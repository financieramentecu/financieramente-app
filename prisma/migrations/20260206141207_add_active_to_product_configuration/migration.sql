-- AlterTable
ALTER TABLE "product_configuration" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "product_configuration" RENAME CONSTRAINT "product_configuration_id_product_percentaje_commision_new_fkey" TO "product_configuration_id_product_percentaje_commision_new__fkey";

-- RenameIndex
ALTER INDEX "product_configuration_id_product_percentaje_commision_new_key" RENAME TO "product_configuration_id_product_percentaje_commision_new_b_key";
