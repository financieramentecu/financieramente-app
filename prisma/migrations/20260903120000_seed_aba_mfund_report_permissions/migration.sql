-- Idempotent catalog + default category enablement for ABA-MFUND and
-- Analítica de Leads. Deploy pipelines run `prisma migrate deploy` but not
-- `prisma db seed`. Without these rows the reports never appear in Permisos
-- de Reportes and category-gated users cannot see them like Producción Real.
-- LEADS_ANALYTICS is re-asserted here because the earlier
-- 20260821180000 migration may have run before categories existed (0 permission
-- rows) or never applied on some environments.

INSERT INTO "report_definition" ("code", "name", "description", "route_path", "status", "created_at", "updated_at")
VALUES (
	'ABA_MFUND',
	'ABA-MFUND',
	'Reporte ABA-MFUND (SKANDIA + MFUND) con KPIs, ranking y detalle',
	'/dashboard/reportes/aba-mfund',
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
WHERE rd."code" IN ('ABA_MFUND', 'LEADS_ANALYTICS')
ON CONFLICT ("id_report", "id_category") DO UPDATE SET
	"status" = true,
	"updated_at" = NOW();
