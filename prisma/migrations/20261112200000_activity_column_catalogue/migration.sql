-- Columns can be hidden, and the team can add custom ones.
-- A card with column_code stays in that custom column; null keeps the due-date column.
ALTER TABLE "lead_activity_column" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "lead_activity_column_active_position_idx" ON "lead_activity_column"("active", "position");

ALTER TABLE "lead_task" ADD COLUMN "column_code" VARCHAR(20);
ALTER TABLE "lead_support_case" ADD COLUMN "column_code" VARCHAR(20);

CREATE INDEX "lead_task_column_code_idx" ON "lead_task"("column_code");
CREATE INDEX "lead_support_case_column_code_idx" ON "lead_support_case"("column_code");
