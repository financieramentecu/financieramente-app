-- Backfill NULL/empty code (aligned with buildProductConfigurationCode: trim, whitespace → _, upper).
-- Use quoted identifiers + public schema so shadow DB replay matches Prisma migrations.
-- LEFT(..., 50) keeps values within VARCHAR(50).
UPDATE "public"."product_configuration" AS pc
SET "code" = LEFT(
  CONCAT_WS(
    '-',
    UPPER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(p."name"), '\s+', '_', 'g'), '-', '_', 'g')),
    UPPER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(co."name"), '\s+', '_', 'g'), '-', '_', 'g')),
    UPPER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(cat."name"), '\s+', '_', 'g'), '-', '_', 'g'))
  ),
  50
)
FROM "public"."product" AS p,
     "public"."client_origin" AS co,
     "public"."category" AS cat
WHERE p."id_product" = pc."id_product"
  AND co."id_client_origin" = pc."id_client_origin"
  AND cat."id_category" = pc."id_category"
  AND (pc."code" IS NULL OR TRIM(pc."code") = '');

-- Fallback for orphan rows
UPDATE "public"."product_configuration"
SET "code" = LEFT('CFG-' || "id_product_configuration"::text, 50)
WHERE "code" IS NULL OR TRIM("code") = '';

-- Dedupe: keep lowest id per code; suffix others (stay within 50 chars)
WITH ranked AS (
  SELECT
    "id_product_configuration",
    "code",
    ROW_NUMBER() OVER (PARTITION BY "code" ORDER BY "id_product_configuration" ASC) AS rn
  FROM "public"."product_configuration"
)
UPDATE "public"."product_configuration" AS pc
SET "code" = LEFT(LEFT(pc."code", 30) || '-' || pc."id_product_configuration"::text, 50)
FROM ranked AS r
WHERE pc."id_product_configuration" = r."id_product_configuration"
  AND r.rn > 1;

ALTER TABLE "public"."product_configuration" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "product_configuration_code_key" ON "public"."product_configuration"("code");
