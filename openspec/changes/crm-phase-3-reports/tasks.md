# Tasks: CRM Phase 3 — Pipeline reports

Strict TDD: every RED test is written and seen failing before its GREEN implementation.

## 1. Query and access
- [x] 1.1 RED/GREEN `crm-report-query.schema.test.ts` — defaults, both bounds, order, span, owners.
- [x] 1.2 `CRM_PIPELINE` in `REPORT_CODES` / `KNOWN_REPORT_DEFINITIONS`; catalog test updated.
- [x] 1.3 `CrmActor.idCategory`; guard test updated.

## 2. Pure builder
- [x] 2.1 RED/GREEN outcomes and rates.
- [x] 2.2 RED/GREEN funnel (furthest stage, skipped stage, fallback ignored).
- [x] 2.3 RED/GREEN time per stage (initial stay, open stay excluded, median).
- [x] 2.4 RED/GREEN breakdowns (origin, advisor, team, buckets, sort).
- [x] 2.5 RED/GREEN forecast (open only, weighted, unknown stage last).

## 3. Service and route
- [x] 3.1 RED/GREEN `crm-pipeline-report.service.test.ts` — scope where, limit, dataset mapping.
- [x] 3.2 RED/GREEN `GET /api/crm/reports/pipeline` route test — 401/404/403 report/400/413/200.

## 4. UI
- [ ] 4.0 Mockup "CRM — Reportes" in `Financiera.pen`; sign-off.
- [x] 4.1 `useCrmPipelineReport` (`AsyncState<T>`) + test.
- [x] 4.2 `CrmReports` component + test; enable the tab behind `crm_reports`.

## 5. Docs and verify
- [x] 5.1 Changeset, plan doc, env docs.
- [ ] 5.2 `type-check`, `lint`, `test:unit`.
- [ ] 5.3 Integration/E2E against a disposable database (pending: configured databases are remote).
