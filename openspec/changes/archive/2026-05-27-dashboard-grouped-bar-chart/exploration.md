# Exploration: Dashboard Grouped Bar Chart — MS USD vs Nacional

**Change name**: `dashboard-grouped-bar-chart`
**Explored**: 2026-05-27
**Status**: done

---

## Executive Summary

The codebase has a solid foundation for per-MS aggregation but the existing KPI API only returns aggregated totals — it must be extended with a new endpoint returning per-user/per-currency breakdown. No chart library is installed; installing Recharts is the recommended path. The HierarchySelectionContext already carries the node list with levelCode and ordering, making it the authoritative source for X-axis ordering.

---

## Current Architecture Map

```
HierarchySelectionProvider (nodes tree + selectedUserIds)
    │
    ├── HierarchyTreePanel (tree UI, toggle, INIT dispatch)
    │
DashboardFilterProvider (draft, appliedFilters)
    │
    ├── DashboardFilterPanel (filters UI)
    │
    └── UsdKpiPanel
            ├── useTrm()         → GET /api/trm (TRM rate, once on mount)
            └── useProductionKpis(trmRate)
                    └── GET /api/production-dashboard/kpis
                              └── getProductionKpiRaw()
                                        └── prisma.business.groupBy(['idCurrency'])
                                                  Returns: ProductionKpiRaw (aggregated totals)
```

**Gap**: The chart needs per-userId + per-currency breakdown. The existing service aggregates across all userIds.

---

## Data Shape Analysis

### What exists today

```typescript
// Current aggregated result — one row for all selected users
interface ProductionKpiRaw {
  totalCop: number          // Sum of COP businesses
  totalForeignUsd: number   // Sum of foreign-currency businesses
  nationalCount: number
  foreignCount: number
}
```

### What the chart needs

```typescript
// New — one row per userId, same currency split
interface MsKpiRow {
  userId: number
  fullName: string          // from HierarchyNode (client-side)
  levelCode: string         // from HierarchyNode (client-side)
  totalCop: number
  totalForeignUsd: number
  nationalCount: number
  foreignCount: number
}

// After TRM conversion on client:
interface MsBarDatum {
  userId: number
  fullName: string
  levelCode: string
  foreignUsd: number        // totalForeignUsd (already USD)
  nationalUsd: number       // totalCop / trmRate
  totalCop: number          // kept for tooltip
  foreignCount: number
  nationalCount: number
}
```

### Prisma query change required

Current: `prisma.business.groupBy({ by: ['idCurrency'], _sum, _count })`

New: `prisma.business.groupBy({ by: ['idUser', 'idCurrency'], _sum, _count })`

Same `where` clause reuse — adds `idUser` to the `by` array. Returns `N × 2` rows max (N MS users × 2 currency types). Single DB round trip.

---

## Hierarchy & Level Codes

From test fixtures and production code:

| levelCode       | Role            | Notes                                |
|-----------------|-----------------|--------------------------------------|
| `GENERAL_LEVEL` | MIA             | Full tree viewer (all users)         |
| `TEAM_LEADER`   | Team Leader     | Sees self + MS under them            |
| `MS_SENIOR`     | MS Senior       | Sees self + MS Junior subordinates   |
| `MS_JUNIOR`     | MS Junior       | Gets empty tree; only own bars       |
| `LEVEL_0`       | MS Junior (alt) | Returns empty hierarchy tree nodes[] |

**MS nodes for the chart** = nodes with `levelCode` in `['MS_SENIOR', 'MS_JUNIOR']`.

**Ordering**: Walk the hierarchy tree depth-first in the order `HierarchySelectionContext.nodes` already provides it. The service sorts roots by `idLevel` ascending, so higher-authority levels appear first. Within each subtree, alphabetical is preserved from Prisma `findMany` order.

**MS Junior scenario**: Since their hierarchy tree is empty (`nodes = []`), they can only see their own data. The chart should show a single group (their own userId). The viewer's own `userId` must come from the session.

---

## Chart Library Assessment

No chart library currently installed. The `sparkline-chart.tsx` uses pure SVG.

| Option | Library | Pros | Cons | Effort |
|--------|---------|------|------|--------|
| A | **Recharts** (install) | Rich tooltips, responsive, accessible, `BarChart` + `Tooltip` native, ~200KB gzip, excellent TS | New dependency | Low–Medium |
| B | **Native SVG** | Zero dependency, consistent with existing sparkline pattern | Complex tooltip state management, aria roles, responsive math | High |
| C | **Chart.js / react-chartjs-2** | Canvas-based, fast render at scale | Worse React integration, imperative API, larger bundle | Medium |
| D | **Tremor** | Pre-styled components | Opinionated styling, may conflict with current Tailwind v4 + shadcn tokens | Medium |

**Recommendation: Option A — Recharts**

Recharts is the most natural fit for React 19 + TypeScript. `<BarChart>` with `layout="vertical"` or standard supports grouped bars via two `<Bar>` children. `<Tooltip>` and `<ResponsiveContainer>` handle scrolling and responsive layout natively. Horizontal scrolling for many MS agents can be implemented by constraining the `ResponsiveContainer` height and letting the parent div overflow-x scroll.

---

## What Needs to Be Built

```
NEW BACKEND
──────────────────────────────────────────────────────
1. types/production-kpi.types.ts
   └── Add: MsKpiRaw, MsChartQueryParams

2. services/production-kpi.service.ts (or new ms-chart.service.ts)
   └── Add: getMsChartRaw(params) → MsKpiRaw[]
       Uses: prisma.business.groupBy({ by: ['idUser', 'idCurrency'], ... })
       Same where clause as getProductionKpiRaw

3. app/api/production-dashboard/ms-chart/route.ts (NEW)
   └── GET /api/production-dashboard/ms-chart
       Accepts same query params as /kpis (userIds, dateFrom, dateTo, etc.)
       Returns: ApiResponse<MsKpiRaw[]>

NEW FRONTEND
──────────────────────────────────────────────────────
4. hooks/use-ms-bar-chart.ts (NEW)
   └── Consumes: useHierarchySelection, useDashboardFilter
       Fetches: GET /api/production-dashboard/ms-chart
       Returns: AsyncState<MsBarDatum[]>
       Applies TRM conversion client-side (same as useProductionKpis)
       Derives ordering from nodes tree (walks tree, filters MS-level nodes)
       Handles MS Junior (viewer-only) case

5. components/MsGroupedBarChart.tsx (NEW)
   └── Receives: AsyncState<MsBarDatum[]>, trmRate, trmAvailable
       Uses Recharts: BarChart, Bar (foreignUsd + nationalUsd), Tooltip, XAxis, YAxis
       Tooltip format: "USD 185,000.00 · 45 negocios" (foreign)
                       "USD 72,300.00 (COP 292,815,000) · 38 negocios" (national)
       Empty state: <EmptyState> from shared/ui/empty-state.tsx
       Skeleton: matches UsdKpiCard loading pattern (animate-pulse)
       Horizontal scroll: overflow-x-auto wrapper div

6. DashboardShell.tsx (MODIFY — minimal)
   └── Add <MsGroupedBarChart /> below <UsdKpiPanel /> in ShellContent main section

7. index.ts (MODIFY — minimal)
   └── Export new types, hook, and component

INSTALL
──────────────────────────────────────────────────────
8. npm install recharts
```

---

## Ordering Algorithm (Client-Side)

```
function collectMsNodesInOrder(nodes: HierarchyNode[]): HierarchyNode[] {
  const result: HierarchyNode[] = []
  function walk(nodes: HierarchyNode[]): void {
    for (const node of nodes) {
      if (node.included && isMsLevel(node.levelCode)) result.push(node)
      walk(node.children)
    }
  }
  walk(nodes)
  return result
}

const MS_LEVEL_CODES = new Set(['MS_SENIOR', 'MS_JUNIOR'])
function isMsLevel(code: string): boolean {
  return MS_LEVEL_CODES.has(code)
}
```

This naturally preserves hierarchy order (Team Leader's MS before another TL's MS) and handles the "uncheck Team Leader → remove their MS" scenario because `included` cascades via `setIncludedRecursive`.

---

## Scenario Coverage

| Scenario | Handled By |
|----------|-----------|
| Initial load with scope | `collectMsNodesInOrder` from tree + API fetch |
| Tooltip USD bar | Recharts `<Tooltip>` custom formatter |
| Tooltip national-converted | Custom formatter with COP legend |
| MS with zero in one category | Bar renders as zero-height; tooltip shows "USD 0.00 · 0 negocios" |
| Partner/MIA scrollable | `overflow-x-auto` wrapper |
| MS Junior — own bars only | `nodes=[]` case: hook uses session userId directly |
| Uncheck MS in tree | `included=false` → filtered out of `collectMsNodesInOrder` → chart reflows |
| Uncheck Team Leader | Cascade via `setIncludedRecursive` → children `included=false` → same filter |
| Date range filter | `appliedFilters.dateRange` forwarded to API |
| Combined partial filters | All `appliedFilters` forwarded to API (same pattern as `/kpis`) |
| Empty state | `<EmptyState title="Sin producción registrada..." />` from shared/ui |

---

## Data Flow Diagram

```
HierarchySelectionContext.nodes
  │
  ├─(collectMsNodesInOrder)─→ orderedMsNodes: HierarchyNode[]
  │                                   │
  │                                   └─ x-axis labels + ordering
  │
  └─(selectedUserIds)─────────────────────────────────────────────┐
                                                                   ▼
DashboardFilterContext.appliedFilters ────────────────→ useMsBarChart(trmRate)
                                                                   │
                                                     GET /api/production-dashboard/ms-chart
                                                                   │
                                                      MsKpiRaw[] (per-userId, per-currency)
                                                                   │
                                                      join with orderedMsNodes
                                                      apply TRM conversion
                                                                   │
                                                          MsBarDatum[]
                                                                   │
                                                     MsGroupedBarChart (Recharts)
```

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| No Recharts installed — new dependency | Low | Standard install; well-maintained; no conflicts with Tailwind v4 |
| Per-userId groupBy may be slow with many users | Medium | Existing `where` filters limit rows; add DB index on `Business.idUser` if not present |
| MS Junior scenario — tree is empty (nodes=[]) | Medium | Hook must detect `nodes.length === 0` and use session userId instead |
| Large number of MS agents (scroll UX) | Low | `overflow-x-auto` + min bar width ensures scrollability; `ResponsiveContainer` minWidth |
| TRM unavailable — national bars show null | Low | Same pattern as `UsdKpiCard`: render "—" or zero-height bar with "TRM no disponible" tooltip |
| Recharts server-side rendering | Low | Wrap in `'use client'` component (already required for chart interactivity) |
| Existing `/kpis` endpoint unchanged | None | New endpoint is additive; no breaking changes |

---

## Affected Files Summary

**New files (6)**:
- `src/features/production-dashboard/types/production-kpi.types.ts` (extend with `MsKpiRaw`, `MsChartQueryParams`)
- `src/app/api/production-dashboard/ms-chart/route.ts`
- `src/features/production-dashboard/services/ms-chart.service.ts` (or extend existing)
- `src/features/production-dashboard/hooks/use-ms-bar-chart.ts`
- `src/features/production-dashboard/components/MsGroupedBarChart.tsx`
- Tests for all of the above

**Modified files (3)**:
- `src/features/production-dashboard/components/DashboardShell.tsx` (add chart component)
- `src/features/production-dashboard/index.ts` (add exports)
- `package.json` (recharts install)

---

## Recommended Next Step

`sdd-propose` — Ready to write a formal proposal with acceptance criteria for all 12 scenarios.
