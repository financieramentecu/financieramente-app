-- AlterTable
ALTER TABLE "settlement_commission" ADD COLUMN     "settled_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "commission_configuration" (
    "id_config_commission" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "discount_percentage" DECIMAL(5,4) NOT NULL,
    "clawback_percentage" DECIMAL(5,4),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_configuration_pkey" PRIMARY KEY ("id_config_commission")
);

-- CreateIndex
CREATE INDEX "commission_configuration_status_idx" ON "commission_configuration"("status");
