# Delta for Production Dashboard — Heatmap Table

## ADDED Requirements

### Requirement: SPEC-001 Heatmap API Endpoint

The system SHALL expose `GET /api/production-dashboard/heatmap` returning `ApiResponse<HeatmapRow[]>`. The route MUST validate the session; unauthenticated requests MUST return HTTP 401. The route MUST NOT call Prisma directly; all data access MUST delegate to `heatmap.service.ts`. Accepted query params: `userIds` (comma-separated numbers), `dateFrom`, `dateTo`, `statuses`, `categoryIds`, `companyIds`, `productIds`, `originIds`, `plazos`, `periodicidades`. The `isInternacional` filter MUST NOT be forwarded to the service.

#### Scenario: Authenticated request returns heatmap rows

- GIVEN a viewer with a valid session
- WHEN `GET /api/production-dashboard/heatmap` is called with valid params
- THEN the response SHALL have `success: true` and `data` as `HeatmapRow[]`

#### Scenario: Unauthenticated request rejected

- GIVEN no valid session exists
- WHEN the endpoint is called
- THEN the response SHALL return HTTP 401

#### Scenario: isInternacional is never forwarded

- GIVEN the caller passes `isInternacional=true` in the query string
- WHEN the service is invoked
- THEN the service MUST NOT receive `isInternacional` as a parameter

---

### Requirement: SPEC-002 Heatmap Service Aggregation

The service MUST query `prisma.business.findMany` filtered by `userIds`, `appliedFilters` fields (excluding `isInternacional`), and the date range. It MUST aggregate results in JS by `(idUser, idCompany)` producing `HeatmapRow[]`. Each row MUST contain: `idUser`, `fullName`, `levelCode`, `levelOrder`, `categoryName`, `levelColor`, and a map of `companyId → { usdTotal: number, count: number }`. A `levelOrder` integer MUST be derived from the `Level` table (or a static rank map) so that sort order is not dependent on lexicographic `levelCode`.

#### Scenario: Aggregation groups by user and company

- GIVEN multiple business records for the same user and company
- WHEN the service aggregates
- THEN a single `HeatmapRow` entry exists per `(idUser, idCompany)` combination with summed `usdTotal` and `count`

#### Scenario: levelOrder is numeric, not string-based

- GIVEN two levels whose `levelCode` values are not lexicographically ordered by seniority
- WHEN the service builds `HeatmapRow[]`
- THEN each row MUST carry an integer `levelOrder` reflecting actual seniority rank, not `levelCode` alphabetical order

#### Scenario: Empty userIds returns empty array

- GIVEN `userIds` is an empty array
- WHEN the service is called
- THEN it SHALL return `[]` without querying Prisma

---

### Requirement: SPEC-003 Hook — Fetch, Pivot, and Sort

`use-heatmap.ts` MUST use `AsyncState<T>` and accept `{ selectedUserIds, appliedFilters, trmRate }`. It MUST remain `idle` until `trmRate` is a non-null number. On each reactive change it MUST fetch from the API, then pivot raw rows into `{ rows: PersonRow[], companyColumns: CompanyColumn[], legend: CategoryLegendItem[] }`.

Row sort order MUST be: `levelOrder` descending (highest seniority first), then `fullName` ascending. Company columns MUST be sorted by total USD across all rows descending. Per-column USD maximum MUST be computed and stored in `CompanyColumn.maxUsd` for intensity use by the component.

#### Scenario: Hook idles while trmRate is null

- GIVEN `trmRate` is `null`
- WHEN the hook renders
- THEN state SHALL be `{ status: 'idle' }` and no fetch is triggered

#### Scenario: Rows sorted by seniority then name

- GIVEN rows for TL, MS Senior, and MS Junior users
- WHEN the hook pivots
- THEN rows SHALL be ordered TL first, then MS Senior, then MS Junior, and within each level alphabetically by `fullName`

#### Scenario: Companies sorted by total USD desc

- GIVEN company A totals 10,000 USD and company B totals 25,000 USD
- WHEN columns are built
- THEN company B column SHALL appear before company A

#### Scenario: Columns with all-zero values are excluded

- GIVEN a company exists in the dataset but all visible users have 0 USD for it after filtering
- WHEN columns are built
- THEN that company MUST NOT appear as a column

---

### Requirement: SPEC-004 USD Conversion

USD conversion MUST happen in the hook, not in the service. The hook SHALL multiply COP totals by `trmRate` to produce USD values. The service MUST return raw COP aggregates. The component MUST receive and display only pre-converted USD values.

#### Scenario: COP-to-USD conversion applied in hook

- GIVEN the service returns a row with `copTotal: 4,600,000` and `trmRate: 4600`
- WHEN the hook transforms the data
- THEN `PersonRow.usdTotal` for that entry SHALL be `1000`

---

### Requirement: SPEC-005 Heatmap Intensity Rendering

Each USD cell MUST compute intensity as `usdTotal / CompanyColumn.maxUsd` (value in [0,1]). Cells with `usdTotal > 0` MUST apply intensity via inline `style={{ backgroundColor: \`rgba(59,130,246,${intensity})\` }}`. Dynamic Tailwind classes MUST NOT be used for intensity. Zero-value cells MUST render with no background color. Negative-value cells MUST render as plain text with no heatmap color.

#### Scenario: Non-zero cell gets rgba background

- GIVEN a cell has `usdTotal = 500` and `CompanyColumn.maxUsd = 1000`
- WHEN the cell renders
- THEN it SHALL have inline style `backgroundColor: rgba(59,130,246,0.5)`

#### Scenario: Zero cell is transparent

- GIVEN a cell has `usdTotal = 0`
- WHEN the cell renders
- THEN it SHALL have no background color applied

#### Scenario: Negative cell is plain text only

- GIVEN a cell has `usdTotal < 0`
- WHEN the cell renders
- THEN the value SHALL be displayed as plain text without any rgba background

---

### Requirement: SPEC-006 Sticky First Column

The first `<th>` and `<td>` of the table MUST have `position: sticky; left: 0` applied. Their background MUST match the card background (CSS variable `--card`) to prevent content bleed during horizontal scroll. The `z-index` of the sticky column MUST be high enough to overlap scrolling body cells.

#### Scenario: First column remains visible during horizontal scroll

- GIVEN the table has more company columns than fit in the viewport
- WHEN the user scrolls horizontally
- THEN the name + badge column SHALL remain fixed on the left side

#### Scenario: Sticky cell background prevents bleed-through

- GIVEN a non-sticky cell scrolls behind the sticky column
- WHEN the table renders
- THEN the sticky cell background SHALL fully cover the scrolled content behind it

---

### Requirement: SPEC-007 Role-Based Visibility

The API MUST compute the viewer's scope server-side from the session. MIA and Partner roles MUST receive the full org (all active users). BL, PL, and TL roles MUST receive only their own subtree (self + active subordinates reachable via `idUserLeader`). MS Junior MUST receive only their own row. The caller MUST NOT supply viewer identity — it MUST be derived from the session.

Self-row MUST follow normal hierarchical sort order. It MUST NOT be pinned to the top.

#### Scenario: Partner sees all active users

- GIVEN the viewer is a Partner
- WHEN `GET /api/production-dashboard/heatmap` is called
- THEN all active users in the org appear as rows

#### Scenario: TL sees own subtree only

- GIVEN the viewer is a Team Leader
- WHEN the endpoint is called
- THEN only the TL and their active subordinates appear as rows
- AND peers or superiors SHALL NOT appear

#### Scenario: MS Junior sees only self

- GIVEN the viewer is an MS Junior
- WHEN the endpoint is called
- THEN exactly one row appears for the viewer themselves

#### Scenario: Self row follows hierarchy sort order

- GIVEN the viewer is an MS Senior
- WHEN rows are rendered
- THEN the viewer's row appears in its natural seniority position (not pinned to top)

---

### Requirement: SPEC-008 Reactivity

The hook MUST re-fetch whenever `selectedUserIds` (from `HierarchySelectionContext`) or `appliedFilters` (from `DashboardFilterContext`) change. The effective `userIds` sent to the API MUST be the intersection of `selectedUserIds` and the server-enforced role scope. The `isInternacional` field of `appliedFilters` MUST be excluded from the query params sent to the API.

#### Scenario: Filter change triggers re-fetch

- GIVEN the hook is mounted with initial filters
- WHEN `appliedFilters` changes (e.g., new date range applied)
- THEN the hook SHALL transition to `loading` and issue a new API request

#### Scenario: Hierarchy selection change triggers re-fetch

- GIVEN the user unchecks a node in the hierarchy tree
- WHEN `selectedUserIds` updates in context
- THEN the hook SHALL issue a new API request with the updated user list

#### Scenario: isInternacional excluded from API call

- GIVEN `appliedFilters.isInternacional` is `true`
- WHEN the hook builds the query params
- THEN `isInternacional` SHALL NOT appear in the request URL or body

---

### Requirement: SPEC-009 Panel Layout and Category Legend

`HeatmapTablePanel.tsx` MUST render a card with a header showing a subtitle with the active row count (e.g., "12 asesores"). A category legend MUST appear in the top-right of the card, derived from `legend: CategoryLegendItem[]` (visible nodes only). The table MUST be wrapped in `<div className="overflow-x-auto">` to support horizontal scroll. The panel MUST be placed in `ShellContent` after `MsBarChartPanel` and MUST receive `trmRate` as a prop.

#### Scenario: Subtitle shows active row count

- GIVEN the hook returns 8 rows
- WHEN the panel renders
- THEN the subtitle SHALL read "8 asesores" (or equivalent active count label)

#### Scenario: Legend reflects only visible categories

- GIVEN filters exclude all MS Senior users
- WHEN the panel renders
- THEN the legend SHALL NOT include the MS Senior category entry

#### Scenario: Panel mounts after MsBarChartPanel

- GIVEN `DashboardShell` renders `ShellContent`
- WHEN the DOM is inspected
- THEN `HeatmapTablePanel` SHALL appear after `MsBarChartPanel` in document order

---

## Constraints

- All identifiers MUST be in English. User-facing strings MUST be in Spanish.
- No `any` type is permitted.
- Async hook state MUST use `AsyncState<T>` from `src/features/shared/types/async-state.types.ts`.
- No new npm dependencies.
- `isInternacional` MUST NOT be forwarded at any layer (service, route, hook query params).
- Intensity colors MUST use inline `style` — never dynamic Tailwind class strings.
- `levelOrder` MUST be an integer from the Level entity or a static rank map; lexicographic `levelCode` sort is prohibited.
