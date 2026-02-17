/*
  Warnings:

  - You are about to drop the column `id_comission_distribution` on the `clawback` table. All the data in the column will be lost.
  - You are about to drop the `discount` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `id_user` to the `clawback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."clawback" DROP CONSTRAINT "clawback_id_comission_distribution_fkey";

-- DropForeignKey
ALTER TABLE "public"."comission_distribution" DROP CONSTRAINT "comission_distribution_id_discount_fkey";

-- DropIndex
DROP INDEX "public"."clawback_id_comission_distribution_key";

-- AlterTable
ALTER TABLE "clawback" DROP COLUMN "id_comission_distribution",
ADD COLUMN     "id_commission_distribution" INTEGER,
ADD COLUMN     "id_user" INTEGER NOT NULL,
ALTER COLUMN "porcentaje_applied" DROP NOT NULL;

-- AlterTable
ALTER TABLE "comission_distribution" ADD COLUMN     "applied_discount_percentage" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "file_import" ADD COLUMN     "file_type" VARCHAR(20);

-- AlterTable
ALTER TABLE "settlement_commission" ADD COLUMN     "applied_clawback_percentage" DECIMAL(5,4),
ADD COLUMN     "applied_discount_percentage" DECIMAL(5,4),
ADD COLUMN     "base_commission" DECIMAL(15,2),
ADD COLUMN     "commission_type" TEXT,
ADD COLUMN     "origin_commission" TEXT;

-- DropTable
DROP TABLE "public"."discount";

-- CreateTable
CREATE TABLE "clawback_balance" (
    "id_user" INTEGER NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clawback_balance_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "config_commission" (
    "id_discount" SERIAL NOT NULL,
    "percentage" DECIMAL(5,4) NOT NULL,
    "clawback_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_commission_pkey" PRIMARY KEY ("id_discount")
);

-- CreateIndex
CREATE INDEX "config_commission_status_idx" ON "config_commission"("status");

-- CreateIndex
CREATE INDEX "clawback_id_user_idx" ON "clawback"("id_user");

-- AddForeignKey
ALTER TABLE "clawback" ADD CONSTRAINT "clawback_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clawback" ADD CONSTRAINT "clawback_id_commission_distribution_fkey" FOREIGN KEY ("id_commission_distribution") REFERENCES "comission_distribution"("id_comission_distribution") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clawback_balance" ADD CONSTRAINT "clawback_balance_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "user_typeIdentity_identityNumber_key" RENAME TO "user_type_identity_identity_number_key";
