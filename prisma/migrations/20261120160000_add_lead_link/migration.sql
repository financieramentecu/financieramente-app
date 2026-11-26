-- Same person, later origin: a second lead linked to the first.
-- Additive. Rows are deactivated, never deleted.

CREATE TYPE "LeadLinkSource" AS ENUM ('AUTO', 'MANUAL');

CREATE TABLE "lead_link" (
    "id_lead_link" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "id_related_lead" INTEGER NOT NULL,
    "id_client_origin" INTEGER,
    "source" "LeadLinkSource" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "linked_at" TIMESTAMP(3) NOT NULL,
    "linked_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_link_pkey" PRIMARY KEY ("id_lead_link"),
    CONSTRAINT "lead_link_distinct_leads_chk" CHECK ("id_lead" <> "id_related_lead")
);

CREATE INDEX "lead_link_id_related_lead_active_idx" ON "lead_link"("id_related_lead", "active");

CREATE UNIQUE INDEX "lead_link_id_lead_id_related_lead_key" ON "lead_link"("id_lead", "id_related_lead");

ALTER TABLE "lead_link" ADD CONSTRAINT "lead_link_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lead_link" ADD CONSTRAINT "lead_link_id_related_lead_fkey" FOREIGN KEY ("id_related_lead") REFERENCES "lead"("id_lead") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lead_link" ADD CONSTRAINT "lead_link_id_client_origin_fkey" FOREIGN KEY ("id_client_origin") REFERENCES "client_origin"("id_client_origin") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lead_link" ADD CONSTRAINT "lead_link_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
