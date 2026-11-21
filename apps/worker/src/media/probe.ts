import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PrismaClientLike } from '@frameforge/db';
import type { WorkerEnv } from '../services/env';
import type { WorkerStorage } from '../services/storage';

interface ProbeContext {
  prisma: PrismaClientLike;
  storage: WorkerStorage;
  env: WorkerEnv;
  jobId: string;
  logger: ReturnType<typeof import('../logger').createLogger>;
}

interface ProbeMetadata {
  durationMs: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  fps: number | null;
  codec: string | null;
  bitrate: number | null;
}

export async function processProbeJob(ctx: ProbeContext): Promise<void> {
  const { prisma, storage, env, jobId, logger } = ctx;
  const asset: any = await (prisma as any).mediaAsset.findUnique({ where: { id: jobId } });

  if (!asset) {
    (logger as any).error({ assetId: jobId }, 'Media asset not found');
    return;
  }
  if (asset.status !== 'UPLOADING' && asset.status !== 'PROCESSING') return;

  await (prisma as any).mediaAsset.update({
    where: { id: asset.id },
    data: { status: 'PROCESSING' },
  });

  const workDir = await mkdtemp(join(tmpdir(), 'frameforge-probe-'));
  try {
    const extension = String(asset.originalName ?? '').includes('.')
      ? `.${String(asset.originalName).split('.').pop()}`
      : '';
    const sourcePath = join(workDir, `source${extension}`);
    await storage.getToFile(asset.storageKey, sourcePath);

    const metadata = await probeWithFfprobe(env.FFPROBE_PATH, sourcePath);

    await (prisma as any).mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: 'READY',
        durationMs: metadata.durationMs,
        width: metadata.width,
        height: metadata.height,
        hasAudio: metadata.hasAudio,
        metadata: {
          ...(asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}),
          fps: metadata.fps,
          codec: metadata.codec,
          bitrate: metadata.bitrate,
        },
        failureReason: null,
      },
    });

    (logger as any).info({ assetId: asset.id, ...metadata }, 'Media probe completed');
  } catch (error) {
    const message = (error as Error).message ?? 'Probe failed';
    (logger as any).error({ err: message, assetId: asset.id }, 'Media probe failed');
    await (prisma as any).mediaAsset
      .update({
        where: { id: asset.id },
        data: { status: 'FAILED', failureReason: message.slice(0, 500) },
      })
      .catch(() => undefined);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function probeWithFfprobe(ffprobePath: string, filePath: string): Promise<ProbeMetadata> {
  const output = await runCommand(ffprobePath, [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);
  const parsed = JSON.parse(output) as {
    format?: { duration?: string; bit_rate?: string };
    streams?: Array<{
      codec_type?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
      codec_name?: string;
    }>;
  };

  const streams = parsed.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === 'video');
  const audio = streams.find((stream) => stream.codec_type === 'audio');
  const durationSeconds = Number(parsed.format?.duration ?? 0);

  return {
    durationMs: Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.round(durationSeconds * 1000)
      : null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    hasAudio: Boolean(audio),
    fps: parseFrameRate(video?.avg_frame_rate ?? video?.r_frame_rate),
    codec: video?.codec_name ?? null,
    bitrate: parsed.format?.bit_rate ? Number(parsed.format.bit_rate) : null,
  };
}

function parseFrameRate(value: string | undefined): number | null {
  if (!value) return null;
  const [numerator, denominator] = value.split('/').map(Number);
  if (!numerator || !denominator) return null;
  const fps = numerator / denominator;
  return Number.isFinite(fps) ? Math.round(fps * 100) / 100 : null;
}

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited with code ${code}: ${stderr.slice(0, 500)}`));
    });
    child.on('error', reject);
  });
}
