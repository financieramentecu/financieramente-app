-- Migration: init_refactor_load_file_v2
-- Refactors settlement_commission for the load-file v2 feature
-- Adds: start_date, end_date, is_lag, is_clawback, lag_date
-- Removes: commission_percentage, error
-- Changes: status default, commission_type NOT NULL, contract type
-- Creates: file_import_error table

-- DropColumn: commission_percentage (replaced by discount_percentage)
ALTER TABLE "settlement_commission" DROP COLUMN IF EXISTS "commission_percentage";

-- DropColumn: error (replaced by file_import_error table)
ALTER TABLE "settlement_commission" DROP COLUMN IF EXISTS "error";

-- AddColumns: date range for voluntaria processing
ALTER TABLE "settlement_commission" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3);
ALTER TABLE "settlement_commission" ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3);

-- AddColumns: control flags
ALTER TABLE "settlement_commission" ADD COLUMN IF NOT EXISTS "is_lag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "settlement_commission" ADD COLUMN IF NOT EXISTS "is_clawback" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "settlement_commission" ADD COLUMN IF NOT EXISTS "lag_date" TIMESTAMP(3);

-- AlterColumn: status default from PENDIENTE to PENDING
ALTER TABLE "settlement_commission" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterColumn: commission_type make required (was nullable)
UPDATE "settlement_commission" SET "commission_type" = 'UNKNOWN' WHERE "commission_type" IS NULL;
ALTER TABLE "settlement_commission" ALTER COLUMN "commission_type" SET NOT NULL;

-- AlterColumn: contract type from VARCHAR(100) to VARCHAR(50)
ALTER TABLE "settlement_commission" ALTER COLUMN "contract" TYPE VARCHAR(50);

-- CreateTable: file_import_error (for detailed row-level error tracking)
CREATE TABLE IF NOT EXISTS "file_import_error" (
    "id_file_import_error" SERIAL NOT NULL,
    "id_file_import" INTEGER NOT NULL,
    "row_number" INTEGER NOT NULL,
    "contract" VARCHAR(50),
    "reason" TEXT NOT NULL,
    "raw_data" JSONB NOT NULL,

    CONSTRAINT "file_import_error_pkey" PRIMARY KEY ("id_file_import_error")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "file_import_error_id_file_import_idx" ON "file_import_error"("id_file_import");

-- AddForeignKey
ALTER TABLE "file_import_error" ADD CONSTRAINT "file_import_error_id_file_import_fkey" FOREIGN KEY ("id_file_import") REFERENCES "file_import"("id_file_import") ON DELETE RESTRICT ON UPDATE CASCADE;
