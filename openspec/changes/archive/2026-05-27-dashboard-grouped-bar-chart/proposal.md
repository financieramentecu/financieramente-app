# Proposal: Dashboard Grouped Bar Chart — MS USD vs Nacional

**Change name**: `dashboard-grouped-bar-chart`
**Proposed**: 2026-05-27
**Status**: proposed
**Author**: SDD propose agent

---

## Problem Statement

The Production Dashboard currently exposes KPI totals aggregated across all Money Strategists (MS) visible to the authenticated user. Leaders (Team Leader, MS Senior, MIA/Partner) have no per-MS breakdown of how each agent's foreign-currency production compares to their national production converted to USD. This makes it impossible to spot individual performance gaps, identify agents skewed toward one currency type, or perform quick visual comparisons within a team — all of which are required for effective portfolio management and coaching conversations.

---

## Proposed Solution

Add a **Grouped Bar Chart** panel to the Production Dashboard. Each MS visible within the authenticated user's hierarchy scope occupies one group on the X-axis, with two bars:

- **Blue bar** (`foreignUsd`): sum of foreign-currency businesses, already in USD (`totalForeignUsd`)
- **Green bar** (`nationalUsd`): sum of COP businesses converted to USD using the current TRM rate (`totalCop / trmRate`), with original COP value surfaced in the tooltip

The chart is driven by a new, additive API endpoint (`GET /api/production-dashboard/ms-chart`) that returns a per-user, per-currency breakdown using the same filter contract as the existing `/kpis` endpoint. The X-axis ordering mirrors the hierarchy tree: depth-first walk of `HierarchySelectionContext.nodes`, filtering to MS-level nodes (`MS_SENIOR`, `MS_JUNIOR`) while respecting the `included` flag. The chart reacts live to tree selection changes and applied filter changes without any additional user action beyond the existing "Aplicar" button flow.

---

## Out of Scope

- Modifications to the existing `/api/production-dashboard/kpis` endpoint or its service function.
- Per-business drill-down from the chart (click → detail view).
- Export or download of chart data.
- Stacked-bar or normalized-bar variants.
- Changes to the `HierarchySelectionContext` or `DashboardFilterContext` providers.
- Dark mode specific chart color overrides (will use Recharts defaults with Tailwind-compatible neutral axes).
- Pagination or virtual scrolling for very large MS lists (horizontal scroll is sufficient for expected scale).

---

## Acceptance Criteria

### AC-1: Initial load — Team Leader scope

**Given** a Team Leader is authenticated with 4 MS in their tree: Ana (MS_SENIOR), Julieta (MS_SENIOR), Jhon (MS_JUNIOR), Paula (MS_JUNIOR), and all tree nodes are checked  
**When** the dashboard loads  
**Then** the chart renders exactly 5 groups — the TL's own group first, then Ana, Julieta (MS_SENIOR), then Jhon, Paula (MS_JUNIOR, alphabetical within level)  
**And** each group contains exactly 2 bars: a blue bar (foreign USD) and a green bar (national converted USD)  
**And** the ordering matches depth-first hierarchy traversal (TL self → senior subordinates alphabetically → junior subordinates alphabetically)

---

### AC-2: Tooltip — foreign bar (blue)

**Given** the chart is rendered and Ana has foreign-currency businesses totalling USD 185,000 across 45 negocios  
**When** the user hovers over Ana's blue bar  
**Then** the tooltip displays: `USD 185,000.00 · 45 negocios`  
**And** the values reflect the currently applied scope and filter selections

---

### AC-3: Tooltip — national converted bar (green)

**Given** the chart is rendered, the current TRM is 4,050, and Ana has national COP businesses totalling COP 292,815,000 across 38 negocios  
**When** the user hovers over Ana's green bar  
**Then** the tooltip displays: `USD 72,300.00 (COP 292,815,000) · 38 negocios`  
**And** the USD value equals `totalCop / trmRate` (rounded to 2 decimal places)  
**And** the COP value is the raw original sum

---

### AC-4: MS with no businesses in one category

**Given** Jhon has only national COP businesses and zero international businesses  
**When** the chart renders  
**Then** Jhon's blue bar renders at zero height (or is not visible)  
**And** hovering Jhon's blue bar (if hoverable at zero height) shows: `USD 0.00 · 0 negocios`  
**And** Jhon's group remains present on the X-axis

---

### AC-5: Partner/MIA scope — full organization view

**Given** a Partner or MIA user is authenticated with access to all MS in the organization  
**When** the full hierarchy tree is active (all nodes checked)  
**Then** all MS nodes across all Team Leaders appear in the chart  
**And** when the number of MS groups exceeds the visible chart width, the chart area becomes horizontally scrollable  
**And** all bars remain individually readable with correct tooltips

---

### AC-6: MS Junior — own bars only

**Given** an MS Junior is authenticated (their hierarchy tree returns empty nodes)  
**When** the dashboard loads  
**Then** the chart renders exactly 1 group: the MS Junior's own data  
**And** the group contains the standard 2 bars (blue foreign USD, green national USD)  
**And** no other agents' data is shown

---

### AC-7: MS Senior — own group plus their MS Juniors

**Given** an MS Senior has 2 MS Junior subordinates: Pedro and Sofía  
**When** all tree nodes are checked  
**Then** the chart shows exactly 3 groups: MS Senior first, then Pedro, then Sofía (alphabetical within MS_JUNIOR level)  
**And** each group has the correct 2 bars reflecting each agent's individual production

---

### AC-8: Uncheck one MS from the tree

**Given** the chart is rendered with Ana, Julieta, Jhon, and Paula  
**When** the user unchecks "Julieta" in the hierarchy tree panel  
**Then** Julieta's group disappears from the chart immediately  
**And** the remaining groups (Ana, Jhon, Paula) retain their correct values  
**And** the X-axis reflows with no empty placeholder space where Julieta was

---

### AC-9: Uncheck a Team Leader node (cascade)

**Given** a Business Leader (or MIA) has two Team Leaders in their tree, each with their own MS  
**When** the user unchecks a Team Leader node in the hierarchy tree  
**Then** all MS subordinates of that Team Leader are removed from the chart simultaneously  
**And** the TL's own group (if present as an MS node) is also removed  
**And** the other Team Leader's MS groups remain with intact values and correct ordering

---

### AC-10: Date range filter applied

**Given** the chart is rendered with production data spanning multiple periods  
**When** the user sets the date range to "Ene 2026 – Mar 2026" and presses "Aplicar"  
**Then** all bars recalculate to show only production within Q1 2026  
**And** MS with no production in that period display zero-height bars  
**And** tooltips reflect the filtered period's values

---

### AC-11: Combined partial tree selection and multiple filters

**Given** a Business Leader is authenticated and the tree has both Senior and Junior MS nodes  
**When** the user checks only "Senior" category nodes in the tree, sets date range to "Ene–Jun 2025", and sets company filter to "Trinity", then presses "Aplicar"  
**Then** the chart shows only the intersection: Senior MS nodes, within the Ene–Jun 2025 range, with businesses belonging to company "Trinity"  
**And** MS nodes not matching all three conditions do not appear in the chart

---

### AC-12: Empty state

**Given** all applied filters and scope constraints result in no matching production records  
**When** the chart would otherwise render with no data  
**Then** the chart area displays the empty state message: "Sin producción registrada para los filtros aplicados"  
**And** no bars, axis labels, or chart scaffold are rendered  
**And** the empty state is visually consistent with other empty states in the dashboard

---

## Technical Approach

### New API Endpoint
`GET /api/production-dashboard/ms-chart` — additive, shares the same query-parameter contract as `/api/production-dashboard/kpis` (userIds, dateFrom, dateTo, idCompany, etc.). Returns `ApiResponse<MsKpiRaw[]>`.

### New Service Function
`getMsChartRaw(params)` in `src/features/production-dashboard/services/ms-chart.service.ts` — executes `prisma.business.groupBy({ by: ['idUser', 'idCurrency'], _sum, _count, where })`. Reuses the same `where` clause builder as the existing KPI service. Returns one row per (userId × currency) pair.

### New Hook
`use-ms-bar-chart.ts` — consumes `useHierarchySelection` and `useDashboardFilter`. Calls the new endpoint, joins API rows with `orderedMsNodes` (from depth-first walk of `HierarchySelectionContext.nodes`), applies TRM conversion client-side, and exposes `AsyncState<MsBarDatum[]>`. Handles the MS Junior case (`nodes.length === 0` → use session `userId` directly).

### New Component
`MsGroupedBarChart.tsx` — `'use client'` component wrapping Recharts `<BarChart>` with two `<Bar>` children (blue: `foreignUsd`, green: `nationalUsd`). Uses `<Tooltip>` with custom formatter. Wrapped in `overflow-x-auto` div for horizontal scroll. Renders skeleton on loading state and `<EmptyState>` on empty data. Registered in `DashboardShell.tsx` below the `<UsdKpiPanel />`.

### New Types
`MsKpiRaw`, `MsChartQueryParams`, `MsBarDatum` added to `src/features/production-dashboard/types/production-kpi.types.ts`.

### Dependency
`recharts` installed via `npm install recharts`. No conflicts with Tailwind CSS v4 or shadcn/ui (Recharts renders SVG; styling is applied through props and `className`, not conflicting CSS resets).

### Ordering Algorithm
Client-side depth-first walk of `HierarchySelectionContext.nodes`, collecting nodes where `node.included === true` and `levelCode ∈ { MS_SENIOR, MS_JUNIOR }`. Natural tree order preserves hierarchy grouping; alphabetical order within same-level siblings is maintained by the existing service sort (`idLevel ASC`).

### Architecture Compliance
- Route handler → calls service only (no direct Prisma)
- Service → Prisma only, returns domain data (not `ApiResponse`)
- Hook → `AsyncState<T>`, single discriminated state
- Component → render only, no business logic
- All identifiers in English; user-facing strings in Spanish

---

## Affected Files

### New Files (8 including tests)
| File | Type |
|------|------|
| `src/features/production-dashboard/types/production-kpi.types.ts` | Extend (new types) |
| `src/features/production-dashboard/services/ms-chart.service.ts` | New service |
| `src/app/api/production-dashboard/ms-chart/route.ts` | New API route |
| `src/features/production-dashboard/hooks/use-ms-bar-chart.ts` | New hook |
| `src/features/production-dashboard/components/MsGroupedBarChart.tsx` | New component |
| `src/features/production-dashboard/__tests__/ms-chart.service.test.ts` | Unit tests — service |
| `src/features/production-dashboard/__tests__/use-ms-bar-chart.test.ts` | Unit tests — hook |
| `src/features/production-dashboard/__tests__/MsGroupedBarChart.test.tsx` | Unit tests — component |

### Modified Files (3)
| File | Change |
|------|--------|
| `src/features/production-dashboard/components/DashboardShell.tsx` | Add `<MsGroupedBarChart />` below `<UsdKpiPanel />` |
| `src/features/production-dashboard/index.ts` | Export new types, hook, component |
| `package.json` | Add `recharts` dependency |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `recharts` is a new dependency (~200 KB gzip) | Low | Well-maintained, compatible with React 19 and Tailwind v4; SSR issue mitigated by `'use client'` directive |
| `groupBy(['idUser', 'idCurrency'])` may be slow without index on `Business.idUser` | Medium | Check existing Prisma schema; add `@@index([idUser])` migration if absent |
| MS Junior scenario — `nodes = []` edge case requires session userId fallback | Medium | Hook must explicitly detect `nodes.length === 0` and call session hook; cover with unit test |
| Horizontal scroll UX degradation on very wide viewports with many MS | Low | Set `minWidth` on chart container (e.g. `max(100%, numAgents * 80px)`); tested with 20+ MS |
| TRM unavailable on mount — national bars cannot be calculated | Low | Same handling as `UsdKpiCard`: show zero-height bar with tooltip "TRM no disponible"; `trmAvailable` prop gates calculation |
| Recharts `<Tooltip>` re-renders on every hover — potential perf impact | Low | React Compiler handles memoization; custom tooltip component avoids inline JSX recreation |
| `appliedFilters` shape divergence if `/kpis` query builder is refactored | Low | Extract shared `buildProductionWhereClause()` helper used by both services |
