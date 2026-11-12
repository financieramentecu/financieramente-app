-- Additive CRM support cases for existing leads. Business references are read-only context only.
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'CASE_OPENED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'CASE_UPDATED';
CREATE TYPE "LeadSupportCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED');
CREATE TYPE "LeadSupportCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "lead_support_case" (
  "id_lead_support_case" SERIAL NOT NULL,
  "id_lead" INTEGER NOT NULL,
  "id_business" INTEGER,
  "opened_by" INTEGER NOT NULL,
  "assigned_to" INTEGER,
  "subject" VARCHAR(240) NOT NULL,
  "status" "LeadSupportCaseStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "LeadSupportCasePriority" NOT NULL DEFAULT 'MEDIUM',
  "due_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lead_support_case_pkey" PRIMARY KEY ("id_lead_support_case")
);
CREATE TABLE "lead_support_case_comment" (
  "id_lead_support_case_comment" SERIAL NOT NULL,
  "id_lead_support_case" INTEGER NOT NULL,
  "author_id" INTEGER NOT NULL,
  "body" VARCHAR(2000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_support_case_comment_pkey" PRIMARY KEY ("id_lead_support_case_comment")
);
CREATE INDEX "lead_support_case_id_lead_status_idx" ON "lead_support_case"("id_lead", "status");
CREATE INDEX "lead_support_case_id_business_status_idx" ON "lead_support_case"("id_business", "status");
CREATE INDEX "lead_support_case_assigned_to_status_due_at_idx" ON "lead_support_case"("assigned_to", "status", "due_at");
CREATE INDEX "lead_support_case_comment_id_lead_support_case_created_at_idx" ON "lead_support_case_comment"("id_lead_support_case", "created_at");
ALTER TABLE "lead_support_case" ADD CONSTRAINT "lead_support_case_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_support_case" ADD CONSTRAINT "lead_support_case_id_business_fkey" FOREIGN KEY ("id_business") REFERENCES "business"("id_business") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_support_case" ADD CONSTRAINT "lead_support_case_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_support_case" ADD CONSTRAINT "lead_support_case_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_support_case_comment" ADD CONSTRAINT "lead_support_case_comment_id_case_fkey" FOREIGN KEY ("id_lead_support_case") REFERENCES "lead_support_case"("id_lead_support_case") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_support_case_comment" ADD CONSTRAINT "lead_support_case_comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
