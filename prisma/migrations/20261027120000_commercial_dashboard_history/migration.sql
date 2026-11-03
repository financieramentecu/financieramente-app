-- Aditiva: solo tabla nueva. No modifica ninguna tabla existente.
-- Historial append-only de cambios de etapa de un lead (fuente: crm-sync / GHL).

-- CreateTable
CREATE TABLE "lead_stage_event" (
    "id_lead_stage_event" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "id_user" INTEGER,
    "from_column_id" INTEGER,
    "to_column_id" INTEGER NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "source" VARCHAR(40) NOT NULL DEFAULT 'crm-sync',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_stage_event_pkey" PRIMARY KEY ("id_lead_stage_event")
);

-- CreateIndex
CREATE INDEX "lead_stage_event_id_lead_occurred_at_idx" ON "lead_stage_event"("id_lead", "occurred_at");
CREATE INDEX "lead_stage_event_occurred_at_idx" ON "lead_stage_event"("occurred_at");
CREATE INDEX "lead_stage_event_id_user_occurred_at_idx" ON "lead_stage_event"("id_user", "occurred_at");

-- AddForeignKey
ALTER TABLE "lead_stage_event" ADD CONSTRAINT "lead_stage_event_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE CASCADE ON UPDATE CASCADE;
