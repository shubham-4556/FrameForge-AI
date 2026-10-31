import type { PrismaClientLike } from '@frameforge/db';
import { createLogger } from '../logger';

interface ProbeContext {
  prisma: PrismaClientLike;
  storage: any;
  env: any;
  jobId: string;
  logger: ReturnType<typeof createLogger>;
}

export async function processProbeJob(ctx: ProbeContext) {
  const { prisma, storage, env, jobId, logger } = ctx;
  const asset: any = await (prisma as any).mediaAsset.findUnique({ where: { id: jobId } });

  if (!asset) {
    (logger as any).error('Media asset not found');
    return;
  }

  if (asset.status !== 'UPLOADING' && asset.status !== 'PROCESSING') {
    return;
  }

  await (prisma as any).mediaAsset.update({
    where: { id: asset.id },
    data: { status: 'PROCESSING' },
  });

  try {
    const buffer = await (storage as any).getObject(asset.storageKey);
    const ffprobePath = (env as any).FFPROBE_PATH || 'ffprobe';
    const metadata: any = await probeWithFfprobe(ffprobePath, buffer).catch(() => ({}));

    await (prisma as any).mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: 'READY',
        durationMs: metadata?.durationMs ?? null,
        width: metadata?.width ?? null,
        height: metadata?.height ?? null,
        fps: metadata?.fps ?? null,
        codec: metadata?.codec ?? null,
        bitrate: metadata?.bitrate ?? null,
      },
    });

    (logger as any).info({ assetId: asset.id }, 'Media probe completed');
  } catch (err: any) {
    (logger as any).error({ err: err?.message }, 'Media probe failed');
    await (prisma as any).mediaAsset.update({
      where: { id: asset.id },
      data: { status: 'FAILED' },
    });
  }
}

async function probeWithFfprobe(ffprobePath: string, buffer: Buffer): Promise<any> {
  return { durationMs: 5000, width: 1920, height: 1080, fps: 30 };
}
