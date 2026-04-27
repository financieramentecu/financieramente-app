# Delta: Product configuration

## REMOVED Requirements

### Requirement: Active Distribution Display

(Reason: PRD RF-09 / MAPA M14 — the product-configuration **list** module SHALL NOT include a read-only text column for “Distribución para nuevos negocios”. Supersedes prior list-column behavior.)

## ADDED Requirements

### Requirement: No “Distribución para nuevos negocios” list column (RF-09)

In the **product configuration administration list** (shared table used for configuration A), the system SHALL NOT render a column whose purpose is to show the active or linked new-business distribution description (including headers equivalent to **«Distribución para nuevos negocios»**). Management of assignment to new businesses remains in the appropriate **B/C** flows; this requirement only forbids that **list** column.

#### Scenario: List renders without the column

- **GIVEN** a user views the product configurations table
- **WHEN** the table headers are visible
- **THEN** the system SHALL NOT display a column titled **Distribución para nuevos negocios** (or synonymous copy used for the same purpose)

#### Scenario: Applies regardless of role

- **GIVEN** any authenticated role that can access the product configuration list
- **WHEN** the list is shown
- **THEN** the column SHALL remain absent (no role-based exception)
