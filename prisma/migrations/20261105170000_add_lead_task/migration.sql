-- Add follow-up tasks for existing leads without changing lead/business semantics.
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'TASK_CREATED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'TASK_COMPLETED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'TASK_REASSIGNED';

CREATE TYPE "LeadTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

CREATE TABLE "lead_task" (
  "id_lead_task" SERIAL NOT NULL,
  "id_lead" INTEGER NOT NULL,
  "id_business" INTEGER,
  "assigned_to" INTEGER NOT NULL,
  "created_by" INTEGER NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "due_at" TIMESTAMP(3),
  "status" "LeadTaskStatus" NOT NULL DEFAULT 'OPEN',
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lead_task_pkey" PRIMARY KEY ("id_lead_task")
);

CREATE INDEX "lead_task_assigned_to_status_due_at_idx" ON "lead_task"("assigned_to", "status", "due_at");
CREATE INDEX "lead_task_id_lead_status_idx" ON "lead_task"("id_lead", "status");
ALTER TABLE "lead_task" ADD CONSTRAINT "lead_task_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_task" ADD CONSTRAINT "lead_task_id_business_fkey" FOREIGN KEY ("id_business") REFERENCES "business"("id_business") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_task" ADD CONSTRAINT "lead_task_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_task" ADD CONSTRAINT "lead_task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
