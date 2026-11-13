import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { occurrenceDates, recurrenceClientId } from '../tasks/recurrence';
import {
  CreateTransactionDto,
  SetBudgetDto,
  UpdateTransactionDto,
} from '../workspaces/dto/workspace.dto';

const categoryLabels = {
  income: 'Income',
  food: 'Food',
  housing: 'Housing',
  transport: 'Transport',
  other: 'Other',
};

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    this.validateAmountSign(dto);
    const workspace = await this.access.getPersonalWorkspace(userId);
    return this.prisma.financialTransaction.upsert({
      where: {
        financialWorkspaceId_clientId: {
          financialWorkspaceId: workspace.financialId,
          clientId: dto.clientId,
        },
      },
      update: {},
      create: {
        financialWorkspaceId: workspace.financialId,
        clientId: dto.clientId,
        title: dto.title,
        amountInCents: dto.amountInCents,
        kind: dto.kind,
        occurredOn: new Date(dto.date),
        repeatFrequency: dto.repeatFrequency,
        repeatInterval: dto.repeatFrequency ? (dto.repeatInterval ?? 1) : 1,
        repeatUntil: dto.repeatUntil ? new Date(dto.repeatUntil) : null,
      },
      select: { id: true },
    });
  }

  async update(
    userId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ) {
    this.validateAmountSign(dto);
    const workspace = await this.access.getPersonalWorkspace(userId);
    const result = await this.prisma.financialTransaction.updateMany({
      where: {
        id: transactionId,
        financialWorkspaceId: workspace.financialId,
      },
      data: {
        title: dto.title,
        amountInCents: dto.amountInCents,
        kind: dto.kind,
        occurredOn: new Date(dto.date),
      },
    });
    if (result.count === 0)
      throw new NotFoundException('Transaction not found');
    return { success: true };
  }

  async remove(userId: string, transactionId: string) {
    const workspace = await this.access.getPersonalWorkspace(userId);
    const result = await this.prisma.financialTransaction.deleteMany({
      where: {
        id: transactionId,
        financialWorkspaceId: workspace.financialId,
      },
    });
    if (result.count === 0)
      throw new NotFoundException('Transaction not found');
    return { success: true };
  }

  private validateAmountSign(dto: {
    kind: CreateTransactionDto['kind'] | UpdateTransactionDto['kind'];
    amountInCents: number;
  }) {
    if ((dto.kind === 'income') !== dto.amountInCents > 0)
      throw new BadRequestException(
        'Income must be positive and expenses must be negative',
      );
  }

  async setBudget(userId: string, dto: SetBudgetDto) {
    const workspace = await this.access.getPersonalWorkspace(userId);
    return this.prisma.budget.upsert({
      where: {
        financialWorkspaceId_kind: {
          financialWorkspaceId: workspace.financialId,
          kind: dto.kind,
        },
      },
      create: { financialWorkspaceId: workspace.financialId, ...dto },
      update: { amountInCents: dto.amountInCents },
      select: { id: true },
    });
  }

  async getSummary(financialId: string, date: Date, page: number) {
    const financialWorkspaceId = financialId;
    const monthStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    );
    const nextMonth = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    );
    await this.materializeRecurring(financialId, nextMonth);
    const rangeStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 5, 1),
    );
    const monthFilter = {
      financialWorkspaceId,
      occurredOn: { gte: monthStart, lt: nextMonth },
    };
    const [balance, grouped, transactions, total, budgets] = await Promise.all([
      this.prisma.financialTransaction.aggregate({
        where: { financialWorkspaceId },
        _sum: { amountInCents: true },
      }),
      this.prisma.financialTransaction.groupBy({
        by: ['occurredOn', 'kind'],
        where: {
          financialWorkspaceId,
          occurredOn: { gte: rangeStart, lt: nextMonth },
        },
        _sum: { amountInCents: true },
      }),
      this.prisma.financialTransaction.findMany({
        where: monthFilter,
        select: {
          id: true,
          title: true,
          amountInCents: true,
          kind: true,
          occurredOn: true,
        },
        orderBy: [
          { occurredOn: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip: (page - 1) * 50,
        take: 50,
      }),
      this.prisma.financialTransaction.count({ where: monthFilter }),
      this.prisma.budget.findMany({
        where: { financialWorkspaceId },
        select: { kind: true, amountInCents: true },
        orderBy: { kind: 'asc' },
      }),
    ]);
    const months = Array.from({ length: 6 }, (_, index) => {
      const start = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 5 + index, 1),
      );
      return {
        key: start.toISOString().slice(0, 7),
        label: new Intl.DateTimeFormat('en-US', {
          month: 'short',
          timeZone: 'UTC',
        }).format(start),
        incomeInCents: 0,
        expenseInCents: 0,
      };
    });
    const spending = { housing: 0, food: 0, transport: 0, other: 0 };
    for (const group of grouped) {
      const key = group.occurredOn.toISOString().slice(0, 7);
      const month = months.find((item) => item.key === key);
      const amount = group._sum.amountInCents ?? 0;
      if (month) {
        if (amount > 0) month.incomeInCents += amount;
        else month.expenseInCents -= amount;
      }
      if (key === date.toISOString().slice(0, 7) && group.kind !== 'income')
        spending[group.kind] -= amount;
    }
    const current = months[5];
    return {
      balanceInCents: balance._sum.amountInCents ?? 0,
      incomeInCents: current.incomeInCents,
      expenseInCents: current.expenseInCents,
      months,
      categories: (['housing', 'food', 'transport', 'other'] as const).map(
        (kind) => ({
          kind,
          label: categoryLabels[kind],
          spentInCents: spending[kind],
          budgetInCents:
            budgets.find((budget) => budget.kind === kind)?.amountInCents ??
            null,
        }),
      ),
      transactions: transactions.map(({ occurredOn, ...transaction }) => ({
        ...transaction,
        date: occurredOn.toISOString().slice(0, 10),
        category: categoryLabels[transaction.kind],
      })),
      hasMore: page * 50 < total,
    };
  }

  private async materializeRecurring(financialWorkspaceId: string, through: Date) {
    const rules = await this.prisma.financialTransaction.findMany({
      where: {
        financialWorkspaceId,
        repeatFrequency: { not: null },
        occurredOn: { lt: through },
      },
    });
    for (const rule of rules) {
      for (const occurredOn of occurrenceDates(
        rule.occurredOn,
        rule.repeatFrequency!,
        rule.repeatInterval,
        rule.repeatUntil,
        new Date(through.getTime() - 86400000),
      )) {
        await this.prisma.financialTransaction.upsert({
          where: {
            recurrenceSourceId_recurrenceDate: {
              recurrenceSourceId: rule.id,
              recurrenceDate: occurredOn,
            },
          },
          update: {},
          create: {
            financialWorkspaceId,
            clientId: recurrenceClientId(),
            title: rule.title,
            amountInCents: rule.amountInCents,
            kind: rule.kind,
            occurredOn,
            recurrenceSourceId: rule.id,
            recurrenceDate: occurredOn,
          },
        });
      }
    }
  }
}
