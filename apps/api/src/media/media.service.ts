import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type MediaAsset } from '@frameforge/db';
import { UPLOAD_MIME_TYPES, type MediaKind, type PaginationInput } from '@frameforge/shared';
import { safeFilename } from '@frameforge/shared/server';
import { PrismaService } from '../database/prisma.service';
import { AccessService } from '../workspaces/access.service';
import { StorageService } from '../storage/storage.service';
import { QueuesService } from '../queues/queues.service';
import { UsageService } from '../billing/usage.service';
import { AuditService } from '../audit/audit.service';

export interface MediaQuery extends PaginationInput {
  workspaceId: string;
  kind?: MediaKind;
  projectId?: string;
  sort: 'createdAt' | 'sizeBytes' | 'originalName';
  order: 'asc' | 'desc';
}

function serializeAsset(asset: MediaAsset) {
  return {
    id: asset.id,
    workspaceId: asset.workspaceId,
    projectId: asset.projectId,
    kind: asset.kind,
    status: asset.status,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: Number(asset.sizeBytes),
    durationMs: asset.durationMs,
    width: asset.width,
    height: asset.height,
    hasAudio: asset.hasAudio,
    mock: asset.mock,
    failureReason: asset.failureReason,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly storage: StorageService,
    private readonly queues: QueuesService,
    private readonly usage: UsageService,
    private readonly audit: AuditService,
  ) {}

  async initUpload(
    userId: string,
    input: {
      workspaceId: string;
      projectId?: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      durationMs?: number;
    },
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
    }

    const kind = UPLOAD_MIME_TYPES[input.mimeType];
    if (!kind) {
      throw new BadRequestException({ code: 'UNSUPPORTED_MEDIA', message: 'Unsupported file type' });
    }

    await this.usage.assertStorageAvailable(input.workspaceId, input.sizeBytes);

    const assetId = `asset_${randomUUID()}`;
    const filename = safeFilename(input.filename) || 'upload';
    const key = `workspaces/${input.workspaceId}/media/${assetId}/${filename}`;

    const asset = await this.prisma.mediaAsset.create({
      data: {
        id: assetId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        uploadedById: userId,
        kind,
        status: 'UPLOADING',
        originalName: input.filename,
        storageKey: key,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        durationMs: input.durationMs ?? null,
        mock: false,
      },
    });

    const target = await this.storage.createUploadTarget({
      key,
      mimeType: input.mimeType,
      maxBytes: input.sizeBytes,
      expiresInSeconds: 900,
    });

    return {
      asset: serializeAsset(asset),
      upload: {
        url: target.url,
        method: target.method,
        headers: target.headers,
        expiresAt: target.expiresAt,
      },
    };
  }

  async completeUpload(userId: string, assetId: string) {
    const asset = await this.requireAsset(userId, assetId, 'EDITOR');
    if (asset.status === 'READY') return serializeAsset(asset);
    if (asset.deletedAt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Asset not found' });
    }

    const stat = await this.storage.stat(asset.storageKey);
    if (!stat || stat.sizeBytes <= 0) {
      throw new BadRequestException({
        code: 'UPLOAD_NOT_FOUND',
        message: 'The uploaded file could not be found. Upload it again.',
      });
    }
    if (stat.sizeBytes > Number(asset.sizeBytes) * 1.05 + 1024) {
      await this.storage.delete(asset.storageKey).catch(() => undefined);
      throw new BadRequestException({
        code: 'UPLOAD_TOO_LARGE',
        message: 'The uploaded file is larger than declared.',
      });
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        sizeBytes: BigInt(stat.sizeBytes),
        status: 'PROCESSING',
        failureReason: null,
      },
    });

    await this.queues.addMediaProbeJob(assetId);

    return serializeAsset(updated);
  }

  async retryProbe(userId: string, assetId: string) {
    const asset = await this.requireAsset(userId, assetId, 'EDITOR');
    if (asset.status === 'READY') return serializeAsset(asset);
    const updated = await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { status: 'PROCESSING', failureReason: null },
    });
    await this.queues.addMediaProbeJob(assetId);
    return serializeAsset(updated);
  }

  async list(userId: string, query: MediaQuery) {
    await this.access.requireWorkspace(userId, query.workspaceId);
    const where: Prisma.MediaAssetWhereInput = {
      workspaceId: query.workspaceId,
      deletedAt: null,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.q ? { originalName: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const orderBy: Prisma.MediaAssetOrderByWithRelationInput = {
      [query.sort]: query.order,
    };

    const [total, assets] = await this.prisma.$transaction([
      this.prisma.mediaAsset.count({ where }),
      this.prisma.mediaAsset.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { project: { select: { id: true, title: true } } },
      }),
    ]);

    const items = await Promise.all(
      assets.map(async (asset) => {
        const previewKey = asset.thumbnailKey ?? (asset.kind === 'IMAGE' ? asset.storageKey : null);
        const preview = previewKey
          ? await this.storage
              .createDownloadUrl({ key: previewKey, expiresInSeconds: 3600 })
              .catch(() => null)
          : null;
        return {
          ...serializeAsset(asset),
          project: asset.project,
          previewUrl: preview?.url ?? null,
        };
      }),
    );

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async get(userId: string, assetId: string) {
    const asset = await this.requireAsset(userId, assetId);
    const download = await this.storage.createDownloadUrl({
      key: asset.storageKey,
      filename: asset.originalName,
      contentType: asset.mimeType,
      expiresInSeconds: 3600,
    });
    const preview = asset.thumbnailKey
      ? await this.storage
          .createDownloadUrl({ key: asset.thumbnailKey, expiresInSeconds: 3600 })
          .catch(() => null)
      : null;
    return {
      ...serializeAsset(asset),
      downloadUrl: download.url,
      previewUrl: preview?.url ?? (asset.kind === 'IMAGE' ? download.url : null),
    };
  }

  async download(userId: string, assetId: string) {
    const asset = await this.requireAsset(userId, assetId);
    return this.storage.createDownloadUrl({
      key: asset.storageKey,
      filename: asset.originalName,
      contentType: asset.mimeType,
      expiresInSeconds: 300,
    });
  }

  async remove(userId: string, assetId: string, meta: { ip?: string; userAgent?: string }) {
    const asset = await this.requireAsset(userId, assetId, 'EDITOR');
    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { deletedAt: new Date(), status: 'DELETED' },
    });
    await Promise.allSettled([
      this.storage.delete(asset.storageKey),
      ...(asset.thumbnailKey ? [this.storage.delete(asset.thumbnailKey)] : []),
    ]);
    await this.audit.record({
      workspaceId: asset.workspaceId,
      actorId: userId,
      action: 'media.deleted',
      targetType: 'media_asset',
      targetId: assetId,
      metadata: { originalName: asset.originalName },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { deleted: true };
  }

  private async requireAsset(
    userId: string,
    assetId: string,
    minimum: 'VIEWER' | 'EDITOR' | 'ADMIN' = 'VIEWER',
  ): Promise<MediaAsset> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, deletedAt: null },
    });
    if (!asset) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Asset not found' });
    try {
      await this.access.requireWorkspace(userId, asset.workspaceId, minimum);
    } catch {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Asset not found' });
    }
    return asset;
  }

  async assertProjectAssets(workspaceId: string, projectId: string, assetIds: string[]) {
    if (assetIds.length === 0) return;
    const count = await this.prisma.mediaAsset.count({
      where: {
        id: { in: assetIds },
        workspaceId,
        OR: [{ projectId }, { projectId: null }],
        deletedAt: null,
        status: 'READY',
      },
    });
    if (count !== new Set(assetIds).size) {
      throw new ConflictException({
        code: 'INVALID_ASSET',
        message: 'Some assets are not available for this project',
      });
    }
  }
}
