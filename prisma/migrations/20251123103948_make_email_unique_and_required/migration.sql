/*
  Warnings:

  - You are about to alter the column `email` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(150)` to `VarChar(150)`.
  - A unique constraint covering the columns `[email]` on the `user` table will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX IF EXISTS "user_email_idx";

-- AlterTable
ALTER TABLE "public"."user" 
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "email" SET DATA TYPE VARCHAR(150);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

