import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Workspace, Project } from '@frameforge/db';
import { hasMinimumRole, type WorkspaceRole } from '@frameforge/shared';
import { PrismaService } from '../database/prisma.service';

export interface WorkspaceAccess {
  workspace: Workspace;
  role: WorkspaceRole;
  memberId: string;
}

export interface ProjectAccess extends WorkspaceAccess {
  project: Project;
}

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireWorkspace(
    userId: string,
    workspaceId: string,
    minimum: WorkspaceRole = 'VIEWER',
  ): Promise<WorkspaceAccess> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Workspace not found or you do not have access',
      });
    }

    if (!hasMinimumRole(member.role as WorkspaceRole, minimum)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `This action requires the ${minimum.toLowerCase()} role or higher`,
      });
    }

    return {
      workspace: member.workspace,
      role: member.role as WorkspaceRole,
      memberId: member.id,
    };
  }

  async requireProject(
    userId: string,
    projectId: string,
    minimum: WorkspaceRole = 'VIEWER',
  ): Promise<ProjectAccess> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { workspace: true },
    });

    if (!project) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
    });

    if (!member) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    }

    if (!hasMinimumRole(member.role as WorkspaceRole, minimum)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `This action requires the ${minimum.toLowerCase()} role or higher`,
      });
    }

    return {
      project,
      workspace: project.workspace,
      role: member.role as WorkspaceRole,
      memberId: member.id,
    };
  }

  async assertAssetOwnership(
    workspaceId: string,
    assetIds: string[],
    kinds?: Array<'VIDEO' | 'IMAGE' | 'AUDIO' | 'FONT'>,
  ): Promise<void> {
    const unique = [...new Set(assetIds)];
    if (unique.length === 0) return;
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: unique },
        workspaceId,
        deletedAt: null,
        status: 'READY',
        ...(kinds ? { kind: { in: kinds } } : {}),
      },
      select: { id: true },
    });
    if (assets.length !== unique.length) {
      throw new ForbiddenException({
        code: 'INVALID_ASSET',
        message: 'One or more assets are missing, not ready, or belong to another workspace',
      });
    }
  }
}
