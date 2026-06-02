# Apply Progress: dashboard-grouped-bar-chart

**Status**: complete
**Date**: 2026-05-27
**Type-check**: pass
**Unit tests**: 256 files passed (2327 passing, 3 skipped)

## Tasks Completed

- [x] T-001 — Install recharts (npm install recharts ✓)
- [x] T-002 — Extend production-kpi.types.ts with MsKpiRaw, MsBarDatum, MsChartQueryParams
- [x] T-003 — Create src/features/production-dashboard/services/ms-chart.service.ts
- [x] T-004 — Refactor production-kpi.service.ts to use buildProductionWhereClause
- [x] T-005 — Create src/app/api/production-dashboard/ms-chart/route.ts
- [x] T-006 — Create src/features/production-dashboard/hooks/use-ms-bar-chart.ts
- [x] T-007 — Create format-currency.ts and MsBarTooltip.tsx
- [x] T-008 — Create MsGroupedBarChart.tsx
- [x] T-009 — Refactor UsdKpiPanel.tsx to accept TRM props
- [x] T-010 — Update DashboardShell.tsx — lift useTrm(), add MsBarChartPanel
- [x] T-011 — Create __tests__/services/ms-chart.service.test.ts
- [x] T-012 — Create __tests__/services/ms-chart.route.test.ts
- [x] T-013 — Create __tests__/hooks/use-ms-bar-chart.test.ts
- [x] T-014 — Create __tests__/components/MsGroupedBarChart.test.tsx + __tests__/lib/format-currency.test.ts
- [x] T-015 — Update __tests__/components/UsdKpiPanel.test.tsx for new props signature
- [x] T-016 — Update src/features/production-dashboard/index.ts exports

## Files Created

- src/features/production-dashboard/services/ms-chart.service.ts
- src/app/api/production-dashboard/ms-chart/route.ts
- src/features/production-dashboard/hooks/use-ms-bar-chart.ts
- src/features/production-dashboard/lib/format-currency.ts
- src/features/production-dashboard/components/MsBarTooltip.tsx
- src/features/production-dashboard/components/MsGroupedBarChart.tsx
- src/features/production-dashboard/__tests__/services/ms-chart.service.test.ts
- src/features/production-dashboard/__tests__/services/ms-chart.route.test.ts
- src/features/production-dashboard/__tests__/hooks/use-ms-bar-chart.test.ts
- src/features/production-dashboard/__tests__/components/MsGroupedBarChart.test.tsx
- src/features/production-dashboard/__tests__/lib/format-currency.test.ts

## Files Modified

- src/features/production-dashboard/types/production-kpi.types.ts (added MsKpiRaw, MsBarDatum, MsChartQueryParams)
- src/features/production-dashboard/services/production-kpi.service.ts (uses buildProductionWhereClause)
- src/features/production-dashboard/components/UsdKpiPanel.tsx (TRM as props, removed useTrm())
- src/features/production-dashboard/components/DashboardShell.tsx (lifted useTrm(), added MsBarChartPanel)
- src/features/production-dashboard/index.ts (added MS chart exports)
- src/features/production-dashboard/__tests__/components/UsdKpiPanel.test.tsx (updated for new props)
- package.json (recharts added)
