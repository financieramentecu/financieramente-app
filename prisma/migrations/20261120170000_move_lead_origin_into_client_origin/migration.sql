-- The lead catalogue created in 20261119141100 is retired.
-- Its code is stored on the existing client_origin table.
-- Existing client_origin rows keep their name, description and status.
-- Existing lead_client_origin rows are left as they are.

ALTER TABLE "client_origin" ADD COLUMN "code" VARCHAR(120);

CREATE UNIQUE INDEX "client_origin_code_key" ON "client_origin"("code");

UPDATE "client_origin" AS client
SET "code" = origin."code"
FROM "lead_origin" AS origin
WHERE client."code" IS NULL
  AND lower(client."name") = lower(origin."name");

INSERT INTO "client_origin" ("name", "description", "status", "code", "created_at", "updated_at")
SELECT left(origin."name", 100), NULL, origin."status", origin."code", origin."created_at", origin."updated_at"
FROM "lead_origin" AS origin
WHERE NOT EXISTS (
    SELECT 1
    FROM "client_origin" AS client
    WHERE lower(client."name") = lower(origin."name")
       OR client."code" = origin."code"
);

INSERT INTO "lead_client_origin" (
    "id_lead",
    "id_client_origin",
    "active",
    "first_seen_at",
    "last_seen_at",
    "created_at",
    "updated_at"
)
SELECT
    assignment."id_lead",
    client."id_client_origin",
    assignment."active",
    assignment."first_seen_at",
    assignment."last_seen_at",
    assignment."created_at",
    assignment."updated_at"
FROM "lead_origin_assignment" AS assignment
JOIN "lead_origin" AS origin ON origin."id_lead_origin" = assignment."id_lead_origin"
JOIN "client_origin" AS client ON client."code" = origin."code"
ON CONFLICT ("id_lead", "id_client_origin") DO NOTHING;

DROP TABLE "lead_origin_assignment";

DROP TABLE "lead_origin";
