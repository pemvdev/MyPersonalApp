import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';

describe('FinanceService', () => {
  const getPersonalWorkspace = jest.fn();
  const upsert = jest.fn();
  const updateMany = jest.fn();
  const deleteMany = jest.fn();
  const aggregate = jest.fn();
  const groupBy = jest.fn();
  const findMany = jest.fn();
  const count = jest.fn();
  const budgetFindMany = jest.fn();
  let service: FinanceService;
  beforeEach(async () => {
    jest.resetAllMocks();
    getPersonalWorkspace.mockResolvedValue({
      id: 'workspace',
      financialId: 'my-finance',
    });
    aggregate.mockResolvedValue({ _sum: { amountInCents: 10001 } });
    groupBy.mockResolvedValue([]);
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    budgetFindMany.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: WorkspaceAccessService, useValue: { getPersonalWorkspace } },
        {
          provide: PrismaService,
          useValue: {
            financialTransaction: {
              upsert,
              updateMany,
              deleteMany,
              aggregate,
              groupBy,
              findMany,
              count,
            },
            budget: { findMany: budgetFindMany },
          },
        },
      ],
    }).compile();
    service = module.get(FinanceService);
  });
  it.each([
    { kind: 'income' as const, amountInCents: -100 },
    { kind: 'food' as const, amountInCents: 100 },
  ])('rejects an inconsistent transaction sign: %j', async (input) => {
    await expect(
      service.create('user', {
        ...input,
        title: 'Invalid',
        date: '2026-11-07',
        clientId: 'request',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
  it('keeps cent precision and derives the financial workspace from access', async () => {
    await service.create('user', {
      kind: 'food',
      amountInCents: -499,
      title: 'Coffee',
      date: '2026-11-07',
      clientId: 'request',
    });
    expect(getPersonalWorkspace).toHaveBeenCalledWith('user');
    expect(upsert.mock.calls[0]).toMatchObject([
      {
        where: {
          financialWorkspaceId_clientId: {
            financialWorkspaceId: 'my-finance',
            clientId: 'request',
          },
        },
        create: { amountInCents: -499, financialWorkspaceId: 'my-finance' },
      },
    ]);
  });
  it('updates only transactions in the caller’s financial workspace', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await expect(
      service.update('user', 'transaction-id', {
        title: 'Lunch',
        date: '2026-11-08',
        amountInCents: -1200,
        kind: 'food',
      }),
    ).resolves.toEqual({ success: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'transaction-id',
        financialWorkspaceId: 'my-finance',
      },
      data: {
        title: 'Lunch',
        amountInCents: -1200,
        kind: 'food',
        occurredOn: new Date('2026-11-08'),
      },
    });
  });
  it('does not update another workspace’s transaction', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.update('user', 'other-transaction', {
        title: 'Lunch',
        date: '2026-11-08',
        amountInCents: -1200,
        kind: 'food',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'other-transaction',
          financialWorkspaceId: 'my-finance',
        },
      }),
    );
  });
  it('enforces the income and expense sign rule when updating', async () => {
    await expect(
      service.update('user', 'transaction-id', {
        title: 'Invalid',
        date: '2026-11-08',
        amountInCents: -1200,
        kind: 'income',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });
  it('deletes only transactions in the caller’s financial workspace', async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    await expect(service.remove('user', 'transaction-id')).resolves.toEqual({
      success: true,
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'transaction-id',
        financialWorkspaceId: 'my-finance',
      },
    });
  });
  it('returns not found when deleting another workspace’s transaction', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('user', 'other-transaction')).rejects.toThrow(
      NotFoundException,
    );
  });
  it('computes six months and categories from full scoped records, independently of list pagination', async () => {
    groupBy.mockResolvedValue([
      {
        occurredOn: new Date('2026-11-01'),
        kind: 'income',
        _sum: { amountInCents: 10001 },
      },
      {
        occurredOn: new Date('2026-11-02'),
        kind: 'food',
        _sum: { amountInCents: -499 },
      },
      {
        occurredOn: new Date('2026-10-02'),
        kind: 'food',
        _sum: { amountInCents: -123 },
      },
    ]);
    budgetFindMany.mockResolvedValue([{ kind: 'food', amountInCents: 10000 }]);
    const result = await service.getSummary(
      'my-finance',
      new Date('2026-11-07'),
      2,
    );
    expect(result.months).toHaveLength(6);
    expect(result.incomeInCents).toBe(10001);
    expect(result.expenseInCents).toBe(499);
    expect(
      result.categories.find((category) => category.kind === 'food'),
    ).toEqual({
      kind: 'food',
      label: 'Food',
      spentInCents: 499,
      budgetInCents: 10000,
    });
    expect(findMany.mock.calls[0]).toMatchObject([
      { skip: 50, take: 50, where: { financialWorkspaceId: 'my-finance' } },
    ]);
    expect(aggregate).toHaveBeenCalledWith({
      where: { financialWorkspaceId: 'my-finance' },
      _sum: { amountInCents: true },
    });
  });
  it('returns zero amounts for an empty account', async () => {
    aggregate.mockResolvedValue({ _sum: { amountInCents: null } });
    const result = await service.getSummary(
      'my-finance',
      new Date('2026-11-07'),
      1,
    );
    expect(result.balanceInCents).toBe(0);
    expect(result.expenseInCents).toBe(0);
    expect(result.incomeInCents).toBe(0);
    expect(
      result.categories.every(
        (category) =>
          category.spentInCents === 0 && category.budgetInCents === null,
      ),
    ).toBe(true);
  });
});
