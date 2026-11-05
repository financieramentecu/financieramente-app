-- Add immutable, additive CRM timeline events for existing leads.
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE_ADDED');

CREATE TABLE "lead_activity" (
    "id_lead_activity" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "id_business" INTEGER,
    "id_user" INTEGER NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "payload_version" INTEGER NOT NULL DEFAULT 1,
    "correlation_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_activity_pkey" PRIMARY KEY ("id_lead_activity")
);

CREATE UNIQUE INDEX "lead_activity_id_lead_correlation_id_key" ON "lead_activity"("id_lead", "correlation_id");
CREATE INDEX "lead_activity_id_lead_occurred_at_id_lead_activity_idx" ON "lead_activity"("id_lead", "occurred_at", "id_lead_activity");
CREATE INDEX "lead_activity_id_business_occurred_at_idx" ON "lead_activity"("id_business", "occurred_at");
CREATE INDEX "lead_activity_correlation_id_idx" ON "lead_activity"("correlation_id");

ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_id_business_fkey" FOREIGN KEY ("id_business") REFERENCES "business"("id_business") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
