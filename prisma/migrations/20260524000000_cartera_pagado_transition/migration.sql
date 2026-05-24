-- AlterEnum
-- Postgres constraint: ADD VALUE cannot run inside an explicit transaction block.
-- These two statements run as separate implicit transactions.
ALTER TYPE "AnnualPaymentStatus" ADD VALUE 'CARTERA_PAGADO';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "portfolio_payment_date" TIMESTAMP(3);
