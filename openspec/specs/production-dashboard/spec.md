# Production Dashboard Specification

## Purpose

Hierarchy filter tree for the Production Dashboard left column. Scopes downstream business/KPI filters via a checkbox tree of active org users. Viewer-role determines tree depth; selection output is `selectedUserIds[]`.

---

## Requirements

### Requirement: Hierarchy Tree API

The system SHALL expose `GET /api/production-dashboard/hierarchy-tree` returning `ApiResponse<{ nodes: HierarchyNode[] }>`. The server MUST resolve viewer identity from the session email; client-supplied identity MUST NOT be trusted. Only users where `User.active === true` SHALL appear. Users without a valid `idLevel` SHALL be excluded from the tree. Tree depth MUST be computed by walking `Level.idNextLevel`; depth constants MUST NOT be hardcoded.

`HierarchyNode = { userId: number, fullName: string, levelCode: string, categoryName: string, levelColor: string, included: boolean, children: HierarchyNode[] }`

#### Scenario: Authenticated request returns nested tree

- GIVEN a viewer with a valid session
- WHEN `GET /api/production-dashboard/hierarchy-tree` is called
- THEN response SHALL have `success: true` and `data.nodes` as a nested `HierarchyNode[]`

#### Scenario: Inactive users excluded from tree

- GIVEN some users have `User.active === false`
- WHEN the tree is built
- THEN those users SHALL NOT appear in any node

#### Scenario: Users without level excluded from tree

- GIVEN some active users have no valid `idLevel`
- WHEN the tree is built
- THEN those users SHALL NOT appear in any node

#### Scenario: Unauthenticated request rejected

- GIVEN no valid session exists
- WHEN the endpoint is called
- THEN the response SHALL return HTTP 401

---

### Requirement: Role-Based Tree Scope

Viewers with role `GENERAL_LEVEL` (MIA) OR any role in `HIERARCHY_BYPASS_ROLES` SHALL receive the full org tree from the highest active `Level` downward. All other viewers SHALL receive only their own down-branch (active subordinates reachable via `idUserLeader`). MS Senior viewers SHALL receive only their direct MS Junior subordinates.

#### Scenario: MIA viewer gets full org tree

- GIVEN the viewer's role is GENERAL_LEVEL
- WHEN the hierarchy tree is fetched
- THEN `data.nodes` SHALL contain the complete active org tree from the root level

#### Scenario: Backoffice bypass role gets full tree

- GIVEN the viewer's role is in `HIERARCHY_BYPASS_ROLES`
- WHEN the hierarchy tree is fetched
- THEN `data.nodes` SHALL be scoped the same as the MIA full tree

#### Scenario: Team Leader gets own subtree only

- GIVEN the viewer is a Team Leader (not MIA, not bypass)
- WHEN the hierarchy tree is fetched
- THEN `data.nodes` SHALL contain only the viewer and active users reachable via `idUserLeader` downward
- AND peers or superiors SHALL NOT appear

#### Scenario: MS Senior gets only own MS Junior subordinates

- GIVEN the viewer is an MS Senior
- WHEN the hierarchy tree is fetched
- THEN `data.nodes` SHALL include only the viewer's direct MS Junior subordinates

#### Scenario: Dynamic depth expands for new levels

- GIVEN a new `Level` is inserted and linked via `idNextLevel`
- WHEN the tree is fetched for a qualifying viewer
- THEN the new level's users SHALL appear in the tree without any code change

---

### Requirement: MS Junior Visibility

The API MUST return `{ nodes: [] }` with HTTP 200 for an MS Junior viewer. The UI MUST NOT render the hierarchy filter panel when `nodes` is empty.

#### Scenario: MS Junior receives empty tree

- GIVEN the viewer's role is MS Junior
- WHEN `GET /api/production-dashboard/hierarchy-tree` is called
- THEN response SHALL have `success: true` and `data.nodes === []`

#### Scenario: Empty tree hides the panel

- GIVEN `data.nodes` is an empty array
- WHEN the Production Dashboard renders
- THEN the hierarchy filter panel SHALL NOT be visible

---

### Requirement: Selection Contract

All nodes SHALL default to `included: true` (full scope active on load). The UI MUST render a checkbox per node. Unchecking a node MUST set `included: false` and remove its `userId` from `selectedUserIds[]`. Unchecking a parent MUST cascade to all descendants. `selectedUserIds: number[]` is the output contract for downstream filter calls.

#### Scenario: Default — all nodes included

- GIVEN the tree loads with no prior interaction
- WHEN the UI renders
- THEN every checkbox SHALL be checked and `selectedUserIds` SHALL equal all visible `userId` values

#### Scenario: Uncheck a leaf node

- GIVEN a user unchecks a leaf node
- WHEN selection state updates
- THEN that `userId` SHALL be removed from `selectedUserIds[]`

#### Scenario: Uncheck parent cascades to children

- GIVEN a user unchecks a parent node
- WHEN selection state updates
- THEN all descendant nodes SHALL also be set to `included: false`
- AND all their `userId` values SHALL be removed from `selectedUserIds[]`

---

### Requirement: Hierarchy Tree Presentation

Each node SHALL display the user's `fullName` with a badge showing `categoryName` on a `levelColor` background. All nodes with children SHALL be expanded by default on initial render. The full name SHALL be available via a tooltip when truncated or on hover.

#### Scenario: Category badge uses level color

- GIVEN a node with `categoryName` and `levelColor`
- WHEN the node renders
- THEN the badge SHALL show `categoryName` with background `levelColor`

#### Scenario: Tree nodes expanded by default

- GIVEN a node has one or more children
- WHEN the hierarchy panel first renders
- THEN child nodes SHALL be visible without requiring expand interaction

#### Scenario: Full name available in tooltip

- GIVEN a node displays a truncated or abbreviated name
- WHEN the user hovers the node label
- THEN a tooltip SHALL show the complete `fullName`

---

## Part II: Dashboard Filter Panel

### Requirement: Applied Filter Contract

The system MUST expose a stable `DashboardAppliedFilters` contract with the following shape and defaults:

| Field | Type | Default | Semantics |
|---|---|---|---|
| `dateFrom` | `Date \| null` | `null` (= start of current year) | Inclusive lower bound |
| `dateTo` | `Date \| null` | `null` (= end of current year) | Inclusive upper bound |
| `statuses` | `string[]` | `[]` (= all) | Empty = all statuses |
| `categoryIds` | `number[]` | `[]` (= all) | Empty = all categories |
| `companyIds` | `number[]` | `[]` (= all) | Empty = all companies |
| `productIds` | `number[]` | `[]` (= all) | Empty = all products |
| `originIds` | `number[]` | `[]` (= all) | Empty = all origins |
| `plazos` | `number[]` | `[]` (= all) | Empty = all plazos |
| `periodicidades` | `string[]` | `[]` (= all) | Empty = all periodicidades |
| `isInternacional` | `boolean` | `false` | Nacional mode |

The system MUST maintain two independent snapshots: `draftFilters` (in-progress edits) and `appliedFilters` (committed state). Changes to filter controls MUST mutate only `draftFilters`. The `appliedFilters` snapshot MUST remain unchanged until the user confirms via "Aplicar".

#### Scenario: Initial state

- GIVEN the dashboard page loads for the first time
- WHEN no user action has been taken
- THEN `draftFilters` equals `buildDefaultFilters()` and `appliedFilters` equals `buildDefaultFilters()`
- AND the "Aplicar" button is disabled (draft equals applied)

---

### Requirement: Draft-to-Applied Transition

The system MUST copy `draftFilters` into `appliedFilters` only when the user confirms via the "Aplicar" action. The "Aplicar" action MUST be disabled when (a) `draftFilters` equals `appliedFilters`, or (b) date validation fails.

#### Scenario: Valid filter confirmation

- GIVEN the user has changed at least one filter in `draftFilters`
- AND the date range is valid (dateFrom ≤ dateTo or both null)
- WHEN the user presses "Aplicar"
- THEN `appliedFilters` is updated to equal `draftFilters`
- AND the "Aplicar" button becomes disabled again

#### Scenario: No changes — Aplicar disabled

- GIVEN `draftFilters` equals `appliedFilters`
- WHEN the panel is rendered
- THEN "Aplicar" MUST be disabled regardless of date validity

---

### Requirement: Date Range Filter

The system MUST provide a day-level calendar picker. The picker MUST emit date pairs for start and end. The default range MUST be January 1 to December 31 of the current year.

#### Scenario: Valid date range selected

- GIVEN the user selects January 2025 as start and December 2025 as end
- WHEN the selection is complete
- THEN `draftFilters.dateFrom` reflects January 2025 and `draftFilters.dateTo` reflects December 2025
- AND the period badge shows "Periodo: Ene-Dic 2025"
- AND "Aplicar" becomes enabled

#### Scenario: Invalid date range — start after end

- GIVEN the user selects a start date that is later than the end date
- WHEN the validation runs
- THEN an inline error "La fecha de inicio debe ser anterior a la fecha fin" MUST be displayed
- AND "Aplicar" MUST be disabled

#### Scenario: Period badge persists across navigation

- GIVEN the user has applied a valid date range "Ene 2025–Dic 2025"
- WHEN the user navigates between dashboard sections (without changing filters)
- THEN the "Periodo: Ene-Dic 2025" badge MUST remain visible

---

### Requirement: Multiselect Filters with "Todas/Todos" Toggle

Multiselect filters (Estado, Categoría, Compañía, Producto, Origen) MUST follow "Todas/Todos" semantics: an empty array (`[]`) represents all options selected. The UI MUST show "Todas" or "Todos" in the field summary when the array is empty.

Selecting a "Todas/Todos" option MUST clear all specific selections (reset to `[]`). Selecting any specific item when the array is empty MUST populate the array with that item only (deselecting the implicit "all" state).

#### Scenario: "Todas" selected clears specific items

- GIVEN the user has selected `companyIds: [1, 2]` in the Compañía multiselect
- WHEN the user selects "Todas"
- THEN `draftFilters.companyIds` becomes `[]`
- AND the field summary shows "Todas"

#### Scenario: Specific item selected from "Todas" state

- GIVEN `draftFilters.companyIds` is `[]` (Todas)
- WHEN the user selects company with id 3
- THEN `draftFilters.companyIds` becomes `[3]`
- AND "Todas" is no longer shown as selected

#### Scenario: Same semantics for Origen

- GIVEN `draftFilters.originIds` is `[]` (Todas)
- WHEN the user selects a specific origin
- THEN `draftFilters.originIds` contains only that origin
- AND "Todas" is deselected in the UI

---

### Requirement: Product Cascade from Company

When selected companies change, the system MUST derive the effective product set from the current company selection. Products that belong only to deselected companies MUST be removed from `draftFilters.productIds`.

The derivation MUST be computed as a pure, side-effect-free function (`deriveActiveProductIds`) called exactly once per state transition. No duplicated derived state computation is permitted.

#### Scenario: Deselecting a company removes orphan products

- GIVEN the user has `companyIds: [1, 2]` and `productIds: [10, 20, 30]`
- AND products 20 and 30 belong exclusively to company 2
- WHEN the user deselects company 2
- THEN `draftFilters.companyIds` becomes `[1]`
- AND `draftFilters.productIds` becomes `[10]`

#### Scenario: Company "Todas" clears product cascade constraint

- GIVEN `companyIds: [1]` and `productIds: [10]`
- WHEN the user selects "Todas" in Compañía
- THEN `companyIds` becomes `[]` and the product list shows all products
- AND `productIds` is reset to `[]`

---

### Requirement: Limpiar (Reset All Filters)

The system MUST provide a "Limpiar" action that resets both `draftFilters` and `appliedFilters` to `buildDefaultFilters()` in a single atomic operation. The hierarchy tree selection (from `HierarchySelectionContext`) MUST also be cleared when "Limpiar" is triggered.

#### Scenario: Full reset on Limpiar

- GIVEN the user has applied non-default filters
- WHEN the user presses "Limpiar"
- THEN `draftFilters` and `appliedFilters` both equal `buildDefaultFilters()`
- AND the hierarchy tree selection is cleared
- AND the "Aplicar" button is disabled

---

### Requirement: Active Filter Badges

The system MUST display one badge per active filter (a filter whose value differs from its default). Badge display MUST reflect `appliedFilters`, not `draftFilters`.

#### Scenario: Badge per active filter

- GIVEN the user has applied `companyIds: [1]`, `dateFrom: Jan 2025`, `dateTo: Dec 2025`
- WHEN the panel renders the badge area
- THEN exactly one badge is shown for the period ("Periodo: Ene-Dic 2025") and one for Compañía
- AND no badge is shown for filters still at their defaults

---

### Requirement: Categoría Filter and Hierarchy Tree Visual Feedback

The system MUST emit `categoryIds` in `appliedFilters` when the user selects categories. The hierarchy tree MUST visually reflect which users match the selected categories (users whose `idCategory` is in `categoryIds` are highlighted/checked; others are dimmed).

This visual update MUST be driven by reading `appliedFilters.categoryIds` from context — it MUST NOT be computed independently in the tree component.

#### Scenario: Category selection updates tree visual state

- GIVEN `appliedFilters.categoryIds` is `[5]`
- WHEN the hierarchy tree renders
- THEN users with `idCategory === 5` appear checked/highlighted
- AND users with other categories appear dimmed or unchecked

#### Scenario: "Todas" in Categoría shows all users

- GIVEN `appliedFilters.categoryIds` is `[]`
- WHEN the hierarchy tree renders
- THEN all users appear in their normal (non-dimmed) state

---

### Requirement: Internacional Mode

The system MUST support an "Internacional" boolean flag that, when enabled, swaps filter labels: Categoría → País, Compañía → Moneda, Origen → Canal Internacional. The system MUST render a note explaining that international data is forthcoming. No international catalog data or queries are required in this slice.

#### Scenario: Internacional flag enables label swap and note

- GIVEN the user activates the "Internacional" toggle
- WHEN the filter panel renders
- THEN the labels "Categoría", "Compañía", and "Origen" are replaced with "País", "Moneda", and "Canal Internacional"
- AND a note is displayed indicating international data is not yet available
- AND `draftFilters.isInternacional` is set to `true`

#### Scenario: Returning to nacional mode restores labels

- GIVEN `isInternacional` is `true`
- WHEN the user deactivates the toggle
- THEN original labels are restored and the note is hidden
- AND `draftFilters.isInternacional` is set to `false`

---

### Requirement: Panel Layout

The filter panel MUST be rendered in the right column of the production dashboard. The panel MUST be organized as a card with two rows of four filter controls each:

| Row | Column 1 | Column 2 | Column 3 | Column 4 |
|---|---|---|---|---|
| 1 | Rango de fechas | Estado | Categoría | Compañía |
| 2 | Producto | Origen | Plazo (Años) | Periodicidad |

- Rango de fechas: day-level calendar picker
- Estado: single select
- Plazo: single select
- Periodicidad: single select
- Categoría, Compañía, Producto, Origen: multiselect with "Todas/Todos" toggle

The panel MUST include "Aplicar" and "Limpiar" action controls. The Internacional toggle MUST be visible within or adjacent to the panel.

---

### Requirement: Context Composition at Dashboard Page

Both `HierarchySelectionContext` and `DashboardFilterContext` MUST be provided at the dashboard page level. The two contexts MUST operate as siblings (neither nests inside the other at the data level). Future KPI hooks MUST be able to read `selectedUserIds` from `HierarchySelectionContext` and `appliedFilters` from `DashboardFilterContext` independently.

The category↔tree integration MUST be achieved by reading `appliedFilters.categoryIds` from `DashboardFilterContext` within the hierarchy tree rendering logic — no prop drilling through intermediate components.

#### Scenario: Both contexts available to children

- GIVEN the dashboard page is rendered with both providers
- WHEN any child component reads `useDashboardFilters()` or `useHierarchySelection()`
- THEN both return their current state without error

#### Scenario: Hook used outside provider throws

- GIVEN a component uses `useDashboardFilters()` without a surrounding provider
- WHEN the component mounts
- THEN an error is thrown with a descriptive message indicating the missing provider

---

### Requirement: Catalog Data Access

The system MUST NOT introduce new API routes for catalog data in this change. Catalog data (companies, products, origins, categories) MUST be fetched using existing hooks from the `negocios` and `categories` features.

---

### Requirement: KPI Consumer Contract (Stable Output Shape)

The `appliedFilters` object emitted by `DashboardFilterContext` constitutes the stable contract for future KPI hooks. The shape MUST NOT change without a new SDD proposal. Future KPI queries MUST use `business.user.idCategory IN (categoryIds)` — NOT a direct `business.categoryId` join, which does not exist.

---

## Part III: Company Donut KPI

### Requirement: Company Donut Data Aggregation

The system MUST expose `GET /api/production-dashboard/by-company` returning `ApiResponse<CompanyDonutRaw[]>`. The endpoint MUST accept all 9 filter dimensions (`userIds`, `dateRange`, `statuses`, `categoryIds`, `companyIds`, `productIds`, `originIds`, `plazos`, `periodicidades`) via `buildProductionWhereClause`. The service MUST perform one `findMany` with in-memory `(companyId × currencyId)` reduce. Companies with zero businesses in scope MUST be excluded from the result.

#### Scenario: Aggregate returns one entry per company × currency

- GIVEN businesses exist spanning multiple companies and currencies
- WHEN `GET /api/production-dashboard/by-company` is called with no filters
- THEN each `CompanyDonutRaw` entry SHALL have a unique `(companyId, currencyId)` key
- AND the sum of all counts equals the total in-scope business count

#### Scenario: Empty result when no businesses match scope

- GIVEN the active filter combination yields zero businesses
- WHEN the endpoint is called
- THEN the response SHALL return `success: true` with an empty `data` array

#### Scenario: All 9 filter dimensions forwarded to query

- GIVEN a filter set with `statuses`, `dateRange`, and `categoryIds` set
- WHEN the service runs
- THEN only businesses satisfying all active filter predicates SHALL appear in the aggregate

---

### Requirement: Company Donut Stable Color Mapping

The system MUST assign colors to companies from a predefined palette sorted by `idCompany` ascending. USD companies SHALL use the base palette; COP companies SHALL use the light palette. Color assignment MUST be deterministic and stable across reloads. New companies MUST receive the next available slot without altering existing assignments.

#### Scenario: Colors stable on reload

- GIVEN a set of companies C1, C2, C3 with `idCompany` 10, 20, 30
- WHEN the donut renders twice without data change
- THEN each company receives the same color slot both times

#### Scenario: New company gets next slot

- GIVEN three companies already assigned slots 0, 1, 2
- WHEN a fourth company appears in the result
- THEN it receives slot 3 and existing slots are unchanged

---

### Requirement: Status Donut Data Aggregation

The system MUST expose `GET /api/production-dashboard/by-status` returning `ApiResponse<StatusDonutRaw[]>`. The endpoint MUST accept the same 9 filter dimensions as `by-company` via `buildProductionWhereClause`. The service MUST query only businesses where `status IN ('VENTA_EFECTUADA', 'EMITIDO', 'FONDEADO')` using `prisma.business.groupBy(['status'])`. Businesses with any other status or a null status MUST be excluded. The allowed status set MUST be defined as a single constant in lib — MUST NOT be hardcoded inline in the service or route.

#### Scenario: Aggregate returns one entry per in-scope status

- GIVEN businesses exist across all three statuses
- WHEN `GET /api/production-dashboard/by-status` is called with no filters
- THEN each `StatusDonutRaw` entry SHALL have a unique `status` key
- AND the sum of all counts equals the total in-scope business count

#### Scenario: Out-of-scope statuses excluded from aggregate

- GIVEN some businesses have status `CANCELADO` or a null status
- WHEN the endpoint is called
- THEN those businesses SHALL NOT appear in any `StatusDonutRaw` entry

#### Scenario: Empty result when no businesses match filters

- GIVEN the active filter combination yields zero qualifying businesses
- WHEN the endpoint is called
- THEN the response SHALL return `success: true` with an empty `data` array

#### Scenario: All 9 filter dimensions forwarded to query

- GIVEN a filter set with `dateRange`, `categoryIds`, and `companyIds` set
- WHEN the service runs
- THEN only businesses satisfying all active filter predicates SHALL appear in the aggregate

---

### Requirement: Status Donut Fixed Color Mapping

The system MUST assign a fixed, deterministic color to each status:

| Status | Color |
|---|---|
| `VENTA_EFECTUADA` | `#f97316` (orange-500) |
| `EMITIDO` | `#3b82f6` (blue-500) |
| `FONDEADO` | `#22c55e` (green-500) |

Color assignment MUST NOT change when filters change or when the hierarchy tree selection changes. The mapping MUST be defined in lib as a constant — MUST NOT be inlined in the component.

#### Scenario: Colors stable across filter changes

- GIVEN the donut is rendered with all three segments
- WHEN the user changes the date range filter
- THEN each status segment retains its assigned color

#### Scenario: Colors stable when only two statuses present

- GIVEN only `VENTA_EFECTUADA` and `EMITIDO` have businesses in scope
- WHEN the donut renders
- THEN those two segments use their fixed colors and no third segment appears

---

### Requirement: Status Donut Visualization

The system MUST render `StatusDonut` as the third panel in `DashboardShell`, to the right of `CompanyDonutPanel` on xl screens. The legend MUST show one entry per visible segment with format `"LABEL · PCT%"` using Spanish display labels. Tooltip on hover MUST show `"COUNT (PCT%)"` and disappear on mouse-out. Sum of all segment percentages MUST equal 100%. A segment whose percentage rounds to less than 1% MUST still render a visible minimum arc and show the precise decimal percentage in both legend and tooltip.

Display labels:

| Status | Display Label |
|---|---|
| `VENTA_EFECTUADA` | Venta Efectuada |
| `EMITIDO` | Emitido |
| `FONDEADO` | Fondeado |

#### Scenario: Legend shows all three statuses with percentages

- GIVEN businesses are distributed 35% / 45% / 20% across the three statuses
- WHEN the panel renders
- THEN the legend shows "Venta Efectuada · 35%", "Emitido · 45%", "Fondeado · 20%"
- AND the sum of displayed percentages equals 100%

#### Scenario: Tooltip shows count and percentage on hover

- GIVEN the user hovers the EMITIDO segment with 63 businesses (45%)
- WHEN the tooltip appears
- THEN it shows "63 (45%)"
- AND disappears when the user moves the cursor away

#### Scenario: Single status at 100%

- GIVEN only one status has businesses in scope after applying filters
- WHEN the donut renders
- THEN one segment at 100% is shown with its fixed color and legend "LABEL · 100%"

#### Scenario: Two statuses sum to 100%

- GIVEN two statuses have businesses in scope
- WHEN the donut renders
- THEN the legend shows exactly two entries and their percentages sum to 100%

#### Scenario: Sub-1% segment renders minimum arc

- GIVEN one status has a count resulting in 0.3% of total
- WHEN the donut renders
- THEN a minimum visible arc is rendered for that segment
- AND the legend shows "LABEL · 0.3%"
- AND the tooltip shows "1 (0.3%)"

#### Scenario: Empty state when no businesses in scope

- GIVEN the active filter combination yields zero qualifying businesses
- WHEN `StatusDonut` renders
- THEN the EmptyState component is shown with message "Sin negocios para los filtros aplicados"
- AND no legend items or segments are rendered

---

### Requirement: Status Donut Filter Reactivity

The donut MUST recalculate when any of the following change: hierarchy tree selection, date range, status panel filter, category, company, origin, or any other `appliedFilters` dimension. The sum MUST always equal 100% over the filtered scope.

#### Scenario: Role-based scope — MS Junior sees own businesses only

- GIVEN the viewer is MS Junior
- WHEN the donut renders
- THEN only businesses owned by that MS Junior are aggregated

#### Scenario: Partner or MIA sees full org scope

- GIVEN the viewer is MIA or has a hierarchy-bypass role
- WHEN the donut renders
- THEN all active org businesses in scope are aggregated

#### Scenario: Uncheck hierarchy tree node recalculates

- GIVEN a TL node is unchecked in the hierarchy tree
- WHEN the donut recalculates
- THEN businesses belonging to MS users under that TL are excluded
- AND percentages recompute over the remaining scope

#### Scenario: Uncheck parent cascades to children recalculates

- GIVEN a Team Leader node with multiple MS users is unchecked
- WHEN the donut recalculates
- THEN all subordinate businesses are excluded from the aggregate

#### Scenario: Date range filter recalculates

- GIVEN the user changes the date range to a narrower window
- WHEN the filter is applied
- THEN only businesses with dates in range appear in the donut

#### Scenario: Status panel filter produces single 100% segment

- GIVEN the status panel filter is set to "Fondeado"
- WHEN applied
- THEN the donut renders one segment at 100% labeled "Fondeado · 100%"

#### Scenario: Combined filters intersect correctly

- GIVEN date range, tree partial selection, company, category, and origin filters are all active
- WHEN the donut renders
- THEN only businesses satisfying all predicates appear and percentages sum to 100%

---

## MODIFIED Requirements

### Requirement: Company Donut Visualization

The system MUST render `CompanyDonutPanel` to the RIGHT of `OriginDonutPanel` and to the LEFT of `StatusDonut` in `DashboardShell` using `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`. The legend MUST show one item per company with format `"COMPANY · PCT%"`. Tooltip on hover MUST show `"COMPANY · CURRENCY · COUNT (PCT%)"` and disappear on mouse-out. Sum of all segment percentages MUST equal 100%.

(Previously: grid was `grid-cols-1 md:grid-cols-2` — updated to add third column slot for StatusDonut on xl screens)

#### Scenario: Legend lists each company with percentage

- GIVEN the donut has segments for SKANDIA (48.2%) and TRINITY (51.8%)
- WHEN the panel renders
- THEN the legend shows "SKANDIA · 48.2%" and "TRINITY · 51.8%"

#### Scenario: Tooltip on segment hover

- GIVEN the user hovers a segment for SKANDIA, COP, 130 businesses (48.2%)
- WHEN the tooltip appears
- THEN it shows "SKANDIA · COP · 130 (48.2%)"
- AND disappears when the user moves the cursor away

#### Scenario: Single company at 100%

- GIVEN only one company has businesses in scope
- WHEN the donut renders
- THEN one segment at 100% is shown with legend "COMPANY · 100%" and tooltip "COMPANY · COP · N (100%)"

#### Scenario: EmptyState when no businesses in scope

- GIVEN the filter combination yields zero businesses
- WHEN `CompanyDonutPanel` renders
- THEN the EmptyState component is shown with message "Sin negocios para los filtros aplicados"
- AND no legend items or segments are rendered

---

### Requirement: Company Donut Filter Reactivity

The donut MUST recalculate when any of the following change: hierarchy tree selection, date range, status, origin, company multiselect, or category filter. The sum MUST always equal 100% over the filtered scope.

#### Scenario: Role-based scope — MS Junior sees own businesses only

- GIVEN the viewer is MS Junior with 15 businesses across SKANDIA, TRINITY, DOMINION
- WHEN the donut renders
- THEN only those 15 businesses are aggregated and percentages sum to 100%

#### Scenario: Deselecting a hierarchy node excludes its businesses

- GIVEN a TL node is unchecked in the hierarchy tree
- WHEN the donut recalculates
- THEN businesses belonging to MS users under that TL are excluded
- AND if no businesses remain for a company, its segment disappears

#### Scenario: Date range filter scopes aggregation

- GIVEN a date range that excludes some businesses
- WHEN applied
- THEN only businesses with dates in range appear in the donut

#### Scenario: Status filter scopes aggregation

- GIVEN the status filter is set to "Fondeado"
- WHEN applied
- THEN only "Fondeado" businesses appear in the company distribution

#### Scenario: Origin filter scopes aggregation

- GIVEN the origin filter is set to "Método Vortex"
- WHEN applied
- THEN only businesses with that origin appear in the company distribution

#### Scenario: Company multiselect filter

- GIVEN the user selects specific companies in the Compañía multiselect
- WHEN applied
- THEN the donut shows only those companies and their percentages sum to 100%

#### Scenario: Combined filters intersect correctly

- GIVEN date range, status, and category filters are all active simultaneously
- WHEN the donut renders
- THEN only businesses satisfying all predicates appear and sum equals 100%

---

## Constraints

- All identifiers MUST be in English. User-facing strings MUST be in Spanish.
- No `any` type is permitted.
- Async hook state MUST use `AsyncState<T>` from `src/features/shared/types/async-state.types.ts`.
- No new npm dependencies for the date picker (Radix Popover + Calendar components).
- No Prisma calls, no API route handlers, no service layer changes in this slice.
