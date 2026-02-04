-- ProductConfiguration + refactor ProductPercentajeCommision
-- 1. Create product_configuration table
-- 2. Populate from distinct (id_product, id_client_origin, id_category) in product_percentaje_commision
-- 3. Add id_product_configuration to product_percentaje_commision, backfill, then drop old columns

-- CreateTable product_configuration (without FK to PPC yet to avoid circular dependency)
CREATE TABLE "product_configuration" (
    "id_product_configuration" SERIAL NOT NULL,
    "id_product" INTEGER NOT NULL,
    "id_client_origin" INTEGER NOT NULL,
    "id_category" INTEGER NOT NULL,
    "id_product_percentaje_commision_new_businesses" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_configuration_pkey" PRIMARY KEY ("id_product_configuration")
);

-- Unique (product, origin, category)
CREATE UNIQUE INDEX "product_configuration_id_product_id_client_origin_id_catego_key" ON "product_configuration"("id_product", "id_client_origin", "id_category");

-- Unique for one-to-one relation (PPC as new businesses)
CREATE UNIQUE INDEX "product_configuration_id_product_percentaje_commision_new_key" ON "product_configuration"("id_product_percentaje_commision_new_businesses");

CREATE INDEX "product_configuration_id_product_idx" ON "product_configuration"("id_product");
CREATE INDEX "product_configuration_id_client_origin_idx" ON "product_configuration"("id_client_origin");
CREATE INDEX "product_configuration_id_category_idx" ON "product_configuration"("id_category");

-- FKs to product, client_origin, category
ALTER TABLE "product_configuration" ADD CONSTRAINT "product_configuration_id_product_fkey" FOREIGN KEY ("id_product") REFERENCES "product"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_configuration" ADD CONSTRAINT "product_configuration_id_client_origin_fkey" FOREIGN KEY ("id_client_origin") REFERENCES "client_origin"("id_client_origin") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_configuration" ADD CONSTRAINT "product_configuration_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "category"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Populate: one row per distinct (id_product, id_client_origin, id_category); new_businesses = one active PPC per group or any PPC
INSERT INTO "product_configuration" ("id_product", "id_client_origin", "id_category", "id_product_percentaje_commision_new_businesses", "created_at", "updated_at")
SELECT
    ppc.id_product,
    ppc.id_client_origin,
    ppc.id_category,
    COALESCE(
        (SELECT MIN(ppc2.id_product_percentaje_commision) FROM "product_percentaje_commision" ppc2
         WHERE ppc2.id_product = ppc.id_product AND ppc2.id_client_origin = ppc.id_client_origin AND ppc2.id_category = ppc.id_category AND ppc2.active = true),
        MIN(ppc.id_product_percentaje_commision)
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "product_percentaje_commision" ppc
GROUP BY ppc.id_product, ppc.id_client_origin, ppc.id_category;

-- Add id_product_configuration to product_percentaje_commision (nullable)
ALTER TABLE "product_percentaje_commision" ADD COLUMN "id_product_configuration" INTEGER;

-- Backfill: set id_product_configuration from matching product_configuration
UPDATE "product_percentaje_commision" ppc
SET "id_product_configuration" = pc."id_product_configuration"
FROM "product_configuration" pc
WHERE pc."id_product" = ppc."id_product"
  AND pc."id_client_origin" = ppc."id_client_origin"
  AND pc."id_category" = ppc."id_category";

-- Make id_product_configuration NOT NULL
ALTER TABLE "product_percentaje_commision" ALTER COLUMN "id_product_configuration" SET NOT NULL;

-- Drop old FKs (Prisma names)
ALTER TABLE "product_percentaje_commision" DROP CONSTRAINT IF EXISTS "product_percentaje_commision_id_product_fkey";
ALTER TABLE "product_percentaje_commision" DROP CONSTRAINT IF EXISTS "product_percentaje_commision_id_client_origin_fkey";
ALTER TABLE "product_percentaje_commision" DROP CONSTRAINT IF EXISTS "product_percentaje_commision_id_category_fkey";

-- Drop old indexes
DROP INDEX IF EXISTS "product_percentaje_commision_id_product_idx";
DROP INDEX IF EXISTS "product_percentaje_commision_id_client_origin_idx";
DROP INDEX IF EXISTS "product_percentaje_commision_id_category_idx";

-- Drop old columns
ALTER TABLE "product_percentaje_commision" DROP COLUMN "id_product";
ALTER TABLE "product_percentaje_commision" DROP COLUMN "id_client_origin";
ALTER TABLE "product_percentaje_commision" DROP COLUMN "id_category";

-- Add FK from product_percentaje_commision to product_configuration
ALTER TABLE "product_percentaje_commision" ADD CONSTRAINT "product_percentaje_commision_id_product_configuration_fkey" FOREIGN KEY ("id_product_configuration") REFERENCES "product_configuration"("id_product_configuration") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add FK from product_configuration to PPC (new businesses)
ALTER TABLE "product_configuration" ADD CONSTRAINT "product_configuration_id_product_percentaje_commision_new_fkey" FOREIGN KEY ("id_product_percentaje_commision_new_businesses") REFERENCES "product_percentaje_commision"("id_product_percentaje_commision") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index on PPC
CREATE INDEX "product_percentaje_commision_id_product_configuration_idx" ON "product_percentaje_commision"("id_product_configuration");
