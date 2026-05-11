-- Fix: rename category PK column from "id" to "id_category"
-- to match Prisma schema @map("id_category")

ALTER TABLE "category" RENAME COLUMN "id" TO "id_category";
