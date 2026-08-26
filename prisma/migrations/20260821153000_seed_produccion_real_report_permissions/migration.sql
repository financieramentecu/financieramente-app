-- Idempotent catalog + default category enablement for Producción Real.
-- Deploy pipelines run `prisma migrate deploy` but not `prisma db seed`.

INSERT INTO "report_definition" ("code", "name", "description", "route_path", "status", "created_at", "updated_at")
VALUES (
	'PRODUCCION_REAL',
	'Producción Real',
	'Reporte de Producción Real con filtros, jerarquía y KPIs',
	'/dashboard/reportes/produccion-real',
	true,
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
	"name" = EXCLUDED."name",
	"description" = EXCLUDED."description",
	"route_path" = EXCLUDED."route_path",
	"status" = true,
	"updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "category_report_permission" ("id_report", "id_category", "status", "created_at", "updated_at")
SELECT
	rd."id",
	c."id_category",
	true,
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
FROM "report_definition" rd
INNER JOIN "category" c
	ON c."name" = 'Performance Leader'
	AND c."status" = true
WHERE rd."code" = 'PRODUCCION_REAL'
ON CONFLICT ("id_report", "id_category") DO UPDATE SET
	"status" = true,
	"updated_at" = CURRENT_TIMESTAMP;
