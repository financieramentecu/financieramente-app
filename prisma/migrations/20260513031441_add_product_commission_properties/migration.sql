/*
  Warnings:

  - A unique constraint covering the columns `[id_product,id_level]` on the table `product_configuration` will be added. If there are existing duplicate values, this will fail.

*/

-- CreateEnum (safe: no-op if already exists)
DO $$ BEGIN
  CREATE TYPE "ContributionType" AS ENUM ('REGULAR', 'INICIO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DropIndex (safe: no-op if already dropped)
DROP INDEX IF EXISTS "public"."category_id_category_type_idx";
DROP INDEX IF EXISTS "public"."user_id_category_idx";

-- AlterTable: free up "category_pkey" name first (safe: no-op if already renamed)
DO $$ BEGIN
  ALTER TABLE "level" RENAME CONSTRAINT "category_pkey" TO "level_pkey";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

-- AlterTable: now "category_pkey" is available (safe: no-op if already renamed)
DO $$ BEGIN
  ALTER TABLE "category" RENAME CONSTRAINT "category_pkey1" TO "category_pkey";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

-- AlterTable category timestamps
DO $$ BEGIN
  ALTER TABLE "category"
    ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
    ALTER COLUMN "updated_at" DROP DEFAULT,
    ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);
EXCEPTION WHEN others THEN NULL;
END $$;

-- AlterTable product: add columns (safe: no-op if already exist)
ALTER TABLE "product"
  ADD COLUMN IF NOT EXISTS "commission_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "contribution_type" "ContributionType" NOT NULL DEFAULT 'REGULAR';

-- AlterTable ppc_level pkey rename (safe: no-op if already renamed)
DO $$ BEGIN
  ALTER TABLE "product_percentaje_commision_level" RENAME CONSTRAINT "product_percentaje_commision_category_pkey" TO "product_percentaje_commision_level_pkey";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

-- Deduplicate product_configuration before creating unique index
-- Keep the row with the highest id_product_configuration per (id_product, id_level) group
DELETE FROM product_percentaje_commision
WHERE id_product_configuration IN (
  SELECT id_product_configuration FROM (
    SELECT id_product_configuration,
      ROW_NUMBER() OVER (PARTITION BY id_product, id_level ORDER BY id_product_configuration DESC) AS rn
    FROM product_configuration
  ) t WHERE rn > 1
);

DELETE FROM product_configuration
WHERE id_product_configuration IN (
  SELECT id_product_configuration FROM (
    SELECT id_product_configuration,
      ROW_NUMBER() OVER (PARTITION BY id_product, id_level ORDER BY id_product_configuration DESC) AS rn
    FROM product_configuration
  ) t WHERE rn > 1
);

-- CreateIndex (safe: no-op if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS "product_configuration_id_product_id_level_key" ON "product_configuration"("id_product", "id_level");

-- RenameForeignKey (safe: no-op if already renamed)
DO $$ BEGIN
  ALTER TABLE "product_configuration" RENAME CONSTRAINT "product_configuration_id_category_fkey" TO "product_configuration_id_level_fkey";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "product_percentaje_commision_level" RENAME CONSTRAINT "product_percentaje_commision_category_id_category_fkey" TO "product_percentaje_commisen_level_id_level_fkey";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "product_percentaje_commision_level" RENAME CONSTRAINT "product_percentaje_commision_category_id_product_percentag_fkey" TO "product_percentaje_commisen_level_id_product_percentage_c_fkey";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user" RENAME CONSTRAINT "user_id_categoria_fkey" TO "user_id_level_fkey";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

-- RenameIndex (safe: no-op if already renamed)
DO $$ BEGIN
  ALTER INDEX "product_percentaje_commision_category_id_level_idx" RENAME TO "product_percentaje_commision_level_id_level_idx";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER INDEX "product_percentaje_commision_category_id_product_percentage_idx" RENAME TO "product_percentaje_commision_level_id_product_percentage_co_idx";
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;
