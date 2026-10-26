import { Global, Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Global()
@Module({
  imports: [WorkspacesModule],
  controllers: [BillingController],
  providers: [BillingService, UsageService],
  exports: [UsageService, BillingService],
})
export class BillingModule {}
