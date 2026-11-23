-- Editable titles for the four activities-board columns.
-- The code stays fixed; only the visible name changes.
CREATE TABLE "lead_activity_column" (
    "id_lead_activity_column" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_activity_column_pkey" PRIMARY KEY ("id_lead_activity_column")
);

CREATE UNIQUE INDEX "lead_activity_column_code_key" ON "lead_activity_column"("code");

ALTER TABLE "lead_activity_column" ADD CONSTRAINT "lead_activity_column_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "lead_activity_column" ("code", "name", "position", "updated_by", "updated_at")
SELECT v.code, v.name, v.position, u.id_user, CURRENT_TIMESTAMP
FROM (
    VALUES
        ('overdue', 'Vencidas', 0),
        ('today', 'Vencen hoy', 1),
        ('upcoming', 'Próximas a vencer', 2),
        ('done', 'Completadas', 3)
) AS v(code, name, position)
CROSS JOIN LATERAL (
    SELECT "id_user" FROM "user" ORDER BY "id_user" ASC LIMIT 1
) AS u;
