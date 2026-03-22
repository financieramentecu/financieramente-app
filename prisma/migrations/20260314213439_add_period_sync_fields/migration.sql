-- AlterTable
ALTER TABLE "file_import" ADD COLUMN     "month" INTEGER,
ADD COLUMN     "year" INTEGER;

-- AlterTable
ALTER TABLE "file_import_error" ADD COLUMN     "resolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolved_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "settlement_commission" ADD COLUMN     "sync_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "file_import_file_type_month_year_status_idx" ON "file_import"("file_type", "month", "year", "status");
