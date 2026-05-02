/*
  Warnings:

  - You are about to drop the `annual_payment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."annual_payment" DROP CONSTRAINT "annual_payment_id_business_fkey";

-- AlterTable
ALTER TABLE "business" ADD COLUMN     "num_aportes" INTEGER;

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "id_currency" INTEGER;

-- AlterTable
ALTER TABLE "file_import" ADD COLUMN     "upload_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "file_import_error" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "load_number" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "settlement_commission" ADD COLUMN     "load_number" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "public"."annual_payment";

-- CreateTable
CREATE TABLE "payments" (
    "id_annual_payment" SERIAL NOT NULL,
    "id_business" INTEGER NOT NULL,
    "installment_index" INTEGER NOT NULL,
    "status" "AnnualPaymentStatus" NOT NULL DEFAULT 'SIN_FONDEAR',
    "date_anchored" TIMESTAMP(3),
    "expected_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id_annual_payment")
);

-- CreateIndex
CREATE INDEX "payments_id_business_idx" ON "payments"("id_business");

-- CreateIndex
CREATE UNIQUE INDEX "payments_id_business_installment_index_key" ON "payments"("id_business", "installment_index");

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_id_currency_fkey" FOREIGN KEY ("id_currency") REFERENCES "currency"("id_currency") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_id_business_fkey" FOREIGN KEY ("id_business") REFERENCES "business"("id_business") ON DELETE CASCADE ON UPDATE CASCADE;
