-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AnnualPaymentStatus" ADD VALUE 'EN_CARTERA';
ALTER TYPE "AnnualPaymentStatus" ADD VALUE 'PAGO_ANTICIPADO';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "portfolio_date" TIMESTAMP(3),
ADD COLUMN     "early_payment_date" TIMESTAMP(3);

-- RenameForeignKey
ALTER TABLE "product_percentaje_commision_level" RENAME CONSTRAINT "product_percentaje_commisen_level_id_level_fkey" TO "product_percentaje_commision_level_id_level_fkey";

-- RenameForeignKey
ALTER TABLE "product_percentaje_commision_level" RENAME CONSTRAINT "product_percentaje_commisen_level_id_product_percentage_c_fkey" TO "product_percentaje_commision_level_id_product_percentage_c_fkey";
