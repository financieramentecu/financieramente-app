/*
  Warnings:

  - You are about to drop the column `id_client_origin` on the `product_percentaje_commision` table. All the data in the column will be lost.
  - Added the required column `id_origin` to the `product_percentaje_commision` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."product_percentaje_commision" DROP CONSTRAINT "product_percentaje_commision_id_client_origin_fkey";

-- DropIndex
DROP INDEX "public"."product_percentaje_commision_id_client_origin_idx";

-- AlterTable
ALTER TABLE "product_percentaje_commision" DROP COLUMN "id_client_origin",
ADD COLUMN     "id_origin" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "product_origin" (
    "id_origin" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_origin_pkey" PRIMARY KEY ("id_origin")
);

-- CreateIndex
CREATE INDEX "product_percentaje_commision_id_origin_idx" ON "product_percentaje_commision"("id_origin");

-- AddForeignKey
ALTER TABLE "product_percentaje_commision" ADD CONSTRAINT "product_percentaje_commision_id_origin_fkey" FOREIGN KEY ("id_origin") REFERENCES "product_origin"("id_origin") ON DELETE RESTRICT ON UPDATE CASCADE;
