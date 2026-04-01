-- AlterTable
ALTER TABLE "settlement_commission" ADD COLUMN     "is_lag_by_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_lag_by_user_date" TIMESTAMP(3);
