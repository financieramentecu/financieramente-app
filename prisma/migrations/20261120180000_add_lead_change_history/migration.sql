-- Append-only history of Money Strategy and client-origin changes for the CRM timeline.
CREATE TYPE "LeadChangeKind" AS ENUM ('OWNER', 'ORIGIN');

CREATE TYPE "LeadChangeSource" AS ENUM ('SYSTEM', 'MANUAL');

CREATE TABLE "lead_change_history" (
    "id_lead_change_history" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "kind" "LeadChangeKind" NOT NULL,
    "source" "LeadChangeSource" NOT NULL,
    "id_actor" INTEGER,
    "actor_label" VARCHAR(200),
    "from_label" VARCHAR(200),
    "to_label" VARCHAR(200) NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_change_history_pkey" PRIMARY KEY ("id_lead_change_history")
);

CREATE INDEX "lead_change_history_id_lead_changed_at_idx" ON "lead_change_history"("id_lead", "changed_at");

ALTER TABLE "lead_change_history" ADD CONSTRAINT "lead_change_history_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lead_change_history" ADD CONSTRAINT "lead_change_history_id_actor_fkey" FOREIGN KEY ("id_actor") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
