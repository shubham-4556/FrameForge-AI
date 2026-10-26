import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { RedisService } from '../redis/redis.service';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './decorators';
import type { RequestWithAuth } from './decorators';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const keyPart =
      options.key === 'user' && request.auth?.user?.id
        ? request.auth.user.id
        : (request.ip ?? (request.headers['x-forwarded-for'] as string) ?? 'unknown');

    const key = `rl:${request.routeOptions?.url ?? request.url}:${keyPart}`;
    const current = await this.redis.increment(key, options.windowSeconds);
    if (current > options.limit) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
