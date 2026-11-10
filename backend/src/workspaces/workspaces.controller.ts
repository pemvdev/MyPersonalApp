import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { TasksService } from '../tasks/tasks.service';
import { FinanceService } from '../finance/finance.service';
import { WorkspacesService } from './workspaces.service';
import {
  CreateFocusSessionDto,
  CreateTaskDto,
  CreateTransactionDto,
  DashboardQueryDto,
  SetBookmarkDto,
  SetBudgetDto,
  UpdateTransactionDto,
  UpdateTaskDto,
} from './dto/workspace.dto';

@Controller('workspaces/current')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly tasks: TasksService,
    private readonly finance: FinanceService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getCurrent(
    @Req() request: AuthenticatedRequest,
    @Query() query: DashboardQueryDto,
  ) {
    return this.workspaces.getCurrent(request.user.id, query);
  }

  @Post('tasks')
  createTask(@Req() request: AuthenticatedRequest, @Body() dto: CreateTaskDto) {
    return this.tasks.create(request.user.id, dto);
  }

  @Patch('tasks/:taskId')
  updateTask(
    @Req() request: AuthenticatedRequest,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(request.user.id, taskId, dto);
  }

  @Delete('tasks/:taskId')
  removeTask(
    @Req() request: AuthenticatedRequest,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.remove(request.user.id, taskId);
  }

  @Post('transactions')
  createTransaction(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.finance.create(request.user.id, dto);
  }

  @Patch('transactions/:transactionId')
  updateTransaction(
    @Req() request: AuthenticatedRequest,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.finance.update(request.user.id, transactionId, dto);
  }

  @Delete('transactions/:transactionId')
  removeTransaction(
    @Req() request: AuthenticatedRequest,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    return this.finance.remove(request.user.id, transactionId);
  }

  @Put('budgets')
  setBudget(@Req() request: AuthenticatedRequest, @Body() dto: SetBudgetDto) {
    return this.finance.setBudget(request.user.id, dto);
  }

  @Put('bookmarks')
  setBookmark(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SetBookmarkDto,
  ) {
    return this.workspaces.setBookmark(request.user.id, dto);
  }

  @Post('focus-sessions')
  saveFocus(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFocusSessionDto,
  ) {
    return this.tasks.saveFocus(request.user.id, dto);
  }
}
