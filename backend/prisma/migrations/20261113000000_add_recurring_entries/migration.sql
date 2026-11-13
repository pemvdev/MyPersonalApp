CREATE TYPE "RepeatFrequency" AS ENUM ('daily', 'weekly', 'monthly');

ALTER TABLE "tasks"
  ADD COLUMN "is_frequent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "repeat_frequency" "RepeatFrequency",
  ADD COLUMN "repeat_interval" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "repeat_until" DATE,
  ADD COLUMN "recurrence_source_id" UUID,
  ADD COLUMN "recurrence_date" DATE;

ALTER TABLE "financial_transactions"
  ADD COLUMN "repeat_frequency" "RepeatFrequency",
  ADD COLUMN "repeat_interval" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "repeat_until" DATE,
  ADD COLUMN "recurrence_source_id" UUID,
  ADD COLUMN "recurrence_date" DATE;

CREATE UNIQUE INDEX "tasks_recurrence_source_id_recurrence_date_key"
  ON "tasks"("recurrence_source_id", "recurrence_date");
CREATE UNIQUE INDEX "financial_transactions_recurrence_source_id_recurrence_date_key"
  ON "financial_transactions"("recurrence_source_id", "recurrence_date");
