import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import { PrismaClientLike } from '@frameforge/db';

dotenv.config({ path: process.env.DOTENV_PATH ?? '../../.env' });

export const redis: any = new (Redis as any)(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const prisma: PrismaClientLike = new (require('@frameforge/db').PrismaClient)({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['warn', 'error'],
}) as any;

export async function ensureRedisConnection(): Promise<void> {
  try {
    if ((redis as any).status === 'ready') {
      return;
    }
    if (typeof (redis as any).connect === 'function') {
      await (redis as any).connect().catch(() => undefined);
    }
  } catch {}
}
