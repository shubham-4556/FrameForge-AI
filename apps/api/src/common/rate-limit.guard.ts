import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { RedisService } from '../redis/redis.service';
import { SKIP_RATE_LIMIT_KEY } from './decorators/skip-rate-limit.decorator';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 120;

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    try {
      const req = context.switchToHttp().getRequest<FastifyRequest & { ip?: string; headers: any }>();
      const key = `rl:${req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown'}:${req.routeOptions?.url ?? req.url}`;
      const count = await this.redis.increment(key, WINDOW_SECONDS);
      if (count > MAX_REQUESTS) {
        throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
      }
      return true;
    } catch (err: any) {
      if (err?.status === HttpStatus.TOO_MANY_REQUESTS) {
        throw err;
      }
      return true;
    }
  }
}
