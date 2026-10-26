import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurrentUser, Public, SkipCsrf, type RequestWithAuth } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiZodBody } from '../common/api-zod.decorator';
import { BillingService } from './billing.service';

const checkoutSchema = z.object({ plan: z.enum(['PRO', 'STUDIO']) });

@ApiTags('Billing')
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('workspaces/:id/billing')
  @ApiOperation({ summary: 'Plan, usage and subscription state' })
  overview(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.billing.overview(user.id, id);
  }

  @Post('workspaces/:id/billing/checkout')
  @ApiOperation({ summary: 'Create a Stripe Checkout session (admin)' })
  @ApiZodBody(checkoutSchema, 'BillingCheckout')
  checkout(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(checkoutSchema)) body: { plan: 'PRO' | 'STUDIO' },
    @Req() req: RequestWithAuth,
  ) {
    return this.billing.createCheckout(user.id, id, body.plan, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('workspaces/:id/billing/portal')
  @ApiOperation({ summary: 'Create a Stripe billing portal session (admin)' })
  portal(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.billing.createPortal(user.id, id);
  }

  @Public()
  @SkipCsrf()
  @Post('billing/webhook')
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  webhook(@Req() req: FastifyRequest & { rawBody?: Buffer }) {
    const signature = req.headers['stripe-signature'];
    const raw = req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {})));
    return this.billing.handleWebhook(raw, typeof signature === 'string' ? signature : undefined);
  }
}
