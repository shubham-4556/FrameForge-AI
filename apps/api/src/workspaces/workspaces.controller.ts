import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
} from '@frameforge/shared';
import { CurrentUser, type RequestWithAuth } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiZodBody } from '../common/api-zod.decorator';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List workspaces you belong to' })
  list(@CurrentUser() user: { id: string }) {
    return this.workspaces.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  @ApiZodBody(createWorkspaceSchema, 'CreateWorkspace')
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: { name: string },
    @Req() req: RequestWithAuth,
  ) {
    return this.workspaces.create(user.id, body.name, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details and usage' })
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.workspaces.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a workspace (admin)' })
  @ApiZodBody(updateWorkspaceSchema, 'UpdateWorkspace')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: { name: string },
    @Req() req: RequestWithAuth,
  ) {
    return this.workspaces.update(user.id, id, body.name, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List workspace members' })
  members(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.workspaces.members(user.id, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add an existing account to the workspace (admin)' })
  @ApiZodBody(inviteMemberSchema, 'InviteMember')
  invite(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inviteMemberSchema))
    body: { email: string; role: 'ADMIN' | 'EDITOR' | 'VIEWER' },
    @Req() req: RequestWithAuth,
  ) {
    return this.workspaces.invite(user.id, id, body.email, body.role, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Change a member role (admin)' })
  @ApiZodBody(updateMemberRoleSchema, 'UpdateMemberRole')
  updateRole(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema))
    body: { role: 'ADMIN' | 'EDITOR' | 'VIEWER' },
    @Req() req: RequestWithAuth,
  ) {
    return this.workspaces.updateRole(user.id, id, memberId, body.role, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member (admin)' })
  removeMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.workspaces.removeMember(user.id, id, memberId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
