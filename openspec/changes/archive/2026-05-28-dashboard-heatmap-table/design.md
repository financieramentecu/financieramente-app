# Design: Production Dashboard Heatmap Table

## Technical Approach

Add a per-user × per-company production heatmap to the Production Dashboard. Reuse the existing MS chart architecture (service → route → hook → panel) and the `buildProductionWhereClause` filter helper to prevent drift. Aggregate via `prisma.business.findMany` + JS reduction (idCompany lives 3 joins from Business — `business → ppc → productConfiguration → product → company` — so `prisma.groupBy` cannot be used). Service returns raw COP totals + counts keyed by `(idUser, idCompany)`. Hook performs TRM conversion, pivots into table shape, sorts rows (levelOrder desc → fullName asc), sorts columns (USD desc), drops all-zero columns, and exposes per-column `maxUsd` for intensity. Component renders a plain HTML table inside `overflow-x-auto`, with `position: sticky; left: 0` on the first cell of every row.

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| 1 | `levelOrder` source | Derive at runtime from `Level.idNextLevel` chain in `heatmap.service.ts` — assign integer rank by walking the linked list (root = highest = N; tail = lowest = 1). Cache the rank map per request. | (a) Schema migration adding `Level.order`; (b) static rank map in `lib/` | No DB migration; data-driven (auto-adapts when levels reordered); contained to one service. Static map drifts when seniority changes. |
| 2 | Aggregation strategy | `prisma.business.findMany` with nested `include` of company via PPC path + JS `reduce` by `(idUser, idCompany)`. Reuse `buildProductionWhereClause` (already exported by `ms-chart.service.ts`). Guard `userIds.length === 0 → []`. No upper bound guard (defer until profiling); document in code. | `prisma.$queryRaw` GROUP BY | Stays within Prisma idioms, mirrors existing pattern, defers raw SQL until profiling justifies it. Volume guard postponed (proposal sets `≤500 rows` perf target — JS reduce is O(n) and trivially fast at that scale). |
| 3 | COP→USD location | Hook (`use-heatmap-table.ts`) multiplies COP totals × `trmRate` after fetch, identical to `useMsBarChart`. Service returns `copTotal` only. | Service-side conversion | Keeps service deterministic and TRM-agnostic (testable without TRM mock); matches established MS chart pattern. |
| 4 | Role bypass | Server-side. Route resolves viewer scope: if `isHierarchyBypassRole(session.user.role.code)` OR `level.code === 'GENERAL_LEVEL'` → full active org via `buildHierarchyTree` logic; else use `getDownstreamUserIds(viewer)`. Intersect with caller-supplied `userIds` before passing to service. Caller MUST NOT supply viewer identity. | Trust client-supplied `userIds` | Defense in depth — same pattern used by `hierarchy-tree.service.ts`. Prevents IDOR. |
| 5 | Column sort | In the hook, after pivot: companies ranked by sum of USD across visible rows desc; tie-break by `companyName` asc. | Component-side sort; service-side sort | Component is presentational; service is currency-agnostic so cannot rank by USD. |
| 6 | Sticky column CSS | Inline `style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'var(--card)' }}` on first `<th>`/`<td>`. Wrap `<table>` in `<div className="overflow-x-auto">` — this becomes the scroll container, isolated from `ShellContent`'s `overflow-y-auto`. | Tailwind utility classes for sticky | Inline `style` guarantees `--card` resolution and `zIndex` priority; sticky needs a direct scroll container — the inner `overflow-x-auto` div provides it without conflicting with vertical scroll above. |
| 7 | Heatmap intensity | `intensity = max(0.05, usdTotal / column.maxUsd)` for `usdTotal > 0`. Inline `style={{ backgroundColor: \`rgba(59,130,246,${intensity})\` }}`. Zero cells: no style. Negative cells: plain text, no style. | Dynamic Tailwind opacity classes | Tailwind cannot generate dynamic class strings at build time. Minimum 0.05 keeps small non-zero cells visible. |
| 8 | API params | `GET /api/production-dashboard/heatmap?userIds&dateFrom&dateTo&statuses&categoryIds&companyIds&productIds&originIds&plazos&periodicidades`. Mirror `ms-chart/route.ts` parser. `isInternacional` accepted but discarded by `buildFiltersFromSearchParams` (already defaults to `false`). | Custom param shape | Filter parity with MS chart; reuses existing parser knowledge. |

## Data Flow

```
DashboardShell
  └─ ShellContent (overflow-y-auto)
       ├─ MsBarChartPanel
       └─ HeatmapTablePanel  ← new
            └─ useHeatmapTable(trmRate)
                 ├─ HierarchySelectionContext  (selectedUserIds)
                 ├─ DashboardFilterContext     (appliedFilters, minus isInternacional)
                 └─ fetch GET /api/production-dashboard/heatmap
                        └─ route.ts
                             ├─ auth() → session
                             ├─ resolveViewerScope(session) → scopeIds
                             ├─ intersect(scopeIds, userIds) → effectiveIds
                             └─ getHeatmapRaw({ userIds: effectiveIds, appliedFilters })
                                  ├─ buildProductionWhereClause (shared)
                                  ├─ prisma.business.findMany (include company)
                                  ├─ buildLevelOrderMap (walks idNextLevel chain)
                                  └─ JS reduce → HeatmapRow[]   (raw COP + count)
                 → pivot → { rows, companyColumns(maxUsd), legend } → render
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/production-dashboard/services/heatmap.service.ts` | Create | `getHeatmapRaw`, `buildLevelOrderMap` (private), `resolveViewerScope` (or import from hierarchy lib) |
| `src/features/production-dashboard/types/production-kpi.types.ts` | Modify | Add `HeatmapRaw`, `HeatmapRow`, `PersonRow`, `CompanyColumn`, `CategoryLegendItem`, `HeatmapQueryParams` |
| `src/features/production-dashboard/hooks/use-heatmap-table.ts` | Create | `useHeatmapTable(trmRate): AsyncState<HeatmapViewModel>` — fetch, pivot, sort, intensity prep |
| `src/app/api/production-dashboard/heatmap/route.ts` | Create | GET handler — auth, parse, resolve scope, delegate to service |
| `src/features/production-dashboard/components/HeatmapTablePanel.tsx` | Create | Card + subtitle + legend + sticky table |
| `src/features/production-dashboard/components/ShellContent.tsx` | Modify | Mount `<HeatmapTablePanel trmRate={trmRate} />` after `<MsBarChartPanel/>` |
| `src/features/production-dashboard/index.ts` | Modify | Re-export new types/hook/component |
| `src/features/production-dashboard/__tests__/services/heatmap.service.test.ts` | Create | Aggregation, levelOrder, viewer scope, empty userIds |
| `src/features/production-dashboard/__tests__/hooks/use-heatmap-table.test.ts` | Create | Sort, column drop, idle on null TRM, intensity calc |
| `src/features/production-dashboard/__tests__/services/heatmap.route.test.ts` | Create | 401, 400 invalid params, isInternacional dropped |
| `src/features/production-dashboard/__tests__/components/HeatmapTablePanel.test.tsx` | Create | Renders rows, sticky col, intensity background |

## Interfaces / Contracts

```ts
// types/production-kpi.types.ts (additions)
export interface HeatmapRaw {
  idUser: number
  fullName: string
  levelCode: string
  levelOrder: number
  levelColor: string
  categoryName: string
  idCategory: number | null
  cells: ReadonlyArray<{
    idCompany: number
    companyName: string
    copTotal: number
    count: number
  }>
}

export interface HeatmapQueryParams {
  userIds: ReadonlyArray<number>
  appliedFilters: DashboardAppliedFilters // isInternacional ignored
}

export interface PersonRow {
  idUser: number
  fullName: string
  levelCode: string
  levelOrder: number
  levelColor: string
  categoryName: string
  cellsByCompany: ReadonlyMap<number, { usdTotal: number; count: number }>
}

export interface CompanyColumn {
  idCompany: number
  companyName: string
  totalUsd: number
  maxUsd: number
}

export interface CategoryLegendItem {
  categoryName: string
  levelColor: string
}

export interface HeatmapViewModel {
  rows: ReadonlyArray<PersonRow>
  companyColumns: ReadonlyArray<CompanyColumn>
  legend: ReadonlyArray<CategoryLegendItem>
}
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (service) | aggregation per `(user, company)`, `levelOrder` from chain, empty userIds short-circuit, isInternacional dropped | Vitest + Prisma mock (`vi.mock('@/lib/prisma')`) |
| Unit (hook) | idle on `trmRate=null`, sort order, column drop when all-zero, USD conversion, fetch cancellation | `renderHook` + `vi.fn()` global fetch |
| Unit (component) | sticky column style applied, intensity rgba on non-zero, no bg on zero/negative, legend filtered to visible categories | Testing Library + inline `style` assertions |
| Integration (route) | 401 unauthenticated, 400 invalid `userIds`, 200 happy path, scope intersection enforced | Vitest mocking `auth()` + service |
| E2E | none in this change | — |

## Migration / Rollout

No DB migration. No env vars. No feature flag. Additive files only. Rollback = remove `<HeatmapTablePanel/>` mount from `ShellContent.tsx` (single-line revert) or revert the feature branch.

## Open Questions

- [ ] Confirm `Level.idNextLevel` chain is fully populated and acyclic in production (fallback: treat orphan levels as `levelOrder = 0`).
- [ ] Should the legend show category name or level name? Spec says "category"; proposal says "category badge" — proceeding with `categoryName + levelColor`.
