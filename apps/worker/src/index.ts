import Redis from 'ioredis';
import { prisma, env, storage } from './services/clients';
import { createWorkers } from './queues';
import { createLogger } from './logger';

const logger = createLogger('worker');

async function main(): Promise<void> {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  redis.on('error', (error) => logger.error('Redis error', error as Error));

  logger.info(`FrameForge worker starting (concurrency:${env.WORKER_CONCURRENCY})`);
  const workers = createWorkers({ redis, prisma, storage, env });

  const shutdown = async (signal: string) => {
    logger.info(`Shutting down on ${signal}`);
    await Promise.allSettled(workers.map((worker) => worker.close()));
    await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
