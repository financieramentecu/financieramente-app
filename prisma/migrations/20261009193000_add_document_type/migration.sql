-- CreateEnum
CREATE TYPE "DocumentDataType" AS ENUM ('NUMERIC', 'ALPHANUMERIC');

-- CreateTable
CREATE TABLE "document_type" (
    "id_document_type" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "data_type" "DocumentDataType" NOT NULL,
    "min_length" INTEGER NOT NULL,
    "max_length" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id_document_type")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_type_name_key" ON "document_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "document_type_code_key" ON "document_type"("code");

-- CreateIndex
CREATE INDEX "document_type_status_idx" ON "document_type"("status");

-- Precarga de la lista base. ON CONFLICT evita fallar si el seed ya insertó las filas.
INSERT INTO "document_type" ("name", "code", "data_type", "min_length", "max_length", "status", "updated_at")
VALUES
    ('Cédula de Ciudadanía', 'CC', 'NUMERIC', 6, 10, true, CURRENT_TIMESTAMP),
    ('Cédula de Extranjería', 'CE', 'ALPHANUMERIC', 6, 7, true, CURRENT_TIMESTAMP),
    ('Pasaporte', 'PAS', 'ALPHANUMERIC', 6, 15, true, CURRENT_TIMESTAMP),
    ('Número de Identificación Tributaria', 'NIT', 'NUMERIC', 9, 10, true, CURRENT_TIMESTAMP),
    ('Permiso de Protección Temporal', 'PPT', 'ALPHANUMERIC', 6, 15, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
