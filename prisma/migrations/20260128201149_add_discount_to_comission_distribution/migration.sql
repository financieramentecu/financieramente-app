-- AlterTable: Agregar columnas de descuento a comission_distribution
ALTER TABLE "comission_distribution" ADD COLUMN "total_discount" DECIMAL(15,2),
ADD COLUMN "id_discount" INTEGER;

-- CreateIndex: Index para búsquedas por id_discount
CREATE INDEX "comission_distribution_id_discount_idx" ON "comission_distribution"("id_discount");

-- AddForeignKey: Relación con tabla discount
ALTER TABLE "comission_distribution" ADD CONSTRAINT "comission_distribution_id_discount_fkey" FOREIGN KEY ("id_discount") REFERENCES "discount"("id_discount") ON DELETE SET NULL ON UPDATE CASCADE;
