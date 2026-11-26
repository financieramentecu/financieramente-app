# Design: CRM Phase 3 — Pipeline reports

## D1. One endpoint, one pure builder
`GET /api/crm/reports/pipeline?from&to&owner` → `getCrmPipelineReport` loads a bounded dataset (leads, stage changes, stages, owners) and `buildCrmPipelineReport(dataset, now)` computes everything in memory. All maths lives in pure, unit-tested functions; the service only queries.

Why not SQL aggregates: the funnel ("furthest stage reached") and stage durations need per-lead ordered history; doing it in SQL means raw queries that cannot reuse the Prisma scope builder. The 20,000-lead cap keeps memory bounded (≈ a few MB).

## D2. Scope
The lead WHERE reuses `buildLeadTableWhere` with `from/to/ownerIds` so the report sees exactly what the Leads table sees for the same filters. Stage changes are loaded with `lead: <same where>`.

## D3. Funnel
Stages: active, non-fallback columns ordered by `position`, then id. For each lead, the furthest rank among its current column and every `from`/`to` column of its history. `reached(stage) = leads whose furthest rank ≥ stage rank`. Leads only ever seen in fallback/inactive columns count in outcomes but not in the funnel. `conversionFromPrevious = reached / reached(previous)`, null for the first stage or when previous is 0.

## D4. Time per stage
Per lead, history sorted by `changedAt`: the stay in `from` of the first change runs from `lead.createdAt` (when `from` is set); each change starts a stay in `to` that ends at the next change. The current (open) stay is excluded. Negative durations (clock skew) are dropped. Days with one decimal; median of the samples.

## D5. Rates
`winRate = won / (won + lost + abandoned)`, `conversionRate = won / total`; null when the denominator is 0. Rounded to 4 decimals (fraction, UI shows %).

## D6. Breakdowns
- Origin: `originTag` trimmed; empty → "Sin origen".
- Advisor: owner; no owner → "Sin asignar".
- Team: owner's leader (`User.idUserLeader`); owner without leader → "Sin líder"; no owner → "Sin asignar".
Each row: total, open, won, lost (lost + abandoned), winRate, estimatedValue, weightedValue (all leads with a value, any status). Sorted by total desc, label asc.

## D7. Forecast
Open leads only, grouped by current stage (stage order, unknown stages last): openLeads, valuedLeads, estimatedValue, weightedValue (= value × (probability ?? 0) / 100, same as Phase 2 totals), plus totals. Amounts are decimal strings (2 dp) computed with `Prisma.Decimal`.

## D8. Access
`requireCrmActor('crm_reports')` then `canViewReport({ roleCode, idCategory }, 'CRM_PIPELINE')` → 403. `CrmActor` gains `idCategory`. `CRM_PIPELINE` joins `KNOWN_REPORT_DEFINITIONS` (route `/dashboard/negocios/crm?tab=reportes`) so admins can grant it per category; it is not added to the Reportes menu (it lives in the CRM tab).

## D9. Query
`from`/`to` Bogotá `YYYY-MM-DD`, both or neither; default last 90 days ending today (Bogotá). `from ≤ to`, span ≤ 366 days, `owner` repeated positive ids (max 50). Invalid → 400.

## D10. UI
`CrmReports` (tab `reportes`): date range + "Aplicar", KPI cards, funnel bars, time-per-stage table, breakdown table with an Origen/Asesor/Equipo switch, forecast table. Hook `useCrmPipelineReport` with `AsyncState<T>`. 403 shows "No tienes permiso para ver este reporte"; 413 asks to narrow the range.
