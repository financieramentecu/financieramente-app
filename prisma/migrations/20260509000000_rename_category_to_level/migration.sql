-- Migration 1.1: Rename category→level and update all FK columns that reference it.
-- NOTE: id_category_type is NOT dropped here — it is still needed in migration 1.2
--       to populate the new category table before being dropped.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Rename the table itself
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "category" RENAME TO "level";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Rename primary key column
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "level" RENAME COLUMN "id_category" TO "id_level";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Rename the self-referential FK column
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "level" RENAME COLUMN "id_next_category" TO "id_next_level";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Rename FK column in users
--         (the column was "id_categoria" — intentional legacy spelling)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "user" RENAME COLUMN "id_categoria" TO "id_level";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5: Rename FK column in product_configuration
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "product_configuration" RENAME COLUMN "id_category" TO "id_level";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 6: Rename FK column in product_percentaje_commision_category
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "product_percentaje_commision_category" RENAME COLUMN "id_category" TO "id_level";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 7: Rename constraints on the level table
-- ─────────────────────────────────────────────────────────────────────────────
-- Self-referential FK (added in 20260507000000)
ALTER TABLE "level" RENAME CONSTRAINT "category_id_next_category_fkey" TO "level_id_next_level_fkey";

-- id_category_type FK (added in 20260310162712)
ALTER TABLE "level" RENAME CONSTRAINT "category_id_category_type_fkey" TO "level_id_category_type_fkey";

-- fixed_beneficiary FK (added in 20260325120000)
ALTER TABLE "level" RENAME CONSTRAINT "category_id_fixed_beneficiary_user_fkey" TO "level_id_fixed_beneficiary_user_fkey";

-- beneficiary mode check constraint (added in 20260325120000)
ALTER TABLE "level" RENAME CONSTRAINT "category_fixed_beneficiary_check" TO "level_fixed_beneficiary_check";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 8: Rename indexes on the level table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER INDEX "category_code_key" RENAME TO "level_code_key";
ALTER INDEX "category_id_category_type_idx" RENAME TO "level_id_category_type_idx";
ALTER INDEX "category_id_fixed_beneficiary_user_idx" RENAME TO "level_id_fixed_beneficiary_user_idx";
ALTER INDEX "category_id_next_category_idx" RENAME TO "level_id_next_level_idx";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 9: Handle product_configuration unique/index renames
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop the old partial unique index (id_product, id_category) — active=true only
DROP INDEX IF EXISTS "product_configuration_idProduct_idCategory_key";

-- Rename the non-partial index on id_category
ALTER INDEX "product_configuration_id_category_idx" RENAME TO "product_configuration_id_level_idx";

-- Create the new partial unique index on (id_product, id_level) — active=true only
CREATE UNIQUE INDEX "product_configuration_idProduct_idLevel_key"
  ON product_configuration (id_product, id_level)
  WHERE active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 10: Rename index on product_percentaje_commision_category
-- ─────────────────────────────────────────────────────────────────────────────
ALTER INDEX "product_percentaje_commision_category_id_category_idx" RENAME TO "product_percentaje_commision_category_id_level_idx";
