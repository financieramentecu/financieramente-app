-- CreateEnum
CREATE TYPE "LeadStageChangeSource" AS ENUM ('CRM_SYNC', 'CSV_IMPORT', 'MANUAL');

-- CreateTable
CREATE TABLE "lead_stage_history" (
    "id_lead_stage_history" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "from_id_lead_funnel_column" INTEGER,
    "to_id_lead_funnel_column" INTEGER NOT NULL,
    "source" "LeadStageChangeSource" NOT NULL,
    "id_user" INTEGER,
    "changed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_stage_history_pkey" PRIMARY KEY ("id_lead_stage_history")
);

-- CreateIndex
CREATE INDEX "lead_stage_history_id_lead_changed_at_idx" ON "lead_stage_history"("id_lead", "changed_at");

-- CreateIndex
CREATE INDEX "lead_stage_history_to_id_lead_funnel_column_changed_at_idx" ON "lead_stage_history"("to_id_lead_funnel_column", "changed_at");

-- AddForeignKey
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_from_id_lead_funnel_column_fkey" FOREIGN KEY ("from_id_lead_funnel_column") REFERENCES "lead_funnel_column"("id_lead_funnel_column") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_to_id_lead_funnel_column_fkey" FOREIGN KEY ("to_id_lead_funnel_column") REFERENCES "lead_funnel_column"("id_lead_funnel_column") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

