-- DropForeignKey
ALTER TABLE "public"."business" DROP CONSTRAINT "business_id_product_percentaje_commision_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_configuration" DROP CONSTRAINT "product_configuration_id_product_percentaje_commision_new__fkey";

-- DropForeignKey
ALTER TABLE "public"."product_percentaje_commision_category" DROP CONSTRAINT "product_percentaje_commision_category_id_product_percentaj_fkey";

-- DropIndex
DROP INDEX "public"."product_configuration_id_product_percentaje_commision_new_b_key";

-- DropIndex
DROP INDEX "public"."product_percentaje_commision_category_id_product_percentaje_idx";

-- RENAME COLUMNS
ALTER TABLE "business" RENAME COLUMN "id_product_percentaje_commision" TO "id_product_percentage_commission";
ALTER TABLE "product_configuration" RENAME COLUMN "id_product_percentaje_commision_new_businesses" TO "id_product_percentage_commission_new_businesses";
ALTER TABLE "product_percentaje_commision" RENAME COLUMN "id_product_percentaje_commision" TO "id_product_percentage_commission";
ALTER TABLE "product_percentaje_commision_category" RENAME COLUMN "id_product_percentaje_commision" TO "id_product_percentage_commission";

-- Add Description
ALTER TABLE "product_percentaje_commision" ADD COLUMN "description" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "product_configuration_id_product_percentage_commission_new__key" ON "product_configuration"("id_product_percentage_commission_new_businesses");

-- CreateIndex
CREATE INDEX "product_percentaje_commision_category_id_product_percentage_idx" ON "product_percentaje_commision_category"("id_product_percentage_commission");

-- AddForeignKey
ALTER TABLE "product_configuration" ADD CONSTRAINT "product_configuration_id_product_percentage_commission_new_fkey" FOREIGN KEY ("id_product_percentage_commission_new_businesses") REFERENCES "product_percentaje_commision"("id_product_percentage_commission") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_percentaje_commision_category" ADD CONSTRAINT "product_percentaje_commision_category_id_product_percentag_fkey" FOREIGN KEY ("id_product_percentage_commission") REFERENCES "product_percentaje_commision"("id_product_percentage_commission") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_id_product_percentage_commission_fkey" FOREIGN KEY ("id_product_percentage_commission") REFERENCES "product_percentaje_commision"("id_product_percentage_commission") ON DELETE RESTRICT ON UPDATE CASCADE;
