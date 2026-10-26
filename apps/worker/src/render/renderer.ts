import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Prisma, type PrismaClient } from '@frameforge/db';
import {
  timelineDocumentSchema,
  timelineDurationMs,
  type TimelineDocument,
} from '@frameforge/shared';
import { isCanceled, safeFilename, type ServerEnv, type StorageDriver } from '@frameforge/shared/server';
import type Redis from 'ioredis';
import { buildFfmpegArgs, buildRenderPlan, type RenderAssetInfo } from './filter.js';
import { FfmpegError, RenderCanceledError, runFfmpeg } from './ffmpeg.js';
import type { WorkerLogger } from '../logger.js';

const execFileAsync = promisify(execFile);

interface RenderSettings {
  width: number;
  height: number;
  fps: number;
  crf: number;
  audioBitrateKbps: number;
  includeAudio: boolean;
  presetId?: string | null;
  projectTitle?: string;
}

function assetIdsFromTimeline(document: TimelineDocument): string[] {
  const ids = new Set<string>();
  for (const track of document.tracks) {
    for (const clip of track.clips) {
      if (clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'audio') {
        ids.add((clip as any).assetId);
      }
    }
  }
  return [...ids];
}

export async function processRenderJob(input: {
  prisma: PrismaClient;
  storage: StorageDriver;
  env: ServerEnv;
  redis: Redis;
  jobId: string;
  logger: WorkerLogger;
}): Promise<void> {
  const { prisma, storage, env, redis, jobId, logger } = input;
  const job = await prisma.renderJob.findUnique({
    where: { id: jobId },
    include: { project: true },
  });
  if (!job) {
    logger.warn(`Render job ${jobId} no longer exists`);
    return;
  }
  if (job.status === 'SUCCEEDED' || job.status === 'CANCELED' || job.status === 'FAILED') {
    logger.info(`Render job ${jobId} already ${job.status.toLowerCase()}`);
    return;
  }

  const settings = job.settings as unknown as RenderSettings;
  let workingDir = '';
  let progressTimer = 0;

  const canceled = async (): Promise<boolean> => {
    if (await isCanceled(redis, 'render', jobId)) return true;
    const current = await prisma.renderJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    return current?.status === 'CANCELED';
  };

  const updateProgress = async (fraction: number) => {
    const progress = Math.max(1, Math.min(99, Math.round(fraction)));
    await prisma.renderJob
      .updateMany({
        where: { id: jobId, status: 'RUNNING' },
        data: { progress },
      })
      .catch(() => undefined);
  };

  try {
    if (await canceled()) {
      await prisma.renderJob.update({
        where: { id: jobId },
        data: { status: 'CANCELED', completedAt: new Date() },
      });
      return;
    }

    await prisma.renderJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', progress: 3, startedAt: new Date(), errorCode: null, errorMessage: null },
    });

    const revision = await prisma.projectRevision.findFirst({
      where: { projectId: job.projectId, revision: job.revision },
    });
    if (!revision) throw new Error(`Timeline revision ${job.revision} not found`);
    const parsed = timelineDocumentSchema.safeParse(revision.document);
    if (!parsed.success) throw new Error('Stored timeline is invalid');
    const document = parsed.data as TimelineDocument;

    const durationMs = Math.max(1000, timelineDurationMs(document));
    const width = settings.width;
    const height = settings.height;
    const fps = settings.fps;

    const assetIds = assetIdsFromTimeline(document);
    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: assetIds }, workspaceId: job.workspaceId },
    });
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const missing = assetIds.filter((id) => {
      const asset = assetMap.get(id);
      return !asset || asset.deletedAt || asset.status !== 'READY';
    });
    if (missing.length > 0) {
      throw new Error(`Assets unavailable: ${missing.join(', ')}`);
    }

    workingDir = await fsp.mkdtemp(path.join(os.tmpdir(), `frameforge-render-${jobId.slice(-8)}-`));
    const localPaths = new Map<string, string>();

    await Promise.all(
      assets.map(async (asset) => {
        const extension = path.extname(asset.storageKey) || (asset.kind === 'IMAGE' ? '.jpg' : '.mp4');
        const destination = path.join(workingDir, `${asset.id}${extension}`);
        await storage.getToFile(asset.storageKey, destination);
        localPaths.set(asset.id, destination);
      }),
    );

    const renderAssets = new Map<string, RenderAssetInfo>();
    for (const asset of assets) {
      const localPath = localPaths.get(asset.id);
      if (!localPath) continue;
      renderAssets.set(asset.id, {
        id: asset.id,
        kind: asset.kind as any,
        path: localPath,
        hasAudio: asset.hasAudio,
      });
    }

    const plan = buildRenderPlan({
      document,
      durationMs,
      width,
      height,
      fps,
      fontPath: env.FFMPEG_FONT,
      assets: renderAssets,
      workingDir,
      includeAudio: settings.includeAudio,
    });

    await Promise.all(plan.textFiles.map((file: any) => fsp.writeFile(file.path, file.content, 'utf8')));
    const filterPath = path.join(workingDir, 'filter.txt');
    await fsp.writeFile(filterPath, plan.filter, 'utf8');
    const outputPath = path.join(workingDir, 'output.mp4');

    logger.info(
      `Rendering ${jobId}: ${width}x${height}@${fps}, ${plan.visualClipCount} visual clips, ${plan.audioInputCount} audio streams, ${(durationMs / 1000).toFixed(1)}s`,
    );

    await updateProgress(8);

    const args = buildFfmpegArgs({
      plan,
      document,
      width,
      height,
      fps,
      durationMs,
      filterPath,
      outputPath,
      crf: settings.crf ?? 21,
      audioBitrateKbps: settings.audioBitrateKbps ?? 192,
    } as any);

    await runFfmpeg({
      ffmpegPath: env.FFMPEG_PATH,
      args,
      durationMs,
      timeoutMs: env.RENDER_TIMEOUT_SECONDS * 1000,
      isCanceled: canceled,
      onLog: (message: string) => logger.warn(message),
      onProgress: (fraction: number) => {
        const now = Date.now();
        if (now - progressTimer > 1500) {
          progressTimer = now;
          void updateProgress(10 + fraction * 80);
        }
      },
    });

    const stats = await fsp.stat(outputPath);
    if (stats.size < 1024) throw new Error('FFmpeg produced an empty file');

    const title = safeFilename(settings.projectTitle ?? job.project.title) || 'frameforge-export';
    const preset = safeFilename(settings.presetId ?? 'custom');
    const storageKey = `workspaces/${job.workspaceId}/renders/${job.id}/${title}-${preset}.mp4`;
    await storage.putFile(storageKey, outputPath, 'video/mp4');
    await updateProgress(94);

    const thumbnailPath = path.join(workingDir, 'thumbnail.jpg');
    let thumbnailKey: string | null = null;
    try {
      await execFileAsync(
        env.FFMPEG_PATH,
        [
          '-y',
          '-ss',
          String(Math.min(1, Math.max(0, durationMs / 2000))),
          '-i',
          outputPath,
          '-frames:v',
          '1',
          '-vf',
          'scale=640:-2',
          '-q:v',
          '3',
          thumbnailPath,
        ],
        { timeout: 30000, maxBuffer: 4 * 1024 * 1024 },
      );
      thumbnailKey = `workspaces/${job.workspaceId}/thumbnails/${job.projectId}/${job.id}.jpg`;
      await storage.putFile(thumbnailKey, thumbnailPath, 'image/jpeg');
    } catch (error) {
      logger.warn(`Thumbnail generation failed for ${jobId}: ${(error as Error).message}`);
    }

    const filename = `${title}.mp4`;

    await prisma.$transaction([
      prisma.renderJob.update({
        where: { id: jobId },
        data: {
          status: 'SUCCEEDED',
          progress: 100,
          outputKey: storageKey,
          outputSizeBytes: BigInt(stats.size),
          durationMs,
          width,
          height,
          completedAt: new Date(),
        },
      }),
      prisma.export.create({
        data: {
          renderJobId: jobId,
          workspaceId: job.workspaceId,
          projectId: job.projectId,
          storageKey,
          filename,
          format: 'mp4',
          sizeBytes: BigInt(stats.size),
          durationMs,
          width,
          height,
          status: 'READY',
        },
      }),
      prisma.project.update({
        where: { id: job.projectId },
        data: {
          status: 'READY',
          durationMs,
          ...(thumbnailKey ? { thumbnailKey } : {}),
        },
      }),
      prisma.usageRecord.create({
        data: {
          workspaceId: job.workspaceId,
          projectId: job.projectId,
          userId: job.requestedById,
          kind: 'RENDER_SECONDS',
          quantity: BigInt(Math.ceil(durationMs / 1000)),
          metadata: { renderJobId: jobId } as Prisma.InputJsonValue,
        },
      }),
      prisma.usageRecord.create({
        data: {
          workspaceId: job.workspaceId,
          projectId: job.projectId,
          userId: job.requestedById,
          kind: 'EXPORT_COUNT',
          quantity: BigInt(1),
          metadata: { renderJobId: jobId } as Prisma.InputJsonValue,
        },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId: job.workspaceId,
          actorId: job.requestedById,
          action: 'render.succeeded',
          targetType: 'render_job',
          targetId: jobId,
          metadata: { bytes: stats.size, durationMs } as Prisma.InputJsonValue,
        },
      }),
    ]);

    await redis.del(`ff:cancel:render:${jobId}`).catch(() => undefined);
    logger.info(`Render ${jobId} completed (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  } catch (error: unknown) {
    if (error instanceof RenderCanceledError || (await canceled().catch(() => false))) {
      await prisma.renderJob
        .update({
          where: { id: jobId },
          data: { status: 'CANCELED', completedAt: new Date() },
        })
        .catch(() => undefined);
      logger.info(`Render ${jobId} canceled`);
      return;
    }

    const message =
      error instanceof FfmpegError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    logger.error(`Render ${jobId} failed`, error instanceof Error ? error : new Error(message));
    await prisma.renderJob
      .update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorCode: error instanceof FfmpegError ? 'RENDER_FAILED' : 'RENDER_ERROR',
          errorMessage: message.slice(0, 2000),
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
    await redis.del(`ff:cancel:render:${jobId}`).catch(() => undefined);
  } finally {
    if (workingDir) {
      await fsp.rm(workingDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
