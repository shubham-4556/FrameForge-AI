import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createProjectSchema,
  duplicateProjectSchema,
  projectListQuerySchema,
  saveTimelineSchema,
  updateProjectSchema,
} from '@frameforge/shared';
import { CurrentUser, type RequestWithAuth } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiZodBody } from '../common/api-zod.decorator';
import { ProjectsService } from './projects.service';

const listQuerySchema = projectListQuerySchema.omit({ workspaceId: true });
const captionsQuerySchema = z.object({ format: z.enum(['srt', 'vtt']).default('srt') });

@ApiTags('Projects')
@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('workspaces/:workspaceId/projects')
  @ApiOperation({ summary: 'List projects in a workspace' })
  list(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
  ) {
    return this.projects.list(user.id, workspaceId, query);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create a project with an empty timeline' })
  @ApiZodBody(createProjectSchema, 'CreateProject')
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createProjectSchema)) body: z.infer<typeof createProjectSchema>,
    @Req() req: RequestWithAuth,
  ) {
    return this.projects.create(user.id, body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get a project and its latest timeline' })
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.projects.get(user.id, id);
  }

  @Patch('projects/:id')
  @ApiOperation({ summary: 'Update project metadata' })
  @ApiZodBody(updateProjectSchema, 'UpdateProject')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: z.infer<typeof updateProjectSchema>,
    @Req() req: RequestWithAuth,
  ) {
    return this.projects.update(user.id, id, body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Soft-delete a project (admin)' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.projects.remove(user.id, id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('projects/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate a project and its timeline' })
  @ApiZodBody(duplicateProjectSchema, 'DuplicateProject')
  duplicate(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(duplicateProjectSchema)) body: z.infer<typeof duplicateProjectSchema>,
    @Req() req: RequestWithAuth,
  ) {
    return this.projects.duplicate(user.id, id, body.title, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('projects/:id/timeline')
  @ApiOperation({ summary: 'Get the latest timeline document' })
  timeline(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.projects.getTimeline(user.id, id);
  }

  @Put('projects/:id/timeline')
  @ApiOperation({ summary: 'Save the timeline with optimistic concurrency' })
  @ApiZodBody(saveTimelineSchema, 'SaveTimeline')
  saveTimeline(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveTimelineSchema)) body: z.infer<typeof saveTimelineSchema>,
    @Req() req: RequestWithAuth,
  ) {
    return this.projects.saveTimeline(
      user.id,
      id,
      body.baseVersion,
      body.document,
      body.label,
      { ip: req.ip, userAgent: req.headers['user-agent'] },
    );
  }

  @Get('projects/:id/revisions')
  @ApiOperation({ summary: 'List timeline revisions' })
  revisions(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.projects.revisions(user.id, id);
  }

  @Get('projects/:id/revisions/:revisionId')
  @ApiOperation({ summary: 'Get a single timeline revision' })
  revision(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.projects.getRevision(user.id, id, revisionId);
  }

  @Post('projects/:id/revisions/:revisionId/restore')
  @ApiOperation({ summary: 'Restore a previous timeline revision' })
  restore(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.projects.restoreRevision(user.id, id, revisionId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('projects/:id/captions')
  @ApiOperation({ summary: 'Download captions as SRT or VTT' })
  async captions(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query(new ZodValidationPipe(captionsQuerySchema)) query: { format: 'srt' | 'vtt' },
    @Res() reply: FastifyReply,
  ) {
    const result = await this.projects.captions(user.id, id, query.format);
    reply
      .header('Content-Type', 'text/plain; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.content);
  }
}
