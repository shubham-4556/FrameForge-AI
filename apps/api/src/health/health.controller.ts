import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { access } from 'node:fs/promises';
import type { ServerEnv } from '@frameforge/shared/server';
import { ENV } from '../config/env.module';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueuesService } from '../queues/queues.service';
import { Public } from '../common/decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(ENV) private readonly env: ServerEnv,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queues: QueuesService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and dependency status' })
  async health() {
    const [database, cache, queue, ffmpeg, ffprobe] = await Promise.all([
      this.prisma.ping(),
      this.redis.ping(),
      this.queues.ping(),
      this.exists(this.env.FFMPEG_PATH),
      this.exists(this.env.FFPROBE_PATH),
    ]);
    return {
      status: database && cache && queue ? 'ok' : 'degraded',
      version: '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      environment: this.env.NODE_ENV,
      checks: {
        database,
        redis: cache,
        queue,
        ffmpeg,
        ffprobe,
        aiProvider: this.env.AI_PROVIDER,
        storage: this.env.STORAGE_DRIVER,
        billing: Boolean(this.env.STRIPE_SECRET_KEY),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for orchestration' })
  async ready() {
    const [database, cache, queue] = await Promise.all([
      this.prisma.ping(),
      this.redis.ping(),
      this.queues.ping(),
    ]);
    if (!database || !cache || !queue) {
      throw new ServiceUnavailableException({
        code: 'NOT_READY',
        message: 'One or more dependencies are unavailable',
        details: { database, redis: cache, queue },
      });
    }
    return { status: 'ready' };
  }

  private async exists(commandOrPath: string): Promise<boolean> {
    if (!commandOrPath.includes('/')) return true;
    try {
      await access(commandOrPath);
      return true;
    } catch {
      return false;
    }
  }
}
