import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { FinanceService } from '../finance/finance.service';
import { DashboardQueryDto, SetBookmarkDto } from './dto/workspace.dto';
import { WorkspaceAccessService } from './workspace-access.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly tasks: TasksService,
    private readonly finance: FinanceService,
  ) {}

  async getCurrent(userId: string, query: DashboardQueryDto) {
    const workspace = await this.access.getPersonalWorkspace(userId);
    const [day, finance, bookmarks] = await Promise.all([
      this.tasks.getDay(workspace.id, new Date(query.date), query.taskPage),
      this.finance.getSummary(
        workspace.financialId,
        new Date(query.date),
        query.transactionPage,
      ),
      this.prisma.bookmark.findMany({
        where: { workspaceId: workspace.id },
        select: { articleId: true },
        orderBy: { articleId: 'asc' },
      }),
    ]);
    const money = (cents: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(cents / 100);
    const articles = [
      {
        id: 'plan',
        category: 'Your day',
        readTime: 1,
        title: `${day.total - day.completed} tasks left in your plan`,
        summary: `You have completed ${day.completed} of ${day.total} tasks for this day. Start with one small next step and build from there.`,
      },
      {
        id: 'spending',
        category: 'Spending',
        readTime: 1,
        title: `${money(finance.expenseInCents)} spent this month`,
        summary: `Your recorded income this month is ${money(finance.incomeInCents)} and your expenses total ${money(finance.expenseInCents)}. These figures come from the transactions you have entered.`,
      },
      {
        id: 'balance',
        category: 'Finances',
        readTime: 1,
        title: `${money(finance.balanceInCents)} recorded net balance`,
        summary:
          'Your recorded net balance is the sum of all income and expense entries in your workspace. Add opening funds as an income entry if you want to include an existing account balance.',
      },
    ];
    return {
      id: workspace.id,
      name: workspace.name,
      tasks: day.tasks,
      taskTotal: day.total,
      completedTasks: day.completed,
      focusSeconds: day.focusSeconds,
      taskHasMore: day.hasMore,
      finance,
      bookmarks: bookmarks.map((bookmark) => bookmark.articleId),
      articles,
    };
  }

  async setBookmark(userId: string, dto: SetBookmarkDto) {
    const workspace = await this.access.getPersonalWorkspace(userId);
    if (dto.isSaved)
      await this.prisma.bookmark.upsert({
        where: {
          workspaceId_articleId: {
            workspaceId: workspace.id,
            articleId: dto.articleId,
          },
        },
        create: { workspaceId: workspace.id, articleId: dto.articleId },
        update: {},
      });
    else
      await this.prisma.bookmark.deleteMany({
        where: { workspaceId: workspace.id, articleId: dto.articleId },
      });
    return { success: true };
  }
}
