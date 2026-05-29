# Apply Progress: dashboard-trm-conversion

**Status:** COMPLETE
**Date:** 2026-05-27
**TDD:** Strict — all tests written before implementation
**Test Results:** 162/162 passing (27 test files)

## Completed Tasks

### Phase 0 — Types
- [x] T-01: `src/features/production-dashboard/types/trm.types.ts`
- [x] T-02: `src/features/production-dashboard/types/production-kpi.types.ts`

### Phase 1 — Pure Lib
- [x] T-03: `src/features/production-dashboard/__tests__/lib/currency-classifier.test.ts`
- [x] T-04: `src/features/production-dashboard/lib/currency-classifier.ts`

### Phase 2 — Service
- [x] T-05: `src/features/production-dashboard/__tests__/services/production-kpi.service.test.ts`
- [x] T-06: `src/features/production-dashboard/services/production-kpi.service.ts`

### Phase 3 — API Routes
- [x] T-07: `src/app/api/trm/__tests__/route.test.ts`
- [x] T-08: `src/app/api/trm/route.ts`
- [x] T-09: `src/app/api/production-dashboard/kpis/__tests__/route.test.ts`
- [x] T-10: `src/app/api/production-dashboard/kpis/route.ts`

### Phase 4 — Hooks
- [x] T-11: `src/features/production-dashboard/__tests__/hooks/use-trm.test.ts`
- [x] T-12: `src/features/production-dashboard/hooks/use-trm.ts`
- [x] T-13: `src/features/production-dashboard/__tests__/hooks/use-production-kpis.test.ts`
- [x] T-14: `src/features/production-dashboard/hooks/use-production-kpis.ts`

### Phase 5 — Components
- [x] T-15: `src/features/production-dashboard/__tests__/components/TrmDisplay.test.tsx`
- [x] T-16: `src/features/production-dashboard/components/TrmDisplay.tsx`
- [x] T-17: `src/features/production-dashboard/__tests__/components/UsdKpiCard.test.tsx`
- [x] T-18: `src/features/production-dashboard/components/UsdKpiCard.tsx`
- [x] T-19: `src/features/production-dashboard/__tests__/components/UsdKpiPanel.test.tsx`
- [x] T-20: `src/features/production-dashboard/components/UsdKpiPanel.tsx`

### Phase 6 — Integration
- [x] T-21: `src/features/production-dashboard/components/DashboardShell.tsx` (MODIFIED)
- [x] T-22: `src/features/production-dashboard/index.ts` (MODIFIED)

## Key Notes
- Route tests require `vi.mock('next/server', ...)` — jsdom strips query params from `req.url` without it
- COP_CURRENCY_ID = 1 (matches existing negocios/stats convention)
- trmRate NOT in useEffect deps in use-production-kpis (per CAP-4)
- UsdKpiPanel: detaileForeignUsd always shows; nacional/total show null when trmRate===null
