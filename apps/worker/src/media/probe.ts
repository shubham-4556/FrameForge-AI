import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Prisma, type PrismaClient } from '@frameforge/db';
import { safeFilename, type ServerEnv, type StorageDriver } from '@frameforge/shared/server';
import type { WorkerLogger } from '../logger.js';

const execFileAsync = promisify(execFile);

interface ProbeResult {
  width?: number;
  height?: number;
  durationMs?: number;
  hasAudio: boolean;
  codec?: string;
}

async function probeFile(
  ffprobePath: string,
  filePath: string,
  logger: WorkerLogger,
): Promise<ProbeResult> {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,codec_name,duration',
        '-show_entries',
        'format=duration',
        '-of',
        'json',
        filePath,
      ],
      { timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as any;
    const stream = parsed.streams?.[0] ?? {};
    const format = parsed.format ?? {};
    const durationSeconds = stream.duration ?? format.duration;
    const durationMs = durationSeconds ? Math.round(Number(durationSeconds) * 1000) : undefined;

    const { stdout: audioOut } = await execFileAsync(
      ffprobePath,
      ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', filePath],
      { timeout: 30_000, maxBuffer: 1 * 1024 * 1024 },
    );
    const hasAudio = audioOut.trim().split(/\n/).filter(Boolean).length > 0;

    return {
      width: stream.width ? Number(stream.width) : undefined,
      height: stream.height ? Number(stream.height) : undefined,
      durationMs,
      hasAudio,
      codec: stream.codec_name,
    };
  } catch (error) {
    logger.warn(`Probe failed: ${(error as Error).message}`);
    return { hasAudio: false };
  }
}

async function generateThumbnail(
  ffmpegPath: string,
  filePath: string,
  destination: string,
  kind: 'VIDEO' | 'IMAGE',
): Promise<void> {
  if (kind === 'IMAGE') {
    await execFileAsync(
      ffmpegPath,
      ['-y', '-i', filePath, '-vf', 'scale=512:-2', '-q:v', '3', destination],
      { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
    );
    return;
  }
  await execFileAsync(
    ffmpegPath,
    [
      '-y',
      '-ss',
      '00:00:01.000',
      '-i',
      filePath,
      '-frames:v',
      '1',
      '-vf',
      'scale=512:-2',
      '-q:v',
      '3',
      destination,
    ],
    { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
  );
}

export async function processProbeJob(input: {
  prisma: PrismaClient;
  storage: StorageDriver;
  env: ServerEnv;
  jobId: string;
  logger: WorkerLogger;
}): Promise<void> {
  const { prisma, storage, env, jobId, logger } = input;
  const asset = await prisma.mediaAsset.findUnique({ where: { id: jobId } });
  if (!asset || asset.deletedAt) {
    logger.warn(`Probe job ${jobId}: asset missing or deleted`);
    return;
  }
  if (asset.status === 'READY') {
    logger.info(`Probe job ${jobId}: already ready`);
    return;
  }

  let workingDir = '';
  try {
    await prisma.mediaAsset.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', failureReason: null },
    });

    workingDir = await fsp.mkdtemp(path.join(os.tmpdir(), `frameforge-probe-${jobId.slice(-8)}-`));
    const extension = path.extname(asset.storageKey) || (asset.kind === 'IMAGE' ? '.jpg' : '.mp4');
    const base = safeFilename(asset.originalName).replace(/\.[^.]+$/, '') || asset.id;
    const local = path.join(workingDir, `${base}${extension}`);
    await storage.getToFile(asset.storageKey, local);

    let probe: ProbeResult = { hasAudio: false };
    if (asset.kind === 'VIDEO') {
      probe = await probeFile(env.FFPROBE_PATH, local, logger);
    } else if (asset.kind === 'AUDIO') {
      probe = await probeFile(env.FFPROBE_PATH, local, logger);
    }

    const thumbPath = path.join(workingDir, 'thumb.jpg');
    try {
      if (asset.kind === 'IMAGE' || asset.kind === 'VIDEO') {
        await generateThumbnail(env.FFMPEG_PATH, local, thumbPath, asset.kind);
        const thumbKey = `workspaces/${asset.workspaceId}/thumbnails/assets/${asset.id}.jpg`;
        await storage.putFile(thumbKey, thumbPath, 'image/jpeg');
        await prisma.mediaAsset.update({
          where: { id: jobId },
          data: { thumbnailKey: thumbKey },
        });
      }
    } catch (error) {
      logger.warn(`Thumbnail failed for ${jobId}: ${(error as Error).message}`);
    }

    await prisma.mediaAsset.update({
      where: { id: jobId },
      data: {
        status: 'READY',
        width: probe.width ?? asset.width,
        height: probe.height ?? asset.height,
        durationMs: probe.durationMs ?? asset.durationMs,
        hasAudio: probe.hasAudio,
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: asset.workspaceId,
        actorId: asset.uploadedById,
        action: 'media.probed',
        targetType: 'media_asset',
        targetId: asset.id,
        metadata: { width: probe.width, height: probe.height, durationMs: probe.durationMs } as Prisma.InputJsonValue,
      },
    });

    logger.info(`Probe completed for ${jobId}`);
  } catch (error) {
    logger.error(`Probe failed for ${jobId}`, error as Error);
    await prisma.mediaAsset.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message.slice(0, 1000) : 'Probe failed',
      },
    });
  } finally {
    if (workingDir) {
      await fsp.rm(workingDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
