-- DropForeignKey
ALTER TABLE "notification" DROP CONSTRAINT "notification_id_business_fkey";

-- DropIndex
DROP INDEX "notification_id_business_idx";

-- AlterTable
ALTER TABLE "notification" DROP COLUMN "id_business",
ADD COLUMN "callback_url" TEXT;
