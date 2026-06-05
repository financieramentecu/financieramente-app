# Delta Spec: negocios-advanced-filters

## Capabilities

| Capability | Type | Domain |
|---|---|---|
| `negocios-advanced-filters` | New | Filter panel UI + badge + DateRangePicker |
| `negocios-export-parity` | New | Export endpoint accepts all list params |
| `negocios-list-filtering` | Modified | Status multiselect + new WHERE clauses |

---

## Capability: negocios-advanced-filters (NEW)

### Requirement: Advanced Filters Sheet Panel

The system MUST replace any existing filter modal/dialog with a `side="right"` Sheet component. The Sheet MUST contain all filter dimensions and MUST be dismissed without applying when the user closes it without clicking "Aplicar". The Sheet MUST open only when the user clicks the "Filtros avanzados" toolbar button.

#### Scenario: Sheet opens on button click

- GIVEN the user is on the negocios list page
- WHEN the user clicks "Filtros avanzados"
- THEN the Sheet MUST slide in from the right
- AND all current filter values MUST be pre-populated from the active URL search params

#### Scenario: Sheet dismissed without applying

- GIVEN the Sheet is open with changed filter values
- WHEN the user closes the Sheet without clicking "Aplicar"
- THEN URL search params MUST remain unchanged
- AND the negocios list MUST NOT re-fetch

---

### Requirement: Toolbar Layout

The toolbar MUST always display exactly three controls: search input, "Filtros avanzados" button, and Export button. No other filter controls MAY appear inline.

The "Filtros avanzados" button MUST display an amber badge (`#F59E0B`) showing the count of active filter DIMENSIONS. The badge MUST be hidden when the count is zero. The Export button MUST be disabled while data is loading.

#### Scenario: Badge count reflects active dimensions

- GIVEN the user has selected 2 statuses and set a date range
- WHEN the toolbar renders
- THEN the badge MUST show `2` (Status = 1 dimension, Date range = 1 dimension)

#### Scenario: Badge hidden when no active filters

- GIVEN all filter dimensions are at their default/empty state
- WHEN the toolbar renders
- THEN no badge MUST be visible on the "Filtros avanzados" button

#### Scenario: Export disabled during load

- GIVEN data is being fetched
- WHEN the toolbar renders
- THEN the Export button MUST be in disabled state

---

### Requirement: Filter Dimension — Date Range with Field Selector

The Sheet MUST include a single date range picker with a selector for the date field. Field options MUST be: "Fondeo" (params: `dateFrom`/`dateTo`), "Creación" (params: `createdFrom`/`createdTo`), "Emisión" (params: `dateIssuedFrom`/`dateIssuedTo`). The default field for all roles MUST be "Fondeo". Changing the date field MUST clear any currently set date range values.

#### Scenario: Default field is Fondeo for all roles

- GIVEN the user opens the Sheet for the first time with no active date filters
- WHEN the date section renders
- THEN the field selector MUST show "Fondeo" as selected

#### Scenario: Changing field clears date range

- GIVEN the user has "Fondeo" selected with dateFrom and dateTo set
- WHEN the user selects "Creación"
- THEN dateFrom and dateTo MUST be cleared in the form state

---

### Requirement: Filter Dimension — Status Multiselect

The Sheet MUST present status as a multiselect. Selected values MUST be serialized as `statuses[]` (array) in URL search params. The dimension MUST count as active if at least one value is selected.

#### Scenario: Multiple statuses selected and applied

- GIVEN the user selects EMITIDO and FONDEADO
- WHEN the user clicks "Aplicar"
- THEN URL MUST contain `statuses[]=EMITIDO&statuses[]=FONDEADO`

---

### Requirement: Filter Dimension — Has Comprobantes

The Sheet MUST include a radio control with three options: "Todos" (default), "Con comprobantes" (`hasSupports=true`), "Sin comprobantes" (`hasSupports=false`). The dimension MUST count as active when the selection is not "Todos".

#### Scenario: Con comprobantes applied

- GIVEN the user selects "Con comprobantes"
- WHEN the user clicks "Aplicar"
- THEN URL MUST contain `hasSupports=true`

#### Scenario: Todos is default and not active

- GIVEN no hasSupports param in URL
- WHEN the Sheet renders
- THEN "Todos" MUST be pre-selected and the dimension MUST NOT count toward the badge

---

### Requirement: Filter Dimensions — Multiselect Catalogs

The Sheet MUST include multiselect controls for: Company (`companyIds[]`), Product (`productIds[]`), Origin (`originIds[]`), Term/Plazo (`terms[]`, discrete year values from DB), Periodicity (`periodicityIds[]`, loaded from catalog endpoint), and Money Strategist (text autocomplete, param: `agentName`). Each dimension MUST count as active if at least one value is selected (or non-empty string for agentName).

#### Scenario: Periodicity options loaded from endpoint

- GIVEN the Sheet opens
- WHEN the Periodicity multiselect renders
- THEN options MUST be loaded from `GET /api/periodicities` and ordered by name

#### Scenario: Term options from distinct Business.term values

- GIVEN the Sheet opens
- WHEN the Term multiselect renders
- THEN options MUST reflect distinct year values present in the Business table

---

### Requirement: Apply and Clear Actions

Clicking "Aplicar" MUST commit all filter state to URL search params and close the Sheet. Clicking "Limpiar filtros" MUST reset all filter dimensions to defaults (date field stays "Fondeo", date range cleared, all multiselects cleared, hasSupports reset to "Todos", agentName cleared) without closing the Sheet.

#### Scenario: Apply commits and closes

- GIVEN filters are set in the Sheet
- WHEN the user clicks "Aplicar"
- THEN URL params MUST be updated with the new filter state
- AND the Sheet MUST close

#### Scenario: Clear resets all dimensions

- GIVEN filters are active in the Sheet
- WHEN the user clicks "Limpiar filtros"
- THEN all multiselects MUST show no selections
- AND date range MUST be empty with date field at "Fondeo"
- AND hasSupports MUST be "Todos"
- AND the Sheet MUST remain open

---

### Requirement: Shared DateRangePicker Component

The system MUST provide a shared `DateRangePicker` component in `src/features/shared/ui/` using a Popover + Calendar (`mode="range"`, react-day-picker v9). This component MUST NOT be duplicated per feature.

#### Scenario: Range picker renders and accepts date range

- GIVEN the DateRangePicker is mounted
- WHEN the user selects a start and end date via calendar
- THEN the component MUST call its onChange callback with the selected range

---

## Capability: negocios-export-parity (NEW)

### Requirement: Export Parameter Parity via Shared Zod Schema

`POST /api/negocios/export` MUST accept exactly the same filter parameters as `GET /api/negocios`. Both routes MUST import and use a single shared Zod schema for all filter params. The export endpoint MUST apply each filter to its query identically to the list endpoint.

#### Scenario: Export applies all list filter params

- GIVEN the list is filtered by statuses, dateFrom/dateTo, companyIds, agentName, and hasSupports
- WHEN the same params are sent to export
- THEN the exported set MUST match the unpaginated list set for those params

#### Scenario: Parity schema test

- GIVEN the shared filter Zod schema
- WHEN both the list route and export route parse the same input
- THEN both MUST produce identical filter objects with no missing or extra params on either side

---

## Capability: negocios-list-filtering (MODIFIED)

### Requirement: List Filter Params and WHERE Clause Extensions

(Previously: `status` was a single value; no `dateIssued` range, `hasSupports`, `terms[]`, `periodicityIds[]`, or `statuses[]` params existed in the list or WHERE builder.)

The list API `GET /api/negocios` MUST accept the following additional/updated params:

| Param | Type | WHERE behavior |
|---|---|---|
| `statuses[]` | string array | `{ status: { in: [...] } }` — replaces single `status` when array provided; `status` single param still accepted |
| `dateIssuedFrom` / `dateIssuedTo` | date string | `{ dateIssued: { gte, lte, not: null } }` |
| `createdFrom` / `createdTo` | date string | `{ createdAt: { gte, lte } }` |
| `hasSupports: true` | boolean | `{ supports: { some: { status: true } } }` |
| `hasSupports: false` | boolean | `{ supports: { none: { status: true } } }` |
| `terms[]` | number array | `{ term: { in: [...] } }` |
| `periodicityIds[]` | number array | `{ periodicityId: { in: [...] } }` |
| `agentName` | string | text match on agent name |
| `companyIds[]` | number array | `{ idCompany: { in: [...] } }` |
| `productIds[]` | number array | `{ idProduct: { in: [...] } }` |
| `originIds[]` | number array | `{ idClientOrigin: { in: [...] } }` |

#### Scenario: statuses[] filters correctly

- GIVEN `statuses[]=EMITIDO&statuses[]=FONDEADO`
- WHEN `buildBusinessListWhere` evaluates the param
- THEN the Prisma where MUST include `{ status: { in: ['EMITIDO', 'FONDEADO'] } }`

#### Scenario: dateIssuedFrom/To excludes null dateIssued rows

- GIVEN `dateIssuedFrom=2024-01-01&dateIssuedTo=2024-12-31`
- WHEN `buildBusinessListWhere` evaluates the param
- THEN the Prisma where MUST include `{ dateIssued: { gte: ..., lte: ..., not: null } }`
- AND businesses with `dateIssued = null` MUST NOT appear in results

#### Scenario: hasSupports=true returns only businesses with active supports

- GIVEN `hasSupports=true`
- WHEN the WHERE clause is applied
- THEN only businesses with at least one support record with `status: true` MUST be returned

#### Scenario: hasSupports=false returns only businesses without active supports

- GIVEN `hasSupports=false`
- WHEN the WHERE clause is applied
- THEN only businesses with zero support records with `status: true` MUST be returned

#### Scenario: Single status backward compat

- GIVEN a caller sends `status=EMITIDO` (legacy single param)
- WHEN the list API processes the param
- THEN it MUST return businesses filtered to `EMITIDO` as before

---

## Capability: Periodicity Catalog Endpoint (NEW)

### Requirement: GET /api/periodicities

If `GET /api/periodicities` does not exist, the system MUST create it. The endpoint MUST return `{ id: number, name: string }[]` ordered by `name` ascending. The endpoint MUST require authentication using the same middleware pattern as other catalog endpoints.

#### Scenario: Returns ordered catalog

- GIVEN the user is authenticated
- WHEN `GET /api/periodicities` is called
- THEN the response MUST be an array of `{ id, name }` ordered alphabetically by name

#### Scenario: Unauthenticated request rejected

- GIVEN no valid session
- WHEN `GET /api/periodicities` is called
- THEN the API MUST return 401 Unauthorized
