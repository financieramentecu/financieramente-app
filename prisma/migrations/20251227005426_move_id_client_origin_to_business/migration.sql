/*
  Warnings:

  - You are about to drop the column `id_client_origin` on the `client` table. All the data in the column will be lost.
  - Added the required column `id_client_origin` to the `business` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add column to business table as nullable temporarily
ALTER TABLE "public"."business" ADD COLUMN "id_client_origin" INTEGER;

-- Step 2: Migrate existing data from client.id_client_origin to business.id_client_origin
-- Copy the id_client_origin from the associated client to each business
UPDATE "public"."business" b
SET "id_client_origin" = c."id_client_origin"
FROM "public"."client" c
WHERE b."id_client" = c."id_client"
  AND c."id_client_origin" IS NOT NULL;

-- Step 3: Handle cases where business has no client or client has no id_client_origin
-- Set a default value (assuming id_client_origin = 1 exists, adjust if needed)
-- If no default exists, this will fail - adjust based on your data
UPDATE "public"."business"
SET "id_client_origin" = (
  SELECT MIN("id_client_origin") FROM "public"."client_origin" LIMIT 1
)
WHERE "id_client_origin" IS NULL;

-- Step 4: Make the column NOT NULL now that all rows have values
ALTER TABLE "public"."business" ALTER COLUMN "id_client_origin" SET NOT NULL;

-- Step 5: Drop foreign key from client table
ALTER TABLE "public"."client" DROP CONSTRAINT IF EXISTS "client_id_client_origin_fkey";

-- Step 6: Drop column from client table
ALTER TABLE "public"."client" DROP COLUMN "id_client_origin";

-- Step 7: Create index on business.id_client_origin
CREATE INDEX "business_id_client_origin_idx" ON "public"."business"("id_client_origin");

-- Step 8: Add foreign key constraint to business table
ALTER TABLE "public"."business" ADD CONSTRAINT "business_id_client_origin_fkey" FOREIGN KEY ("id_client_origin") REFERENCES "public"."client_origin"("id_client_origin") ON DELETE RESTRICT ON UPDATE CASCADE;
