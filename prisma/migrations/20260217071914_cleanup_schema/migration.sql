/*
  Warnings:

  - You are about to drop the column `concepto` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_pago` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `poliza` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `porcentaje_comision` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `producto` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `ramo` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `recibo` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `valor_comision` on the `settlement_commission` table. All the data in the column will be lost.
  - You are about to drop the column `valor_prima` on the `settlement_commission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "settlement_commission" DROP COLUMN "concepto",
DROP COLUMN "fecha_pago",
DROP COLUMN "poliza",
DROP COLUMN "porcentaje_comision",
DROP COLUMN "producto",
DROP COLUMN "ramo",
DROP COLUMN "recibo",
DROP COLUMN "valor_comision",
DROP COLUMN "valor_prima",
ADD COLUMN     "branch" TEXT,
ADD COLUMN     "commission_percentage" DECIMAL(5,2),
ADD COLUMN     "commission_value" DECIMAL(15,2),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "payment_date" TIMESTAMP(3),
ADD COLUMN     "policy" TEXT,
ADD COLUMN     "premium_value" DECIMAL(15,2),
ADD COLUMN     "product" TEXT,
ADD COLUMN     "receipt" TEXT;
