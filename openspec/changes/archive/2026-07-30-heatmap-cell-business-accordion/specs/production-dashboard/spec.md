# Delta for Production Dashboard

## ADDED Requirements

### Requirement: Heatmap Cell Expansion Trigger

The heatmap advisor × company table SHALL provide a dedicated expand/collapse icon at the start of each advisor cell as the single interaction point for revealing that cell's business list (chevron-right collapsed, chevron-down expanded). USD/COP/NEG sub-cells MUST NOT act as triggers. Multiple cells MAY be expanded simultaneously.

#### Scenario: Toggle expands and collapses a cell

- GIVEN a heatmap cell is collapsed (chevron-right)
- WHEN the user clicks its expand icon
- THEN it expands to chevron-down with a detail row below the advisor row
- WHEN the user clicks the icon again
- THEN it collapses and the detail row is removed

#### Scenario: Multiple cells expand independently

- GIVEN one cell is already expanded
- WHEN the user expands a different cell
- THEN both remain expanded, each with its own list, and clicking the USD/NEG values on either does not toggle them

---

### Requirement: Expanded Business List Content

Each expanded cell SHALL group its businesses by company, rendering one visual group section per company within that advisor × company aggregate. Each group section SHALL show that company's name once, in a group header, before the businesses belonging to it. Each business row within a group SHALL show product, contract number, value + currency (USD/COP), and status; the row MUST NOT repeat the company name, since it is already identified by the enclosing group header. A business with missing value or product MUST still appear, rendering the missing field as `-`.

#### Scenario: Businesses are grouped into per-company sections

- GIVEN an expanded cell contains businesses belonging to company A and company B
- WHEN the list renders
- THEN two group sections appear, each with a header showing its company's name exactly once, and each business row appears within the section matching its company

#### Scenario: Complete row renders all fields within its company group

- GIVEN a business has all fields set and belongs to a company group
- WHEN its row renders
- THEN the row displays product, contract number, value+currency, and status, with the business's company identified solely by that group's header (not repeated in the row)

#### Scenario: Missing value or product renders as hyphen

- GIVEN a business is missing its value or its product
- WHEN its row renders
- THEN the missing field shows `-` and the row still appears within its company's group section

---

### Requirement: Expanded List Reconciliation with Cell Aggregate

The expanded list SHALL reflect exactly the business set behind the cell's USD/COP/NEG aggregate, under the same active filters (`appliedFilters`, hierarchy selection, cell's advisor/company scope). No additional filtering beyond what produces the aggregate is permitted.

#### Scenario: List matches aggregate count and sum

- GIVEN a cell shows `NEG: 5` under current filters
- WHEN expanded
- THEN the list has exactly 5 rows and per-currency sums equal the cell's USD/COP aggregate

#### Scenario: List stays reconciled after a filter change

- GIVEN an expanded cell whose aggregate changes after a new filter is applied
- WHEN the inner list refetches
- THEN its business set matches the updated aggregate

---

### Requirement: Navigate to Business Detail

Each row SHALL include an "Ir a negocio" link to `/dashboard/negocios/{id}` opening in a new tab.

#### Scenario: Link opens business detail in new tab

- GIVEN an expanded row for business id 123
- WHEN the user clicks "Ir a negocio"
- THEN a new tab opens at `/dashboard/negocios/123` and the dashboard tab is unchanged

---

### Requirement: Expansion State Persistence Across Filters

Applying a dashboard filter while a cell is expanded MUST keep it expanded and only refetch its inner list. A full page reload MUST reset all expansion state (no URL/storage persistence).

#### Scenario: Applying a filter keeps the cell expanded

- GIVEN an expanded cell
- WHEN the user applies a new dashboard filter via "Aplicar"
- THEN the cell stays expanded, showing loading then the refetched list

#### Scenario: Page reload resets expansion

- GIVEN one or more cells are expanded
- WHEN the user fully reloads the page
- THEN all cells render collapsed

---

### Requirement: Expanded Row Layout Without Internal Scroll

The detail row SHALL render as a full-width (`colSpan`) row that pushes subsequent rows down, growing the page's main scroll. It MUST NOT introduce an internal scroll container, overlay, or modal.

#### Scenario: Expansion grows page scroll and pushes rows down

- GIVEN a heatmap with advisor rows A, B, C
- WHEN A's cell (with 12 businesses) is expanded
- THEN the detail row appears right after A's row, all 12 rows are visible via the main page scroll (no inner scrollbar), and B/C are pushed down without overlap

---

### Requirement: Expanded List Loading, Empty, and Error States

On first expansion the system MUST lazily fetch the cell's businesses, showing a loading state while pending, an empty state on a zero-result success, and an error state (distinct from empty) on fetch failure.

#### Scenario: Loading then empty result

- GIVEN a cell never expanded before, whose aggregate is zero under current filters
- WHEN expanded
- THEN a loading indicator shows first, then an empty-state message with no rows

#### Scenario: Fetch failure shows error state

- GIVEN the businesses fetch for a cell fails
- WHEN the fetch rejects
- THEN the detail row shows an error state, never rendered as an empty list

---

### Requirement: Expansion Scope Follows Existing Visibility Rules

Expanding a cell MUST NOT add any permission gate beyond existing heatmap visibility. The business fetch MUST remain bounded by `resolveVisibleUserIds` as already applied by `GET /api/negocios`.

#### Scenario: Expanded list respects existing role scope

- GIVEN a viewer whose role restricts visible users to a subtree (e.g. Team Leader)
- WHEN that viewer expands any cell they can see
- THEN the returned list is bounded by `resolveVisibleUserIds`, with no extra permission check and no out-of-scope businesses
