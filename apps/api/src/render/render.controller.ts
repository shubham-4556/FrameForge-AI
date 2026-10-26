import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { createRenderSchema, renderListQuerySchema } from '@frameforge/shared';
import { CurrentUser, type RequestWithAuth } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiZodBody } from '../common/api-zod.decorator';
import { RenderService } from './render.service';

@ApiTags('Renders')
@Controller()
export class RenderController {
  constructor(private readonly renders: RenderService) {}

  @Post('projects/:id/renders')
  @ApiOperation({ summary: 'Queue an MP4 export of the current timeline' })
  @ApiZodBody(createRenderSchema, 'CreateRender')
  create(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createRenderSchema)) body: z.infer<typeof createRenderSchema>,
    @Req() req: RequestWithAuth,
  ) {
    return this.renders.create(user.id, id, body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('workspaces/:workspaceId/renders')
  @ApiOperation({ summary: 'List renders in a workspace' })
  list(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(renderListQuerySchema)) query: z.infer<typeof renderListQuerySchema>,
  ) {
    return this.renders.list(user.id, query);
  }

  @Get('renders/:id')
  @ApiOperation({ summary: 'Get a render job' })
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.renders.get(user.id, id);
  }

  @Post('renders/:id/cancel')
  @ApiOperation({ summary: 'Cancel a queued or running render' })
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.renders.cancel(user.id, id);
  }

  @Get('renders/:id/download')
  @ApiOperation({ summary: 'Create a short-lived MP4 download URL' })
  download(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.renders.download(user.id, id);
  }

  @Delete('renders/:id')
  @ApiOperation({ summary: 'Delete a render and its export (admin)' })
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.renders.remove(user.id, id);
  }
}
