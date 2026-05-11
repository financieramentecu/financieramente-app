-- Migration 1.2: Create the new category table (agent grouping/presentation),
-- populate it from existing level data, assign users to categories,
-- then drop id_category_type from level (no longer needed there).

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Create the new category table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE "category" (
  "id_category"      SERIAL       PRIMARY KEY,
  "name"             VARCHAR(100) NOT NULL,
  "description"      TEXT,
  "status"           BOOLEAN      NOT NULL DEFAULT true,
  "id_category_type" INTEGER      NOT NULL REFERENCES "category_type"("id_category_type") ON DELETE RESTRICT ON UPDATE CASCADE,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Populate category from level rows (preserves names: MS_JUNIOR, etc.)
--         Maps level.descripcion → category.description (column rename in model)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO "category" (name, description, status, id_category_type)
SELECT name, descripcion, status, id_category_type
FROM "level";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Add id_category column to users (nullable — populated below)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "user" ADD COLUMN "id_category" INTEGER REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Assign each user their matching category based on their current level name
--         Joins: user → level (by id_level), level → category (by name match)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE "user" u
SET id_category = c.id
FROM "category" c,
     "level" l
WHERE u.id_level = l.id_level
  AND c.name = l.name;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5: Create index on users.id_category
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX "user_id_category_idx" ON "user"("id_category");

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 6: Create index on category.id_category_type
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX "category_id_category_type_idx" ON "category"("id_category_type");

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 7: Drop id_category_type from level — now safe since category is populated
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "level" DROP CONSTRAINT "level_id_category_type_fkey";
DROP INDEX IF EXISTS "level_id_category_type_idx";
ALTER TABLE "level" DROP COLUMN "id_category_type";
