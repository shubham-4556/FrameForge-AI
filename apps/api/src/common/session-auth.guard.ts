import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY, type RequestWithAuth } from './decorators';

export const SESSION_COOKIE = 'ff_session';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function extractSessionToken(request: RequestWithAuth): string | null {
  const cookies = (request as RequestWithAuth & { cookies?: Record<string, string | undefined> }).cookies;
  const cookieToken = cookies?.[SESSION_COOKIE];
  if (cookieToken) return cookieToken;
  const header = request.headers.authorization;
  if (header?.toLowerCase().startsWith('bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return null;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = extractSessionToken(request);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sign in to continue',
      });
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
      if (isPublic) return true;
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Session expired',
      });
    }

    request.auth = {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: Boolean(session.user.emailVerifiedAt),
        avatarUrl: session.user.avatarUrl,
        createdAt: session.user.createdAt,
      },
      sessionId: session.id,
      sessionToken: token,
    };

    return true;
  }
}
