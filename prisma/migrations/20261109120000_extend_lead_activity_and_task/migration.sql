-- CRM phase 1: logged contact events, typed tasks with reminders, and the
-- CRM-owned last activity timestamp on leads. Additive only.
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'CALL_LOGGED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'MEETING_LOGGED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'EMAIL_LOGGED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'WHATSAPP_LOGGED';

CREATE TYPE "LeadTaskType" AS ENUM ('TODO', 'CALL', 'MEETING', 'EMAIL', 'WHATSAPP');

ALTER TABLE "lead_task" ADD COLUMN "type" "LeadTaskType" NOT NULL DEFAULT 'TODO';
ALTER TABLE "lead_task" ADD COLUMN "reminder_sent_at" TIMESTAMP(3);
CREATE INDEX "lead_task_due_at_reminder_sent_at_idx" ON "lead_task"("due_at", "reminder_sent_at");

ALTER TABLE "lead" ADD COLUMN "last_activity_at" TIMESTAMP(3);
CREATE INDEX "lead_outcome_status_last_activity_at_idx" ON "lead"("outcome_status", "last_activity_at");
