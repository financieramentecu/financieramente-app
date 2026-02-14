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

-- AlterTable
ALTER TABLE "business" DROP COLUMN "id_product_percentaje_commision",
ADD COLUMN     "id_product_percentage_commission" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "product_configuration" DROP COLUMN "id_product_percentaje_commision_new_businesses",
ADD COLUMN     "id_product_percentage_commission_new_businesses" INTEGER;

-- AlterTable
ALTER TABLE "product_percentaje_commision" DROP CONSTRAINT "product_percentaje_commision_pkey",
DROP COLUMN "id_product_percentaje_commision",
ADD COLUMN     "description" VARCHAR(255),
ADD COLUMN     "id_product_percentage_commission" SERIAL NOT NULL,
ADD CONSTRAINT "product_percentaje_commision_pkey" PRIMARY KEY ("id_product_percentage_commission");

-- AlterTable
ALTER TABLE "product_percentaje_commision_category" DROP COLUMN "id_product_percentaje_commision",
ADD COLUMN     "id_product_percentage_commission" INTEGER NOT NULL;

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

