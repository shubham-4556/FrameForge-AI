import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '@frameforge/shared';
import Redis from 'ioredis';
import type { PrismaClient } from '@frameforge/db';
import type { ServerEnv, StorageDriver } from '@frameforge/shared/server';
import { createLogger } from './logger.js';
import { processProbeJob } from './media/probe.js';
import { processRenderJob } from './render/renderer.js';
import { processAiJob } from './ai/processor.js';

export function createWorkers(input: {
  redis: Redis;
  prisma: PrismaClient;
  storage: StorageDriver;
  env: ServerEnv;
}): Worker[] {
  const { redis, prisma, storage, env } = input;
  const connection = redis;

  const concurrency = env.WORKER_CONCURRENCY;

  const mediaWorker = new Worker(
    QUEUE_NAMES.MEDIA,
    async (job) => {
      const logger = createLogger(`media:${job.name}`);
      if (job.name === 'probe') {
        await processProbeJob({ prisma, storage, env, jobId: String((job.data as any).assetId ?? job.id), logger });
        return;
      }
      logger.warn(`Unknown media job ${job.name}`);
    },
    { connection, concurrency },
  );

  const renderWorker = new Worker(
    QUEUE_NAMES.RENDER,
    async (job) => {
      const logger = createLogger(`render:${job.id}`);
      if (job.name === 'render') {
        await processRenderJob({ prisma, storage, env, redis, jobId: String((job.data as any).renderJobId ?? job.id), logger });
        return;
      }
      logger.warn(`Unknown render job ${job.name}`);
    },
    { connection, concurrency },
  );

  const aiWorker = new Worker(
    QUEUE_NAMES.AI,
    async (job) => {
      const logger = createLogger(`ai:${job.id}`);
      if (job.name === 'ai') {
        await processAiJob({ prisma, storage, env, redis, jobId: String((job.data as any).aiJobId ?? job.id), logger });
        return;
      }
      logger.warn(`Unknown ai job ${job.name}`);
    },
    { connection, concurrency },
  );

  for (const worker of [mediaWorker, renderWorker, aiWorker]) {
    worker.on('failed', (job, err) => {
      console.error(`[worker] ${worker.name ?? 'worker'} job ${job?.id} failed: ${err?.message}`);
    });
    worker.on('error', (err) => console.error(`[worker] error: ${err.message}`));
  }

  return [mediaWorker, renderWorker, aiWorker];
}
