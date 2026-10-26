import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type RenderJob } from '@frameforge/db';
import {
  EXPORT_PRESETS,
  RENDER_QUALITY_CRF,
  resolveDimensions,
  type AspectRatio,
  type CreateRenderInput,
  type Fps,
  type PaginationInput,
  type Resolution,
} from '@frameforge/shared';
import { PrismaService } from '../database/prisma.service';
import { AccessService } from '../workspaces/access.service';
import { UsageService } from '../billing/usage.service';
import { QueuesService } from '../queues/queues.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';

export interface RenderListQuery extends PaginationInput {
  workspaceId: string;
  projectId?: string;
  status?: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
}

export function serializeRender(job: RenderJob) {
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    projectId: job.projectId,
    revision: job.revision,
    presetId: job.presetId,
    status: job.status,
    progress: job.progress,
    settings: job.settings,
    outputSizeBytes: job.outputSizeBytes ? Number(job.outputSizeBytes) : null,
    durationMs: job.durationMs,
    width: job.width,
    height: job.height,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

@Injectable()
export class RenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly usage: UsageService,
    private readonly queues: QueuesService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    projectId: string,
    input: CreateRenderInput,
    meta: { ip?: string; userAgent?: string },
  ) {
    const access = await this.access.requireProject(userId, projectId, 'EDITOR');
    const project = access.project;
    if (project.durationMs <= 0) {
      throw new BadRequestException({
        code: 'EMPTY_TIMELINE',
        message: 'Add at least one clip before exporting.',
      });
    }

    const preset = input.presetId
      ? EXPORT_PRESETS.find((candidate) => candidate.id === input.presetId)
      : undefined;
    if (input.presetId && !preset) {
      throw new BadRequestException({ code: 'INVALID_PRESET', message: 'Unknown export preset' });
    }

    const aspectRatio = (preset?.aspectRatio ?? input.aspectRatio ?? project.aspectRatio) as AspectRatio;
    const resolution = (preset?.resolution ?? input.resolution) as Resolution;
    const fps = (preset?.fps ?? input.fps) as Fps;
    const { width, height } = resolveDimensions(aspectRatio, resolution);

    const revision = input.revision ?? project.version;
    if (revision !== project.version) {
      throw new BadRequestException({
        code: 'STALE_REVISION',
        message: 'That revision is no longer current. Save the timeline and export again.',
      });
    }

    await this.usage.assertRenderAllowed(access.workspace.id, project.durationMs / 1000);

    const settings: Prisma.InputJsonValue = {
      presetId: preset?.id ?? null,
      aspectRatio,
      resolution,
      width,
      height,
      fps,
      quality: input.quality,
      crf: RENDER_QUALITY_CRF[input.quality],
      audioBitrateKbps: preset?.audioBitrateKbps ?? input.audioBitrateKbps,
      includeAudio: input.includeAudio,
      projectTitle: project.title,
    };

    const job = await this.prisma.renderJob.create({
      data: {
        workspaceId: access.workspace.id,
        projectId,
        requestedById: userId,
        revision,
        presetId: preset?.id ?? null,
        settings,
      },
    });

    try {
      await this.queues.addRenderJob(job.id);
    } catch (error) {
      await this.prisma.renderJob.update({
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
      workspaceId: access.workspace.id,
      actorId: userId,
      action: 'render.queued',
      targetType: 'render_job',
      targetId: job.id,
      metadata: { projectId, presetId: job.presetId, revision },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return serializeRender(job);
  }

  async list(userId: string, query: RenderListQuery) {
    await this.access.requireWorkspace(userId, query.workspaceId);
    const where: Prisma.RenderJobWhereInput = {
      workspaceId: query.workspaceId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.renderJob.count({ where }),
      this.prisma.renderJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { export: { select: { id: true, filename: true, sizeBytes: true } } },
      }),
    ]);
    return {
      items: jobs.map((job) => ({
        ...serializeRender(job),
        export: job.export
          ? {
              id: job.export.id,
              filename: job.export.filename,
              sizeBytes: Number(job.export.sizeBytes),
            }
          : null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async get(userId: string, jobId: string) {
    const job = await this.requireJob(userId, jobId);
    return serializeRender(job);
  }

  async cancel(userId: string, jobId: string) {
    const job = await this.requireJob(userId, jobId, 'EDITOR');
    if (job.status === 'SUCCEEDED') {
      throw new ConflictException({
        code: 'JOB_FINISHED',
        message: 'This render already finished. Delete the export instead.',
      });
    }
    if (job.status === 'FAILED' || job.status === 'CANCELED') {
      return serializeRender(job);
    }
    const updated = await this.prisma.renderJob.update({
      where: { id: jobId },
      data: { status: 'CANCELED', completedAt: new Date() },
    });
    await this.queues.requestCancel('render', jobId);
    await this.audit.record({
      workspaceId: job.workspaceId,
      actorId: userId,
      action: 'render.canceled',
      targetType: 'render_job',
      targetId: jobId,
    });
    return serializeRender(updated);
  }

  async download(userId: string, jobId: string) {
    const job = await this.requireJob(userId, jobId);
    if (job.status !== 'SUCCEEDED') {
      throw new BadRequestException({
        code: 'RENDER_NOT_READY',
        message: 'This render is not ready for download',
      });
    }
    const record = await this.prisma.export.findUnique({ where: { renderJobId: jobId } });
    if (!record || record.status !== 'READY') {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Export file not found' });
    }
    await this.prisma.export.update({
      where: { id: record.id },
      data: { downloadCount: { increment: 1 } },
    });
    return this.storage.createDownloadUrl({
      key: record.storageKey,
      filename: record.filename,
      contentType: 'video/mp4',
      expiresInSeconds: 600,
    });
  }

  async remove(userId: string, jobId: string) {
    const job = await this.requireJob(userId, jobId, 'ADMIN');
    const record = await this.prisma.export.findUnique({ where: { renderJobId: jobId } });
    if (record) {
      await this.storage.delete(record.storageKey).catch(() => undefined);
      await this.prisma.export.delete({ where: { id: record.id } });
    }
    await this.prisma.renderJob.delete({ where: { id: jobId } });
    return { deleted: true };
  }

  private async requireJob(userId: string, jobId: string, minimum: 'VIEWER' | 'EDITOR' | 'ADMIN' = 'VIEWER') {
    const job = await this.prisma.renderJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Render not found' });
    try {
      await this.access.requireWorkspace(userId, job.workspaceId, minimum);
    } catch {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Render not found' });
    }
    return job;
  }
}
