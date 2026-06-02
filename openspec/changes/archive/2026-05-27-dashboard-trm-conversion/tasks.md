# Tasks: Dashboard TRM Auto-Consultation & USD Conversion Panel

**Change:** `dashboard-trm-conversion`
**Status:** Ready for apply
**Date:** 2026-05-27
**Engram ID:** #843
**Delivery strategy:** ask-on-risk
**TDD:** Strict — test runner: `npm run test:unit`

---

## Review Workload Forecast

| Metric | Estimate |
|--------|----------|
| New files | 15 (11 source + 4 test groups) |
| Modified files | 2 (DashboardShell, index.ts) |
| Estimated lines changed | ~560–640 |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Decision needed before apply | **Yes** |

Recommended split:
- **PR #1** — Foundation (types + lib + service + API routes) — ~260 lines
- **PR #2** — UI layer (hooks + components + shell integration + barrel) — ~380 lines

---

## Phase 0 — Types (parallel, no deps)

### T-01 · Create `trm.types.ts`
- **File:** `src/features/production-dashboard/types/trm.types.ts`
- **Spec refs:** CAP-1, CAP-2
- **Work:**
  - `TrmResponse` interface (valor, fecha, unidad from dolarapi)
  - `TrmState` const + type: `'auto' | 'manual' | 'error'`
  - `TrmDisplayData` flat interface (rate: number, source: TrmState)
- **Parallel-safe:** Yes

### T-02 · Create `production-kpi.types.ts`
- **File:** `src/features/production-dashboard/types/production-kpi.types.ts`
- **Spec refs:** CAP-3
- **Work:**
  - `ProductionKpiQueryParams` interface
  - `ProductionKpiRaw` interface (totalCop, foreignUsd, nationalCount, foreignCount)
  - `ProductionKpiComputed` interface (detaileForeignUsd, nationalUsd, totalUsd + counts)
  - `UsdKpiCardData` flat interface (label, valueUsd, count, legend?)
- **Parallel-safe:** Yes

---

## Phase 1 — Pure Lib (sequential after T-01/T-02)

### T-03 · Write tests for `currency-classifier.ts` FIRST (TDD)
- **File:** `src/features/production-dashboard/__tests__/lib/currency-classifier.test.ts`
- **Spec refs:** CAP-3
- **Work:** COP=national, non-COP=foreign, null/undefined edge cases, groupBy result shape
- **Parallel-safe:** Yes (no impl dep)

### T-04 · Implement `currency-classifier.ts`
- **File:** `src/features/production-dashboard/lib/currency-classifier.ts`
- **Spec refs:** CAP-3
- **Depends on:** T-03 (tests must pass first)
- **Work:**
  - Pure function `classifyGroupByResults(groups, copCurrencyId): ProductionKpiRaw`
  - Uses `idCurrency` directly (no symbol/name sniffing)
  - No Prisma import
- **Parallel-safe:** No

---

## Phase 2 — Service (sequential after Phase 1)

### T-05 · Write tests for `production-kpi.service.ts` FIRST (TDD)
- **File:** `src/features/production-dashboard/__tests__/services/production-kpi.service.test.ts`
- **Spec refs:** CAP-3, CAP-5
- **Work:**
  - Mock prisma.business.groupBy
  - Empty userIds → zeros, no DB call
  - groupBy result classified correctly
  - Decimal coercion
- **Parallel-safe:** Yes

### T-06 · Implement `production-kpi.service.ts`
- **File:** `src/features/production-dashboard/services/production-kpi.service.ts`
- **Spec refs:** CAP-3, CAP-5
- **Depends on:** T-04, T-05
- **Work:**
  - `getProductionKpiRaw(params): Promise<ProductionKpiRaw>`
  - Short-circuit on empty userIds → return zeros
  - Apply filters to Prisma where clause
  - groupBy idCurrency; delegate to classifyGroupByResults
- **Parallel-safe:** No

---

## Phase 3 — API Routes (parallel pair after Phase 2)

### T-07 · Write tests for `GET /api/trm` FIRST (TDD)
- **File:** `src/app/api/trm/__tests__/route.test.ts`
- **Spec refs:** CAP-1
- **Work:** Mock fetch; 200 proxies response; 5s timeout; non-200 → 502; no auth → 401
- **Parallel-safe:** Yes

### T-08 · Implement `GET /api/trm`
- **File:** `src/app/api/trm/route.ts`
- **Spec refs:** CAP-1
- **Depends on:** T-07
- **Work:**
  - `auth()` guard → 401
  - AbortController 5s timeout
  - Proxy `https://co.dolarapi.com/v1/trm`
  - Return `ApiResponse<TrmResponse>`
- **Parallel-safe:** No

### T-09 · Write tests for `GET /api/production-dashboard/kpis` FIRST (TDD)
- **File:** `src/app/api/production-dashboard/kpis/__tests__/route.test.ts`
- **Spec refs:** CAP-3, CAP-4, CAP-5
- **Work:** Mock service; auth guard; empty userIds; valid params; malformed userIds → 400
- **Parallel-safe:** Yes (parallel to T-07)

### T-10 · Implement `GET /api/production-dashboard/kpis`
- **File:** `src/app/api/production-dashboard/kpis/route.ts`
- **Spec refs:** CAP-3, CAP-4
- **Depends on:** T-06, T-09
- **Work:**
  - `auth()` guard → 401
  - Parse: userIds (comma-sep → number[]), dateFrom, dateTo, categoryIds, productIds
  - Validate userIds → 400 on malformed
  - Call `getProductionKpiRaw`; return `{ data: ProductionKpiRaw }`
- **Parallel-safe:** No

---

## Phase 4 — Hooks (parallel pair after Phase 3)

### T-11 · Write tests for `use-trm.ts` FIRST (TDD)
- **File:** `src/features/production-dashboard/__tests__/hooks/use-trm.test.ts`
- **Spec refs:** CAP-1, CAP-2, CAP-6
- **Work:** Mock fetch; initial loading; success auto; failure error; setManualTrm; no re-fetch on manual
- **Parallel-safe:** Yes

### T-12 · Implement `use-trm.ts`
- **File:** `src/features/production-dashboard/hooks/use-trm.ts`
- **Spec refs:** CAP-1, CAP-2, CAP-4, CAP-6
- **Depends on:** T-11
- **Work:**
  - `AsyncState<TrmDisplayData>` for fetch state
  - `useEffect` on mount → fetch `/api/trm`
  - `setManualTrm(rate)` → trmState='manual'
  - Returns: `{ trmState, trmRate, setManualTrm, isManual, error }`
- **Parallel-safe:** No

### T-13 · Write tests for `use-production-kpis.ts` FIRST (TDD)
- **File:** `src/features/production-dashboard/__tests__/hooks/use-production-kpis.test.ts`
- **Spec refs:** CAP-3, CAP-4, CAP-5, CAP-6
- **Work:** Empty userIds → zeros no fetch; userIds change → re-fetch; filters change → re-fetch; computed values; trm=0 guard
- **Parallel-safe:** Yes (parallel to T-11)

### T-14 · Implement `use-production-kpis.ts`
- **File:** `src/features/production-dashboard/hooks/use-production-kpis.ts`
- **Spec refs:** CAP-3, CAP-4, CAP-5
- **Depends on:** T-12, T-13
- **Work:**
  - `AsyncState<ProductionKpiComputed>`
  - Deps: selectedUserIds + appliedFilters (from contexts), trmRate (param)
  - Re-fetch on selectedUserIds/appliedFilters; conversion client-side
  - Guard: empty userIds → zeros, no fetch
- **Parallel-safe:** No

---

## Phase 5 — Components (parallel tests, sequential impls)

### T-15 · Write tests for `TrmDisplay.tsx` FIRST (TDD)
- **File:** `src/features/production-dashboard/__tests__/components/TrmDisplay.test.tsx`
- **Spec refs:** CAP-1, CAP-2, CAP-6
- **Work:** Skeleton; "4,050 COP/USD" format; error state + manual input + disabled Recalcular; button enable on valid input; manual label
- **Parallel-safe:** Yes

### T-16 · Implement `TrmDisplay.tsx`
- **File:** `src/features/production-dashboard/components/TrmDisplay.tsx`
- **Spec refs:** CAP-1, CAP-2, CAP-6
- **Depends on:** T-15
- **Work:**
  - `'use client'` component
  - Props: `trmState, trmRate, isLoading, error, onManualTrm`
  - Loading → skeleton; Auto → read-only rate; Error → input + Recalcular; Manual → label
- **Parallel-safe:** No

### T-17 · Write tests for `UsdKpiCard.tsx` FIRST (TDD)
- **File:** `src/features/production-dashboard/__tests__/components/UsdKpiCard.test.tsx`
- **Spec refs:** CAP-3, CAP-5, CAP-6
- **Work:** Skeleton; "USD 2,500.00 · 3 negocios"; legend; null valueUsd → "—"; Detalle always renders
- **Parallel-safe:** Yes

### T-18 · Implement `UsdKpiCard.tsx`
- **File:** `src/features/production-dashboard/components/UsdKpiCard.tsx`
- **Spec refs:** CAP-3, CAP-5, CAP-6
- **Depends on:** T-17
- **Work:**
  - `'use client'` component
  - Props: `UsdKpiCardData & { isLoading: boolean }`
  - Format: `USD {toLocaleString en-US 2dp} · {count} negocios`
  - null valueUsd → "—"
- **Parallel-safe:** No

### T-19 · Write tests for `UsdKpiPanel.tsx` FIRST (TDD)
- **File:** `src/features/production-dashboard/__tests__/components/UsdKpiPanel.test.tsx`
- **Spec refs:** CAP-1 through CAP-6
- **Work:** Renders TrmDisplay + 3 cards; Detalle shows value in TRM error; Nacional+Total show "—" without TRM; Recalcular triggers recompute
- **Parallel-safe:** Yes

### T-20 · Implement `UsdKpiPanel.tsx`
- **File:** `src/features/production-dashboard/components/UsdKpiPanel.tsx`
- **Spec refs:** All CAPs (integration)
- **Depends on:** T-16, T-18, T-19
- **Work:**
  - `'use client'` component
  - Composes `use-trm` + `use-production-kpis`
  - Reads selectedUserIds + appliedFilters from contexts
  - Section heading "Venta total naranja en USD"
  - null trmRate → null valueUsd for Nacional + Total cards
- **Parallel-safe:** No

---

## Phase 6 — Integration (sequential, all prior phases done)

### T-21 · Modify `DashboardShell.tsx`
- **File:** `src/features/production-dashboard/components/DashboardShell.tsx`
- **Spec refs:** CAP-3, CAP-4
- **Depends on:** T-20
- **Work:**
  - Import `UsdKpiPanel`
  - Add `<UsdKpiPanel />` below `<DashboardFilterPanel />` in right `<main>` column
  - Provider order unchanged
- **Parallel-safe:** No

### T-22 · Update barrel `index.ts`
- **File:** `src/features/production-dashboard/index.ts`
- **Spec refs:** —
- **Depends on:** T-20, T-21
- **Work:**
  - Export new types: `TrmState`, `TrmDisplayData`, `ProductionKpiRaw`, `ProductionKpiComputed`, `UsdKpiCardData`
  - Export new hooks: `useTrm`, `useProductionKpis`
  - Export new components: `UsdKpiPanel`, `UsdKpiCard`, `TrmDisplay`
  - No removals
- **Parallel-safe:** No

---

## Dependency Graph

```
T-01 T-02 (parallel)
  └──> T-03 → T-04
                └──> T-05 → T-06
                              └──> T-07 T-09 (parallel)
                                      └──> T-08 T-10 (parallel after tests)
                                              └──> T-11 T-13 (parallel)
                                                      └──> T-12, T-14
                                                              └──> T-15 T-17 T-19 (parallel)
                                                                      └──> T-16 T-18 → T-20
                                                                                        └──> T-21 → T-22
```

**Total tasks:** 22 (11 test-first files + 9 new source files + 2 modifications)

---

## PR Split (ask-on-risk — decision required before apply)

### PR #1 — Foundation
`feat(production-dashboard): TRM proxy BFF and KPI aggregation foundation`
Tasks: T-01 through T-10
Est. ~260 lines

### PR #2 — UI Layer
`feat(production-dashboard): USD KPI panel with TRM display and shell integration`
Tasks: T-11 through T-22
Est. ~380 lines
