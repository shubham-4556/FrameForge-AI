import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PrismaClientLike } from '@frameforge/db';
import { QUEUE_NAMES } from '@frameforge/shared';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { createLogger } from './logger';

interface RenderContext {
  prisma: PrismaClientLike;
  storage: any;
  env: any;
  redis: any;
  jobId: string;
  logger: ReturnType<typeof createLogger>;
}

const RENDER_QUEUE = new Queue(QUEUE_NAMES.RENDER, {
  connection: new (Redis as any)(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null }),
});

async function checkCancelled(redis: any, renderJobId: string): Promise<boolean> {
  const key = `ff:cancel:render:${renderJobId}`;
  const value = await redis.get(key);
  return value === '1';
}

export async function processRenderJob(ctx: RenderContext) {
  const { prisma, storage, env, redis, jobId, logger } = ctx;
  const renderJob: any = await (prisma as any).renderJob.findUnique({
    where: { id: jobId },
    include: {
      project: true,
      projectRevision: true,
      assets: {
        include: { asset: true },
      },
    },
  });

  if (!renderJob) {
    (logger as any).error('Render job not found');
    return;
  }

  if (renderJob.status !== 'QUEUED') {
    (logger as any).warn({ status: renderJob.status }, 'Render job not in queued state');
    return;
  }

  await (prisma as any).renderJob.update({
    where: { id: renderJob.id },
    data: { status: 'RUNNING', startedAt: new Date(), progress: 0 },
  });

  try {
    if (await checkCancelled(redis, renderJob.id)) {
      await (prisma as any).renderJob.update({
        where: { id: renderJob.id },
        data: { status: 'CANCELED', finishedAt: new Date() },
      });
      return;
    }

    const workDir = await mkdtemp(join(tmpdir(), 'frameforge-render-'));
    const outputPath = join(workDir, 'output.mp4');

    const assets: any[] = [];
    for (const link of renderJob.assets || []) {
      const asset = link.asset as any;
      if (!asset || asset.deletedAt || asset.status !== 'READY') {
        continue;
      }
      try {
        const buffer = await (storage as any).getObject(asset.storageKey);
        const assetPath = join(workDir, `${asset.id}-${asset.fileName || 'asset'}`);
        await writeFile(assetPath, buffer);
        assets.push({ asset, path: assetPath, order: link.order });
      } catch (err: any) {
        (logger as any).warn({ err: err?.message, assetId: asset.id }, 'Failed to fetch asset for render');
      }
    }

    await runFfmpeg({ env, outputPath, assets, logger: logger as any, onProgress: async (progress: number) => {
      await (prisma as any).renderJob.update({
        where: { id: renderJob.id },
        data: { progress: Math.floor(progress * 100) },
      });
    }});

    if (await checkCancelled(redis, renderJob.id)) {
      await (prisma as any).renderJob.update({
        where: { id: renderJob.id },
        data: { status: 'CANCELED', finishedAt: new Date() },
      });
      await rm(workDir, { recursive: true, force: true });
      return;
    }

    const fileBuffer = await readFile(outputPath);
    const key = `renders/${renderJob.projectId}/${renderJob.id}/output.mp4`;
    await (storage as any).putObject(key, fileBuffer, 'video/mp4');

    const downloadUrl = await (storage as any).getSignedDownloadUrl(key, 3600);

    await (prisma as any).renderJob.update({
      where: { id: renderJob.id },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        finishedAt: new Date(),
        outputStorageKey: key,
        outputUrl: downloadUrl,
      },
    });

    await rm(workDir, { recursive: true, force: true });
    (logger as any).info({ renderJobId: renderJob.id }, 'Render job completed');
  } catch (err: any) {
    (logger as any).error({ err: err?.message }, 'Render job failed');
    await (prisma as any).renderJob.update({
      where: { id: renderJob.id },
      data: { status: 'FAILED', finishedAt: new Date(), error: err?.message },
    });
  }
}

async function runFfmpeg(input: {
  env: any;
  outputPath: string;
  assets: Array<{ asset: any; path: string; order: number }>;
  logger: any;
  onProgress: (progress: number) => Promise<void>;
}) {
  const { env, outputPath, assets, onProgress } = input;
  const ffmpegPath = (env as any).FFMPEG_PATH || 'ffmpeg';

  if (assets.length === 0) {
    await runCommand([ffmpegPath, '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:d=5', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'libx264', '-c:a', 'aac', outputPath]);
    await onProgress(1);
    return;
  }

  const sorted = assets.sort((a: any, b: any) => a.order - b.order);
  const firstAsset = sorted[0];
  if (!firstAsset) {
    await runCommand([ffmpegPath, '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:d=5', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'libx264', '-c:a', 'aac', outputPath]);
    await onProgress(1);
    return;
  }
  await runCommand([ffmpegPath, '-i', firstAsset.path, '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart', outputPath]);
  await onProgress(1);
}

function runCommand(args: (string | undefined)[]): Promise<void> {
  const cmd = args.filter(Boolean) as string[];
  return new Promise((resolve, reject) => {
    const child: any = spawn(cmd[0], cmd.slice(1));
    if (child.stdout) child.stdout.on('data', () => {});
    if (child.stderr) child.stderr.on('data', () => {});
    child.on('close', (code: any) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}
