# Proposal: Production Dashboard Heatmap Table

## Intent

The Production Dashboard exposes USD KPIs and an MS bar chart, but does not let users see per-person × per-company production at a glance. Senior roles (MIA/Partner/BL/PL/TL) need to compare individual production across companies side-by-side to identify concentration, gaps, and outliers. The widget must respect role-based hierarchy scope and react to both the hierarchy tree and the dashboard filter panel, so analysis stays consistent with the rest of the dashboard.

## Scope

### In Scope
- New API endpoint `GET /api/production-dashboard/heatmap` returning per-(user, company) USD totals and business counts
- New service `heatmap.service.ts` using `prisma.business.findMany` + JS aggregation
- New hook `use-heatmap.ts` (mirrors `useMsBarChart` pattern, uses `AsyncState<T>`, accepts `trmRate` prop)
- New panel `HeatmapTablePanel.tsx` placed after `MsBarChartPanel` in `DashboardShell`
- Sticky-left first column (name + category badge), horizontal scroll for company columns
- Heatmap intensity per USD column, relative to visible max
- Category legend (top-right) derived from visible nodes
- Subtitle with active row count
- Reactive to `HierarchySelectionContext` and `DashboardAppliedFilters` (intersection)

### Out of Scope
- Raw SQL `GROUP BY` optimization (defer until perf becomes an issue >10k businesses)
- CSV/Excel export of heatmap data
- Drill-down on cell click (future enhancement)
- Mobile-optimized layout (desktop-first; horizontal scroll suffices)
- `isInternacional` filter forwarding (excluded by design — see Decision #4)
- Modifying `ms-chart` endpoint or its hook

## Capabilities

### New Capabilities
- `production-dashboard-heatmap`: per-user × per-company production heatmap with sticky-column table, hierarchy/filter reactivity, role-based visibility, and category legend

### Modified Capabilities
- None

## Approach

Follow the existing dashboard widget pattern (KPI / MsBar):
1. Service queries `Business` with selective `include` for company (via `productPercentageCommission → productConfiguration → product → company`) and aggregates by `(idUser, idCompany)` in JS, returning `HeatmapRow[]`.
2. API route validates input, calls service, returns rows.
3. Hook receives `selectedUserIds`, `appliedFilters`, `trmRate`; fetches and pivots rows into `{ rows: PersonRow[], companyColumns: CompanyColumn[], legend: CategoryLegendItem[] }`. Sort rows by `levelCode` desc then `fullName` asc. Sort companies by total USD desc. Compute per-column USD max for intensity.
4. Component renders a plain HTML `<table>` inside `<div className="overflow-x-auto">`. First column uses `sticky left-0 bg-card z-10`. USD cells use inline `backgroundColor: rgba(59,130,246, intensity)`; zero cells use transparent. NEG column is plain text.
5. Add `HeatmapTablePanel` to `ShellContent` right column after `MsBarChartPanel`, passing `trmRate`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/production-dashboard/types/production-kpi.types.ts` | Modified | Add `HeatmapRow`, `HeatmapQueryParams`, `PersonRow`, `CompanyColumn`, `CategoryLegendItem` |
| `src/features/production-dashboard/services/heatmap.service.ts` | New | Prisma findMany + JS aggregation |
| `src/app/api/production-dashboard/heatmap/route.ts` | New | GET handler, delegates to service |
| `src/features/production-dashboard/hooks/use-heatmap.ts` | New | AsyncState hook |
| `src/features/production-dashboard/components/HeatmapTablePanel.tsx` | New | Panel + table component |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modified | Mount panel after MsBarChartPanel |
| `src/features/production-dashboard/index.ts` | Modified | Re-exports |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sticky column breaks due to ancestor `overflow-y-auto` in `ShellContent` | Med | Verify in implementation; if broken, wrap table in isolated container with own scroll context |
| Wide orgs produce many company columns → horizontal scroll fatigue | Med | Sort companies by total USD desc so highest-value first; add visible scroll indicator (shadow on edges) |
| `levelCode` sort order assumes lexicographic order matches seniority | Med | Confirm DB level codes during spec phase; if not safe, add explicit `levelOrder` mapping in `lib/` |
| Large business sets (>10k) slow JS aggregation | Low | Add `userIds.length` guard (≤50); plan raw-SQL migration if breached |
| TRM rate is null on first paint | Low | Hook returns `idle` until `trmRate != null` (same as MsBar) |

## Rollback Plan

1. Remove `<HeatmapTablePanel />` mount from `DashboardShell.tsx` — widget disappears, rest of dashboard intact.
2. If needed, revert the entire feature branch: new files are additive; only `DashboardShell.tsx`, `production-kpi.types.ts`, and `index.ts` were modified.
3. No DB migrations, no env vars, no contract changes for existing endpoints.

## Dependencies

- Existing `HierarchySelectionContext`, `DashboardFilterProvider`, `useTrm` (already in `ShellContent`)
- Prisma relation path `Business → PPC → ProductConfiguration → Product → Company` (already exists)

## Success Criteria

- [ ] AC-1..AC-15 from user scenarios pass in integration tests
- [ ] Vitest unit tests cover service aggregation, hook sort/pivot logic, intensity calculation
- [ ] Manual QA: MS Junior sees one row; Partner sees all rows with horizontal+vertical scroll
- [ ] Sticky first column remains visible during horizontal scroll on Chrome, Firefox, Safari
- [ ] Heatmap recalculates within 200ms after filter or tree change (visible scope ≤500 rows)
- [ ] `npm run lint && npm run test:unit` green
