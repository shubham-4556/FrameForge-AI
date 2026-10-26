import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { getServerEnv } from '@frameforge/shared/server';
import { SKIP_CSRF_KEY } from './decorators';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly env = getServerEnv();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!MUTATING_METHODS.has(request.method)) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    if (request.headers['x-frameforge-csrf'] !== '1') {
      throw new ForbiddenException({
        code: 'CSRF_REJECTED',
        message: 'Missing CSRF request header',
      });
    }

    try {
      const origin = (request.headers as any).origin;
      if (origin) {
        const allowed = new Set([
          new URL(this.env.APP_URL).origin,
          new URL(this.env.API_INTERNAL_URL).origin,
        ]);
        if (!allowed.has(origin)) {
          throw new ForbiddenException({
            code: 'CSRF_REJECTED',
            message: 'Request origin is not allowed',
          });
        }
      }
    } catch (e) {
      // ignore
    }

    return true;
  }
}
