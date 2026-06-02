# Design: Negocios por Compañía Donut Chart

## Technical Approach

Mirror the `origin-donut` vertical slice end-to-end with one structural twist: because `Business` has no direct FK to `Company`, the service cannot use `prisma.groupBy`. Instead it issues a single `findMany` selecting the deep relation chain `productPercentageCommission.productConfiguration.product.{idCompany, company.name}` plus `idCurrency` and `value`, then reduces in-memory into `(companyId × currencyId)` buckets (same pattern as `heatmap.service.ts`). The reduced rows are joined with currency lookups (`name`, `symbol`) via a single `prisma.currency.findMany`. The hook, libs, panel, chart, tooltip, and legend follow `OriginDonut*` 1:1 for props, styling, and `AsyncState<T>` wiring. The shell wraps the two panels in a `grid grid-cols-1 md:grid-cols-2 gap-4`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Aggregation strategy | `findMany` + in-memory reduce | `groupBy`; raw SQL | Prisma `groupBy` cannot group by nested relation fields. Raw SQL bypasses the type-safety the rest of the dashboard relies on; reduce is already proven in `heatmap.service.ts`. |
| Palette stability key | Sort `idCompany` asc, modulo into palette | Hash of company name; DB-persisted slot | PKs are immutable; sort is deterministic without persistence. Names can change and would shift colors. |
| Palette identity | New palette file with hue range distinct from origin | Reuse `ORIGIN_BASE_PALETTE` | Side-by-side donuts must be visually distinct so users can tell them apart at a glance. |
| Currency variant | Light palette for COP (`idCurrency === 1`), base for others | Single palette; opacity | Matches origin donut convention; keeps mental model consistent across both donuts. |
| Layout | `grid grid-cols-1 md:grid-cols-2 gap-4` in `ShellContent` | Tabs; flex row | Both KPIs are first-class; tabs hide information. Grid degrades cleanly on narrow viewports. |
| TRM prop on CompanyDonut | Omit | Pass `trmRate` like origin | Company donut is count-based; no currency conversion is required. Keeps the panel API minimal. |
| Empty state | Reuse shared `EmptyState` with `"Sin negocios para los filtros aplicados"` | Custom blank chart | Matches origin donut UX; avoids divergence. |

## Data Flow

```
DashboardFilterContext + HierarchySelection
        │
        ▼
useCompanyDonut ──► GET /api/production-dashboard/by-company
                            │
                            ▼
                    company-donut.service.ts
                       findMany(relation chain, idCurrency, value)
                            │  + prisma.currency.findMany
                            ▼
                    CompanyDonutRaw[] ──► ApiResponse
        │
        ▼
aggregateCompanyDonut(raw) ──► CompanyDonutSlice[] (percentage + fill)
        │
        ▼
CompanyDonutPanel ─► CompanyDonutChart ─► Tooltip / Legend
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/api/production-dashboard/by-company/route.ts` | Create | HTTP entry. Parse 9 filter query params, call service, return `ApiResponse<CompanyDonutRaw[]>`. No Prisma. |
| `src/features/production-dashboard/services/company-donut.service.ts` | Create | `findMany` + in-memory reduce; joins currency lookup; short-circuits on empty `userIds`. |
| `src/features/production-dashboard/lib/company-donut-aggregate.ts` | Create | Pure: total count, percentage (1 decimal), attach `fill`/`fillLight` via palette map. |
| `src/features/production-dashboard/lib/company-donut-colors.ts` | Create | `COMPANY_BASE_PALETTE`, `COMPANY_LIGHT_PALETTE` (distinct hues from origin), `resolveCompanyDonutColor`, `buildCompanyPaletteMap` (sort `idCompany` asc). |
| `src/features/production-dashboard/hooks/use-company-donut.ts` | Create | `AsyncState<CompanyDonutSlice[]>`; mirrors `useOriginDonut` auth/hierarchy/filter wiring + AbortController. |
| `src/features/production-dashboard/components/CompanyDonutPanel.tsx` | Create | Section wrapper, header `"Negocios por Compañía"`, renders chart or `EmptyState`. |
| `src/features/production-dashboard/components/CompanyDonutChart.tsx` | Create | Recharts `PieChart` with custom tooltip + legend. |
| `src/features/production-dashboard/components/CompanyDonutTooltip.tsx` | Create | Format: `"SKANDIA · COP · 130 (48.2%)"`. |
| `src/features/production-dashboard/components/CompanyDonutLegend.tsx` | Create | Mirrors origin donut legend. |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modify | Wrap `OriginDonutPanel` + `CompanyDonutPanel` in `grid grid-cols-1 md:grid-cols-2 gap-4`. |
| `src/features/production-dashboard/types/production-kpi.types.ts` | Modify | Add `CompanyDonutQueryParams`, `CompanyDonutRaw`, `CompanyDonutSlice`. |

## Interfaces / Contracts

```ts
interface CompanyDonutQueryParams {
  readonly userIds: readonly number[]
  readonly appliedFilters: DashboardAppliedFilters
}
interface CompanyDonutRaw {
  readonly companyId: number
  readonly companyName: string
  readonly currencyId: number
  readonly currencyName: string
  readonly currencySymbol: string
  readonly count: number
  readonly totalValue: number
}
interface CompanyDonutSlice extends CompanyDonutRaw {
  readonly percentage: number // 0-100, 1 decimal
  readonly fill: string       // base palette (USD/non-COP)
  readonly fillLight: string  // light palette (COP)
}
```

API contract: `GET /api/production-dashboard/by-company?userIds=...&dateFrom=...&dateTo=...&statuses=...&categoryIds=...&productIds=...&companyIds=...&originIds=...&plazos=...&periodicidades=...` → `ApiResponse<CompanyDonutRaw[]>`.

Reduce key: `` `${companyId}-${currencyId}` ``. Bucket accumulator: `{ companyId, companyName, currencyId, count, totalValue }`. Skip rows where `idCompany` cannot be resolved through the relation chain (defensive — log via service-level warn, do not throw).

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `company-donut-aggregate` (totals, percentages, empty input, single slice) | Vitest pure-function tests |
| Unit | `company-donut-colors` (sort stability, COP→light, modulo wrap, distinct from origin) | Vitest pure-function tests |
| Unit | `company-donut.service` (empty userIds, relation chain reduction, missing company guard, currency join) | Vitest with `vi.mock('@/lib/prisma')` |
| Unit | `use-company-donut` (loading/error/idle/success, AbortController, hierarchy gating) | `renderHook` + mocked `fetch` (per MEMORY.md pattern) |
| Unit | `CompanyDonutTooltip`, `CompanyDonutLegend`, `CompanyDonutPanel` (renders, empty state) | Testing Library |
| Integration | Route handler → service contract | Existing dashboard integration harness |

## Migration / Rollout

No migration required. Change is purely additive: new route, new files, new types, one modified shell layout. Revert by removing the new files and restoring the single-panel `DashboardShell` render.

## Open Questions

- [ ] Confirm distinct hue range for the new palette (suggest teal/indigo/rose/amber family vs origin's blue/green/red/purple). Final hex values can be chosen during apply.
