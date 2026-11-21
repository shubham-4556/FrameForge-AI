import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PrismaClientLike } from '@frameforge/db';
import type { WorkerEnv } from '../services/env';
import type { WorkerStorage } from '../services/storage';
import { createLogger } from './logger';

interface RenderContext {
  prisma: PrismaClientLike;
  storage: WorkerStorage;
  env: WorkerEnv;
  redis: any;
  jobId: string;
  logger: ReturnType<typeof createLogger>;
}

interface RenderClip {
  id: string;
  kind: 'video' | 'image' | 'audio' | 'text';
  assetId?: string;
  startMs: number;
  durationMs: number;
  trimInMs?: number;
}

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_FPS = 30;

async function checkCancelled(ctx: RenderContext, renderJobId: string): Promise<boolean> {
  try {
    const value = await ctx.redis.get(`ff:cancel:render:${renderJobId}`);
    if (value === '1') return true;
  } catch {
    return false;
  }
  const job: any = await (ctx.prisma as any).renderJob.findUnique({
    where: { id: renderJobId },
    select: { status: true },
  });
  return job?.status === 'CANCELED';
}

function asJson(value: unknown): any {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function asNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

export async function processRenderJob(ctx: RenderContext): Promise<void> {
  const { prisma, storage, env, jobId, logger } = ctx;
  const renderJob: any = await (prisma as any).renderJob.findUnique({
    where: { id: jobId },
    include: { project: true },
  });

  if (!renderJob) {
    (logger as any).error({ renderJobId: jobId }, 'Render job not found');
    return;
  }
  if (renderJob.status !== 'QUEUED') {
    (logger as any).warn({ renderJobId: jobId, status: renderJob.status }, 'Render job not queued');
    return;
  }

  await (prisma as any).renderJob.update({
    where: { id: renderJob.id },
    data: { status: 'RUNNING', startedAt: new Date(), progress: 1 },
  });

  const settings = asJson(renderJob.settings);
  const width = asNumber(settings.width, DEFAULT_WIDTH);
  const height = asNumber(settings.height, DEFAULT_HEIGHT);
  const fps = asNumber(settings.fps, DEFAULT_FPS);
  const crf = asNumber(settings.crf, 20);
  const revision: any = await (prisma as any).projectRevision.findUnique({
    where: { projectId_revision: { projectId: renderJob.projectId, revision: renderJob.revision } },
  });

  const workDir = await mkdtemp(join(tmpdir(), 'frameforge-render-'));
  try {
    const document = asJson(revision?.document);
    const clips = extractVideoClips(document);
    const assetIds = Array.from(
      new Set(clips.map((clip) => clip.assetId).filter((value): value is string => Boolean(value))),
    );

    const assets: any[] = assetIds.length
      ? await (prisma as any).mediaAsset.findMany({ where: { id: { in: assetIds } } })
      : [];
    const assetById = new Map<string, any>(assets.map((asset) => [asset.id, asset]));

    const segments: string[] = [];
    let timelineDurationMs = 0;
    let renderedDurationMs = 0;

    if (clips.length === 0) {
      const fallback = join(workDir, 'segment-0.mp4');
      await renderBlackFrame({ ffmpegPath: env.FFMPEG_PATH, outputPath: fallback, width, height, fps, crf });
      segments.push(fallback);
      timelineDurationMs = 5000;
      renderedDurationMs = 5000;
    } else {
      for (let index = 0; index < clips.length; index += 1) {
        if (await checkCancelled(ctx, renderJob.id)) {
          await finishCanceled(ctx, renderJob.id);
          return;
        }
        const clip = clips[index] as RenderClip;
        timelineDurationMs += clip.durationMs;
        const asset = clip.assetId ? assetById.get(clip.assetId) : undefined;
        if (!asset || asset.deletedAt || asset.status === 'FAILED') {
          (logger as any).warn({ clipId: clip.id }, 'Skipping clip without a ready asset');
          continue;
        }

        const sourcePath = join(workDir, `source-${clip.id}`);
        try {
          await storage.getToFile(asset.storageKey, sourcePath);
        } catch (error) {
          (logger as any).warn(
            { clipId: clip.id, err: (error as Error).message },
            'Failed to fetch asset for render',
          );
          continue;
        }

        const segment = join(workDir, `segment-${segments.length}.mp4`);
        await renderClipSegment({
          ffmpegPath: env.FFMPEG_PATH,
          sourcePath,
          outputPath: segment,
          isImage: clip.kind === 'image' || String(asset.mimeType).startsWith('image/'),
          durationMs: clip.durationMs,
          trimInMs: clip.trimInMs ?? 0,
          width,
          height,
          fps,
          crf,
        });
        segments.push(segment);
        renderedDurationMs += clip.durationMs;
        await (prisma as any).renderJob.update({
          where: { id: renderJob.id },
          data: {
            progress: Math.min(95, Math.round(((index + 1) / clips.length) * 90) + 5),
          },
        });
      }

      if (segments.length === 0) {
        const fallback = join(workDir, 'segment-0.mp4');
        await renderBlackFrame({ ffmpegPath: env.FFMPEG_PATH, outputPath: fallback, width, height, fps, crf });
        segments.push(fallback);
        renderedDurationMs = Math.max(5000, timelineDurationMs);
      }
    }

    if (await checkCancelled(ctx, renderJob.id)) {
      await finishCanceled(ctx, renderJob.id);
      return;
    }

    const outputPath = join(workDir, 'output.mp4');
    await concatenateSegments({
      ffmpegPath: env.FFMPEG_PATH,
      segments,
      workDir,
      outputPath,
      crf,
    });

    const outputStats = await stat(outputPath);
    const outputKey = `renders/${renderJob.projectId}/${renderJob.id}/output.mp4`;
    await storage.putFile(outputKey, outputPath, 'video/mp4');
    const download = await storage.createDownloadUrl({
      key: outputKey,
      filename: `${renderJob.project?.title ?? 'export'}.mp4`,
      contentType: 'video/mp4',
      expiresInSeconds: 3600,
    });

    await (prisma as any).renderJob.update({
      where: { id: renderJob.id },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        completedAt: new Date(),
        outputKey,
        outputSizeBytes: BigInt(outputStats.size),
        durationMs: renderedDurationMs,
        width,
        height,
        errorCode: null,
        errorMessage: null,
      },
    });

    const exportRecord = await (prisma as any).export.findUnique({
      where: { renderJobId: renderJob.id },
    });
    const exportData = {
      workspaceId: renderJob.workspaceId,
      projectId: renderJob.projectId,
      storageKey: outputKey,
      filename: `${renderJob.project?.title ?? 'export'}.mp4`,
      format: 'mp4',
      sizeBytes: BigInt(outputStats.size),
      durationMs: renderedDurationMs,
      width,
      height,
      status: 'READY',
    };
    if (exportRecord) {
      await (prisma as any).export.update({ where: { id: exportRecord.id }, data: exportData });
    } else {
      await (prisma as any).export.create({
        data: { renderJobId: renderJob.id, ...exportData },
      });
    }

    (logger as any).info(
      { renderJobId: renderJob.id, sizeBytes: outputStats.size, downloadUrl: download.url },
      'Render job completed',
    );
  } catch (error) {
    const message = (error as Error).message ?? 'Render failed';
    (logger as any).error({ renderJobId: renderJob.id, err: message }, 'Render job failed');
    await (prisma as any).renderJob
      .update({
        where: { id: renderJob.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorCode: 'RENDER_ERROR',
          errorMessage: message.slice(0, 2000),
        },
      })
      .catch(() => undefined);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function finishCanceled(ctx: RenderContext, renderJobId: string): Promise<void> {
  await (ctx.prisma as any).renderJob
    .update({
      where: { id: renderJobId },
      data: { status: 'CANCELED', completedAt: new Date() },
    })
    .catch(() => undefined);
}

function extractVideoClips(document: any): RenderClip[] {
  const tracks: any[] = Array.isArray(document?.tracks) ? document.tracks : [];
  const clips: RenderClip[] = [];
  for (const track of tracks) {
    if (track?.type !== 'video' || track?.hidden) continue;
    for (const clip of Array.isArray(track?.clips) ? track.clips : []) {
      if (clip?.kind !== 'video' && clip?.kind !== 'image') continue;
      clips.push({
        id: String(clip.id),
        kind: clip.kind,
        assetId: clip.assetId ? String(clip.assetId) : undefined,
        startMs: Math.max(0, Number(clip.startMs) || 0),
        durationMs: Math.max(100, Number(clip.durationMs) || 3000),
        trimInMs: Math.max(0, Number(clip.trimInMs) || 0),
      });
    }
  }
  return clips.sort((a, b) => a.startMs - b.startMs);
}

async function renderClipSegment(input: {
  ffmpegPath: string;
  sourcePath: string;
  outputPath: string;
  isImage: boolean;
  durationMs: number;
  trimInMs: number;
  width: number;
  height: number;
  fps: number;
  crf: number;
}): Promise<void> {
  const { ffmpegPath, sourcePath, outputPath, isImage, durationMs, trimInMs, width, height, fps, crf } = input;
  const durationSeconds = Math.max(0.1, durationMs / 1000);
  const trimSeconds = Math.max(0, trimInMs / 1000);
  const filters = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}`;
  const args = isImage
    ? [
        '-y',
        '-loop',
        '1',
        '-t',
        String(durationSeconds),
        '-i',
        sourcePath,
        '-vf',
        filters,
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        String(crf),
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outputPath,
      ]
    : [
        '-y',
        ...(trimSeconds > 0 ? ['-ss', String(trimSeconds)] : []),
        '-t',
        String(durationSeconds),
        '-i',
        sourcePath,
        '-vf',
        filters,
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        String(crf),
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outputPath,
      ];

  await runCommand(ffmpegPath, args);
}

async function renderBlackFrame(input: {
  ffmpegPath: string;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  crf: number;
}): Promise<void> {
  const { ffmpegPath, outputPath, width, height, fps, crf } = input;
  await runCommand(ffmpegPath, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${width}x${height}:d=5:r=${fps}`,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(crf),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ]);
}

async function concatenateSegments(input: {
  ffmpegPath: string;
  segments: string[];
  workDir: string;
  outputPath: string;
  crf: number;
}): Promise<void> {
  const { ffmpegPath, segments, workDir, outputPath, crf } = input;
  if (segments.length === 1) {
    await runCommand(ffmpegPath, ['-y', '-i', segments[0] as string, '-c', 'copy', '-movflags', '+faststart', outputPath]);
    return;
  }
  const listPath = join(workDir, 'segments.txt');
  await writeFile(
    listPath,
    segments.map((segment) => `file '${segment.replace(/'/g, "'\\''")}'`).join('\n'),
    'utf8',
  );
  await runCommand(ffmpegPath, [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(crf),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ]);
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}: ${stderr.slice(-1500)}`));
    });
    child.on('error', reject);
  });
}
