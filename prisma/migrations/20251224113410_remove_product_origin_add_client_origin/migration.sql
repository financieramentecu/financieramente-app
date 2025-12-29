-- Eliminar foreign key constraint de id_origin en product_percentaje_commision
ALTER TABLE "product_percentaje_commision" DROP CONSTRAINT IF EXISTS "product_percentaje_commision_id_origin_fkey";

-- Eliminar índice de id_origin en product_percentaje_commision
DROP INDEX IF EXISTS "product_percentaje_commision_id_origin_idx";

-- Agregar columna id_client_origin a product_percentaje_commision
-- NOTA: Se agrega como nullable primero para permitir migración de datos
-- Si hay datos existentes, será necesario actualizar los valores según la lógica de negocio
-- para mapear correctamente de id_origin (product_origin) a id_client_origin (client_origin)
ALTER TABLE "product_percentaje_commision" ADD COLUMN "id_client_origin" INTEGER;

-- Actualizar valores existentes con el primer id_client_origin disponible (valor temporal)
-- IMPORTANTE: Esto es un valor temporal. Debe actualizarse según la lógica de negocio específica
UPDATE "product_percentaje_commision" 
SET "id_client_origin" = (
    SELECT COALESCE(MIN(id_client_origin), 1) 
    FROM "client_origin"
    LIMIT 1
)
WHERE "id_client_origin" IS NULL;

-- Hacer la columna NOT NULL después de actualizar los valores
ALTER TABLE "product_percentaje_commision" ALTER COLUMN "id_client_origin" SET NOT NULL;

-- Crear foreign key constraint hacia client_origin
ALTER TABLE "product_percentaje_commision" ADD CONSTRAINT "product_percentaje_commision_id_client_origin_fkey" FOREIGN KEY ("id_client_origin") REFERENCES "client_origin"("id_client_origin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Crear índice para id_client_origin
CREATE INDEX "product_percentaje_commision_id_client_origin_idx" ON "product_percentaje_commision"("id_client_origin");

-- Eliminar columna id_origin de product_percentaje_commision
ALTER TABLE "product_percentaje_commision" DROP COLUMN "id_origin";

-- Eliminar tabla product_origin
DROP TABLE IF EXISTS "product_origin";

