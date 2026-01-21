/*
  Warnings:

  - You are about to drop the column `id_type_user` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `type_user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."user" DROP CONSTRAINT "user_id_type_user_fkey";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "id_type_user";

-- DropTable
DROP TABLE "public"."type_user";
