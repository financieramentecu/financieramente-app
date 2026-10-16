-- COM-27: relaciona client con document_type y asigna CC solo a quienes no tienen tipo.
-- Respaldo antes de producción. Rollback manual: quitar la FK y la columna.
-- Los type_identity que no coincidían con el catálogo quedan en CC y no se revierten solos.
-- Idempotente: no reemplaza id_document_type ya definido ni crea relaciones duplicadas.
-- Misma regla que planClientDocumentTypeMigration().
-- User.type_identity queda sin FK (usuarios de plataforma, fuera de alcance).
-- El tomador (COM-28) aún no existe como tabla; cuando se agregue debe usar esta misma FK.

ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "id_document_type" INTEGER;

INSERT INTO "document_type" ("name", "code", "data_type", "min_length", "max_length", "status", "updated_at")
SELECT 'Cédula de Ciudadanía', 'CC', 'NUMERIC', 6, 10, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "document_type" WHERE upper("code") = 'CC'
);

DO $$
DECLARE
    skipped_count integer;
    found_count integer;
    preserved_count integer;
    defaulted_count integer;
    cc_id integer;
BEGIN
    SELECT COUNT(*) INTO skipped_count
    FROM "client"
    WHERE "id_document_type" IS NOT NULL;

    SELECT COUNT(*) INTO found_count
    FROM "client"
    WHERE "id_document_type" IS NULL;

    SELECT "id_document_type" INTO cc_id
    FROM "document_type"
    WHERE upper("code") = 'CC'
    ORDER BY "id_document_type"
    LIMIT 1;

    IF cc_id IS NULL THEN
        RAISE EXCEPTION 'Precondición COM-27: no existe Cédula de Ciudadanía (CC) en document_type';
    END IF;

    UPDATE "client" AS client_row
    SET
        "id_document_type" = matched."id_document_type",
        "type_identity" = matched."code"
    FROM (
        SELECT DISTINCT ON (upper("code")) "id_document_type", "code"
        FROM "document_type"
        ORDER BY upper("code"), "id_document_type"
    ) AS matched
    WHERE client_row."id_document_type" IS NULL
      AND upper(btrim(client_row."type_identity")) = upper(matched."code");

    GET DIAGNOSTICS preserved_count = ROW_COUNT;

    UPDATE "client"
    SET
        "id_document_type" = cc_id,
        "type_identity" = 'CC'
    WHERE "id_document_type" IS NULL;

    GET DIAGNOSTICS defaulted_count = ROW_COUNT;

    IF EXISTS (SELECT 1 FROM "client" WHERE "id_document_type" IS NULL) THEN
        RAISE EXCEPTION 'COM-27: quedaron clientes sin tipo de documento';
    END IF;

    INSERT INTO "audit_log" ("action", "details", "created_at")
    VALUES (
        'CLIENT_DOCUMENT_TYPE_MIGRATED',
        format(
            'found=%s migrated=%s preserved=%s defaulted_cc=%s skipped=%s errors=0',
            found_count,
            preserved_count + defaulted_count,
            preserved_count,
            defaulted_count,
            skipped_count
        ),
        CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'COM-27 client document type migration found=% migrated=% preserved=% defaulted_cc=% skipped=% errors=0',
        found_count,
        preserved_count + defaulted_count,
        preserved_count,
        defaulted_count,
        skipped_count;
END $$;

ALTER TABLE "client" ALTER COLUMN "id_document_type" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_id_document_type_fkey'
    ) THEN
        ALTER TABLE "client"
            ADD CONSTRAINT "client_id_document_type_fkey"
            FOREIGN KEY ("id_document_type")
            REFERENCES "document_type"("id_document_type")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "client_id_document_type_idx" ON "client"("id_document_type");
