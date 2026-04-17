-- CreateEnum
CREATE TYPE "AnnualPaymentStatus" AS ENUM ('SIN_FONDEAR', 'FONDEADO');

-- CreateTable
CREATE TABLE "annual_payment" (
    "id_annual_payment" SERIAL NOT NULL,
    "id_business" INTEGER NOT NULL,
    "installment_index" INTEGER NOT NULL,
    "status" "AnnualPaymentStatus" NOT NULL DEFAULT 'SIN_FONDEAR',
    "date_anchored" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_payment_pkey" PRIMARY KEY ("id_annual_payment")
);

-- CreateIndex
CREATE UNIQUE INDEX "annual_payment_id_business_installment_index_key" ON "annual_payment"("id_business", "installment_index");

CREATE INDEX "annual_payment_id_business_idx" ON "annual_payment"("id_business");

-- AddForeignKey
ALTER TABLE "annual_payment" ADD CONSTRAINT "annual_payment_id_business_fkey" FOREIGN KEY ("id_business") REFERENCES "business"("id_business") ON DELETE CASCADE ON UPDATE CASCADE;
