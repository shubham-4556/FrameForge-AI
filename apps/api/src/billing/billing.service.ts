import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import type { Plan } from '@frameforge/db';
import type { ServerEnv } from '@frameforge/shared/server';
import { ENV } from '../config/env.module';
import { PrismaService } from '../database/prisma.service';
import { AccessService } from '../workspaces/access.service';
import { UsageService } from './usage.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger('Billing');
  private readonly stripe: Stripe | null;

  constructor(
    @Inject(ENV) private readonly env: ServerEnv,
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly usage: UsageService,
    private readonly audit: AuditService,
  ) {
    this.stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
  }

  private priceFor(plan: 'PRO' | 'STUDIO'): string {
    const price = plan === 'PRO' ? this.env.STRIPE_PRICE_PRO : this.env.STRIPE_PRICE_STUDIO;
    if (!price) {
      throw new ServiceUnavailableException({
        code: 'BILLING_NOT_CONFIGURED',
        message: `Billing is not configured for the ${plan} plan. Set STRIPE_PRICE_${plan}.`,
      });
    }
    return price;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException({
        code: 'BILLING_NOT_CONFIGURED',
        message: 'Billing is not configured on this deployment. Set STRIPE_SECRET_KEY to enable upgrades.',
      });
    }
    return this.stripe;
  }

  async overview(userId: string, workspaceId: string) {
    const access = await this.access.requireWorkspace(userId, workspaceId);
    const summary = await this.usage.getSummary(workspaceId);
    return {
      ...summary,
      role: access.role,
      canManage: access.role === 'OWNER' || access.role === 'ADMIN',
      billingConfigured: Boolean(
        this.env.STRIPE_SECRET_KEY && this.env.STRIPE_PRICE_PRO && this.env.STRIPE_PRICE_STUDIO,
      ),
      plans: this.usage.plans(),
    };
  }

  async createCheckout(userId: string, workspaceId: string, plan: 'PRO' | 'STUDIO', meta: { ip?: string; userAgent?: string }) {
    await this.access.requireWorkspace(userId, workspaceId, 'ADMIN');
    const stripe = this.requireStripe();
    const price = this.priceFor(plan);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true },
    });
    if (!workspace) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Workspace not found' });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${this.env.APP_URL}/settings?billing=success&workspace=${workspaceId}`,
      cancel_url: `${this.env.APP_URL}/settings?billing=canceled&workspace=${workspaceId}`,
      client_reference_id: workspaceId,
      ...(workspace.subscription?.externalCustomerId
        ? { customer: workspace.subscription.externalCustomerId }
        : user?.email
          ? { customer_email: user.email }
          : {}),
      metadata: { workspaceId, plan },
      subscription_data: { metadata: { workspaceId, plan } },
      allow_promotion_codes: true,
    });

    await this.audit.record({
      workspaceId,
      actorId: userId,
      action: 'billing.checkout_started',
      targetType: 'workspace',
      targetId: workspaceId,
      metadata: { plan },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { url: session.url };
  }

  async createPortal(userId: string, workspaceId: string) {
    await this.access.requireWorkspace(userId, workspaceId, 'ADMIN');
    const stripe = this.requireStripe();
    const subscription = await this.prisma.subscription.findUnique({ where: { workspaceId } });
    if (!subscription?.externalCustomerId) {
      throw new BadRequestException({
        code: 'NO_SUBSCRIPTION',
        message: 'This workspace has no paid subscription yet.',
      });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.externalCustomerId,
      return_url: `${this.env.APP_URL}/settings?workspace=${workspaceId}`,
    });
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<{ received: boolean }> {
    const stripe = this.requireStripe();
    if (!this.env.STRIPE_WEBHOOK_SECRET) {
      throw new ServiceUnavailableException({ code: 'BILLING_NOT_CONFIGURED', message: 'Webhook secret missing' });
    }
    if (!signature) {
      throw new BadRequestException({ code: 'INVALID_SIGNATURE', message: 'Missing Stripe signature' });
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, this.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      throw new BadRequestException({
        code: 'INVALID_SIGNATURE',
        message: `Webhook signature verification failed: ${(error as Error).message}`,
      });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id;
        const plan = (session.metadata?.plan ?? 'PRO') as Plan;
        if (workspaceId) {
          await this.prisma.$transaction([
            this.prisma.workspace.update({ where: { id: workspaceId }, data: { plan } }),
            this.prisma.subscription.upsert({
              where: { workspaceId },
              create: {
                workspaceId,
                plan,
                status: 'active',
                provider: 'stripe',
                externalCustomerId:
                  typeof session.customer === 'string' ? session.customer : session.customer?.id,
                externalSubscriptionId:
                  typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
              },
              update: {
                plan,
                status: 'active',
                provider: 'stripe',
                externalCustomerId:
                  typeof session.customer === 'string' ? session.customer : session.customer?.id,
                externalSubscriptionId:
                  typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
              },
            }),
          ]);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as unknown as {
          id: string;
          status: string;
          cancel_at_period_end: boolean;
          current_period_end?: number;
          items: { data: Array<{ price: { id: string } }> };
        };
        const record = await this.prisma.subscription.findFirst({
          where: { externalSubscriptionId: subscription.id },
        });
        if (record) {
          const priceId = subscription.items.data[0]?.price.id;
          const plan: Plan =
            priceId && priceId === this.env.STRIPE_PRICE_STUDIO
              ? 'STUDIO'
              : priceId && priceId === this.env.STRIPE_PRICE_PRO
                ? 'PRO'
                : event.type === 'customer.subscription.deleted'
                  ? 'FREE'
                  : record.plan;
          const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status;
          await this.prisma.$transaction([
            this.prisma.workspace.update({ where: { id: record.workspaceId }, data: { plan } }),
            this.prisma.subscription.update({
              where: { id: record.id },
              data: {
                plan,
                status,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                currentPeriodEnd: subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000)
                  : null,
              },
            }),
          ]);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await this.prisma.subscription.updateMany({
            where: { externalCustomerId: customerId },
            data: { status: 'past_due' },
          });
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event ${event.type}`);
    }

    return { received: true };
  }
}
