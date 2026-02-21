-- DropForeignKey
ALTER TABLE "comission_distribution" DROP CONSTRAINT "comission_distribution_id_discount_fkey";

-- DropIndex
DROP INDEX "comission_distribution_id_discount_idx";

-- AlterTable
ALTER TABLE "comission_distribution"
DROP COLUMN "id_discount",
ADD COLUMN "applied_discount_percentage" DECIMAL(5,4);

-- AlterTable
ALTER TABLE "product_percentaje_commision_category"
ADD COLUMN "porcentaje_portfolio" DECIMAL(5,4);

-- RenameTable
ALTER TABLE "discount" RENAME TO "commission_configuration";

-- RenameColumns
ALTER TABLE "commission_configuration" RENAME COLUMN "id_discount" TO "id_config_commission";
ALTER TABLE "commission_configuration" RENAME COLUMN "percentage" TO "discount_percentage";

-- AlterTable
ALTER TABLE "commission_configuration"
ADD COLUMN "clawback_percentage" DECIMAL(5,4),
ADD COLUMN "name" VARCHAR(100);

-- RenameColumns
ALTER TABLE "settlement_commission" RENAME COLUMN "valor_comision" TO "commission_value";
ALTER TABLE "settlement_commission" RENAME COLUMN "porcentaje_comision" TO "commission_percentage";
ALTER TABLE "settlement_commission" RENAME COLUMN "valor_prima" TO "base_commission";
ALTER TABLE "settlement_commission" RENAME COLUMN "concepto" TO "descripcion";

-- AlterTable
ALTER TABLE "settlement_commission"
DROP COLUMN "poliza",
DROP COLUMN "ramo",
DROP COLUMN "producto",
DROP COLUMN "recibo",
DROP COLUMN "fecha_pago",
ADD COLUMN "discount_percentage" DECIMAL(5,4),
ADD COLUMN "clawback_percentage" DECIMAL(5,4),
ADD COLUMN "origin_commission" VARCHAR(20),
ADD COLUMN "commission_type" VARCHAR(20);

-- AlterColumn
ALTER TABLE "settlement_commission"
ALTER COLUMN "commission_percentage" TYPE DECIMAL(5,4) USING "commission_percentage"::DECIMAL(5,4);
