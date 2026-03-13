-- CreateTable
CREATE TABLE "commission_discount" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,

    CONSTRAINT "commission_discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_discount_status_idx" ON "commission_discount"("status");

-- CreateIndex
CREATE INDEX "commission_discount_type_idx" ON "commission_discount"("type");

-- AddForeignKey
ALTER TABLE "commission_discount" ADD CONSTRAINT "commission_discount_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_discount" ADD CONSTRAINT "commission_discount_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
