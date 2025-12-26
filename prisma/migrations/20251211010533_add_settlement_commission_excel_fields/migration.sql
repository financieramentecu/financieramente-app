/*
  Warnings:

  - The `comission_date_from` column on the `settlement_commission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `id_file_import` to the `settlement_commission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."settlement_commission" DROP CONSTRAINT "settlement_commission_id_business_fkey";

-- DropIndex
DROP INDEX "public"."settlement_commission_id_business_key";

-- AlterTable
ALTER TABLE "file_import" ADD COLUMN     "rezagado_record" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sincronizado_record" INTEGER NOT NULL DEFAULT 0;

-- AlterTable - Primero hacer id_file_import nullable temporalmente
ALTER TABLE "settlement_commission" ADD COLUMN     "compania" VARCHAR(200),
ADD COLUMN     "contract" VARCHAR(100),
ADD COLUMN     "franquicia" VARCHAR(200),
ADD COLUMN     "id_file_import" INTEGER,
ADD COLUMN     "nombre" VARCHAR(200),
ADD COLUMN     "nombre_fp" VARCHAR(200),
ADD COLUMN     "producto" VARCHAR(200),
ADD COLUMN     "sub_grupo_fp" VARCHAR(200),
ADD COLUMN     "tipo_comision" VARCHAR(200),
ALTER COLUMN "id_business" DROP NOT NULL;

-- Convertir comission_date_from de Int a Date
-- Primero crear la nueva columna como nullable
ALTER TABLE "settlement_commission" ADD COLUMN     "comission_date_from_new" DATE;

-- Migrar datos existentes (si los hay) - convertir número de días desde 1900-01-01 a fecha
UPDATE "settlement_commission" 
SET "comission_date_from_new" = ('1900-01-01'::date + ("comission_date_from"::integer || ' days')::interval)
WHERE "comission_date_from" IS NOT NULL AND "comission_date_from"::text ~ '^[0-9]+$';

-- Eliminar columna antigua y renombrar la nueva
ALTER TABLE "settlement_commission" DROP COLUMN "comission_date_from";
ALTER TABLE "settlement_commission" RENAME COLUMN "comission_date_from_new" TO "comission_date_from";

-- Hacer id_file_import NOT NULL
-- Si hay datos existentes, necesitamos crear un FileImport temporal o eliminar los registros antiguos
-- Por ahora, si hay datos, los eliminamos ya que no tienen sentido sin FileImport
DELETE FROM "settlement_commission" WHERE "id_file_import" IS NULL;
ALTER TABLE "settlement_commission" ALTER COLUMN "id_file_import" SET NOT NULL;

-- CreateIndex
CREATE INDEX "settlement_commission_contract_idx" ON "settlement_commission"("contract");

-- CreateIndex
CREATE INDEX "settlement_commission_id_file_import_idx" ON "settlement_commission"("id_file_import");

-- CreateIndex
CREATE INDEX "settlement_commission_id_business_idx" ON "settlement_commission"("id_business");

-- AddForeignKey
ALTER TABLE "settlement_commission" ADD CONSTRAINT "settlement_commission_id_business_fkey" FOREIGN KEY ("id_business") REFERENCES "business"("id_business") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_commission" ADD CONSTRAINT "settlement_commission_id_file_import_fkey" FOREIGN KEY ("id_file_import") REFERENCES "file_import"("id_file_import") ON DELETE RESTRICT ON UPDATE CASCADE;
