# production-dashboard-origin-distribution Specification

## Purpose

Define all behavioral requirements for the donut chart that shows negocio distribution by ClientOrigin × Currency on the Production Dashboard, including data aggregation, filter parity, rendering states, and user interaction.

---

## Requirements

### Requirement: Scope-Aware Initial Load

The system MUST load origin distribution data scoped to the authenticated user's hierarchical scope on initial render. Each role MUST see only negocios within their authority: Partner (MIA) sees the full organization aggregate; MS Junior sees only their own negocios; intermediate roles see their subtree. The scope MUST be derived from `selectedUserIds` in `HierarchySelectionContext`.

#### Scenario: Partner loads dashboard

- GIVEN an authenticated user with Partner (MIA) role
- WHEN the dashboard mounts
- THEN the donut reflects ALL negocios across the full organization

#### Scenario: MS Junior loads dashboard

- GIVEN an authenticated user with MS Junior role
- WHEN the dashboard mounts
- THEN the donut reflects ONLY negocios assigned to that user

---

### Requirement: Data Aggregation by Origin × Currency

The system MUST aggregate negocios using `groupBy [idClientOrigin, idCurrency]`. Each resulting group MUST be joined with `ClientOrigin.name` and `Currency.name` by ID. The join MUST NOT filter by `ClientOrigin.status` so that deactivated origins with historical data remain visible. The response shape per slice MUST include: `originId`, `originName`, `currencyId`, `currencyCode`, `count`, `percentage`.

#### Scenario: Multiple origins and currencies

- GIVEN negocios referencing 3 origins, 2 in COP and 1 in USD
- WHEN the service aggregates
- THEN 3 slices are returned, one per origin × currency combination

#### Scenario: Deactivated origin with existing negocios

- GIVEN a `ClientOrigin` with `status = false` that has historical negocios
- WHEN the service aggregates
- THEN that origin's slice IS included in results

---

### Requirement: Percentage Calculation

The system MUST compute `percentage = (segmentCount / totalCount) * 100` rounded to 1 decimal place. `totalCount` MUST equal the sum of all segment counts within the current scope and applied filters. All segment percentages MUST sum to 100.0 (±0.1 tolerance from rounding).

#### Scenario: Two equal segments

- GIVEN 2 origin × currency combinations each with 50 negocios
- WHEN percentages are computed
- THEN each segment shows 50.0%

---

### Requirement: Filter Parity

The system MUST apply all fields from `DashboardFilterContext.appliedFilters` (including `originIds`, `categoryIds`, `companyIds`, `productIds`, date range) via the existing `buildProductionWhereClause` helper. It MUST also respect `selectedUserIds` from `HierarchySelectionContext`. A re-fetch MUST trigger whenever either context value changes.

#### Scenario: Unchecking a hierarchy node

- GIVEN the donut is showing data for 3 users
- WHEN the user unchecks one node in the hierarchy tree
- THEN `selectedUserIds` updates, a new request fires, and the donut re-renders with the reduced scope

#### Scenario: Re-checking a previously unchecked node

- GIVEN a hierarchy node was unchecked
- WHEN the user re-checks it
- THEN `selectedUserIds` restores, the donut re-fetches and reflects the full scope again

#### Scenario: Combined tree + multiple filters

- GIVEN hierarchy is scoped to 2 users AND category, company, date range, and originIds filters are applied
- WHEN the donut fetches
- THEN all 4 filter dimensions AND the user scope are passed to `buildProductionWhereClause`

#### Scenario: Single origin in filtered scope

- GIVEN applied filters result in a scope containing only 1 origin
- WHEN data is returned
- THEN the donut shows one segment at 100%

---

### Requirement: Color Palette

Each `ClientOrigin` MUST map to a consistent base hue that persists across sessions. Within the same origin, COP slices MUST use a lighter luminosity variant and USD slices MUST use the solid/full-saturation variant. The same origin MUST always resolve to the same hue regardless of filter state.

#### Scenario: Same origin in consecutive loads

- GIVEN origin "Referido" mapped to hue 200
- WHEN the dashboard loads on two separate sessions
- THEN "Referido" renders with hue 200 both times

---

### Requirement: Legend

The component MUST render one legend item per origin × currency slice. Each item MUST display `"[OriginName] [CurrencyName] · XX.X%"`. Items MUST be sorted in descending order by percentage. No legend items MUST be shown when the dataset is empty.

#### Scenario: Sorted legend

- GIVEN 3 slices at 50.0%, 30.0%, 20.0%
- WHEN the legend renders
- THEN items appear in the order 50.0%, 30.0%, 20.0%

---

### Requirement: Tooltip on Hover

The component MUST show a tooltip on hover for each segment. Line 1 MUST display `"N negocios (XX.X%)"`. Line 2 MUST display `"≈ $X.XXX.XXX COP"` only when the segment's currency is USD AND the TRM value is available. Line 2 MUST be hidden when TRM is unavailable or the segment is COP. The tooltip MUST disappear on mouse leave.

#### Scenario: Hover over USD segment with TRM available

- GIVEN a USD segment and TRM = 4200
- WHEN the user hovers over the slice
- THEN line 1 shows "17 negocios (12.2%)" and line 2 shows "≈ $71.400.000 COP"

#### Scenario: Hover over USD segment with TRM unavailable

- GIVEN a USD segment and TRM context returns no rate
- WHEN the user hovers
- THEN only line 1 is shown; line 2 is absent

#### Scenario: Hover over COP segment

- GIVEN a COP segment
- WHEN the user hovers
- THEN only line 1 is shown regardless of TRM availability

---

### Requirement: Empty State

When the API returns zero slices, the component MUST render a neutral icon and the message "Sin negocios para los filtros aplicados". No chart, no legend MUST be displayed in this state.

#### Scenario: All filters produce no results

- GIVEN applied filters match zero negocios
- WHEN the component receives an empty array
- THEN neutral icon + message are shown; chart and legend are hidden

---

### Requirement: Loading State

The component MUST display a skeleton or spinner while the fetch is in progress, consistent with the pattern used by other dashboard panels.

#### Scenario: Data is fetching

- GIVEN the hook is in `loading` state
- WHEN the component renders
- THEN a skeleton/spinner is shown and no chart is visible

---

### Requirement: Error State

The component MUST display an error boundary–compatible error state when the fetch fails, consistent with the pattern used by other dashboard panels.

#### Scenario: API returns error

- GIVEN the API request fails
- WHEN the hook transitions to `error` state
- THEN the component renders the shared error UI and not an empty/blank area

---

### Requirement: Race Condition Prevention

The hook MUST cancel in-flight requests via AbortController when new filter or hierarchy changes arrive before a previous request completes.

#### Scenario: Rapid filter changes

- GIVEN the user changes filters 3 times quickly
- WHEN each change fires a new request
- THEN only the last request's response is applied; the previous two are cancelled

---

### Requirement: Dashboard Shell Position

The donut chart section MUST be inserted in `DashboardShell` after `UsdKpiPanel` and before `MsBarChartPanel`.

#### Scenario: Shell render order

- GIVEN the dashboard mounts
- WHEN the shell renders
- THEN order is: UsdKpiPanel → OriginDonutChart → MsBarChartPanel

---

### Requirement: Architecture Compliance

The API route handler MUST NOT call Prisma directly. All Prisma access MUST be in `origin-donut.service.ts`. The hook MUST NOT call `fetch` outside the hook boundary. The component MUST NOT contain business logic.

#### Scenario: Route handler isolation

- GIVEN the route handler is invoked
- WHEN it processes the request
- THEN it calls only the service function and returns an HTTP response; no Prisma import exists in the handler file
