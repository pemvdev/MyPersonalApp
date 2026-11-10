-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('STANDARD', 'FINANCIAL');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('Work', 'Health', 'Personal');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('income', 'food', 'housing', 'transport', 'other');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT 'Personal workspace',
    "type" "WorkspaceType" NOT NULL DEFAULT 'FINANCIAL',
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_workspaces" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,

    CONSTRAINT "financial_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "client_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "due_date" DATE NOT NULL,
    "scheduled_time" VARCHAR(5) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "category" "TaskCategory" NOT NULL DEFAULT 'Work',
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "client_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "financial_workspace_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "kind" "TransactionKind" NOT NULL,
    "occurred_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "financial_workspace_id" UUID NOT NULL,
    "kind" "TransactionKind" NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "workspace_id" UUID NOT NULL,
    "article_id" VARCHAR(32) NOT NULL,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("workspace_id","article_id")
);

-- CreateTable
CREATE TABLE "focus_sessions" (
    "client_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "completed_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_owner_id_key" ON "workspaces"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_workspaces_workspace_id_key" ON "financial_workspaces"("workspace_id");

-- CreateIndex
CREATE INDEX "tasks_workspace_id_due_date_scheduled_time_id_idx" ON "tasks"("workspace_id", "due_date", "scheduled_time", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_workspace_id_client_id_key" ON "tasks"("workspace_id", "client_id");

-- CreateIndex
CREATE INDEX "financial_transactions_financial_workspace_id_occurred_on_c_idx" ON "financial_transactions"("financial_workspace_id", "occurred_on", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_financial_workspace_id_client_id_key" ON "financial_transactions"("financial_workspace_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_financial_workspace_id_kind_key" ON "budgets"("financial_workspace_id", "kind");

-- CreateIndex
CREATE INDEX "focus_sessions_workspace_id_completed_on_idx" ON "focus_sessions"("workspace_id", "completed_on");

-- CreateIndex
CREATE UNIQUE INDEX "focus_sessions_workspace_id_client_id_key" ON "focus_sessions"("workspace_id", "client_id");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_workspaces" ADD CONSTRAINT "financial_workspaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_financial_workspace_id_fkey" FOREIGN KEY ("financial_workspace_id") REFERENCES "financial_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_financial_workspace_id_fkey" FOREIGN KEY ("financial_workspace_id") REFERENCES "financial_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "financial_workspaces" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "financial_transactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_duration_check" CHECK (duration_minutes BETWEEN 1 AND 1440);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_time_check" CHECK (scheduled_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "financial_transactions" ADD CONSTRAINT "transactions_amount_check" CHECK (amount_in_cents BETWEEN -99999999 AND 99999999 AND amount_in_cents <> 0 AND ((kind = 'income' AND amount_in_cents > 0) OR (kind <> 'income' AND amount_in_cents < 0)));
ALTER TABLE "budgets" ADD CONSTRAINT "budget_amount_check" CHECK (amount_in_cents BETWEEN 1 AND 99999999 AND kind <> 'income');
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_duration_check" CHECK (duration_seconds BETWEEN 1 AND 86400);
