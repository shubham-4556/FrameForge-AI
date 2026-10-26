import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ProjectStatus } from '@frameforge/db';
import {
  captionsToSrt,
  captionsToVtt,
  createEmptyTimeline,
  timelineDocumentSchema,
  timelineDurationMs,
  type AspectRatio,
  type Fps,
  type ProjectListQuery,
  type TimelineDocument,
  type WorkspaceRole,
} from '@frameforge/shared';
import { PrismaService } from '../database/prisma.service';
import { AccessService } from '../workspaces/access.service';
import { UsageService } from '../billing/usage.service';
import { AuditService } from '../audit/audit.service';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

interface CreateProjectInput {
  workspaceId: string;
  title: string;
  description?: string;
  aspectRatio: AspectRatio;
  fps: Fps;
}

function parseTimeline(document: unknown): TimelineDocument {
  const parsed = timelineDocumentSchema.safeParse(document);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'INVALID_TIMELINE',
      message: 'The timeline document is invalid',
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

function assetIdsFromTimeline(document: TimelineDocument): string[] {
  const ids = new Set<string>();
  for (const track of document.tracks) {
    for (const clip of track.clips) {
      if (clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'audio') {
        ids.add(clip.assetId);
      }
    }
  }
  return [...ids];
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly usage: UsageService,
    private readonly audit: AuditService,
  ) {}

  private latestRevision(projectId: string) {
    return this.prisma.projectRevision.findFirst({
      where: { projectId },
      orderBy: { revision: 'desc' },
    });
  }

  async list(userId: string, workspaceId: string, query: Omit<ProjectListQuery, 'workspaceId'>) {
    const access = await this.access.requireWorkspace(userId, workspaceId);
    const where: Prisma.ProjectWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(query.status ? { status: query.status as ProjectStatus } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const orderBy: Prisma.ProjectOrderByWithRelationInput =
      query.sort === 'title' ? { title: query.order } : { [query.sort]: query.order };

    const [total, projects] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          revisions: { orderBy: { revision: 'desc' }, take: 1, select: { revision: true, createdAt: true } },
          _count: { select: { assets: true, renderJobs: true } },
        },
      }),
    ]);

    return {
      items: projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        aspectRatio: project.aspectRatio,
        fps: project.fps,
        durationMs: project.durationMs,
        thumbnailUrl: project.thumbnailKey ? `/api/media/thumbnail/${project.id}` : null,
        version: project.version,
        createdBy: project.createdBy,
        assetCount: project._count.assets,
        renderCount: project._count.renderJobs,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        lastEditedAt: project.lastEditedAt.toISOString(),
        role: access.role as WorkspaceRole,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async create(userId: string, input: CreateProjectInput, meta: RequestMeta) {
    await this.access.requireWorkspace(userId, input.workspaceId, 'EDITOR');
    await this.usage.assertProjectAllowed(input.workspaceId);

    const document = createEmptyTimeline({
      aspectRatio: input.aspectRatio,
      fps: input.fps,
      name: input.title,
    });

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          workspaceId: input.workspaceId,
          createdById: userId,
          title: input.title,
          description: input.description ?? null,
          aspectRatio: input.aspectRatio,
          fps: input.fps,
          version: 1,
        },
      });
      await tx.projectRevision.create({
        data: {
          projectId: created.id,
          revision: 1,
          document: document as unknown as Prisma.InputJsonValue,
          label: 'Created',
          createdById: userId,
        },
      });
      return created;
    });

    await this.audit.record({
      workspaceId: input.workspaceId,
      actorId: userId,
      action: 'project.created',
      targetType: 'project',
      targetId: project.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      aspectRatio: project.aspectRatio,
      fps: project.fps,
      version: project.version,
      durationMs: project.durationMs,
      timeline: document,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async get(userId: string, projectId: string) {
    const access = await this.access.requireProject(userId, projectId);
    const revision = await this.latestRevision(projectId);
    if (!revision) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project timeline is missing' });
    }
    return {
      id: access.project.id,
      workspaceId: access.project.workspaceId,
      title: access.project.title,
      description: access.project.description,
      status: access.project.status,
      aspectRatio: access.project.aspectRatio,
      fps: access.project.fps,
      durationMs: access.project.durationMs,
      version: access.project.version,
      createdAt: access.project.createdAt.toISOString(),
      updatedAt: access.project.updatedAt.toISOString(),
      lastEditedAt: access.project.lastEditedAt.toISOString(),
      role: access.role,
      workspace: { id: access.workspace.id, name: access.workspace.name, plan: access.workspace.plan },
      timeline: revision.document as unknown as TimelineDocument,
    };
  }

  async update(
    userId: string,
    projectId: string,
    input: { title?: string; description?: string | null; status?: 'DRAFT' | 'READY' | 'ARCHIVED' },
    meta: RequestMeta,
  ) {
    await this.access.requireProject(userId, projectId, 'EDITOR');
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: input,
    });
    await this.audit.record({
      workspaceId: project.workspaceId,
      actorId: userId,
      action: 'project.updated',
      targetType: 'project',
      targetId: project.id,
      metadata: input,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async remove(userId: string, projectId: string, meta: RequestMeta) {
    const access = await this.access.requireProject(userId, projectId, 'ADMIN');
    await this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({
      workspaceId: access.workspace.id,
      actorId: userId,
      action: 'project.deleted',
      targetType: 'project',
      targetId: projectId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { deleted: true };
  }

  async duplicate(
    userId: string,
    projectId: string,
    title: string | undefined,
    meta: RequestMeta,
  ) {
    const access = await this.access.requireProject(userId, projectId, 'EDITOR');
    await this.usage.assertProjectAllowed(access.workspace.id);
    const revision = await this.latestRevision(projectId);
    if (!revision) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Nothing to duplicate' });

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          workspaceId: access.project.workspaceId,
          createdById: userId,
          title: (title ?? `${access.project.title} copy`).slice(0, 120),
          description: access.project.description,
          status: 'DRAFT',
          aspectRatio: access.project.aspectRatio,
          fps: access.project.fps,
          durationMs: access.project.durationMs,
          version: 1,
        },
      });
      await tx.projectRevision.create({
        data: {
          projectId: created.id,
          revision: 1,
          document: revision.document as Prisma.InputJsonValue,
          label: 'Duplicated',
          createdById: userId,
        },
      });
      return created;
    });

    await this.audit.record({
      workspaceId: access.workspace.id,
      actorId: userId,
      action: 'project.duplicated',
      targetType: 'project',
      targetId: project.id,
      metadata: { sourceProjectId: projectId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { id: project.id, title: project.title };
  }

  async getTimeline(userId: string, projectId: string) {
    const access = await this.access.requireProject(userId, projectId);
    const revision = await this.latestRevision(projectId);
    if (!revision) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Timeline not found' });
    return {
      version: access.project.version,
      document: revision.document as unknown as TimelineDocument,
      updatedAt: revision.createdAt.toISOString(),
    };
  }

  async saveTimeline(
    userId: string,
    projectId: string,
    baseVersion: number,
    rawDocument: unknown,
    label: string | undefined,
    meta: RequestMeta,
  ) {
    const access = await this.access.requireProject(userId, projectId, 'EDITOR');
    if (access.project.status === 'ARCHIVED') {
      throw new ForbiddenException({
        code: 'PROJECT_ARCHIVED',
        message: 'Archived projects are read-only. Restore the project before editing.',
      });
    }

    const document = parseTimeline(rawDocument);
    await this.access.assertAssetOwnership(
      access.workspace.id,
      assetIdsFromTimeline(document),
    );

    if (access.project.version !== baseVersion) {
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'This project was edited elsewhere. Reload the latest timeline before saving.',
        details: {
          currentVersion: access.project.version,
          lastEditedAt: access.project.lastEditedAt.toISOString(),
        },
      });
    }

    const durationMs = timelineDurationMs(document);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.project.updateMany({
        where: { id: projectId, version: baseVersion, deletedAt: null },
        data: {
          version: { increment: 1 },
          durationMs,
          aspectRatio: document.aspectRatio,
          fps: document.fps,
          lastEditedAt: new Date(),
          status: access.project.status === 'PROCESSING' ? 'PROCESSING' : 'DRAFT',
        },
      });
      if (updated.count === 0) return null;
      const revision = await tx.projectRevision.create({
        data: {
          projectId,
          revision: baseVersion + 1,
          document: document as unknown as Prisma.InputJsonValue,
          label: label ?? `Autosave v${baseVersion + 1}`,
          createdById: userId,
        },
      });
      return revision;
    });

    if (!result) {
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'This project was edited elsewhere. Reload the latest timeline before saving.',
      });
    }

    await this.audit.record({
      workspaceId: access.workspace.id,
      actorId: userId,
      action: 'project.timeline_saved',
      targetType: 'project',
      targetId: projectId,
      metadata: { version: baseVersion + 1, durationMs },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      saved: true,
      version: baseVersion + 1,
      durationMs,
      updatedAt: result.createdAt.toISOString(),
    };
  }

  async revisions(userId: string, projectId: string) {
    await this.access.requireProject(userId, projectId);
    const revisions = await this.prisma.projectRevision.findMany({
      where: { projectId },
      orderBy: { revision: 'desc' },
      take: 100,
      include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return revisions.map((revision) => ({
      id: revision.id,
      revision: revision.revision,
      label: revision.label,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy,
    }));
  }

  async getRevision(userId: string, projectId: string, revisionId: string) {
    await this.access.requireProject(userId, projectId);
    const revision = await this.prisma.projectRevision.findFirst({
      where: { id: revisionId, projectId },
    });
    if (!revision) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Revision not found' });
    return {
      id: revision.id,
      revision: revision.revision,
      label: revision.label,
      document: revision.document as unknown as TimelineDocument,
      createdAt: revision.createdAt.toISOString(),
    };
  }

  async restoreRevision(
    userId: string,
    projectId: string,
    revisionId: string,
    meta: RequestMeta,
  ) {
    const access = await this.access.requireProject(userId, projectId, 'EDITOR');
    if (access.project.status === 'ARCHIVED') {
      throw new ForbiddenException({
        code: 'PROJECT_ARCHIVED',
        message: 'Archived projects are read-only.',
      });
    }
    const revision = await this.prisma.projectRevision.findFirst({
      where: { id: revisionId, projectId },
    });
    if (!revision) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Revision not found' });
    const document = parseTimeline(revision.document);
    await this.access.assertAssetOwnership(access.workspace.id, assetIdsFromTimeline(document));
    const durationMs = timelineDurationMs(document);

    const updated = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: projectId },
        data: {
          version: { increment: 1 },
          durationMs,
          aspectRatio: document.aspectRatio,
          fps: document.fps,
          status: 'DRAFT',
          lastEditedAt: new Date(),
        },
      });
      await tx.projectRevision.create({
        data: {
          projectId,
          revision: project.version,
          document: document as unknown as Prisma.InputJsonValue,
          label: `Restored v${revision.revision}`,
          createdById: userId,
        },
      });
      return project;
    });

    await this.audit.record({
      workspaceId: access.workspace.id,
      actorId: userId,
      action: 'project.revision_restored',
      targetType: 'project',
      targetId: projectId,
      metadata: { restoredRevision: revision.revision, newVersion: updated.version },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { restored: true, version: updated.version, document };
  }

  async captions(userId: string, projectId: string, format: 'srt' | 'vtt') {
    const access = await this.access.requireProject(userId, projectId);
    const revision = await this.latestRevision(projectId);
    if (!revision) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Timeline not found' });
    const document = parseTimeline(revision.document);
    return {
      content: format === 'srt' ? captionsToSrt(document) : captionsToVtt(document),
      filename: `${access.project.title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 60) || 'captions'}.${format}`,
    };
  }
}
