/*
  Warnings:

  - You are about to drop the column `id_user_commission_distribution` on the `clawback` table. All the data in the column will be lost.
  - You are about to drop the column `id_percentaje_comission` on the `comission_distribution` table. All the data in the column will be lost.
  - The primary key for the `settlement_commission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `comission_date_from` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `comission_date_until` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `comission_valor` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `compania` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `contract` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `date_liquidation` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `date_sync` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `franquicia` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `id_settlement_commission` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_fp` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `observations` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `sub_grupo_fp` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_comision` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `value_base` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the `lag_commission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `position` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_percentaje_commision_position` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_comission_distribution` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id_comission_distribution]` on the table `clawback` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_comission_distribution` to the `clawback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."clawback" DROP CONSTRAINT "clawback_id_user_commission_distribution_fkey";

-- DropForeignKey
ALTER TABLE "public"."comission_distribution" DROP CONSTRAINT "comission_distribution_id_percentaje_comission_fkey";

-- DropForeignKey
ALTER TABLE "public"."comission_distribution" DROP CONSTRAINT "comission_distribution_id_settlement_comission_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_percentaje_commision_position" DROP CONSTRAINT "product_percentaje_commision_position_id_position_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_percentaje_commision_position" DROP CONSTRAINT "product_percentaje_commision_position_id_product_percentaj_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_comission_distribution" DROP CONSTRAINT "user_comission_distribution_id_comission_distribution_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_comission_distribution" DROP CONSTRAINT "user_comission_distribution_id_user_fkey";

-- DropIndex
DROP INDEX "public"."settlement_commission_contract_idx";

-- DropIndex
DROP INDEX "public"."settlement_commission_period_idx";

-- DropIndex
DROP INDEX "public"."settlement_commission_status_idx";

-- AlterTable
ALTER TABLE "clawback" DROP COLUMN "id_user_commission_distribution",
ADD COLUMN     "id_comission_distribution" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "comission_distribution" DROP COLUMN "id_percentaje_comission",
ADD COLUMN     "id_percentaje_commision_category" INTEGER;

-- AlterTable
ALTER TABLE "file_import" ADD COLUMN     "no_sincronizado_record" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pre_liquidacion_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "settlement_commission" DROP CONSTRAINT "settlement_commission_pkey",
DROP COLUMN "comission_date_from",
DROP COLUMN "comission_date_until",
DROP COLUMN "comission_valor",
DROP COLUMN "compania",
DROP COLUMN "contract",
DROP COLUMN "date_liquidation",
DROP COLUMN "date_sync",
DROP COLUMN "franquicia",
DROP COLUMN "id_settlement_commission",
DROP COLUMN "nombre",
DROP COLUMN "nombre_fp",
DROP COLUMN "observations",
DROP COLUMN "period",
DROP COLUMN "sub_grupo_fp",
DROP COLUMN "tipo_comision",
DROP COLUMN "value_base",
ADD COLUMN     "concepto" TEXT,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "fecha_pago" TIMESTAMP(3),
ADD COLUMN     "idSettlementCommission" SERIAL NOT NULL,
ADD COLUMN     "poliza" TEXT,
ADD COLUMN     "porcentaje_comision" DECIMAL(5,2),
ADD COLUMN     "ramo" TEXT,
ADD COLUMN     "recibo" TEXT,
ADD COLUMN     "valor_comision" DECIMAL(15,2),
ADD COLUMN     "valor_prima" DECIMAL(15,2),
ALTER COLUMN "is_lag" SET DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'PENDIENTE',
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "producto" SET DATA TYPE TEXT,
ADD CONSTRAINT "settlement_commission_pkey" PRIMARY KEY ("idSettlementCommission");

-- DropTable
DROP TABLE "public"."lag_commission";

-- DropTable
DROP TABLE "public"."position";

-- DropTable
DROP TABLE "public"."product_percentaje_commision_position";

-- DropTable
DROP TABLE "public"."user_comission_distribution";

-- CreateTable
CREATE TABLE "product_percentaje_commision_category" (
    "id" SERIAL NOT NULL,
    "id_category" INTEGER NOT NULL,
    "id_product_percentaje_commision" INTEGER NOT NULL,
    "porcentaje_distribucion" DECIMAL(5,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_percentaje_commision_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_percentaje_commision_category_id_category_idx" ON "product_percentaje_commision_category"("id_category");

-- CreateIndex
CREATE INDEX "product_percentaje_commision_category_id_product_percentaje_idx" ON "product_percentaje_commision_category"("id_product_percentaje_commision");

-- CreateIndex
CREATE UNIQUE INDEX "clawback_id_comission_distribution_key" ON "clawback"("id_comission_distribution");

-- CreateIndex
CREATE INDEX "file_import_status_idx" ON "file_import"("status");

-- AddForeignKey
ALTER TABLE "product_percentaje_commision_category" ADD CONSTRAINT "product_percentaje_commision_category_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "category"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_percentaje_commision_category" ADD CONSTRAINT "product_percentaje_commision_category_id_product_percentaj_fkey" FOREIGN KEY ("id_product_percentaje_commision") REFERENCES "product_percentaje_commision"("id_product_percentaje_commision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comission_distribution" ADD CONSTRAINT "comission_distribution_id_settlement_comission_fkey" FOREIGN KEY ("id_settlement_comission") REFERENCES "settlement_commission"("idSettlementCommission") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comission_distribution" ADD CONSTRAINT "comission_distribution_id_percentaje_commision_category_fkey" FOREIGN KEY ("id_percentaje_commision_category") REFERENCES "product_percentaje_commision_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clawback" ADD CONSTRAINT "clawback_id_comission_distribution_fkey" FOREIGN KEY ("id_comission_distribution") REFERENCES "comission_distribution"("id_comission_distribution") ON DELETE RESTRICT ON UPDATE CASCADE;
