-- Pivot between a CRM lead and the existing client_origin catalogue.
-- Additive. client_origin stays the origin list used by businesses.

CREATE TABLE "lead_client_origin" (
    "id_lead_client_origin" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "id_client_origin" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_client_origin_pkey" PRIMARY KEY ("id_lead_client_origin")
);

CREATE INDEX "lead_client_origin_id_client_origin_active_idx" ON "lead_client_origin"("id_client_origin", "active");

CREATE UNIQUE INDEX "lead_client_origin_id_lead_id_client_origin_key" ON "lead_client_origin"("id_lead", "id_client_origin");

ALTER TABLE "lead_client_origin" ADD CONSTRAINT "lead_client_origin_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lead_client_origin" ADD CONSTRAINT "lead_client_origin_id_client_origin_fkey" FOREIGN KEY ("id_client_origin") REFERENCES "client_origin"("id_client_origin") ON DELETE RESTRICT ON UPDATE CASCADE;
