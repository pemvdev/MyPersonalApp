import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateTaskDto,
  CreateTransactionDto,
  DashboardQueryDto,
  SetBudgetDto,
  UpdateTransactionDto,
} from './workspace.dto';
const base = {
  clientId: 'd4e783a7-3443-4bda-9136-b814cb257cc1',
  title: 'Coffee',
  date: '2026-11-07',
};
describe('Workspace input validation', () => {
  it.each([0, 1.5, 100000000])(
    'rejects invalid integer cent amount %s',
    async (amount) => {
      const errors = await validate(
        plainToInstance(CreateTransactionDto, {
          ...base,
          kind: 'food',
          amountInCents: amount,
        }),
      );
      expect(errors.length).toBeGreaterThan(0);
    },
  );
  it('rejects dates that do not exist', async () => {
    const errors = await validate(
      plainToInstance(DashboardQueryDto, { date: '2026-02-30' }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
  it('accepts a valid transaction update without a client id', async () => {
    const errors = await validate(
      plainToInstance(UpdateTransactionDto, {
        title: 'Coffee',
        date: '2026-11-07',
        kind: 'food',
        amountInCents: -499,
      }),
    );
    expect(errors).toHaveLength(0);
  });
  it('rejects invalid task categories, times, and whitespace titles', async () => {
    const errors = await validate(
      plainToInstance(CreateTaskDto, {
        ...base,
        title: '   ',
        time: '25:00',
        category: 'ADMIN',
        durationMinutes: 0,
      }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['title', 'time', 'category', 'durationMinutes']),
    );
  });
  it('does not allow budgets for income', async () => {
    const errors = await validate(
      plainToInstance(SetBudgetDto, { kind: 'income', amountInCents: 100 }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
  it('rejects ownership fields supplied by clients', async () => {
    const errors = await validate(
      plainToInstance(CreateTransactionDto, {
        ...base,
        kind: 'food',
        amountInCents: -499,
        ownerId: 'someone-else',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.some((error) => error.property === 'ownerId')).toBe(true);
  });
});
