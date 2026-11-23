-- Configurable activity labels for CRM task cards. Seeded rows keep the
-- built-in LeadTaskType names; existing tasks point at the matching label.
CREATE TABLE "lead_activity_label" (
    "id_lead_activity_label" SERIAL NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#64748b',
    "code" VARCHAR(20),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_activity_label_pkey" PRIMARY KEY ("id_lead_activity_label")
);

CREATE UNIQUE INDEX "lead_activity_label_code_key" ON "lead_activity_label"("code");
CREATE INDEX "lead_activity_label_active_position_idx" ON "lead_activity_label"("active", "position");

ALTER TABLE "lead_activity_label" ADD CONSTRAINT "lead_activity_label_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lead_task" ADD COLUMN "id_lead_activity_label" INTEGER;
CREATE INDEX "lead_task_id_lead_activity_label_idx" ON "lead_task"("id_lead_activity_label");
ALTER TABLE "lead_task" ADD CONSTRAINT "lead_task_id_lead_activity_label_fkey" FOREIGN KEY ("id_lead_activity_label") REFERENCES "lead_activity_label"("id_lead_activity_label") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "lead_activity_label" ("name", "color", "code", "position", "created_by", "updated_at")
SELECT v.name, v.color, v.code, v.position, u.id_user, CURRENT_TIMESTAMP
FROM (
    VALUES
        ('Tarea', '#64748b', 'TODO', 0),
        ('Llamada', '#0284c7', 'CALL', 1),
        ('Reunión', '#7c3aed', 'MEETING', 2),
        ('Email', '#0f766e', 'EMAIL', 3),
        ('WhatsApp', '#15803d', 'WHATSAPP', 4)
) AS v(name, color, code, position)
CROSS JOIN LATERAL (
    SELECT "id_user" FROM "user" ORDER BY "id_user" ASC LIMIT 1
) AS u;

UPDATE "lead_task" AS t
SET "id_lead_activity_label" = l."id_lead_activity_label"
FROM "lead_activity_label" AS l
WHERE l."code" = t."type"::text
  AND t."id_lead_activity_label" IS NULL;
