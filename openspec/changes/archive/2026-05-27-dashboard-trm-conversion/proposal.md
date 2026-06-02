# Proposal: Dashboard TRM Auto-Consultation & USD Conversion Panel

## Intent

The production dashboard reports "venta total verde" only in COP. Stakeholders need a USD view that separates foreign-currency business from COP business converted at the official rate. We add a "Venta total naranja en USD" section that auto-fetches the COP/USD TRM and renders three KPI cards, fully respecting the existing hierarchy selection and applied filters.

## Scope

### In Scope
- BFF proxy `GET /api/production-dashboard/trm` (server fetch to dolarapi.com, 5s timeout)
- KPI endpoint `GET /api/production-dashboard/kpis` (userIds + filter params → foreign/local totals)
- Three KPI cards: Detalle internacional (USD), Nacional convertido a USD (with TRM traceability legend), Total USD (Int + Nac)
- Currency split by `Business.idCurrency` reusing the `stats/route.ts` heuristic (extracted to a shared classifier)
- TRM read-only display with auto-fetch on load; manual-input fallback + "Recalcular" only when the service fails/times out
- Values react to `HierarchySelectionContext.selectedUserIds` + `DashboardFilterContext.appliedFilters`

### Out of Scope
- `isInternacional` filter toggle (split is purely by currency, not by user flag)
- Prisma schema changes (split is computed at aggregation time)
- Persisting TRM to DB or caching beyond the request lifecycle
- Changes to `DashboardFilterContext`, `HierarchySelectionContext`, or `CoachKpiCard`

## Capabilities

### New Capabilities
- `dashboard-trm`: server-side TRM retrieval (auto-fetch, 5s timeout, manual fallback contract)
- `dashboard-usd-kpis`: USD KPI aggregation (foreign vs converted-national totals scoped to hierarchy + filters)

### Modified Capabilities
- None

## Approach

A BFF proxy isolates the external dolarapi.com dependency (CORS-free, server-enforced 5s timeout). A dedicated KPI route delegates to `production-kpi.service.ts`, which runs Prisma aggregations splitting totals by currency via a shared `currency-classifier.ts` (DRY extraction from `stats/route.ts`). Conversion is pure: `nacionalUsd = totalCop / trm`; `totalUsd = foreignUsd + nacionalUsd` — computed client-side so the TRM value (auto or manual) drives recalculation without re-querying. Hooks use `AsyncState<T>`; empty hierarchy (0 users) short-circuits to zeros with no DB query.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/production-dashboard/trm/route.ts` | New | TRM BFF proxy |
| `src/app/api/production-dashboard/kpis/route.ts` | New | KPI aggregation endpoint |
| `src/features/production-dashboard/services/production-kpi.service.ts` | New | Prisma foreign/local aggregation |
| `src/features/production-dashboard/lib/currency-classifier.ts` | New | Shared COP/USD heuristic |
| `src/features/production-dashboard/types/{trm,production-kpi}.types.ts` | New | Domain types/DTOs |
| `src/features/production-dashboard/hooks/{use-trm,use-production-kpis}.ts` | New | AsyncState hooks |
| `src/features/production-dashboard/components/{TrmDisplay,UsdKpiPanel,UsdKpiCard}.tsx` | New | UI section |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modified | Mount panel in right column |
| `src/features/production-dashboard/index.ts` | Modified | New exports |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| dolarapi.com unavailable (no SLA) | Med | BFF 5s timeout + manual TRM fallback |
| Currency heuristic brittle on new currencies | Med | Symbol/name match + idCurrency fallback (1=COP, 2=USD) |
| KPI query slow on large filtered sets | Low | `prisma.aggregate`/`groupBy` with indexed WHERE |
| Empty hierarchy returns all businesses | Med | 0 selected → return zeros, skip query |

## Rollback Plan

Revert the feature commit. All work is additive (new routes/files + one DashboardShell mount line); no migrations, no shared-context edits, so removing the `UsdKpiPanel` mount and new files fully restores prior behavior.

## Dependencies

- Public endpoint `https://co.dolarapi.com/v1/trm` (no API key)

## Success Criteria

- [ ] On load, TRM auto-fetches and displays read-only ("4,050 COP/USD")
- [ ] Three cards show foreign USD, converted national USD (with TRM legend), and total
- [ ] Cards recompute when hierarchy selection or applied filters change
- [ ] On TRM failure/timeout, manual input + Recalcular appears with "TRM ingresada manualmente" label
- [ ] 0 selected users → cards show zeros without a DB query
