import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { AccessService } from './access.service';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, AccessService],
  exports: [AccessService, WorkspacesService],
})
export class WorkspacesModule {}
