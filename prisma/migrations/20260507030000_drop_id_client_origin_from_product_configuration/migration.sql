-- Eliminar columna id_client_origin de product_configuration.
-- DROP COLUMN en PostgreSQL elimina automáticamente FK e índices asociados.
ALTER TABLE "product_configuration" DROP COLUMN IF EXISTS "id_client_origin";
