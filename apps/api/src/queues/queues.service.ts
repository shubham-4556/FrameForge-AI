import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_NAMES, cancelKey } from '@frameforge/shared';
import type { ServerEnv } from '@frameforge/shared/server';
import { ENV } from '../config/env.module';

const DEFAULT_JOB_OPTIONS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 3_000 },
  removeOnComplete: { age: 86_400, count: 500 },
  removeOnFail: { age: 7 * 86_400, count: 500 },
};

@Injectable()
export class QueuesService implements OnModuleDestroy {
  private readonly logger = new Logger('Queues');
  private readonly connection: Redis;
  private readonly renderQueue: Queue;
  private readonly aiQueue: Queue;
  private readonly mediaQueue: Queue;
  private readonly redisForCancel: Redis;

  constructor(@Inject(ENV) env: ServerEnv) {
    this.connection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.connection.on('error', (error) => this.logger.warn(`Queue Redis: ${error.message}`));

    this.redisForCancel = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    this.redisForCancel.on('error', () => undefined);

    this.renderQueue = new Queue(QUEUE_NAMES.RENDER, {
      connection: this.connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    this.aiQueue = new Queue(QUEUE_NAMES.AI, {
      connection: this.connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    this.mediaQueue = new Queue(QUEUE_NAMES.MEDIA, {
      connection: this.connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  private queueFor(name: typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]): Queue {
    if (name === QUEUE_NAMES.RENDER) return this.renderQueue;
    if (name === QUEUE_NAMES.AI) return this.aiQueue;
    return this.mediaQueue;
  }

  async addRenderJob(renderJobId: string): Promise<void> {
    try {
      await this.renderQueue.add(
        'render',
        { renderJobId },
        { jobId: `render-${renderJobId}`, priority: 5 },
      );
    } catch (error) {
      throw new ServiceUnavailableException({
        code: 'QUEUE_UNAVAILABLE',
        message: `The rendering queue is unavailable: ${(error as Error).message}`,
      });
    }
  }

  async addAiJob(jobId: string): Promise<void> {
    try {
      await this.aiQueue.add('generate', { jobId }, { jobId: `ai-${jobId}` });
    } catch (error) {
      throw new ServiceUnavailableException({
        code: 'QUEUE_UNAVAILABLE',
        message: `The AI queue is unavailable: ${(error as Error).message}`,
      });
    }
  }

  async addMediaProbeJob(assetId: string): Promise<void> {
    try {
      await this.mediaQueue.add(
        'probe',
        { assetId },
        { jobId: `probe-${assetId}`, attempts: 3 },
      );
    } catch (error) {
      throw new ServiceUnavailableException({
        code: 'QUEUE_UNAVAILABLE',
        message: `The media queue is unavailable: ${(error as Error).message}`,
      });
    }
  }

  async requestCancel(kind: 'render' | 'ai', id: string): Promise<void> {
    try {
      await this.redisForCancel.set(cancelKey(kind, id), '1', 'EX', 7_200);
    } catch {
      // The worker also reconciles canceled jobs from the database.
    }
    const name = kind === 'render' ? QUEUE_NAMES.RENDER : QUEUE_NAMES.AI;
    const job = await this.queueFor(name).getJob(`${kind}-${id}`).catch(() => null);
    if (job) {
      const state = await job.getState().catch(() => null);
      if (state === 'waiting' || state === 'delayed') {
        await job.remove().catch(() => undefined);
      }
    }
  }

  async clearCancel(kind: 'render' | 'ai', id: string): Promise<void> {
    await this.redisForCancel.del(cancelKey(kind, id)).catch(() => undefined);
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.connection.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.renderQueue.close(),
      this.aiQueue.close(),
      this.mediaQueue.close(),
    ]);
    await Promise.allSettled([this.connection.quit(), this.redisForCancel.quit()]);
  }
}
