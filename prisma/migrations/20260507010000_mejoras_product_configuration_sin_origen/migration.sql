-- Step 1: Desactivar duplicados por (id_product, id_category), conservar el más reciente activo
WITH ranked AS (
  SELECT id_product_configuration,
         ROW_NUMBER() OVER (
           PARTITION BY id_product, id_category
           ORDER BY active DESC, updated_at DESC, id_product_configuration DESC
         ) AS rn
  FROM product_configuration
)
UPDATE product_configuration
SET active = false
WHERE id_product_configuration IN (
  SELECT id_product_configuration FROM ranked WHERE rn > 1
);

-- Step 2: Drop índice único viejo
DROP INDEX IF EXISTS "product_configuration_idProduct_idClientOrigin_idCategory_key";

-- Step 3: Crear nuevo índice único parcial (solo filas active=true)
CREATE UNIQUE INDEX "product_configuration_idProduct_idCategory_key"
  ON product_configuration (id_product, id_category)
  WHERE active = true;

-- Step 4: Add isActive to business
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Step 5: Add isActive to comission_distribution
ALTER TABLE "comission_distribution" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Nota: el backfill de `code` al nuevo formato (COMPANY-PRODUCT-CATEGORY) se realiza
-- mediante el script de migración: npx tsx prisma/seeds/migrate-product-configurations.ts
