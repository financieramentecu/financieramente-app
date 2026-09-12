-- Seed Leads Analytics report definition and default category permissions.

INSERT INTO "report_definition" ("code", "name", "description", "route_path", "status", "created_at", "updated_at")
VALUES (
	'LEADS_ANALYTICS',
	'Analítica de Leads',
	'Reporte dinámico de leads por estado de seguimiento, conversión a negocio y carga por asesor',
	'/dashboard/reportes/leads-analytics',
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
WHERE rd."code" = 'LEADS_ANALYTICS'
ON CONFLICT ("id_report", "id_category") DO UPDATE SET
	"status" = true,
	"updated_at" = NOW();
