const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv/config');
const { PrismaClient } = require('../dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    max: 1,
  }),
});
const rollback = new Error('ROLLBACK_TEST_DATA');

async function main() {
  try {
    await prisma.$transaction(
      async (transaction) => {
        const ownerId = randomUUID();
        const otherOwnerId = randomUUID();
        await transaction.user.createMany({
          data: [{ id: ownerId }, { id: otherOwnerId }],
        });
        const createWorkspace = (id) =>
          transaction.workspace.upsert({
            where: { ownerId: id },
            create: {
              ownerId: id,
              type: 'FINANCIAL',
              financialProfile: { create: {} },
            },
            update: {},
            include: { financialProfile: true },
          });
        const workspace = await createWorkspace(ownerId);
        const repeated = await createWorkspace(ownerId);
        const other = await createWorkspace(otherOwnerId);
        assert.equal(
          workspace.id,
          repeated.id,
          'Repeat login must reuse the same workspace',
        );
        assert.ok(
          workspace.financialProfile,
          'Financial profile must be created with its workspace',
        );
        const task = await transaction.task.create({
          data: {
            clientId: randomUUID(),
            workspaceId: workspace.id,
            title: 'Rollback-only integration task',
            dueDate: new Date('2026-11-07'),
            scheduledTime: '09:00',
            durationMinutes: 30,
            category: 'Work',
          },
        });
        const denied = await transaction.task.updateMany({
          where: { id: task.id, workspaceId: other.id },
          data: { isComplete: true },
        });
        assert.equal(
          denied.count,
          0,
          'Another workspace cannot update this task',
        );
        const financeId = workspace.financialProfile.id;
        const clientId = randomUUID();
        const data = {
          financialWorkspaceId: financeId,
          clientId,
          title: 'Rollback-only expense',
          amountInCents: -499,
          kind: 'food',
          occurredOn: new Date('2026-11-07'),
        };
        const createEntry = () =>
          transaction.financialTransaction.upsert({
            where: {
              financialWorkspaceId_clientId: {
                financialWorkspaceId: financeId,
                clientId,
              },
            },
            create: data,
            update: {},
          });
        const first = await createEntry();
        const second = await createEntry();
        assert.equal(
          first.id,
          second.id,
          'Retrying a transaction must not duplicate it',
        );
        const total = await transaction.financialTransaction.aggregate({
          where: { financialWorkspaceId: financeId },
          _sum: { amountInCents: true },
        });
        assert.equal(
          total._sum.amountInCents,
          -499,
          'Financial arithmetic must preserve integer cents',
        );
        const rls =
          await transaction.$queryRaw`SELECT bool_and(rowsecurity) AS enabled, count(*) AS total FROM pg_tables WHERE schemaname='public' AND tablename IN ('app_users','workspaces','financial_workspaces','tasks','financial_transactions','budgets','bookmarks','focus_sessions')`;
        assert.equal(
          rls[0].enabled,
          true,
          'All application tables must have row-level security enabled',
        );
        throw rollback;
      },
      { timeout: 20000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    'Live Prisma/PostgreSQL integration checks passed. All test data was rolled back.',
  );
}
main()
  .catch((error) => {
    console.error('Database integration check failed:', error.name);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
