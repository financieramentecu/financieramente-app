-- Lead acquisition origins. Catalogue keyed by normalized utm_source,
-- plus the pivot that labels each CRM lead with the origins it arrived from.
-- Additive only. Distinct from client_origin (business origin).

-- CreateTable
CREATE TABLE "lead_origin" (
    "id_lead_origin" SERIAL NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_origin_pkey" PRIMARY KEY ("id_lead_origin")
);

-- CreateTable
CREATE TABLE "lead_origin_assignment" (
    "id_lead_origin_assignment" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "id_lead_origin" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_origin_assignment_pkey" PRIMARY KEY ("id_lead_origin_assignment")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_origin_code_key" ON "lead_origin"("code");

-- CreateIndex
CREATE INDEX "lead_origin_status_idx" ON "lead_origin"("status");

-- CreateIndex
CREATE INDEX "lead_origin_assignment_id_lead_origin_active_idx" ON "lead_origin_assignment"("id_lead_origin", "active");

-- CreateIndex
CREATE UNIQUE INDEX "lead_origin_assignment_id_lead_id_lead_origin_key" ON "lead_origin_assignment"("id_lead", "id_lead_origin");

-- AddForeignKey
ALTER TABLE "lead_origin_assignment" ADD CONSTRAINT "lead_origin_assignment_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_origin_assignment" ADD CONSTRAINT "lead_origin_assignment_id_lead_origin_fkey" FOREIGN KEY ("id_lead_origin") REFERENCES "lead_origin"("id_lead_origin") ON DELETE RESTRICT ON UPDATE CASCADE;
