# Delta for Negocios

## ADDED Requirements

### Requirement: LIQUIDADO visible in principal business list

The system MUST present `LIQUIDADO` as its own status when the canonical business list API returns that status. In the product lifecycle, `LIQUIDADO` is the terminal state after **`EMITIDO` → `FONDEADO` → `LIQUIDADO`**; commission settlement MUST only promote businesses already in **`FONDEADO`** to `LIQUIDADO` (see **pre-liquidación** delta in this change).

#### Scenario: Distinct from other terminals

- **GIVEN** a business whose API status is `LIQUIDADO`
- **WHEN** the principal list renders the row
- **THEN** the status MUST NOT be shown as `CANCELADO`, `EMITIDO`, or `FONDEADO`

---

### Requirement: Renewed list status filter options

The principal business-list status filter MUST include `LIQUIDADO` as a selectable value. The filter MUST NOT include `COMISIONANDO` as a selectable value.

#### Scenario: LIQUIDADO selectable

- **GIVEN** the user opens the status filter on the principal list
- **WHEN** they inspect the options
- **THEN** a choice corresponding to `LIQUIDADO` MUST be available

#### Scenario: COMISIONANDO not in filter

- **GIVEN** the user opens the status filter on the principal list
- **WHEN** they inspect the options
- **THEN** `COMISIONANDO` MUST NOT appear as a filter choice

---

### Requirement: Accurate canceled presentation in list

For rows backed by canonical list API data, the system MUST NOT show the business as canceled unless the API status is `CANCELADO`.

#### Scenario: Non-canceled API status

- **GIVEN** API status is not `CANCELADO`
- **WHEN** the row is rendered in the principal list
- **THEN** the status MUST NOT read as canceled

#### Scenario: Unknown or unmapped status

- **GIVEN** API returns a status value not yet mapped to a presentation label
- **WHEN** the row is rendered
- **THEN** the system MUST NOT label it as `Cancelado` by default

---

### Requirement: Creation date column header

The column that shows business creation time on the principal list MUST use a header that clearly denotes creation (equivalent to «Fecha creación»), not a generic single-word date header alone.

#### Scenario: Header wording

- **GIVEN** the principal business list table is visible
- **WHEN** column headers render
- **THEN** the creation-time column header MUST convey “creation” explicitly

---

### Requirement: Status presentation parity list and detail

For the same API status code, the principal list and business detail/modal views MUST use the same status labeling semantics (same human-readable label for that code).

#### Scenario: Same code, same label

- **GIVEN** the same API status code on a list row and on the detail/modal view
- **WHEN** both surfaces render
- **THEN** the visible status label MUST match between them

---

## MODIFIED Requirements

### Requirement: COMISIONANDO in business list UI

Until legacy data is migrated, the system SHOULD still indicate `COMISIONANDO` when the API returns that status so rows are not blank. The renewed status filter MUST NOT offer `COMISIONANDO` as a filter option (see **Renewed list status filter options**).

(Previously: The system SHOULD show a `COMISIONANDO` badge in business lists.)

#### Scenario: Legacy COMISIONANDO row

- **GIVEN** API returns `COMISIONANDO` before migration completes
- **WHEN** the principal list renders the row
- **THEN** a status indicator MUST appear

---

## REMOVED Requirements

_None — behavior is narrowed via MODIFIED and ADDED requirements._
