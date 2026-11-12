---
'financieramente-app': minor
---

### Agregado
- CRM: pestaña **Reportes** con el análisis del pipeline para un rango de fechas (por defecto, los últimos 90 días).
- CRM: indicadores de leads, ganados, tasa de cierre (ganados sobre cerrados) y conversión (ganados sobre el total).
- CRM: embudo de conversión por etapa y tiempo promedio y mediano que pasan los leads en cada etapa.
- CRM: leads por origen, por asesor y por equipo, con valor estimado y ponderado.
- CRM: pronóstico del pipeline abierto por etapa con el valor ponderado (valor estimado × probabilidad).
- Permisos de Reportes: nuevo reporte **CRM — Pipeline** para habilitarlo por categoría.

### Técnico
- New endpoint `GET /api/crm/reports/pipeline?from&to&owner` behind `crm_reports` plus `canViewReport(…, 'CRM_PIPELINE')`; aggregates only (no contact fields), hierarchy-scoped through `buildLeadTableWhere`, capped at 20,000 leads (413) and 366 days.
- New report code `CRM_PIPELINE` in `KNOWN_REPORT_DEFINITIONS` (upserted by `ensureKnownReportDefinitions`).
- New feature folder `src/features/leads/reports/` (pure builder `buildCrmPipelineReport`, service, query schema, hook, `CrmReports` tab).
- `CrmActor` exposes `idCategory`. No schema change.
