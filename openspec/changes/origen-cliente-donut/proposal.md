# Proposal: Gráfica de dona "Origen del cliente" — Production Dashboard

## Intent

Add a donut chart to the Production Dashboard that shows the distribution of negocios by `ClientOrigin`, segmented by currency (COP/USD). It answers "¿de dónde vienen mis negocios y en qué moneda?" at a glance, complementing existing KPI cards and bar/heatmap charts. The chart must obey the same hierarchy scope and applied filters as the rest of the dashboard so all visualizations remain consistent.

## Scope

### In Scope
- New API route `GET /api/production-dashboard/by-origin` reusing `buildProductionWhereClause`.
- New service `origin-donut.service.ts` doing `prisma.business.groupBy({ by: ['idClientOrigin', 'idCurrency'] })` + join with `ClientOrigin` and `Currency`.
- New hook `useOriginDonut` with `AsyncState<T>` and AbortController cancellation, reading `selectedUserIds` + `appliedFilters`.
- New component `OriginDonutChart` (Recharts `PieChart` + `Pie` with `innerRadius > 0`).
- Slice-per-(origin × currency) with same hue family per origin, different luminosity per currency.
- Legend items: `"<origin> <currency> · NN%"`.
- Tooltip: `"NN negocios (NN%)"` + USD segments show `≈ $… COP` using existing TRM.
- `EmptyState` reuse when no data.
- Insertion in `DashboardShell` after `UsdKpiPanel`, before `MsBarChartPanel`.
- Unit tests for service, hook, and route handler.

### Out of Scope
- Drill-down or click-through navigation from a slice.
- New filter UI (originIds is already filterable from `DashboardFilterContext`).
- Persisting chart preferences per user.
- A `by-origin` aggregation for non-dashboard screens.
- Changes to `ClientOrigin` schema or CRUD UI.

## Capabilities

### New Capabilities
- `production-dashboard-origin-distribution`: server-aggregated distribution of negocios by `ClientOrigin × Currency` with filter/hierarchy parity, surfaced as a donut chart.

### Modified Capabilities
- None.

## Approach

Follow Option A from exploration — the only path consistent with the established Production Dashboard layering:

1. **API**: `GET /api/production-dashboard/by-origin` validates `userIds` + filter params (same shape as other routes), delegates to the service. Route handler does NO Prisma work.
2. **Service**: `getOriginDonut(...)` builds the WHERE via `buildProductionWhereClause`, runs `prisma.business.groupBy({ by: ['idClientOrigin', 'idCurrency'], where, _count: { idBusiness: true } })`, joins names through `prisma.clientOrigin.findMany({ where: { idClientOrigin: { in: ids } } })` (NO `status: true` pre-filter — see Risks) and `prisma.currency.findMany`. Computes percentage in pure math. Returns `{ originId, originName, currencyId, currencyCode, count, percentage }[]`.
3. **Hook**: `useOriginDonut` consumes `HierarchySelectionContext` + `DashboardFilterContext`, builds query string, fetches with AbortController, returns `AsyncState<OriginDonutSlice[]>`.
4. **Component**: `OriginDonutChart` renders Recharts donut inside `ResponsiveContainer`. Color resolver maps `originId` to a base hue, `currencyCode` to luminosity (USD = solid, COP = light). Tooltip reuses dashboard's TRM context to render the `≈ COP` line on USD slices. Falls back to `EmptyState` when slices is empty.
5. **Shell**: insert the new section in `DashboardShell` between KPI panel and MS bar chart panel.

### Key Design Decisions
1. `originIds` filter is respected — if user filters one origin, donut shows only that origin (100%).
2. Segmentation by currency: `groupBy [idClientOrigin, idCurrency]` (FK, not enum).
3. Color per origin (hue) + luminosity per currency.
4. Legend lists each `origin × currency` slice separately.
5. Tooltip shows count + %; USD adds COP equivalent via TRM.
6. Reuse existing dashboard TRM mechanism (same source as KPIs).
7. Position: after `UsdKpiPanel`, before `MsBarChartPanel`.
8. `EmptyState` with message "Sin negocios para los filtros aplicados".
9. Scoped to `selectedUserIds` from `HierarchySelectionContext`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/production-dashboard/by-origin/route.ts` | New | HTTP layer; validates params; calls service. |
| `src/features/production-dashboard/services/origin-donut.service.ts` | New | Prisma groupBy + name/currency join + % math. |
| `src/features/production-dashboard/hooks/use-origin-donut.ts` | New | Reads contexts, fetches, returns `AsyncState`. |
| `src/features/production-dashboard/components/OriginDonutChart.tsx` | New | Renders Recharts donut, legend, tooltip, empty state. |
| `src/features/production-dashboard/lib/origin-donut-colors.ts` | New | Pure color resolver (hue × luminosity). |
| `src/features/production-dashboard/types/production-kpi.types.ts` | Modified | Add `OriginDonutRaw`, `OriginDonutSlice` types. |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modified | Insert section between KPI and MS bar panels. |
| `src/features/production-dashboard/__tests__/...` | New | Tests for route, service, hook, color resolver. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Negocios reference deactivated `ClientOrigin` records | Medium | Service joins names by ID without filtering `ClientOrigin.status`; surfaces historical names as-is. |
| Recharts `ResponsiveContainer` mis-sizing in flex layouts | Medium | Wrap chart in a fixed-height container (same pattern as `MsGroupedBarChart`). |
| Race conditions on rapid filter changes | Medium | AbortController + cancelled flag, same pattern as `useMsBarChart`. |
| TRM not available when rendering USD slices | Low | Hide the `≈ COP` line if TRM context returns no rate; never block rendering. |
| `originIds + companyIds/productIds` Prisma collision | Low | Already handled inside `buildProductionWhereClause`; donut passes filters unchanged. |

## Rollback Plan

Pure additive change. To revert:
1. Remove the donut section from `DashboardShell.tsx`.
2. Delete the new files (route, service, hook, component, color lib, types entries, tests).
No DB migrations, no schema changes, no shared-state mutations.

## Dependencies

- Existing `buildProductionWhereClause` in `ms-chart.service.ts`.
- Existing TRM context used by dashboard KPIs.
- Recharts (already installed).

## Success Criteria

- [ ] Donut renders distribution of negocios by `ClientOrigin × Currency` for selected hierarchy + applied filters.
- [ ] Filtering by `originIds` collapses donut to selected origin(s) summing 100%.
- [ ] Each origin shares a hue; USD vs COP differ by luminosity.
- [ ] Legend lists each `origin × currency` slice with percentage.
- [ ] Tooltip shows count and percentage; USD slices include COP equivalent when TRM available.
- [ ] Empty state shows when no negocios match filters.
- [ ] Re-fetch on filter or hierarchy change with no race conditions.
- [ ] Route handler contains no Prisma calls (architecture compliance).
- [ ] Unit tests pass for service, hook, route handler, and color resolver.
