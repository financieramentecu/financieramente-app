-- 1. Create `category_type` table
CREATE TABLE "category_type" (
    "id_category_type" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_type_pkey" PRIMARY KEY ("id_category_type")
);

-- 2. Create unique index for name
CREATE UNIQUE INDEX "category_type_name_key" ON "category_type"("name");

-- 3. Insert existing distinct category types from `category`
INSERT INTO "category_type" ("name", "updated_at")
SELECT DISTINCT "type_category", CURRENT_TIMESTAMP
FROM "category";

-- 4. Add the new FK column to `category` (nullable initially)
ALTER TABLE "category" ADD COLUMN "id_category_type" INTEGER;

-- 5. Populate the FK column by joining with `category_type`
UPDATE "category" c
SET "id_category_type" = ct."id_category_type"
FROM "category_type" ct
WHERE c."type_category" = ct."name";

-- 6. Set the FK column to NOT NULL now that it is populated
ALTER TABLE "category" ALTER COLUMN "id_category_type" SET NOT NULL;

-- 7. Add the Foreign Key constraint
ALTER TABLE "category" ADD CONSTRAINT "category_id_category_type_fkey" FOREIGN KEY ("id_category_type") REFERENCES "category_type"("id_category_type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Create index for the new FK
CREATE INDEX "category_id_category_type_idx" ON "category"("id_category_type");

-- 9. Drop the old column and its index
DROP INDEX IF EXISTS "category_type_category_idx";
ALTER TABLE "category" DROP COLUMN "type_category";
