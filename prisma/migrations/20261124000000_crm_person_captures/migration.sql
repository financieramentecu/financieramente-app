CREATE TABLE "lead_capture" (
  "id_lead_capture" SERIAL PRIMARY KEY,
  "name" VARCHAR(120) NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 0 CHECK ("level" >= 0),
  "status" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "lead_capture_name_key" ON "lead_capture"("name");
ALTER TABLE "lead" ADD COLUMN "id_lead_capture" INTEGER, ADD COLUMN "referrer_name" VARCHAR(200);
CREATE INDEX "lead_id_lead_capture_idx" ON "lead"("id_lead_capture");
ALTER TABLE "lead" ADD CONSTRAINT "lead_id_lead_capture_fkey" FOREIGN KEY ("id_lead_capture") REFERENCES "lead_capture"("id_lead_capture") ON DELETE RESTRICT ON UPDATE CASCADE;
