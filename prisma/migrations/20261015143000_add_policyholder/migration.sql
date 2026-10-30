-- COM-28: tomador independiente del cliente. La relación es por negocio.
-- Los negocios existentes quedan con client_is_policyholder = true (Sí).
-- Reejecutar no crea tomadores ni cambia un vínculo ya definido.

CREATE TABLE IF NOT EXISTS "policyholder" (
    "id_policyholder" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "last_name" VARCHAR(200) NOT NULL,
    "type_identity" VARCHAR(10) NOT NULL,
    "id_document_type" INTEGER NOT NULL,
    "identity_number" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policyholder_pkey" PRIMARY KEY ("id_policyholder")
);

CREATE UNIQUE INDEX IF NOT EXISTS "policyholder_type_identity_identity_number_key"
    ON "policyholder"("type_identity", "identity_number");

CREATE INDEX IF NOT EXISTS "policyholder_identity_number_idx"
    ON "policyholder"("identity_number");

CREATE INDEX IF NOT EXISTS "policyholder_id_document_type_idx"
    ON "policyholder"("id_document_type");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'policyholder_id_document_type_fkey'
    ) THEN
        ALTER TABLE "policyholder"
            ADD CONSTRAINT "policyholder_id_document_type_fkey"
            FOREIGN KEY ("id_document_type")
            REFERENCES "document_type"("id_document_type")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "business"
    ADD COLUMN IF NOT EXISTS "client_is_policyholder" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "business"
    ADD COLUMN IF NOT EXISTS "id_policyholder" INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'business_id_policyholder_fkey'
    ) THEN
        ALTER TABLE "business"
            ADD CONSTRAINT "business_id_policyholder_fkey"
            FOREIGN KEY ("id_policyholder")
            REFERENCES "policyholder"("id_policyholder")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "business_id_policyholder_idx"
    ON "business"("id_policyholder");

DO $$
DECLARE
    total_count integer;
    same_count integer;
    distinct_count integer;
BEGIN
    SELECT COUNT(*) INTO total_count FROM "business";
    SELECT COUNT(*) INTO same_count FROM "business" WHERE "client_is_policyholder" = true;
    SELECT COUNT(*) INTO distinct_count FROM "business" WHERE "client_is_policyholder" = false;

    INSERT INTO "audit_log" ("action", "details", "created_at")
    VALUES (
        'BUSINESS_POLICYHOLDER_MIGRATED',
        format(
            'found=%s same_policyholder=%s distinct_policyholder=%s errors=0',
            total_count,
            same_count,
            distinct_count
        ),
        CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'COM-28 policyholder migration found=% same=% distinct=% errors=0',
        total_count, same_count, distinct_count;
END $$;
