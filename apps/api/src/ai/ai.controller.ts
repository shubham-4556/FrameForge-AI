import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { aiGenerationListQuerySchema, createAiGenerationSchema } from '@frameforge/shared';
import { CurrentUser, type RequestWithAuth } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiZodBody } from '../common/api-zod.decorator';
import { AiService } from './ai.service';

@ApiTags('AI')
@Controller('ai/generations')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get()
  @ApiOperation({ summary: 'List AI generation jobs' })
  list(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(aiGenerationListQuerySchema))
    query: z.infer<typeof aiGenerationListQuerySchema>,
  ) {
    return this.ai.list(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Queue an AI generation' })
  @ApiZodBody(createAiGenerationSchema, 'CreateAiGeneration')
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createAiGenerationSchema))
    body: z.infer<typeof createAiGenerationSchema>,
    @Req() req: RequestWithAuth,
  ) {
    return this.ai.create(user.id, body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an AI generation job' })
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ai.get(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a queued or running generation' })
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ai.cancel(user.id, id);
  }
}
