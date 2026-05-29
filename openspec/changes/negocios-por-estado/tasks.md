# Tasks: Negocios por Estado Donut Chart

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 420–520 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR (size:exception — delivery strategy is single-pr) |
| Delivery strategy | single-pr |
| Chain strategy | N/A |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

> Delivery strategy is `single-pr`. A `size:exception` acknowledgement is required before `sdd-apply` starts.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All tasks below | PR 1 (size:exception) | Single PR covering types → lib → service → API → hook → components → layout → tests |

---

## Phase 1: Foundation — Types & Constants

- [ ] 1.1 Append `STATUS_DONUT_ALLOWED`, `StatusDonutKey`, `StatusDonutQueryParams`, `StatusDonutRaw`, `StatusDonutSlice` to `src/features/production-dashboard/types/production-kpi.types.ts`
- [ ] 1.2 Create `src/features/production-dashboard/lib/by-status-colors.ts` — export `STATUS_COLORS: Record<StatusDonutKey, string>` with exact hex values from spec and `STATUS_DISPLAY_LABELS: Record<StatusDonutKey, string>`

## Phase 2: Core Implementation — Lib, Service & Route

- [ ] 2.1 Create `src/features/production-dashboard/lib/by-status-aggregate.ts` — export `aggregateStatusDonut(raw: StatusDonutRaw[]): StatusDonutSlice[]`; compute percentage (1 decimal, rounds to 0–100 sum); attach fill from `STATUS_COLORS`; return empty array on empty input
- [ ] 2.2 Create `src/features/production-dashboard/services/by-status.service.ts` — export `getBusinessesByStatusRaw(params: StatusDonutQueryParams): Promise<StatusDonutRaw[]>`; uses `prisma.business.groupBy(['status'])` with `STATUS_DONUT_ALLOWED` IN filter + `buildProductionWhereClause`; short-circuits on empty `userIds`; filters null status from result
- [ ] 2.3 Create `src/app/api/production-dashboard/by-status/route.ts` — auth guard, parse query params, call `getBusinessesByStatusRaw`, return `ApiResponse<StatusDonutRaw[]>`

## Phase 3: Integration — Hook & Components

- [ ] 3.1 Create `src/features/production-dashboard/hooks/use-status-donut.ts` — mirrors `useCompanyDonut` state machine (`AsyncState<StatusDonutSlice[]>`); reads `DashboardFilterContext` + `HierarchySelectionContext`; aborts on unmount; runs `aggregateStatusDonut` client-side
- [ ] 3.2 Create `src/features/production-dashboard/components/StatusDonutTooltip.tsx` — renders `"COUNT (PCT%)"` on active shape; disappears on mouse-out; no Recharts default tooltip
- [ ] 3.3 Create `src/features/production-dashboard/components/StatusDonutLegend.tsx` — renders `"LABEL · PCT%"` per slice using `STATUS_DISPLAY_LABELS`; accepts `slices: StatusDonutSlice[]`
- [ ] 3.4 Create `src/features/production-dashboard/components/StatusDonutChart.tsx` — Recharts `PieChart` + `Pie`; uses `StatusDonutTooltip`; passes `fill` from slice data; empty state: icon + "Sin negocios para los filtros aplicados"
- [ ] 3.5 Create `src/features/production-dashboard/components/StatusDonutPanel.tsx` — composes `useStatusDonut` + `StatusDonutChart` + `StatusDonutLegend`; handles idle/loading/error states with shared skeletons
- [ ] 3.6 Modify `src/features/production-dashboard/components/DashboardShell.tsx` — update grid class from `md:grid-cols-2` to `md:grid-cols-2 xl:grid-cols-3`; import and render `StatusDonutPanel` as third child

## Phase 4: Testing (TDD — RED → GREEN per layer)

- [ ] 4.1 Create `src/features/production-dashboard/__tests__/by-status-aggregate.test.ts` — table tests: empty input, single status 100%, three-status distribution sums to 100, sub-1% precision, fill matches `STATUS_COLORS`
- [ ] 4.2 Create `src/features/production-dashboard/__tests__/by-status.service.test.ts` — mock `prisma.business.groupBy`; test: empty userIds returns `[]`, WHERE contains IN clause, null status filtered, all filter dimensions forwarded
- [ ] 4.3 Create `src/features/production-dashboard/__tests__/use-status-donut.test.tsx` — `renderHook` + `waitFor`; test: loading → success, loading → error, refetch on `appliedFilters` change, abort controller fires on unmount
- [ ] 4.4 Create `src/app/api/production-dashboard/by-status/__tests__/route.test.ts` — test: 401 without auth, 200 with valid params, empty array result shape, ApiResponse wrapper
- [ ] 4.5 Verify all new tests pass: `npm run test:unit`
