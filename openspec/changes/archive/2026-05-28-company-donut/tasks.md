# Tasks: Company Donut Chart (Negocios por Compañía)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: types + libs + service + route + tests · PR 2: hook + UI + shell + tests |
| Delivery strategy | single-pr (size:exception approved) |
| Chain strategy | N/A — single PR with size:exception |

Decision needed before apply: Resolved (size:exception)
Chained PRs recommended: Yes (overridden by user — single-pr exception)
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types, pure libs, service, route + their tests | PR 1 | Base: feat/pie-origen-client; fully testable in isolation |
| 2 | Hook, UI components, DashboardShell layout + their tests | PR 2 | Base: PR 1 branch; depends on route contract from Unit 1 |

---

## Phase 1: Foundation — Types

- [x] 1.1 Add `CompanyDonutQueryParams`, `CompanyDonutRaw`, `CompanyDonutSlice` to `src/features/production-dashboard/types/production-kpi.types.ts`

## Phase 2: Pure Libraries

- [x] 2.1 Create `src/features/production-dashboard/lib/company-donut-colors.ts` — `COMPANY_BASE_PALETTE` (teal/indigo/rose/amber family, 8 colors), `COMPANY_LIGHT_PALETTE` (300-variants), `COP_CURRENCY_ID` re-export, `resolveCompanyDonutColor(paletteIndex, currencyId)`, `buildCompanyPaletteMap(companyIds)`
- [x] 2.2 Create `src/features/production-dashboard/lib/company-donut-aggregate.ts` — `aggregateCompanyDonut(raw)`: total count, percentage (1 decimal), attach `fill`/`fillLight` via palette map sorted by `idCompany` asc
- [x] 2.3 Write `src/features/production-dashboard/__tests__/lib/company-donut-colors.test.ts` — palette lengths, COP→light, base for non-COP, modulo wrap, sort stability, deduplication, distinct from origin palette
- [x] 2.4 Write `src/features/production-dashboard/__tests__/lib/company-donut-aggregate.test.ts` — empty input, all-zero counts, single item at 100%, multi-item percentage sum, 1-decimal rounding, fill assignment (COP vs non-COP), fillLight always present, preserves raw fields

## Phase 3: Service

- [x] 3.1 Create `src/features/production-dashboard/services/company-donut.service.ts` — `getCompanyDonutRaw(params)`: short-circuit on empty `userIds`; `prisma.business.findMany` with deep relation select (`productPercentageCommission.productConfiguration.product.{idCompany, company.{idCompany, name}}` + `idCurrency` + `value`); reduce into `Map<"${companyId}-${currencyId}", accumulator>`; join `prisma.currency.findMany`; return `CompanyDonutRaw[]`
- [x] 3.2 Write `src/features/production-dashboard/__tests__/services/company-donut.service.test.ts` — mock `@/lib/prisma` (business.findMany + currency.findMany), mock `ms-chart.service` (buildProductionWhereClause); test: empty userIds short-circuit, empty findMany result, correct reduce into (companyId×currencyId) buckets, currency join, buildProductionWhereClause called with params

## Phase 4: Route

- [x] 4.1 Create `src/app/api/production-dashboard/by-company/route.ts` — mirror `by-origin/route.ts` exactly: `parseIds`, `buildFiltersFromSearchParams`, `GET` handler with auth check, `userIds` validation, call `getCompanyDonutRaw`, return `ApiResponse<CompanyDonutRaw[]>`
- [x] 4.2 Write `src/features/production-dashboard/__tests__/services/by-company.route.test.ts` — test: 401 without session, 400 missing userIds, 400 invalid userIds, 200 empty array, 200 with data, 500 on service throw

## Phase 5: Hook

- [x] 5.1 Create `src/features/production-dashboard/hooks/use-company-donut.ts` — mirror `use-origin-donut.ts`: `AsyncState<CompanyDonutSlice[]>`, MS Junior path (session userId), hierarchy gating, AbortController + cancelled flag, call `/api/production-dashboard/by-company`, call `aggregateCompanyDonut` on success; **no** `trmRate` prop
- [x] 5.2 Write `src/features/production-dashboard/__tests__/hooks/use-company-donut.test.ts` — mock `fetch`; test: idle, loading, error, success with aggregated slices, AbortController cancel on unmount, empty selectedUserIds short-circuits to empty success, MS Junior path uses session userId

## Phase 6: UI Components

- [x] 6.1 Create `src/features/production-dashboard/components/CompanyDonutTooltip.tsx` — format: `"SKANDIA · COP · 130 (48.2%)"`; pure component, no trmRate prop; mirror OriginDonutTooltip structure
- [x] 6.2 Create `src/features/production-dashboard/components/CompanyDonutLegend.tsx` — format: `"COMPANY · PCT%"`; sorted descending by percentage; mirror OriginDonutLegend with `companyId` key
- [x] 6.3 Create `src/features/production-dashboard/components/CompanyDonutChart.tsx` — Recharts `PieChart` donut; skeleton for idle/loading; error card; `EmptyState` with `"Sin negocios para los filtros aplicados"`; `Cell` keyed by `"${companyId}-${currencyId}"`; `CompanyDonutTooltip` (no trmRate); `CompanyDonutLegend`
- [x] 6.4 Create `src/features/production-dashboard/components/CompanyDonutPanel.tsx` — thin container: calls `useCompanyDonut`, renders section with header `"Distribución por compañía"`, passes state to `CompanyDonutChart`
- [x] 6.5 Write `src/features/production-dashboard/__tests__/components/CompanyDonutChart.test.tsx` — renders skeleton on loading/idle, error card on error, EmptyState on empty data, chart on success data; mirrors OriginDonutChart test patterns

## Phase 7: Shell Integration

- [x] 7.1 Modify `src/features/production-dashboard/components/DashboardShell.tsx` — import `CompanyDonutPanel`; replace standalone `<OriginDonutPanel trmRate={trmRate} />` with `<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><OriginDonutPanel trmRate={trmRate} /><CompanyDonutPanel /></div>`
