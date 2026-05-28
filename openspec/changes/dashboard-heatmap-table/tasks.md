# Tasks: Production Dashboard — Heatmap Table

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 520–650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → Types + Service + Route · PR 2 → Hook + Component + Wiring |
| Delivery strategy | single-pr with size:exception approved |
| Chain strategy | N/A (single PR) |

Decision needed before apply: Resolved — size:exception approved
Chained PRs recommended: Yes → overridden by user decision (single-pr + size:exception)
Chain strategy: N/A
400-line budget risk: High → accepted

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types + Service + API Route (backend slice) | PR 1 | COMPLETE |
| 2 | Hook + Component + ShellContent wiring (frontend slice) | PR 2 | COMPLETE |

---

## Phase 1: Foundation — Types

- [x] T-001 (XS) — **[TEST-RED]** Write failing type-guard test `src/features/production-dashboard/__tests__/types/heatmap.types.test.ts`: assert `HeatmapRaw`, `PersonRow`, `CompanyColumn`, `CategoryLegendItem`, `HeatmapViewModel`, `HeatmapQueryParams` export with correct shape (use `satisfies`).
- [x] T-002 (S) — **[GREEN]** Add `HeatmapRaw`, `HeatmapQueryParams`, `PersonRow`, `CompanyColumn`, `CategoryLegendItem`, `HeatmapViewModel` interfaces to `src/features/production-dashboard/types/production-kpi.types.ts`. No `any`. All arrays `ReadonlyArray`. Map fields use `ReadonlyMap`. Make T-001 pass.
- [x] T-003 (XS) — **[REFACTOR]** Ensure `HeatmapQueryParams` excludes `isInternacional` at the type level. Run `npm run type-check` to verify no regressions.

---

## Phase 2: Core Service

- [x] T-004 (S) — **[TEST-RED]** Create `src/features/production-dashboard/__tests__/services/heatmap.service.test.ts`. Write failing tests for: (a) `buildLevelOrderMap` assigns numeric rank via `idNextLevel` chain; (b) empty `userIds` returns `[]` without Prisma call; (c) aggregation groups by `(idUser, idCompany)` summing `copTotal`; (d) `isInternacional` is never forwarded; (e) orphan level node gets `levelOrder = 0`.
- [x] T-005 (M) — **[GREEN]** Create `src/features/production-dashboard/services/heatmap.service.ts`. Implement: `buildLevelOrderMap(levels)` walks `idNextLevel` chain → returns `Map<number, number>`; `resolveViewerScope(viewerId, role)` returns `userIds[]` (reuse `isHierarchyBypassRole` + `GENERAL_LEVEL` pattern from `hierarchy-tree.service.ts`); `getHeatmapRaw(params)` calls `buildProductionWhereClause` (imported from `ms-chart.service.ts`), runs `prisma.business.findMany` with nested include for company, JS-reduces into `HeatmapRaw[]`. Make T-004 pass.
- [x] T-006 (XS) — **[REFACTOR]** Extract `buildHeatmapCells` helper inside `heatmap.service.ts` if `getHeatmapRaw` exceeds 40 lines. Run `npm run type-check`.

---

## Phase 3: API Route

- [x] T-007 (S) — **[TEST-RED]** Create `src/features/production-dashboard/__tests__/services/heatmap.route.test.ts`. Write failing tests for: (a) unauthenticated → 401; (b) valid session → 200 with `ApiResponse<HeatmapRaw[]>`; (c) `isInternacional` query param is discarded before service call; (d) missing required params → 400.
- [x] T-008 (S) — **[GREEN]** Create `src/app/api/production-dashboard/heatmap/route.ts`. Implement `GET`: call `auth()`, return 401 if no session; parse query params mirroring `ms-chart/route.ts` parser (accept but discard `isInternacional`); call `resolveViewerScope` + intersect with `userIds`; delegate to `getHeatmapRaw`; return `NextResponse.json(buildApiResponse(data))`. Make T-007 pass.
- [x] T-009 (XS) — **[REFACTOR]** Confirm route handler contains no direct Prisma import. Run `npm run lint`.

---

## Phase 4: Hook

- [x] T-010 (S) — **[TEST-RED]** Create `src/features/production-dashboard/__tests__/hooks/use-heatmap-table.test.ts`. Write failing tests for: (a) `status === 'idle'` when `trmRate` is `null`; (b) rows sorted by `levelOrder` desc then `fullName` asc; (c) companies sorted by total USD desc; (d) all-zero-USD company column excluded; (e) COP-to-USD conversion uses `trmRate`; (f) `isInternacional` absent from fetch URL; (g) re-fetches on `appliedFilters` change.
- [x] T-011 (M) — **[GREEN]** Create `src/features/production-dashboard/hooks/use-heatmap-table.ts`. Implement `useHeatmapTable(trmRate)`: use `AsyncState<HeatmapViewModel>`; consume `HierarchySelectionContext` + `DashboardFilterContext`; remain `idle` while `trmRate` is null; on change fetch `/api/production-dashboard/heatmap` (exclude `isInternacional`); pivot `HeatmapRaw[]` → `PersonRow[]` (COP × trmRate); sort rows (`levelOrder` desc, `fullName` asc); build `CompanyColumn[]` (compute `totalUsd`, `maxUsd`, drop zero columns, sort USD desc); build `CategoryLegendItem[]` from visible rows. Make T-010 pass.
- [x] T-012 (XS) — **[REFACTOR]** Extract `pivotHeatmapRows` and `buildCompanyColumns` as pure functions in `src/features/production-dashboard/lib/pivot-heatmap.ts` if hook body > 60 lines. Run `npm run type-check`.

---

## Phase 5: Component

- [x] T-013 (S) — **[TEST-RED]** Create `src/features/production-dashboard/__tests__/components/HeatmapTablePanel.test.tsx`. Write failing tests for: (a) sticky first column has `position: sticky` inline style and `zIndex`; (b) non-zero cell has `rgba(59,130,246,…)` background; (c) zero-value cell has no background style; (d) negative cell is plain text with no color; (e) subtitle shows `"{n} asesores"`; (f) legend excludes categories not present in rows; (g) table is wrapped in `overflow-x-auto` container.
- [x] T-014 (M) — **[GREEN]** Create `src/features/production-dashboard/components/HeatmapTablePanel.tsx`. Implement: card wrapper; header with subtitle `"{rows.length} asesores"`; `CategoryLegendItem[]` legend top-right; `<div className="overflow-x-auto">`; `<table>`; first `<th>` + first `<td>` in each row carry `style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'var(--card)' }}`; cell intensity computed as `max(0.05, usdTotal / col.maxUsd)` for > 0; zero → no style; negative → plain text. Make T-013 pass.
- [x] T-015 (XS) — **[REFACTOR]** Extract `HeatmapCell` as a local subcomponent if render logic > 20 lines. Run `npm run type-check`.

---

## Phase 6: Integration / Wiring

- [x] T-016 (XS) — **[TEST-RED]** Add test to `src/features/production-dashboard/__tests__/components/shell-ordering.test.tsx`: `HeatmapTablePanel` appears after `MsBarChartPanel` in document order.
- [x] T-017 (XS) — **[GREEN]** Modify `src/features/production-dashboard/components/DashboardShell.tsx`: import `HeatmapTablePanel`; mount it after `<MsBarChartPanel …/>`, passing `trmRate` prop. Make T-016 pass.
- [x] T-018 (XS) — **[GREEN]** Modify `src/features/production-dashboard/index.ts`: add re-export for `HeatmapTablePanel` and `useHeatmapTable`.

---

## Phase 7: Final Verification

- [x] T-019 (XS) — Run `npm run test:unit` — all tests GREEN. 248/248 tests pass (37 test files).
- [x] T-020 (XS) — Run `npm run type-check` and `npm run lint` — zero errors.
- [ ] T-021 (XS) — Manual smoke: load Production Dashboard; confirm heatmap renders below bar chart; scroll horizontally; confirm name column stays sticky; confirm intensity varies by value.
