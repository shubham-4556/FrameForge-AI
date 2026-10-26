import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EnvModule } from './config/env.module';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';
import { QueuesModule } from './queues/queues.module';
import { BillingModule } from './billing/billing.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { MediaModule } from './media/media.module';
import { AiModule } from './ai/ai.module';
import { RenderModule } from './render/render.module';
import { HealthModule } from './health/health.module';
import { SessionAuthGuard } from './common/session-auth.guard';
import { CsrfGuard } from './common/csrf.guard';
import { RateLimitGuard } from './common/rate-limit.guard';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { ApiResponseInterceptor } from './common/api-response.interceptor';

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    RedisModule,
    MailModule,
    AuditModule,
    StorageModule,
    QueuesModule,
    BillingModule,
    WorkspacesModule,
    AuthModule,
    ProjectsModule,
    MediaModule,
    AiModule,
    RenderModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule {}
