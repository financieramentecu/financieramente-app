-- AlterTable
ALTER TABLE "commission_configuration" RENAME CONSTRAINT "discount_pkey" TO "commission_configuration_pkey";

-- RenameIndex
ALTER INDEX "discount_status_idx" RENAME TO "commission_configuration_status_idx";
