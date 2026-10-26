import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Plan, type UsageKind } from '@frameforge/db';
import { PLAN_DEFINITIONS, planFor, type PlanDefinition } from '@frameforge/shared';
import { PrismaService } from '../database/prisma.service';

export interface WorkspaceUsage {
  storageBytes: number;
  renderSeconds: number;
  renderMinutes: number;
  aiCredits: number;
  exports: number;
  projects: number;
  members: number;
}

export interface WorkspaceUsageSummary {
  plan: PlanDefinition;
  subscription: {
    status: string;
    provider: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: WorkspaceUsage;
  limits: {
    storageBytes: number;
    renderMinutes: number;
    aiCredits: number;
    maxProjects: number;
    maxMembers: number;
  };
  period: { start: string; end: string };
}

const GIB = 1024 ** 3;

export function startOfMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function startOfNextMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(workspaceId: string): Promise<WorkspaceUsageSummary> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true },
    });
    if (!workspace) throw new Error('Workspace not found');

    const plan = planFor(workspace.plan);

    const [grouped, storage, projects, members] = await Promise.all([
      this.prisma.usageRecord.groupBy({
        by: ['kind'],
        where: { workspaceId, createdAt: { gte: startOfMonth() } },
        _sum: { quantity: true },
      }),
      this.prisma.mediaAsset.aggregate({
        where: {
          workspaceId,
          deletedAt: null,
          status: { in: ['READY', 'PROCESSING'] },
        },
        _sum: { sizeBytes: true },
      }),
      this.prisma.project.count({ where: { workspaceId, deletedAt: null } }),
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
    ]);

    const totals = new Map<UsageKind, number>();
    for (const row of grouped) {
      totals.set(row.kind, Number(row._sum.quantity ?? 0));
    }

    const renderSeconds = totals.get('RENDER_SECONDS') ?? 0;
    const usage: WorkspaceUsage = {
      storageBytes: Number(storage._sum.sizeBytes ?? 0),
      renderSeconds,
      renderMinutes: Math.round((renderSeconds / 60) * 10) / 10,
      aiCredits: totals.get('AI_CREDITS') ?? 0,
      exports: totals.get('EXPORT_COUNT') ?? 0,
      projects,
      members,
    };

    return {
      plan,
      subscription: workspace.subscription
        ? {
            status: workspace.subscription.status,
            provider: workspace.subscription.provider,
            currentPeriodEnd: workspace.subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: workspace.subscription.cancelAtPeriodEnd,
          }
        : null,
      usage,
      limits: {
        storageBytes: plan.storageGb * GIB,
        renderMinutes: plan.renderMinutesPerMonth,
        aiCredits: plan.aiCreditsPerMonth,
        maxProjects: plan.maxProjects,
        maxMembers: plan.maxMembers,
      },
      period: { start: startOfMonth().toISOString(), end: startOfNextMonth().toISOString() },
    };
  }

  async assertStorageAvailable(workspaceId: string, additionalBytes: number): Promise<void> {
    const summary = await this.getSummary(workspaceId);
    if (summary.usage.storageBytes + additionalBytes > summary.limits.storageBytes) {
      throw new HttpException(
        {
          code: 'QUOTA_EXCEEDED',
          message: `Storage limit reached for the ${summary.plan.name} plan. Delete media or upgrade to add more.`,
          details: {
            usedBytes: summary.usage.storageBytes,
            limitBytes: summary.limits.storageBytes,
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async assertProjectAllowed(workspaceId: string): Promise<void> {
    const summary = await this.getSummary(workspaceId);
    if (summary.usage.projects >= summary.limits.maxProjects) {
      throw new HttpException(
        {
          code: 'QUOTA_EXCEEDED',
          message: `Project limit reached for the ${summary.plan.name} plan.`,
          details: { projects: summary.usage.projects, limit: summary.limits.maxProjects },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async assertRenderAllowed(workspaceId: string, requestedSeconds: number): Promise<void> {
    const summary = await this.getSummary(workspaceId);
    if (summary.usage.renderSeconds + requestedSeconds > summary.limits.renderMinutes * 60) {
      throw new HttpException(
        {
          code: 'QUOTA_EXCEEDED',
          message: `Render quota reached for the ${summary.plan.name} plan.`,
          details: {
            usedMinutes: summary.usage.renderMinutes,
            limitMinutes: summary.limits.renderMinutes,
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async assertAiAllowed(workspaceId: string, credits: number): Promise<void> {
    const summary = await this.getSummary(workspaceId);
    if (summary.usage.aiCredits + credits > summary.limits.aiCredits) {
      throw new HttpException(
        {
          code: 'QUOTA_EXCEEDED',
          message: `AI credit limit reached for the ${summary.plan.name} plan.`,
          details: { used: summary.usage.aiCredits, limit: summary.limits.aiCredits },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async assertMemberAllowed(workspaceId: string): Promise<void> {
    const summary = await this.getSummary(workspaceId);
    if (summary.usage.members >= summary.limits.maxMembers) {
      throw new HttpException(
        {
          code: 'QUOTA_EXCEEDED',
          message: `Seat limit reached for the ${summary.plan.name} plan.`,
          details: { members: summary.usage.members, limit: summary.limits.maxMembers },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async record(input: {
    workspaceId: string;
    kind: UsageKind;
    quantity: number;
    userId?: string;
    projectId?: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    if (input.quantity <= 0) return;
    await this.prisma.usageRecord.create({
      data: {
        workspaceId: input.workspaceId,
        kind: input.kind,
        quantity: BigInt(Math.round(input.quantity)),
        userId: input.userId,
        projectId: input.projectId,
        metadata: input.metadata,
      },
    });
  }

  async setPlan(workspaceId: string, plan: Plan): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.workspace.update({ where: { id: workspaceId }, data: { plan } }),
      this.prisma.subscription.upsert({
        where: { workspaceId },
        create: { workspaceId, plan, status: 'active', provider: 'internal' },
        update: { plan },
      }),
    ]);
  }

  plans(): PlanDefinition[] {
    return Object.values(PLAN_DEFINITIONS);
  }
}
