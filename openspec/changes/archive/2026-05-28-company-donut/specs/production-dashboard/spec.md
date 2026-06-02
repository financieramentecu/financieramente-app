# Delta for Production Dashboard

## ADDED Requirements

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

### Requirement: Company Donut Visualization

The system MUST render `CompanyDonutPanel` to the RIGHT of `OriginDonutPanel` in `DashboardShell` using `grid grid-cols-1 md:grid-cols-2 gap-4`. The legend MUST show one item per company with format `"COMPANY · PCT%"`. Tooltip on hover MUST show `"COMPANY · CURRENCY · COUNT (PCT%)"` and disappear on mouse-out. Sum of all segment percentages MUST equal 100%.

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
