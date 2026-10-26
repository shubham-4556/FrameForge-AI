import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { WorkspaceRole } from '@frameforge/shared';
import { PrismaService } from '../database/prisma.service';
import { AccessService } from './access.service';
import { UsageService } from '../billing/usage.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'studio'}-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly usage: UsageService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: { include: { subscription: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      plan: membership.workspace.plan,
      subscriptionStatus: membership.workspace.subscription?.status ?? null,
      createdAt: membership.workspace.createdAt.toISOString(),
    }));
  }

  async create(userId: string, name: string, meta: { ip?: string; userAgent?: string }) {
    const workspace = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: { name, slug: slugify(name), ownerId: userId },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: created.id, userId, role: 'OWNER' },
      });
      await tx.subscription.create({
        data: { workspaceId: created.id, plan: 'FREE', status: 'active', provider: 'internal' },
      });
      return created;
    });

    await this.audit.record({
      workspaceId: workspace.id,
      actorId: userId,
      action: 'workspace.created',
      targetType: 'workspace',
      targetId: workspace.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: 'OWNER' as WorkspaceRole,
      plan: workspace.plan,
    };
  }

  async get(userId: string, workspaceId: string) {
    const access = await this.access.requireWorkspace(userId, workspaceId);
    const summary = await this.usage.getSummary(workspaceId);
    return {
      id: access.workspace.id,
      name: access.workspace.name,
      slug: access.workspace.slug,
      role: access.role,
      createdAt: access.workspace.createdAt.toISOString(),
      usage: summary,
    };
  }

  async update(
    userId: string,
    workspaceId: string,
    name: string,
    meta: { ip?: string; userAgent?: string },
  ) {
    await this.access.requireWorkspace(userId, workspaceId, 'ADMIN');
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });
    await this.audit.record({
      workspaceId,
      actorId: userId,
      action: 'workspace.updated',
      targetType: 'workspace',
      targetId: workspaceId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { id: workspace.id, name: workspace.name };
  }

  async members(userId: string, workspaceId: string) {
    await this.access.requireWorkspace(userId, workspaceId);
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
    }));
  }

  async invite(
    userId: string,
    workspaceId: string,
    email: string,
    role: 'ADMIN' | 'EDITOR' | 'VIEWER',
    meta: { ip?: string; userAgent?: string },
  ) {
    const access = await this.access.requireWorkspace(userId, workspaceId, 'ADMIN');
    if (access.role === 'ADMIN' && role === 'ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the workspace owner can grant the admin role',
      });
    }
    const target = await this.prisma.user.findUnique({ where: { email } });
    if (!target || target.deletedAt) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'No FrameForge account uses that email. Ask them to sign up first.',
      });
    }
    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: target.id } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'That person is already a member of this workspace',
      });
    }
    await this.usage.assertMemberAllowed(workspaceId);

    const member = await this.prisma.workspaceMember.create({
      data: { workspaceId, userId: target.id, role, invitedById: userId },
      include: { user: { select: { name: true, email: true } } },
    });

    await this.mail
      .sendWorkspaceInvite(target.email, access.workspace.name, (await this.prisma.user.findUnique({ where: { id: userId } }))?.name ?? 'A teammate')
      .catch(() => undefined);
    await this.audit.record({
      workspaceId,
      actorId: userId,
      action: 'workspace.member_invited',
      targetType: 'workspace_member',
      targetId: member.id,
      metadata: { email, role },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      id: member.id,
      userId: target.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
    };
  }

  async updateRole(
    actorId: string,
    workspaceId: string,
    memberId: string,
    role: 'ADMIN' | 'EDITOR' | 'VIEWER',
    meta: { ip?: string; userAgent?: string },
  ) {
    const access = await this.access.requireWorkspace(actorId, workspaceId, 'ADMIN');
    const target = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!target) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Member not found' });
    if (target.role === 'OWNER') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'The workspace owner role cannot be changed',
      });
    }
    if (access.role === 'ADMIN' && (target.role === 'ADMIN' || role === 'ADMIN')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the owner can manage admin roles',
      });
    }
    const updated = await this.prisma.workspaceMember.update({
      where: { id: target.id },
      data: { role },
    });
    await this.audit.record({
      workspaceId,
      actorId,
      action: 'workspace.member_role_updated',
      targetType: 'workspace_member',
      targetId: updated.id,
      metadata: { role },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { id: updated.id, role: updated.role };
  }

  async removeMember(
    actorId: string,
    workspaceId: string,
    memberId: string,
    meta: { ip?: string; userAgent?: string },
  ) {
    const access = await this.access.requireWorkspace(actorId, workspaceId, 'ADMIN');
    const target = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!target) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Member not found' });
    if (target.role === 'OWNER') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'The workspace owner cannot be removed',
      });
    }
    if (target.userId === actorId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You cannot remove yourself from the workspace',
      });
    }
    if (access.role === 'ADMIN' && target.role === 'ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the owner can remove admins',
      });
    }
    await this.prisma.workspaceMember.delete({ where: { id: target.id } });
    await this.audit.record({
      workspaceId,
      actorId,
      action: 'workspace.member_removed',
      targetType: 'workspace_member',
      targetId: memberId,
      metadata: { removedUserId: target.userId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { removed: true };
  }
}
