-- Move code from ProductPercentajeCommision to ProductConfiguration
-- 1. Add code to product_configuration (nullable)
-- 2. Backfill product_configuration.code from first PPC per configuration
-- 3. Drop code from product_percentaje_commision

-- Add code column to product_configuration
ALTER TABLE "product_configuration" ADD COLUMN "code" VARCHAR(50);

-- Backfill: set code from first PPC per configuration
UPDATE "product_configuration" pc
SET "code" = (
  SELECT ppc."code"
  FROM "product_percentaje_commision" ppc
  WHERE ppc."id_product_configuration" = pc."id_product_configuration"
  ORDER BY ppc."id_product_percentaje_commision"
  LIMIT 1
);

-- Drop code from product_percentaje_commision
ALTER TABLE "product_percentaje_commision" DROP COLUMN "code";
