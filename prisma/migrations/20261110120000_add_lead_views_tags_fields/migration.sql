-- CRM phase 2: CRM-owned value/probability/custom fields on leads, tag
-- catalogue and assignments, custom field definitions and saved views. Additive only.
-- CreateEnum
CREATE TYPE "LeadCustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT');

-- AlterTable
ALTER TABLE "lead" ADD COLUMN     "custom_field_values" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "estimated_value" DECIMAL(15,2),
ADD COLUMN     "probability" INTEGER;

-- CreateTable
CREATE TABLE "lead_tag" (
    "id_lead_tag" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#64748b',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_tag_pkey" PRIMARY KEY ("id_lead_tag")
);

-- CreateTable
CREATE TABLE "lead_tag_assignment" (
    "id_lead_tag_assignment" SERIAL NOT NULL,
    "id_lead" INTEGER NOT NULL,
    "id_lead_tag" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_tag_assignment_pkey" PRIMARY KEY ("id_lead_tag_assignment")
);

-- CreateTable
CREATE TABLE "lead_custom_field" (
    "id_lead_custom_field" SERIAL NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "type" "LeadCustomFieldType" NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_custom_field_pkey" PRIMARY KEY ("id_lead_custom_field")
);

-- CreateTable
CREATE TABLE "lead_saved_view" (
    "id_lead_saved_view" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "query" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_saved_view_pkey" PRIMARY KEY ("id_lead_saved_view")
);

-- CreateIndex
CREATE INDEX "lead_tag_active_idx" ON "lead_tag"("active");

-- CreateIndex
CREATE INDEX "lead_tag_assignment_id_lead_tag_active_idx" ON "lead_tag_assignment"("id_lead_tag", "active");

-- CreateIndex
CREATE UNIQUE INDEX "lead_tag_assignment_id_lead_id_lead_tag_key" ON "lead_tag_assignment"("id_lead", "id_lead_tag");

-- CreateIndex
CREATE UNIQUE INDEX "lead_custom_field_key_key" ON "lead_custom_field"("key");

-- CreateIndex
CREATE INDEX "lead_custom_field_active_position_idx" ON "lead_custom_field"("active", "position");

-- CreateIndex
CREATE INDEX "lead_saved_view_id_user_active_idx" ON "lead_saved_view"("id_user", "active");

-- AddForeignKey
ALTER TABLE "lead_tag_assignment" ADD CONSTRAINT "lead_tag_assignment_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "lead"("id_lead") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_tag_assignment" ADD CONSTRAINT "lead_tag_assignment_id_lead_tag_fkey" FOREIGN KEY ("id_lead_tag") REFERENCES "lead_tag"("id_lead_tag") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_saved_view" ADD CONSTRAINT "lead_saved_view_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Probability is a percentage.
ALTER TABLE "lead" ADD CONSTRAINT "lead_probability_range" CHECK ("probability" IS NULL OR ("probability" >= 0 AND "probability" <= 100));
