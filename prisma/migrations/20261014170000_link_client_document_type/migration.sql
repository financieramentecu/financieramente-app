-- COM-27: links client to document_type and assigns CC only when no catalog type matches.
-- Idempotent: does not replace an id_document_type that is already set.
-- Same assignment rule as planClientDocumentTypeMigration().
-- If that plan reports a collision, this migration writes nothing.
-- Each client moved to CC stores its previous code in audit_log.details
-- (action CLIENT_DOCUMENT_TYPE_DEFAULTED) so the code can be restored.
-- User.type_identity stays without an FK (platform users, out of scope).
-- The policyholder (COM-28) is not a table yet; when added it must use this FK.
--
-- Read-only check to run on a backup BEFORE this migration (column id_document_type
-- does not exist yet). Collisions:
--
-- WITH catalog AS (
--     SELECT DISTINCT ON (upper("code")) "code"
--     FROM "document_type"
--     ORDER BY upper("code"), "id_document_type"
-- ),
-- projected AS (
--     SELECT
--         client_row."id_client",
--         client_row."identity_number",
--         client_row."type_identity" AS previous_type,
--         COALESCE(matched."code", 'CC') AS next_type,
--         matched."code" IS NULL AS out_of_catalog
--     FROM "client" AS client_row
--     LEFT JOIN catalog AS matched
--         ON upper(btrim(client_row."type_identity")) = upper(matched."code")
-- )
-- SELECT "identity_number", next_type, COUNT(*) AS clients, array_agg("id_client" ORDER BY "id_client") AS id_clients
-- FROM projected
-- GROUP BY "identity_number", next_type
-- HAVING COUNT(*) > 1;
--
-- Out-of-catalog codes:
--
-- SELECT client_row."id_client", client_row."type_identity", client_row."identity_number"
-- FROM "client" AS client_row
-- WHERE NOT EXISTS (
--     SELECT 1 FROM "document_type" AS document_type_row
--     WHERE upper(btrim(client_row."type_identity")) = upper(document_type_row."code")
-- );

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
    audited_count integer;
    out_of_catalog_count integer;
    collision_count integer;
    collision_sample text;
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

    WITH catalog AS (
        SELECT DISTINCT ON (upper("code")) "id_document_type", "code"
        FROM "document_type"
        ORDER BY upper("code"), "id_document_type"
    ),
    projected AS (
        SELECT
            client_row."id_client",
            client_row."identity_number",
            client_row."type_identity" AS previous_type,
            client_row."id_document_type" IS NULL AS will_assign,
            CASE
                WHEN client_row."id_document_type" IS NOT NULL THEN client_row."type_identity"
                WHEN matched."code" IS NOT NULL THEN matched."code"
                ELSE 'CC'
            END AS next_type
        FROM "client" AS client_row
        LEFT JOIN catalog AS matched
            ON client_row."id_document_type" IS NULL
           AND upper(btrim(client_row."type_identity")) = upper(matched."code")
    ),
    collision_keys AS (
        SELECT "identity_number", next_type
        FROM projected
        GROUP BY "identity_number", next_type
        HAVING COUNT(*) > 1
           AND bool_or(will_assign)
    )
    SELECT COUNT(*) INTO collision_count
    FROM collision_keys;

    IF collision_count > 0 THEN
        WITH catalog AS (
            SELECT DISTINCT ON (upper("code")) "id_document_type", "code"
            FROM "document_type"
            ORDER BY upper("code"), "id_document_type"
        ),
        projected AS (
            SELECT
                client_row."id_client",
                client_row."identity_number",
                client_row."type_identity" AS previous_type,
                client_row."id_document_type" IS NULL AS will_assign,
                CASE
                    WHEN client_row."id_document_type" IS NOT NULL THEN client_row."type_identity"
                    WHEN matched."code" IS NOT NULL THEN matched."code"
                    ELSE 'CC'
                END AS next_type
            FROM "client" AS client_row
            LEFT JOIN catalog AS matched
                ON client_row."id_document_type" IS NULL
               AND upper(btrim(client_row."type_identity")) = upper(matched."code")
        ),
        collision_keys AS (
            SELECT "identity_number", next_type
            FROM projected
            GROUP BY "identity_number", next_type
            HAVING COUNT(*) > 1
               AND bool_or(will_assign)
        )
        SELECT string_agg(sample_line, '; ' ORDER BY "id_client")
        INTO collision_sample
        FROM (
            SELECT
                projected."id_client",
                format(
                    'idClient=%s previousType=%s identityNumber=%s nextType=%s',
                    projected."id_client",
                    COALESCE(projected.previous_type, ''),
                    projected."identity_number",
                    projected.next_type
                ) AS sample_line
            FROM projected
            INNER JOIN collision_keys
                ON collision_keys."identity_number" = projected."identity_number"
               AND collision_keys.next_type = projected.next_type
            ORDER BY projected."id_client"
            LIMIT 20
        ) AS samples;

        RAISE EXCEPTION '%', format(
            'COM-27: %s colisión(es) sobre (type_identity, identity_number). Corrija esos clientes antes de migrar. Muestra: %s',
            collision_count,
            COALESCE(collision_sample, '')
        );
    END IF;

    SELECT COUNT(*) INTO out_of_catalog_count
    FROM "client" AS client_row
    WHERE client_row."id_document_type" IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM "document_type" AS document_type_row
          WHERE upper(btrim(client_row."type_identity")) = upper(document_type_row."code")
      );

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

    INSERT INTO "audit_log" ("action", "details", "created_at")
    SELECT
        'CLIENT_DOCUMENT_TYPE_DEFAULTED',
        format(
            'idClient=%s previousType=%s identityNumber=%s assignedType=CC idDocumentType=%s',
            client_row."id_client",
            COALESCE(client_row."type_identity", ''),
            client_row."identity_number",
            cc_id
        ),
        CURRENT_TIMESTAMP
    FROM "client" AS client_row
    WHERE client_row."id_document_type" IS NULL;

    GET DIAGNOSTICS audited_count = ROW_COUNT;

    UPDATE "client"
    SET
        "id_document_type" = cc_id,
        "type_identity" = 'CC'
    WHERE "id_document_type" IS NULL;

    GET DIAGNOSTICS defaulted_count = ROW_COUNT;

    IF audited_count <> defaulted_count THEN
        RAISE EXCEPTION 'COM-27: el respaldo de códigos (%) no coincide con los clientes pasados a CC (%)',
            audited_count,
            defaulted_count;
    END IF;

    IF EXISTS (SELECT 1 FROM "client" WHERE "id_document_type" IS NULL) THEN
        RAISE EXCEPTION 'COM-27: quedaron clientes sin tipo de documento';
    END IF;

    INSERT INTO "audit_log" ("action", "details", "created_at")
    VALUES (
        'CLIENT_DOCUMENT_TYPE_MIGRATED',
        format(
            'found=%s migrated=%s preserved=%s defaulted_cc=%s skipped=%s out_of_catalog=%s errors=0',
            found_count,
            preserved_count + defaulted_count,
            preserved_count,
            defaulted_count,
            skipped_count,
            out_of_catalog_count
        ),
        CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'COM-27 client document type migration found=% migrated=% preserved=% defaulted_cc=% skipped=% out_of_catalog=% errors=0',
        found_count,
        preserved_count + defaulted_count,
        preserved_count,
        defaulted_count,
        skipped_count,
        out_of_catalog_count;
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
