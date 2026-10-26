import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { initUploadSchema, mediaListQuerySchema } from '@frameforge/shared';
import { CurrentUser, type RequestWithAuth } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiZodBody } from '../common/api-zod.decorator';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @ApiOperation({ summary: 'List workspace media' })
  list(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(mediaListQuerySchema)) query: z.infer<typeof mediaListQuerySchema>,
  ) {
    return this.media.list(user.id, query);
  }

  @Post('uploads/init')
  @ApiOperation({ summary: 'Create an asset and a signed upload target' })
  @ApiZodBody(initUploadSchema, 'InitUpload')
  initUpload(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(initUploadSchema)) body: z.infer<typeof initUploadSchema>,
  ) {
    return this.media.initUpload(user.id, body);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Finalize an upload and queue media probing' })
  complete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.media.completeUpload(user.id, id);
  }

  @Post(':id/probe')
  @ApiOperation({ summary: 'Retry media probing' })
  retryProbe(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.media.retryProbe(user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media metadata and a signed download URL' })
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.media.get(user.id, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Create a short-lived download URL' })
  download(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.media.download(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media asset' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.media.remove(user.id, id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
