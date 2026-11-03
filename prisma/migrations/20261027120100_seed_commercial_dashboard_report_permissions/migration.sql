-- Registra el reporte Dashboard Comercial y lo habilita por defecto para
-- Performance Leader y Business Leader (idempotente).

INSERT INTO "report_definition" ("code", "name", "description", "route_path", "status", "created_at", "updated_at")
VALUES (
	'COMMERCIAL_DASHBOARD',
	'Dashboard Comercial',
	'Embudo comercial, contacto, citas, asistencia y leads estancados por Money Strategist',
	'/dashboard/reportes/comercial',
	true,
	NOW(),
	NOW()
)
ON CONFLICT ("code") DO UPDATE SET
	"name" = EXCLUDED."name",
	"description" = EXCLUDED."description",
	"route_path" = EXCLUDED."route_path",
	"status" = true,
	"updated_at" = NOW();

INSERT INTO "category_report_permission" ("id_report", "id_category", "status", "created_at", "updated_at")
SELECT rd."id", c."id_category", true, NOW(), NOW()
FROM "report_definition" rd
INNER JOIN "category" c
	ON c."name" IN ('Performance Leader', 'Business Leader')
	AND c."status" = true
WHERE rd."code" = 'COMMERCIAL_DASHBOARD'
ON CONFLICT ("id_report", "id_category") DO UPDATE SET
	"status" = true,
	"updated_at" = NOW();
