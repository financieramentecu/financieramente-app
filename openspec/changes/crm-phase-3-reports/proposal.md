# Proposal: CRM Phase 3 — Pipeline reports

## Why
Managers cannot answer "how is the pipeline converting, where do leads get stuck, which origin and which team convert best, and what is the pipeline worth". Andrés's summary cards (`/api/crm/reports/summary`) only count leads per stage. Odoo's pipeline analysis and EspoCRM/SuiteCRM reports answer these questions; we port them on top of the data from Phases 0–2 (stage history, outcome, estimated value, probability).

## What
A **Reportes** tab in Negocios → CRM, behind the existing `crm_reports` flag, with one report for a created-at range (default: last 90 days, Bogotá):
- **Outcomes:** total, open, won, lost, abandoned; win rate (won / closed) and conversion rate (won / total).
- **Conversion funnel:** leads that reached each stage (by the furthest stage in their history) and the conversion from the previous stage.
- **Time per stage:** average and median days spent in each stage (completed stays only).
- **Breakdowns:** by origin (`originTag`), by advisor (owner) and by team (owner's leader), each with totals, win rate, estimated and weighted value.
- **Forecast:** open leads per stage with estimated and weighted value (value × probability).

## Constraints
- Read-only, aggregate output: no contact fields in the response.
- Hierarchy scope (`buildLeadTableWhere`), owner filter only narrows the scope.
- Access: CRM access **and** the new report code `CRM_PIPELINE` in Permisos de Reportes (`canViewReport`; ADMIN and CONSULTOR bypass, others by category).
- Bounded: at most 20,000 leads per report (413 asking to narrow the range); range at most 366 days.
- No schema change.

## Out of scope
Report export (PDF/Excel), scheduled report emails, loss reasons (Phase 4), multiple pipelines (Phase 4).
