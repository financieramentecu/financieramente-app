# Proposal: Production dashboard — report filter panel

## Intent

The production dashboard's right column needs a **"Filtros del reporte"** panel so MIA, backoffice and agente users can scope the future KPIs/charts by **date range, business status, category, company, product, origin, plazo and periodicidad** — orthogonal to the *who* already provided by `HierarchySelectionContext`.

Today the only filter state on the dashboard is `HierarchySelectionContext.selectedUserIds`. There is **no date, status, category, company, product or origin filter state anywhere** in `production-dashboard/`. Without a filter panel the upcoming KPI work has nothing to scope against and no persistent **period** label to anchor every report section.

**Problem this slice solves**: give the dashboard a self-contained filter panel that holds **draft** state while the user edits and emits a stable **applied** state (plus a persistent period label) that future KPI hooks can consume alongside `selectedUserIds`.

**For whom**: dashboard viewers (MIA / backoffice see full scope; agente sees their own subtree). Internally, for the next SDD slice (KPI hooks/services) that will read `DashboardFilterContext.appliedFilters`.

**Success looks like**: a `DashboardFilterPanel` renders above the main content area; editing never affects reports until **Aplicar**; **Limpiar** resets to defaults; date range is validated (start ≤ end); active filters surface as badges plus a green `Periodo: ...` chip; Product options cascade from selected Companies; multiselects support a "Todas/Todos" toggle. No KPI, chart, table, API route or migration is touched.

## Scope

### In Scope

- `src/features/production-dashboard/` filter slice (Screaming Architecture):
  - `types/dashboard-filter.types.ts` — `DateRangeMonth`, `DashboardFilterState`, `DashboardFilterAction`, status / periodicidad / plazo enums or const objects.
  - `components/DashboardFilterContext.tsx` — `useReducer` context, **same pattern as `HierarchySelectionContext`**, exposing `draft`, `appliedFilters`, `periodLabel`, action helpers, and `dispatch`.
  - `components/DashboardFilterPanel.tsx` — the "Filtros del reporte" card (Row 1 + Row 2 layout, Internacional note, `Limpiar` / `Aplicar` buttons).
  - `components/filters/MonthRangePicker.tsx` — month/year range picker via Radix `Popover` + `Select` (no new dependency).
  - `components/filters/StatusSelect.tsx`, `CategoryMultiselect.tsx`, `CompanyMultiselect.tsx`, `ProductMultiselect.tsx`, `OriginMultiselect.tsx`, `PlazoSelect.tsx`, `PeriodicidadSelect.tsx`.
  - `components/filters/ActiveFilterBadges.tsx` — chip per active filter + green `Periodo:` chip.
  - `lib/` pure helpers — `buildDefaultFilters`, `deriveActiveProductIds` (cascade), `toggleTodas`, `validateDateRange`, `formatPeriodLabel`, `deriveActiveBadges`.
  - `__tests__/` colocated unit tests for the reducer and every pure helper.
- Catalog data for filter options reuses **existing hooks** from their feature directories: `useCompanies`, `useProducts`, `useClientOrigins`, and the categories hook (verified during spec). **No new catalog API route.**
- Wiring in `src/app/dashboard/page.tsx`: wrap the right column in `DashboardFilterProvider` (sibling to `HierarchySelectionProvider`) and render `DashboardFilterPanel` above the main content placeholder.
- Internacional mode **flag only**: render the note and swap the *labels* (País / Moneda / Canal). The actual internacional filter *data set* is out of scope.

### Out of Scope

- KPIs, charts, tables, aggregation services (`dashboard-kpis.service.ts`) — next slice.
- **New API routes** of any kind. Filter state is client-side; catalog data uses existing feature hooks.
- Internacional filter **data** (País / Moneda / Canal options and their query semantics) — only the label swap + note ship here.
- Prisma schema changes, migrations, new indexes. (Index needs on `dateIssued` / `dateAnchored` / `idClientOrigin` belong to the KPI-query slice that actually filters Business.)
- Persisting filters to URL/localStorage/server — applied state lives in context for this slice only.
- Reusing/moving `buildBusinessListWhere` — that is a KPI-query concern; this slice does not query Business.

## Key Decisions

### 1. Draft vs Applied state separation (core architectural decision)

The reducer holds **two snapshots**: `draft` (mutated by every control as the user edits) and `applied` (only replaced on `APPLY`). KPI hooks read **`appliedFilters`**, never `draft`. `Aplicar` copies `draft → applied` (after validation passes); `Limpiar` resets **both** to `buildDefaultFilters()`. This keeps editing free of side effects and gives the panel a single source of truth for the persistent period label (derived from `applied`, not `draft`).

Actions: `SET_DATE_RANGE`, `SET_STATUS`, `TOGGLE_CATEGORY`, `TOGGLE_COMPANY`, `TOGGLE_PRODUCT`, `TOGGLE_ORIGIN`, `SET_PLAZO`, `SET_PERIODICIDAD`, `SET_TODAS` (per dimension), `APPLY`, `CLEAR`, `SET_INTERNACIONAL`.

### 2. Month/year picker without a new dependency

No calendar component exists and `react-day-picker` is **not** installed. We build `MonthRangePicker` from Radix `Popover` + two `Select` pairs (start month/year, end month/year), formatting labels with `date-fns` v4 (`Ene 2025`). Avoids a package-approval round-trip and matches the screenshot's month-granularity intent. The picker emits `{ start: {month, year}, end: {month, year} }`; the KPI slice later expands this into concrete `Date` boundaries.

### 3. `DashboardFilterContext` mirrors `HierarchySelectionContext`

Same `useReducer` + pure-helper shape already proven in `HierarchySelectionContext`: pure functions (`toggleTodas`, `deriveActiveProductIds`, `validateDateRange`) live outside the reducer and are unit-tested independently; the provider derives `selectedXIds`, `periodLabel`, `isApplyEnabled` and `activeBadges` from state; a `useDashboardFilters()` hook throws if used outside the provider. Consistency lowers the learning cost and lets both contexts coexist cleanly at `DashboardPage`.

### 4. "Todas/Todos" toggle logic

Each multiselect (Categoría, Compañía, Producto, Origen) carries an implicit "Todas/Todos" meaning: **empty selection ⇒ all**. The reducer treats `selectedIds = []` as "Todas". Choosing a specific item clears the "Todas" pseudo-state; toggling "Todas" explicitly clears the specific selections. UI shows `Todas`/`Todos` label when the set is empty. This avoids a sentinel `-1` id and keeps the emitted contract clean (`[]` = no constraint).

### 5. Product cascade from Company (derived state, computed once)

Product options are filtered to those belonging to the selected Companies (empty companies ⇒ all products). When a company is deselected, any already-selected product that belonged only to that company must drop. `deriveActiveProductIds(draft)` is a **pure function computed once** per render from `companyIds + productIds + catalog` — never duplicated derived state (per the SOLID code-smell rule against `resolvedX2`). The reducer keeps raw `productIds`; the visible/effective set is derived, not stored twice.

### 6. Category-via-User-join is a downstream KPI implication (documented, not implemented)

`Business` has **no** `categoryId`; category lives on `User.idCategory`. This slice only emits `categoryIds[]`. The future KPI query MUST filter via `business.user.idCategory IN (...)`. We document this contract explicitly so the KPI slice does not assume a Business-level field. Also: the selected `categoryIds` will need to reflect in the hierarchy tree checked state (scenario 6) — this slice exposes `categoryIds` on the applied contract; the actual cross-highlighting is a tree-integration concern flagged for the KPI/integration slice.

### 7. Internacional = label/flag only

`SET_INTERNACIONAL` flips a boolean that swaps labels (Categoría→País, Compañía→Moneda, Origen→Canal per the note) and renders the explanatory note. The underlying filter *fields* and option sources for internacional are deferred — the contract reserves the flag so the next slice can branch on it without a state migration.

## Integration Point

Both contexts coexist at `DashboardPage`:

```
<HierarchySelectionProvider>        // who  → selectedUserIds: readonly number[]
  <DashboardFilterProvider>         // when/what → appliedFilters
    <DashboardFilterPanel />        // this slice
    <main> … future KPIs …          // next slice consumes both contexts
  </DashboardFilterProvider>
</HierarchySelectionProvider>
```

Future KPI hooks (`use-dashboard-kpis`) will read:

```ts
const { selectedUserIds } = useHierarchySelection()
const { appliedFilters } = useDashboardFilters()
// appliedFilters: {
//   dateRange: { start: {month,year}, end: {month,year} }
//   status: BusinessStatus | null
//   categoryIds: number[]   // [] = all; query via business.user.idCategory
//   companyIds: number[]    // [] = all
//   productIds: number[]    // [] = all; effective set cascaded from companyIds
//   originIds: number[]     // [] = all → Business.idClientOrigin
//   plazoYears: number | null
//   periodicidad: Periodicidad | null
//   internacional: boolean
// }
```

The KPI slice composes these into `buildBusinessListWhere`-style conditions (`companyIds`, `productIds`, `originIds`, `dateAnchoredRange`/`dateIssued`) plus the `business.user.idCategory` join and the `idUser IN selectedUserIds` scope. **This proposal only guarantees the shape and the applied/persisted period label** — it performs no query.

## Affected Areas

| Area | Impact |
|------|--------|
| `src/features/production-dashboard/types/dashboard-filter.types.ts` | New |
| `src/features/production-dashboard/components/DashboardFilterContext.tsx` | New |
| `src/features/production-dashboard/components/DashboardFilterPanel.tsx` | New |
| `src/features/production-dashboard/components/filters/**` | New (pickers, multiselects, badges) |
| `src/features/production-dashboard/lib/**` | New (pure helpers) |
| `src/features/production-dashboard/__tests__/**` | New (reducer + helpers) |
| `src/app/dashboard/page.tsx` | Modified — wrap right column in `DashboardFilterProvider`, render panel |
| `HierarchySelectionContext.tsx` | Unchanged — consumed as sibling |

## Risks

| Risk | L | Mitigation |
|------|---|------------|
| Category lives on `User`, not `Business` | M | Document join contract (`business.user.idCategory`) for KPI slice; emit `categoryIds` only here |
| Product cascade derived state duplicated | M | Single pure `deriveActiveProductIds`, computed once; unit-tested; never stored twice |
| "Todas/Todos" toggle edge cases | M | Model `[] = all`; dedicated `toggleTodas` helper with table-driven unit tests |
| No date-picker component | L | Build `MonthRangePicker` from Radix `Popover` + `Select`; no new dependency |
| Two contexts must coexist cleanly | L | Mirror proven `HierarchySelectionContext` pattern; siblings at `DashboardPage` |
| KPI data model still undefined | M | Out of scope here; this slice only emits a stable applied contract for the next slice |
| Categoría↔tree cross-highlight (scenario 6) | L | Expose `categoryIds` on contract; defer actual tree highlighting to integration slice |

## Rollback

Revert the PR (new feature files + the `page.tsx` provider/panel wiring). No migration, no API, no schema change — clean revert.

## Dependencies

Existing catalog hooks (`useCompanies`, `useProducts`, `useClientOrigins`, categories hook) and Shadcn primitives (`Popover`, `Select`, `Command`, `Checkbox`, `ScrollArea`, `Badge`, `Separator`, `Button`). `date-fns` v4 (installed).

## Success Criteria

- [x] `DashboardFilterPanel` renders above the main content area, right column.
- [x] Editing controls mutates `draft` only; `appliedFilters` changes solely on `Aplicar`.
- [x] `start > end` ⇒ validation error shown, `Aplicar` disabled (scenario 2).
- [x] Valid range ⇒ `Periodo: Ene-Dic 2025` chip shown, `Aplicar` enabled (scenario 1).
- [x] `Limpiar` ⇒ defaults restored (current year, all multiselects empty/"Todas") (scenario 4).
- [x] Period label derived from applied state and stable across sections (scenario 5).
- [x] Product options cascade from selected Companies; deselected company drops orphan products (scenario 9).
- [x] "Todas/Todos" toggle correct for Categoría/Compañía/Producto/Origen (scenarios 7, 8).
- [x] One badge per active filter (scenario 10).
- [x] Internacional flag swaps labels + renders the note (no internacional data).
- [x] All identifiers in English, user-facing strings in Spanish; no `any`; `AsyncState<T>` for any async catalog state.
- [x] `npm run type-check` + targeted Vitest tests green.
