-- AlterEnum
ALTER TYPE "LeadStageChangeSource" ADD VALUE 'LANDING_FORM';

-- CreateTable
CREATE TABLE "lead_form_submission" (
    "id_lead_form_submission" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "submission_id" VARCHAR(150) NOT NULL,
    "landing_key" VARCHAR(80) NOT NULL,
    "landing_name" VARCHAR(120) NOT NULL,
    "form_version" VARCHAR(40) NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "fields" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_form_submission_pkey" PRIMARY KEY ("id_lead_form_submission")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_form_submission_submission_id_key" ON "lead_form_submission"("submission_id");

-- CreateIndex
CREATE INDEX "lead_form_submission_id_lead_submitted_at_idx" ON "lead_form_submission"("id_lead", "submitted_at");

-- AddForeignKey
ALTER TABLE "lead_form_submission" ADD CONSTRAINT "lead_form_submission_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE RESTRICT ON UPDATE CASCADE;
