/*
  Warnings:

  - The primary key for the `product_percentaje_commision_category` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `product_percentaje_commision_category` table. All the data in the column will be lost.
  - The primary key for the `settlement_commission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `idSettlementCommission` on the `settlement_commission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."comission_distribution" DROP CONSTRAINT "comission_distribution_id_percentaje_commision_category_fkey";

-- DropForeignKey
ALTER TABLE "public"."comission_distribution" DROP CONSTRAINT "comission_distribution_id_settlement_comission_fkey";

-- AlterTable
ALTER TABLE "product_percentaje_commision_category" DROP CONSTRAINT "product_percentaje_commision_category_pkey",
DROP COLUMN "id",
ADD COLUMN     "id_product_percentaje_commision_category" SERIAL NOT NULL,
ADD CONSTRAINT "product_percentaje_commision_category_pkey" PRIMARY KEY ("id_product_percentaje_commision_category");

-- AlterTable
ALTER TABLE "settlement_commission" DROP CONSTRAINT "settlement_commission_pkey",
DROP COLUMN "idSettlementCommission",
ADD COLUMN     "id_settlement_commission" SERIAL NOT NULL,
ADD CONSTRAINT "settlement_commission_pkey" PRIMARY KEY ("id_settlement_commission");

-- AddForeignKey
ALTER TABLE "comission_distribution" ADD CONSTRAINT "comission_distribution_id_settlement_comission_fkey" FOREIGN KEY ("id_settlement_comission") REFERENCES "settlement_commission"("id_settlement_commission") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comission_distribution" ADD CONSTRAINT "comission_distribution_id_percentaje_commision_category_fkey" FOREIGN KEY ("id_percentaje_commision_category") REFERENCES "product_percentaje_commision_category"("id_product_percentaje_commision_category") ON DELETE SET NULL ON UPDATE CASCADE;
