/*
  Warnings:

  - A unique constraint covering the columns `[id_product,id_level]` on the table `product_configuration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('REGULAR', 'INICIO');

-- DropIndex
DROP INDEX "public"."category_id_category_type_idx";

-- DropIndex
DROP INDEX "public"."user_id_category_idx";

-- AlterTable: free up "category_pkey" name first
ALTER TABLE "level" RENAME CONSTRAINT "category_pkey" TO "level_pkey";

-- AlterTable: now "category_pkey" is available
ALTER TABLE "category" RENAME CONSTRAINT "category_pkey1" TO "category_pkey";

-- AlterTable
ALTER TABLE "category"
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "commission_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0,
ADD COLUMN     "contribution_type" "ContributionType" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "product_percentaje_commision_level" RENAME CONSTRAINT "product_percentaje_commision_category_pkey" TO "product_percentaje_commision_level_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "product_configuration_id_product_id_level_key" ON "product_configuration"("id_product", "id_level");

-- RenameForeignKey
ALTER TABLE "product_configuration" RENAME CONSTRAINT "product_configuration_id_category_fkey" TO "product_configuration_id_level_fkey";

-- RenameForeignKey
ALTER TABLE "product_percentaje_commision_level" RENAME CONSTRAINT "product_percentaje_commision_category_id_category_fkey" TO "product_percentaje_commision_level_id_level_fkey";

-- RenameForeignKey
ALTER TABLE "product_percentaje_commision_level" RENAME CONSTRAINT "product_percentaje_commision_category_id_product_percentag_fkey" TO "product_percentaje_commision_level_id_product_percentage_c_fkey";

-- RenameForeignKey
ALTER TABLE "user" RENAME CONSTRAINT "user_id_categoria_fkey" TO "user_id_level_fkey";

-- RenameIndex
ALTER INDEX "product_percentaje_commision_category_id_level_idx" RENAME TO "product_percentaje_commision_level_id_level_idx";

-- RenameIndex
ALTER INDEX "product_percentaje_commision_category_id_product_percentage_idx" RENAME TO "product_percentaje_commision_level_id_product_percentage_co_idx";
