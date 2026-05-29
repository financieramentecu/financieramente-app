# Verification Report — company-donut

**Change**: company-donut
**Mode**: Strict TDD
**Verdict**: PASS WITH WARNINGS
**Date**: 2026-05-28

---

## Task Completeness

| Task | Status |
|------|--------|
| 1.1 Types (CompanyDonutQueryParams, CompanyDonutRaw, CompanyDonutSlice) | ✅ COMPLETE |
| 2.1 company-donut-colors.ts | ✅ COMPLETE |
| 2.2 company-donut-aggregate.ts | ✅ COMPLETE |
| 2.3 company-donut-colors.test.ts (15 tests) | ✅ COMPLETE |
| 2.4 company-donut-aggregate.test.ts (11 tests) | ✅ COMPLETE |
| 3.1 company-donut.service.ts | ✅ COMPLETE |
| 3.2 company-donut.service.test.ts (9 tests) | ✅ COMPLETE |
| 4.1 by-company/route.ts | ✅ COMPLETE |
| 4.2 by-company.route.test.ts (8 tests) | ✅ COMPLETE |
| 5.1 use-company-donut.ts | ✅ COMPLETE |
| 5.2 use-company-donut.test.ts (9 tests) | ✅ COMPLETE |
| 6.1 CompanyDonutTooltip.tsx | ✅ COMPLETE |
| 6.2 CompanyDonutLegend.tsx | ✅ COMPLETE |
| 6.3 CompanyDonutChart.tsx | ✅ COMPLETE |
| 6.4 CompanyDonutPanel.tsx | ✅ COMPLETE |
| 6.5 CompanyDonutChart.test.tsx (7 tests) | ✅ COMPLETE |
| 7.1 DashboardShell.tsx + shell-ordering.test.tsx | ✅ COMPLETE |

**17/17 tasks complete**

---

## Test Results

| Field | Value |
|-------|-------|
| Command | `npm run test:unit` |
| Test files | 276 passed |
| Tests | 2518 passed, 3 skipped, 0 failed |
| Duration | 46.96s |

### Company-donut suite (62 tests, all green)

| File | Tests |
|------|-------|
| company-donut-colors.test.ts | 15 ✅ |
| company-donut-aggregate.test.ts | 11 ✅ |
| company-donut.service.test.ts | 9 ✅ |
| by-company.route.test.ts | 8 ✅ |
| use-company-donut.test.ts | 9 ✅ |
| CompanyDonutChart.test.tsx | 7 ✅ |
| shell-ordering.test.tsx | 3 ✅ |

---

## Spec Compliance Matrix

| Requirement | Scenario | Status | Evidence |
|-------------|----------|--------|----------|
| Data Aggregation | Aggregate returns one entry per (company × currency) | ✅ PASS | service.test.ts: aggregates two businesses + produces separate rows |
| Data Aggregation | Empty result when no businesses match | ✅ PASS | service.test.ts: returns [] when findMany returns empty array |
| Data Aggregation | All 9 filter dimensions forwarded | ✅ PASS | route.test.ts: calls getCompanyDonutRaw with parsed userIds and appliedFilters |
| Stable Colors | Colors stable on reload | ✅ PASS | colors.test.ts: stable regardless of input order |
| Stable Colors | New company gets next slot | ✅ PASS | colors.test.ts: assigns sequential indices starting from 0 |
| Visualization | Legend shows COMPANY · PCT% | ⚠️ WARNING | Actual: "COMPANY CURRENCY · PCT%" — adds currency symbol (no dot separator between name and symbol) |
| Visualization | Tooltip shows COMPANY · CURRENCY · COUNT (PCT%) | ⚠️ WARNING | Multi-line tooltip vs single-line spec format; semantically equivalent, richer display |
| Visualization | EmptyState "Sin negocios para los filtros aplicados" | ✅ PASS | chart.test.tsx: renders empty state when success with empty data |
| Visualization | Sum = 100% | ✅ PASS | aggregate.test.ts: percentages sum to 100 ± 0.1 |
| Filter Reactivity | Re-fetches on selectedUserIds change | ✅ PASS | hook.test.ts: re-fetches when selectedUserIds changes |
| Filter Reactivity | MS Junior uses session userId | ✅ PASS | hook.test.ts: MS Junior happy path |
| DashboardShell | Grid 2-cols with both panels | ✅ PASS | DashboardShell.tsx L82-85 confirmed |
| DashboardShell | trmRate passed to CompanyDonutPanel | ✅ PASS | DashboardShell.tsx L84 |
| Route | 401 on no session | ✅ PASS | route.test.ts |
| Route | 400 on missing userIds | ✅ PASS | route.test.ts |
| Route | 400 on invalid userIds | ✅ PASS | route.test.ts |
| Service | findMany + reduce (NOT groupBy) | ✅ PASS | company-donut.service.ts confirmed — Map reduce pattern |
| Service | Short-circuit on empty userIds | ✅ PASS | implementation L41 + service.test.ts |
| Service | No Company status filter | ✅ PASS | implementation confirmed |
| Colors | COP → light palette | ✅ PASS | colors.test.ts + aggregate.test.ts |
| Colors | Non-COP → base palette | ✅ PASS | colors.test.ts |
| Colors | Sort ascending by companyId | ✅ PASS | colors.test.ts: sorts ascending so lowest id always gets index 0 |
| Hook | AbortController + cancelled flag | ✅ PASS | hook.test.ts: does not apply stale response after unmount |
| Hook | Returns AsyncState<CompanyDonutSlice[]> | ✅ PASS | TypeScript types + hook |
| Types | CompanyDonutRaw has all 7 required fields | ✅ PASS | production-kpi.types.ts verified |
| Types | CompanyDonutSlice adds percentage, fill, fillLight | ✅ PASS | production-kpi.types.ts verified |

---

## Issues

### WARNING — Legend format deviation

**Spec**: `"COMPANY · PCT%"` (e.g., `"SKANDIA · 48.2%"`)

**Actual** (`CompanyDonutLegend.tsx` L35): `"SKANDIA COP · 48.2%"` — company name + space + currency symbol, then dot + percentage

**Impact**: Visually acceptable and more informative (currency context helps users distinguish COP vs USD slices for the same company). Not a regression.

**Recommendation**: Accept as intentional UX improvement, or align to pure `"COMPANY · PCT%"` format if strict spec adherence required.

---

### WARNING — Tooltip format deviation

**Spec**: Single-line `"SKANDIA · COP · 130 (48.2%)"`

**Actual** (`CompanyDonutTooltip.tsx`):
- Line 1 (header): `"SKANDIA · COP"`
- Line 2: `"130 negocios (48.2%)"`
- Optional lines: USD value, COP reference (when trmRate is available)

**Impact**: Richer than spec. All data points from spec are present. The multi-line format is consistent with OriginDonutTooltip pattern used across the dashboard.

**Recommendation**: Accept as design improvement, or collapse to single-line format if strict consistency with spec is required.

---

### SUGGESTION — CompanyDonutPanel receives trmRate (forward-compatible)

**Spec/Tasks**: Hook should have "no trmRate prop". The panel does accept `trmRate: number | null` and forwards it to the chart/tooltip.

**Actual**: `CompanyDonutPanel({ trmRate })` → `CompanyDonutChart({ trmRate })` → `CompanyDonutTooltip({ trmRate })`. Used for optional COP/USD conversion display in tooltip.

**Impact**: None — consistent with OriginDonutPanel design. Enables the tooltip to show USD equivalent for COP segments, which improves user experience.

---

## Design Coherence

| ADR/Design Decision | Implementation | Status |
|---------------------|----------------|--------|
| findMany + reduce (mirrors heatmap.service.ts) | Confirmed in company-donut.service.ts | ✅ PASS |
| Palette distinct from origin (teal/indigo family vs blue/green) | Confirmed in company-donut-colors.ts | ✅ PASS |
| AbortController + cancelled flag (ADR-D5) | Confirmed in use-company-donut.ts | ✅ PASS |
| COP → light palette, non-COP → base palette | Confirmed in aggregate + colors | ✅ PASS |
| Grid grid-cols-1 md:grid-cols-2 gap-4 | DashboardShell.tsx L82 | ✅ PASS |
| CompanyDonutPanel RIGHT of OriginDonutPanel | DashboardShell.tsx L83-84 + shell-ordering.test.tsx | ✅ PASS |
| No Company status filter (historical data preserved) | company-donut.service.ts — no status predicate on Company | ✅ PASS |

---

## Final Verdict: PASS WITH WARNINGS

All 17 tasks complete. 2518 tests pass (0 failures across 276 test files). Two format WARNINGs in legend and tooltip — both are improvements over spec, not regressions. No CRITICAL issues. Change is ready for `sdd-archive`.
