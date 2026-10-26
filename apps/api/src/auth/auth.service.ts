import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@frameforge/db';
import {
  ROLE_RANK,
  SESSION_TTL_MS,
  type SessionResponse,
} from '@frameforge/shared';
import { getServerEnv, type ServerEnv } from '@frameforge/shared/server';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { hashPassword, verifyPassword } from './password';

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

export interface SessionBundle {
  token: string;
  expiresAt: Date;
  response: SessionResponse;
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'studio'}-${randomBytes(3).toString('hex')}`;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');
  private readonly env: ServerEnv = getServerEnv();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  private sessionExpiry(): Date {
    return new Date(Date.now() + SESSION_TTL_MS);
  }

  private async createSessionRecord(
    tx: Prisma.TransactionClient | PrismaService,
    userId: string,
    meta: SessionMeta,
  ): Promise<{ token: string; expiresAt: Date; sessionId: string }> {
    const token = randomToken();
    const expiresAt = this.sessionExpiry();
    const session = await tx.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt,
        ip: meta.ip?.slice(0, 100),
        userAgent: meta.userAgent?.slice(0, 500),
      },
    });
    return { token, expiresAt, sessionId: session.id };
  }

  async signUp(input: {
    email: string;
    password: string;
    name: string;
    ip?: string;
    userAgent?: string;
  }): Promise<SessionBundle> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
    }
    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, name: input.name.trim(), emailVerifiedAt: new Date() },
      });
      await tx.account.create({
        data: { userId: created.id, provider: 'credentials', providerAccountId: created.id, passwordHash },
      });
      const workspace = await tx.workspace.create({
        data: { name: created.name + "'s Workspace", slug: slugify(created.name), ownerId: created.id, plan: 'FREE' },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: created.id, role: 'OWNER' },
      });
      return created;
    });
    const { token, expiresAt, sessionId } = await this.createSessionRecord(this.prisma, user.id, { ip: input.ip, userAgent: input.userAgent });
    const response = await this.buildSessionResponse(user.id, sessionId, expiresAt);
    return { token, expiresAt, response };
  }

  async signIn(input: { email: string; password: string; ip?: string; userAgent?: string }): Promise<SessionBundle> {
    const email = input.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email }, include: { accounts: true } });
    if (!user || user.deletedAt) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    const account = user.accounts.find((a) => a.provider === 'credentials') ?? user.accounts[0];
    if (!account?.passwordHash) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    const valid = await verifyPassword(input.password, account.passwordHash);
    if (!valid) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    const { token, expiresAt, sessionId } = await this.createSessionRecord(this.prisma, user.id, { ip: input.ip, userAgent: input.userAgent });
    const response = await this.buildSessionResponse(user.id, sessionId, expiresAt);
    return { token, expiresAt, response };
  }

  async signOut(sessionId: string): Promise<void> {
    await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
  }

  async buildSessionResponse(userId: string, sessionId?: string, expiresAt?: Date): Promise<SessionResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const memberships = await this.prisma.workspaceMember.findMany({ where: { userId }, include: { workspace: true } });
    const workspaces = memberships
      .map((m) => ({ id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug, role: m.role, plan: m.workspace.plan }))
      .sort((a, b) => (ROLE_RANK[b.role] - ROLE_RANK[a.role]) || a.name.localeCompare(b.name));
    const session = sessionId && expiresAt ? { id: sessionId, expiresAt: expiresAt.toISOString() } : { id: sessionId ?? '', expiresAt: (expiresAt ?? new Date(Date.now() + SESSION_TTL_MS)).toISOString() };
    return {
      user: { id: user.id, email: user.email, name: user.name, emailVerified: Boolean(user.emailVerifiedAt), avatarUrl: user.avatarUrl, createdAt: user.createdAt.toISOString() },
      workspaces,
      session,
    } as SessionResponse;
  }

  async verifyEmail(_token: string): Promise<void> {}
  async resendVerification(_userId: string): Promise<void> {}
  async forgotPassword(_email: string): Promise<void> {}
  async resetPassword(_token: string, _password: string): Promise<void> {}
  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string | null }): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { ...(data.name ? { name: data.name.trim() } : {}), ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}) } });
  }
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { accounts: true } });
    const account = user.accounts.find((a) => a.provider === 'credentials');
    if (!account?.passwordHash) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid password' });
    const valid = await verifyPassword(currentPassword, account.passwordHash);
    if (!valid) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid password' });
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.account.update({ where: { id: account.id }, data: { passwordHash } });
  }
  async listSessions(userId: string) {
    return this.prisma.session.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId, userId } });
  }
  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } });
  }
  async listAuditLogs(workspaceId: string) {
    return this.prisma.auditLog.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
  }
}
