import { Prisma, type PrismaClient } from '@frameforge/db';
import { AI_CREDIT_COST, cancelKey } from '@frameforge/shared';
import { isCanceled, type ServerEnv, type StorageDriver } from '@frameforge/shared/server';
import type Redis from 'ioredis';
import type { WorkerLogger } from '../logger.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processAiJob(input: {
  prisma: PrismaClient;
  storage: StorageDriver;
  env: ServerEnv;
  redis: Redis;
  jobId: string;
  logger: WorkerLogger;
}): Promise<void> {
  const { prisma, storage, env, redis, jobId, logger } = input;
  const job = await prisma.aiGenerationJob.findUnique({
    where: { id: jobId },
    include: { project: true },
  });
  if (!job) {
    logger.warn(`AI job ${jobId} not found`);
    return;
  }
  if (job.status === 'SUCCEEDED' || job.status === 'CANCELED' || job.status === 'FAILED') {
    logger.info(`AI job ${jobId} already ${job.status.toLowerCase()}`);
    return;
  }

  const canceled = async (): Promise<boolean> => {
    if (await isCanceled(redis, 'ai', jobId)) return true;
    const current = await prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    return current?.status === 'CANCELED';
  };

  try {
    if (await canceled()) {
      await prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: { status: 'CANCELED', completedAt: new Date() },
      });
      return;
    }

    await prisma.aiGenerationJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', progress: 5, startedAt: new Date(), errorMessage: null },
    });

    const steps = [20, 40, 60, 80, 90];
    for (const step of steps) {
      if (await canceled()) {
        await prisma.aiGenerationJob.update({
          where: { id: jobId },
          data: { status: 'CANCELED', completedAt: new Date() },
        });
        return;
      }
      await prisma.aiGenerationJob.update({ where: { id: jobId }, data: { progress: step } });
      await sleep(800);
    }

    if (job.kind === 'SCRIPT' || job.kind === 'STORYBOARD') {
      const output = {
        mock: true,
        type: job.kind,
        prompt: job.prompt,
        watermark: 'FRAMEFORGE MOCK',
        result: [
          { scene: 1, description: 'FrameForge mock scene 1', durationSec: 5 },
          { scene: 2, description: 'FrameForge mock scene 2', durationSec: 5 },
        ],
      };
      await prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'SUCCEEDED',
          progress: 100,
          result: output as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
      await redis.del(cancelKey('ai', jobId)).catch(() => undefined);
      logger.info(`AI ${job.kind} job ${jobId} completed (mock)`);
      return;
    }

    const outputKey = `workspaces/${job.workspaceId}/ai/${job.id}/generated.mp4`;
    await prisma.mediaAsset.create({
      data: {
        workspaceId: job.workspaceId,
        projectId: job.projectId,
        uploadedById: job.createdById,
        kind: 'VIDEO',
        storageKey: outputKey,
        originalName: `frameforge-ai-${job.kind.toLowerCase()}.mp4`,
        mimeType: 'video/mp4',
        sizeBytes: BigInt(0),
        status: 'PROCESSING',
      },
    });

    await prisma.aiGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        result: {
          mock: true,
          type: job.kind,
          watermark: 'FRAMEFORGE MOCK',
          mediaAssetKey: outputKey,
        } as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    const creditCost = AI_CREDIT_COST[job.kind as keyof typeof AI_CREDIT_COST] ?? 1;
    await prisma.usageRecord.create({
      data: {
        workspaceId: job.workspaceId,
        projectId: job.projectId,
        userId: job.createdById,
        kind: 'AI_CREDITS',
        quantity: BigInt(creditCost),
        metadata: { aiJobId: jobId, mock: true } as Prisma.InputJsonValue,
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: job.workspaceId,
        actorId: job.createdById,
        action: 'ai.completed',
        targetType: 'ai_job',
        targetId: jobId,
        metadata: { type: job.kind, mock: true } as Prisma.InputJsonValue,
      },
    });

    await redis.del(cancelKey('ai', jobId)).catch(() => undefined);
    logger.info(`AI ${job.kind} job ${jobId} completed (mock)`);
  } catch (error) {
    if (await canceled().catch(() => false)) {
      await prisma.aiGenerationJob
        .update({
          where: { id: jobId },
          data: { status: 'CANCELED', completedAt: new Date() },
        })
        .catch(() => undefined);
      return;
    }
    logger.error(`AI job ${jobId} failed`, error as Error);
    await prisma.aiGenerationJob
      .update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message.slice(0, 2000) : 'AI failed',
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
    await redis.del(cancelKey('ai', jobId)).catch(() => undefined);
  }
}
