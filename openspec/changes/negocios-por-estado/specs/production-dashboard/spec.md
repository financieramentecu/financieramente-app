# Delta for Production Dashboard

## ADDED Requirements

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

#### Scenario: StatusDonut renders as third column on xl

- GIVEN the viewport is xl or wider
- WHEN `DashboardShell` renders
- THEN OriginDonutPanel, CompanyDonutPanel, and StatusDonut appear in a single row
- AND on md viewports CompanyDonutPanel and StatusDonut wrap to a second row

---

## Out of Scope

- CANCELADO and LIQUIDADO statuses
- Currency dimension within status breakdown
- Drill-down or click interactions on segments
- Status transition timeline or historical trend
- Persisting chart state or user preferences
