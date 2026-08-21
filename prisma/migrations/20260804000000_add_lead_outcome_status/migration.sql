-- CreateEnum
CREATE TYPE "LeadOutcomeStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'ABANDONED');

-- AlterTable
ALTER TABLE "lead" ADD COLUMN "outcome_status" "LeadOutcomeStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "lead_outcome_status_created_at_idx" ON "lead"("outcome_status", "created_at");
