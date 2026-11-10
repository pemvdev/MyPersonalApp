import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TasksService } from '../tasks/tasks.service';
import { FinanceService } from '../finance/finance.service';
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [
    WorkspaceAccessService,
    TasksService,
    FinanceService,
    WorkspacesService,
  ],
  controllers: [WorkspacesController],
})
export class WorkspacesModule {}
