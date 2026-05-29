# Proposal: Negocios por Compañía Donut Chart

## Intent

Production users currently see "Origen del cliente" as the only donut on the production dashboard. They need a parallel view of how business volume distributes across compañías (per currency) to spot concentration risk and validate company-level performance — without leaving the dashboard or running ad-hoc queries.

## Scope

### In Scope
- New `CompanyDonutPanel` rendered to the RIGHT of `OriginDonutPanel` in `DashboardShell` (2-column grid).
- New API route `GET /api/production-dashboard/by-company` that respects all existing dashboard filters (userIds hierarchy, dateRange, statuses, categoryIds, companyIds, productIds, originIds, plazos, periodicidades).
- New service `company-donut.service.ts` using `findMany + in-memory reduce` (Prisma `groupBy` not viable — Company is reached via `Business → ProductPercentageCommission → ProductConfiguration → Product → Company`).
- New hook `use-company-donut.ts` using shared `AsyncState<T>` pattern.
- New pure libs: `company-donut-aggregate.ts` and `company-donut-colors.ts` (stable palette keyed by `idCompany asc`; base palette for USD, light palette for COP).
- Tooltip format: `"SKANDIA · COP · 130 (48.2%)"`.
- Empty state when filters yield no businesses.
- Colocated unit tests for service, hook, aggregate, colors, tooltip, legend, panel.

### Out of Scope
- Drilldown from a slice to a businesses list.
- Per-product breakdown inside the company donut.
- New filter dimensions (uses existing `buildProductionWhereClause`).
- Persisting palette assignments to DB.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `production-dashboard`: add `company-donut` as a new visualization alongside `origen-cliente-donut`, including the API endpoint, filter forwarding, 2D `(company × currency)` aggregation, stable color mapping, and empty-state behavior.

## Approach

Mirror the existing `origen-cliente-donut` vertical slice end-to-end:

```
route.ts → company-donut.service.ts → company-donut-aggregate.ts
                                    → use-company-donut.ts
                                    → CompanyDonutPanel → CompanyDonutChart
                                                        → CompanyDonutTooltip
                                                        → CompanyDonutLegend
```

Service performs ONE `findMany` selecting `idCurrency`, `currency.code`, and the deep `productPercentageCommission.productConfiguration.product.{idCompany, company.{id,name}}` chain, then reduces in-memory into `(companyId × currencyId)` buckets. Colors derived from a stable sort by `idCompany asc` so each company keeps its slot across sessions; USD uses base palette, COP uses the light palette.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/production-dashboard/by-company/route.ts` | New | HTTP entry, calls service, returns `ApiResponse<CompanyDonutRaw[]>`. |
| `src/features/production-dashboard/services/company-donut.service.ts` | New | findMany + reduce, returns raw aggregates. |
| `src/features/production-dashboard/lib/company-donut-aggregate.ts` | New | Pure reducer + percentage calc. |
| `src/features/production-dashboard/lib/company-donut-colors.ts` | New | Stable palette per `(company, currency)`. |
| `src/features/production-dashboard/hooks/use-company-donut.ts` | New | `AsyncState<CompanyDonutSlice[]>` + filter wiring. |
| `src/features/production-dashboard/components/CompanyDonutPanel.tsx` (+ Chart/Tooltip/Legend) | New | UI mirroring origin donut. |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modified | Wrap origin + company panels in `grid grid-cols-2 gap-4`. |
| `src/features/production-dashboard/types/production-kpi.types.ts` | Modified | Add `CompanyDonutQueryParams`, `CompanyDonutRaw`, `CompanyDonutSlice`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Deep relation `findMany` slow on large datasets | Medium | Reuse `buildProductionWhereClause` (already index-friendly); select only needed fields; benchmark vs heatmap baseline. |
| Palette index instability if companies added/removed | Low | Sort by `idCompany asc` (stable PK); colors are deterministic. |
| 2-column layout breaks on narrow viewports | Low | Use `grid-cols-1 md:grid-cols-2`; verify visually. |
| Tooltip/legend divergence from origin donut UX | Low | Mirror existing components 1:1 in props and styling. |

## Rollback Plan

Revert the feature branch. The change is additive: the new route, files, and types can be removed cleanly, and `DashboardShell` reverts to a single-panel render. No DB migrations, no shared modules altered beyond `production-kpi.types.ts` additions.

## Dependencies

- Existing `buildProductionWhereClause` and dashboard filter context.
- Existing `OriginDonutPanel` layout reference.

## Success Criteria

- [ ] `GET /api/production-dashboard/by-company` returns `(company × currency)` aggregates respecting all 9 filter dimensions.
- [ ] Donut renders to the right of origin donut on `md+` and stacks below on smaller breakpoints.
- [ ] Tooltip shows `"<COMPANY> · <CURRENCY> · <count> (<pct>%)"`.
- [ ] Company color slot is stable across reloads.
- [ ] Empty state shown when filters yield zero businesses.
- [ ] Unit tests cover all 14 scenarios from exploration.
