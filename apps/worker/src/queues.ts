import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES } from '@frameforge/shared';
import Redis from 'ioredis';
import type { PrismaClientLike } from '@frameforge/db';
import { createLogger } from './logger';
import { processProbeJob } from './media/probe';
import { processRenderJob } from './render/renderer';
import { processAiJob } from './ai/processor';

export function createWorkers(input: {
  redis: any;
  prisma: PrismaClientLike;
  storage: any;
  env: any;
}): Worker[] {
  const { redis, prisma, storage, env } = input;
  const connection = redis as any;

  const concurrency = env?.WORKER_CONCURRENCY || 2;

  const mediaWorker = new Worker(
    QUEUE_NAMES.MEDIA,
    async (job: Job) => {
      const logger = createLogger(`media:${job.name}`);
      if (job.name === 'probe') {
        await processProbeJob({ prisma, storage, env, jobId: String((job.data as any).assetId ?? job.id), logger });
        return;
      }
      (logger as any).warn(`Unknown media job ${job.name}`);
    },
    { connection, concurrency },
  );

  const renderWorker = new Worker(
    QUEUE_NAMES.RENDER,
    async (job: Job) => {
      const logger = createLogger(`render:${job.id}`);
      if (job.name === 'render') {
        await processRenderJob({ prisma, storage, env, redis, jobId: String((job.data as any).renderJobId ?? job.id), logger });
        return;
      }
      (logger as any).warn(`Unknown render job ${job.name}`);
    },
    { connection, concurrency },
  );

  const aiWorker = new Worker(
    QUEUE_NAMES.AI,
    async (job: Job) => {
      const logger = createLogger(`ai:${job.id}`);
      if (job.name === 'ai') {
        await processAiJob({ prisma, storage, env, redis, jobId: String((job.data as any).aiJobId ?? job.id), logger });
        return;
      }
      (logger as any).warn(`Unknown ai job ${job.name}`);
    },
    { connection, concurrency },
  );

  mediaWorker.on('failed', (job: Job | undefined, err: Error) => {
    const logger = createLogger('media');
    (logger as any).error({ err: err?.message, jobId: job?.id }, 'Media job failed');
  });

  renderWorker.on('failed', (job: Job | undefined, err: Error) => {
    const logger = createLogger('render');
    (logger as any).error({ err: err?.message, jobId: job?.id }, 'Render job failed');
  });

  aiWorker.on('failed', (job: Job | undefined, err: Error) => {
    const logger = createLogger('ai');
    (logger as any).error({ err: err?.message, jobId: job?.id }, 'AI job failed');
  });

  return [mediaWorker, renderWorker, aiWorker];
}
