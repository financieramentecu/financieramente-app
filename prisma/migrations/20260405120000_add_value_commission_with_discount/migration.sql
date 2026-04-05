-- AlterTable
ALTER TABLE "comission_distribution" ADD COLUMN "value_commission_with_discount" DECIMAL(15,2);

-- Backfill: monto post-descuento (impuesto) coherente con filas existentes
UPDATE "comission_distribution" cd
SET "value_commission_with_discount" = cd.value_comission_final + COALESCE(
  (
    SELECT c.value_clawback
    FROM "clawback" c
    WHERE c.id_comission_distribution = cd.id_comission_distribution
  ),
  0
);
