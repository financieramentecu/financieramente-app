-- CreateTable
CREATE TABLE "discount" (
    "id_discount" SERIAL NOT NULL,
    "percentage" DECIMAL(5,4) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_pkey" PRIMARY KEY ("id_discount")
);

-- CreateIndex: Unique partial index para asegurar solo un descuento activo
CREATE UNIQUE INDEX "discount_one_active_idx" ON "discount"("status") WHERE "status" = 'ACTIVE';

-- CreateIndex: Index para búsquedas por status
CREATE INDEX "discount_status_idx" ON "discount"("status");
