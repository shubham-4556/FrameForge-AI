import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { ServerEnv } from '@frameforge/shared/server';
import { ENV } from '../config/env.module';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  private readonly logger = new Logger('Redis');

  constructor(@Inject(ENV) env: ServerEnv) {
    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    this.client.on('error', (error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const result = await this.client
      .multi()
      .incr(key)
      .expire(key, ttlSeconds)
      .exec();
    const value = result?.[0]?.[1];
    return Number(value ?? 1);
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
