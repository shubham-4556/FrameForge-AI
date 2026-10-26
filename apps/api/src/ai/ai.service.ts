import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type AiGenerationJob } from '@frameforge/db';
import {
  AI_CREDIT_COST,
  type AiJobKind,
  type CreateAiGenerationInput,
  type PaginationInput,
} from '@frameforge/shared';
import type { ServerEnv } from '@frameforge/shared/server';
import { ENV } from '../config/env.module';
import { PrismaService } from '../database/prisma.service';
import { AccessService } from '../workspaces/access.service';
import { UsageService } from '../billing/usage.service';
import { QueuesService } from '../queues/queues.service';
import { AuditService } from '../audit/audit.service';

export interface AiListQuery extends PaginationInput {
  workspaceId: string;
  projectId?: string;
  kind?: AiJobKind;
  status?: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
}

export function serializeAiJob(job: AiGenerationJob) {
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    projectId: job.projectId,
    kind: job.kind,
    provider: job.provider,
    model: job.model,
    prompt: job.prompt,
    script: job.script,
    style: job.style,
    aspectRatio: job.aspectRatio,
    durationSeconds: job.durationSeconds,
    resolution: job.resolution,
    params: job.params,
    status: job.status,
    progress: job.progress,
    mock: job.mock,
    result: job.result,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

@Injectable()
export class AiService {
  constructor(
    @Inject(ENV) private readonly env: ServerEnv,
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly usage: UsageService,
    private readonly queues: QueuesService,
    private readonly audit: AuditService,
  ) {}

  private modelFor(kind: AiJobKind): string {
    if (kind === 'TEXT_TO_SPEECH' || kind === 'TRANSCRIPTION') return this.env.OPENAI_TTS_MODEL;
    if (kind === 'STORYBOARD' || kind === 'IMAGE_TO_VIDEO' || kind === 'TEXT_TO_VIDEO') {
      return this.env.OPENAI_IMAGE_MODEL;
    }
    return this.env.OPENAI_TEXT_MODEL;
  }

  async create(
    userId: string,
    input: CreateAiGenerationInput,
    meta: { ip?: string; userAgent?: string },
  ) {
    await this.access.requireWorkspace(userId, input.workspaceId, 'EDITOR');

    if (input.projectId) {
      const project = await this.access.requireProject(userId, input.projectId, 'EDITOR');
      if (project.project.workspaceId !== input.workspaceId) {
        throw new BadRequestException({
          code: 'INVALID_PROJECT',
          message: 'Project does not belong to this workspace',
        });
      }
      const assetIds = [
        ...(input.sourceAssetId ? [input.sourceAssetId] : []),
        ...(input.referenceAssetIds ?? []),
      ];
      await this.access.assertAssetOwnership(input.workspaceId, assetIds);
    } else {
      const assetIds = [
        ...(input.sourceAssetId ? [input.sourceAssetId] : []),
        ...(input.referenceAssetIds ?? []),
      ];
      await this.access.assertAssetOwnership(input.workspaceId, assetIds);
    }

    if (input.idempotencyKey) {
      const existing = await this.prisma.aiGenerationJob.findUnique({
        where: {
          workspaceId_idempotencyKey: {
            workspaceId: input.workspaceId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) return serializeAiJob(existing);
    }

    const credits = AI_CREDIT_COST[input.kind];
    await this.usage.assertAiAllowed(input.workspaceId, credits);

    const provider = this.env.AI_PROVIDER === 'openai' && this.env.OPENAI_API_KEY ? 'openai' : 'mock';
    const params: Prisma.InputJsonValue = {
      voice: input.voice ?? this.env.OPENAI_TTS_VOICE,
      language: input.language ?? 'en',
      sourceAssetId: input.sourceAssetId ?? null,
      referenceAssetIds: input.referenceAssetIds ?? [],
      sceneCount: input.sceneCount,
      text: input.text ?? null,
    };

    let job: AiGenerationJob;
    try {
      job = await this.prisma.aiGenerationJob.create({
        data: {
          workspaceId: input.workspaceId,
          projectId: input.projectId ?? null,
          createdById: userId,
          kind: input.kind,
          provider,
          model: this.modelFor(input.kind),
          prompt: input.prompt ?? null,
          script: input.script ?? null,
          style: input.style ?? null,
          aspectRatio: input.aspectRatio,
          durationSeconds: input.durationSeconds,
          resolution: input.resolution,
          params,
          mock: provider === 'mock',
          idempotencyKey: input.idempotencyKey ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.aiGenerationJob.findUnique({
          where: {
            workspaceId_idempotencyKey: {
              workspaceId: input.workspaceId,
              idempotencyKey: input.idempotencyKey ?? '',
            },
          },
        });
        if (existing) return serializeAiJob(existing);
      }
      throw error;
    }

    await this.usage.record({
      workspaceId: input.workspaceId,
      kind: 'AI_CREDITS',
      quantity: credits,
      userId,
      projectId: input.projectId,
      metadata: { jobId: job.id, kind: input.kind },
    });

    try {
      await this.queues.addAiJob(job.id);
    } catch (error) {
      await this.prisma.aiGenerationJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorCode: 'QUEUE_UNAVAILABLE',
          errorMessage: (error as Error).message,
          completedAt: new Date(),
        },
      });
      throw error;
    }

    await this.audit.record({
      workspaceId: input.workspaceId,
      actorId: userId,
      action: 'ai.generation_requested',
      targetType: 'ai_job',
      targetId: job.id,
      metadata: { kind: input.kind, credits, provider },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return serializeAiJob(job);
  }

  async list(userId: string, query: AiListQuery) {
    await this.access.requireWorkspace(userId, query.workspaceId);
    const where: Prisma.AiGenerationJobWhereInput = {
      workspaceId: query.workspaceId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { prompt: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.aiGenerationJob.count({ where }),
      this.prisma.aiGenerationJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: jobs.map(serializeAiJob),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async get(userId: string, jobId: string) {
    const job = await this.requireJob(userId, jobId);
    return serializeAiJob(job);
  }

  async cancel(userId: string, jobId: string) {
    const job = await this.requireJob(userId, jobId, 'EDITOR');
    if (job.status === 'SUCCEEDED' || job.status === 'FAILED' || job.status === 'CANCELED') {
      throw new ConflictException({
        code: 'JOB_FINISHED',
        message: `This generation is already ${job.status.toLowerCase()}`,
      });
    }
    const updated = await this.prisma.aiGenerationJob.update({
      where: { id: job.id },
      data: { status: 'CANCELED', completedAt: new Date() },
    });
    await this.queues.requestCancel('ai', job.id);
    return serializeAiJob(updated);
  }

  private async requireJob(userId: string, jobId: string, minimum: 'VIEWER' | 'EDITOR' = 'VIEWER') {
    const job = await this.prisma.aiGenerationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Generation not found' });
    try {
      await this.access.requireWorkspace(userId, job.workspaceId, minimum);
    } catch {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Generation not found' });
    }
    return job;
  }
}
