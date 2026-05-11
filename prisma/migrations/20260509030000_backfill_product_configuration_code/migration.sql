-- Migration 1.4: Regenerate product_configuration codes now that level codes have
-- been renamed (LEVEL_0…LEVEL_5, GENERAL_LEVEL). New format: COMPANY-PRODUCT-LEVELCODE.
--
-- Rules (same pattern as 20260507040000_fix_product_configuration_code_uppercase):
--   1. UPPER() is applied FIRST before any REGEXP_REPLACE — prevents losing letters.
--   2. PostgreSQL UPDATE...FROM: FROM clause tables must not be referenced as JOIN...ON
--      against the target table — use implicit comma-separated FROM + WHERE conditions.
--   3. Reset all codes to TEMP-{id} first to avoid unique constraint conflicts.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Reset all codes to unique temporary values
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE product_configuration SET code = 'TEMP-' || id_product_configuration::text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Assign codes with suffix to INACTIVE rows (guarantees global uniqueness)
--         Uses: company.name + product.name + level.code (now LEVEL_0 … GENERAL_LEVEL)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE product_configuration pc
SET code = REGEXP_REPLACE(
  REGEXP_REPLACE(
    UPPER(c.name || '-' || p.name || '-' || lv.code),
    '\s+', '_', 'g'
  ),
  '[^A-Z0-9_\-]', '', 'g'
) || '-' || pc.id_product_configuration::text
FROM product p, company c, level lv
WHERE pc.id_product = p.id_product
  AND p.id_company = c.id_company
  AND pc.id_level = lv.id_level
  AND pc.active = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Assign clean codes to ACTIVE rows, with collision suffix for duplicates
-- ─────────────────────────────────────────────────────────────────────────────
WITH base_codes AS (
  SELECT
    pc.id_product_configuration,
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        UPPER(c.name || '-' || p.name || '-' || lv.code),
        '\s+', '_', 'g'
      ),
      '[^A-Z0-9_\-]', '', 'g'
    ) AS base_code,
    ROW_NUMBER() OVER (
      PARTITION BY REGEXP_REPLACE(
        REGEXP_REPLACE(
          UPPER(c.name || '-' || p.name || '-' || lv.code),
          '\s+', '_', 'g'
        ),
        '[^A-Z0-9_\-]', '', 'g'
      )
      ORDER BY pc.id_product_configuration ASC
    ) AS code_rn
  FROM product_configuration pc
  JOIN product p ON p.id_product = pc.id_product
  JOIN company c ON c.id_company = p.id_company
  JOIN level lv ON lv.id_level = pc.id_level
  WHERE pc.active = true
)
UPDATE product_configuration pc
SET code = CASE
  WHEN b.code_rn = 1 THEN b.base_code
  ELSE b.base_code || '-' || pc.id_product_configuration::text
END
FROM base_codes b
WHERE pc.id_product_configuration = b.id_product_configuration;
