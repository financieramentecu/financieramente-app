# Delta for Negocios (H5 — reporte Excel)

## ADDED Requirements

### Requirement: Operational Excel export authorization

Only **ADMIN**, **ASISTENTE_GERENCIA_OPERATIVA**, and **ANALISTA_SOPORTE** SHALL obtain a successful business export; other authenticated roles MUST NOT.

#### Scenario: Authorized export succeeds

- **GIVEN** role **ADMIN**, **ASISTENTE_GERENCIA_OPERATIVA**, or **ANALISTA_SOPORTE** and ≥1 matching business
- **WHEN** export is requested with valid inputs
- **THEN** a downloadable spreadsheet SHALL be returned

#### Scenario: Unauthorized export forbidden

- **GIVEN** role **AGENTE** (or any non-export role)
- **WHEN** export is requested
- **THEN** no spreadsheet SHALL be returned and access SHALL be forbidden

---

### Requirement: Export UI visibility for authorized roles

The business-list export control SHALL appear only for **ADMIN**, **ASISTENTE_GERENCIA_OPERATIVA**, and **ANALISTA_SOPORTE**.

#### Scenario: Authorized role sees export

- **GIVEN** **ANALISTA_SOPORTE** on the business list
- **WHEN** the page renders
- **THEN** export SHALL be visible

#### Scenario: Agent does not see export

- **GIVEN** **AGENTE** on the business list
- **WHEN** the page renders
- **THEN** export SHALL NOT appear

---

### Requirement: Funding date filter (optional pair, Colombia civil days)

When **both** funding **start** and **end** are supplied, results MUST include only businesses whose **business-level funding instant** lies in the **inclusive** interval for **Colombia civil calendar days**. Creation time MUST NOT drive this filter.

When **either** bound is absent, the funding-date restriction MUST NOT apply; behavior MUST match the unpaginated list for the same inputs.

While the funding-date restriction applies, **null** business-level funding instant MUST exclude the row.

#### Scenario: Both dates — in range included

- **GIVEN** **start** and **end** supplied and a non-null business funding instant on a civil day inside the inclusive interval
- **WHEN** filters are evaluated
- **THEN** that business SHALL match for list and export

#### Scenario: Pair incomplete — no funding-date restriction

- **GIVEN** only one bound supplied
- **WHEN** filters are evaluated
- **THEN** funding instant MUST NOT act as a date-range filter

#### Scenario: Both dates — null funding excluded

- **GIVEN** **start** and **end** supplied and null business-level funding instant
- **WHEN** filters are evaluated
- **THEN** that business MUST NOT match

---

### Requirement: List and export parity

For shared filters (optional funding-date pair, status, unified search), export candidates MUST equal the unpaginated list set for identical parameters.

#### Scenario: Same membership with partial date inputs

- **GIVEN** identical parameters where the funding-date pair is incomplete
- **WHEN** list (unpaginated) and export both run
- **THEN** exported business identifiers MUST equal the list match set

---

### Requirement: Spreadsheet columns for commissions context

Each row MUST include core business facts, client, product, company, value, term, periodicity or annuity indicator, coach name and category, leader chain (name and category per level), origin, and **dynamic annuity funding-date columns** through the batch’s maximum installment index. Inapplicable cells SHALL be empty.

#### Scenario: Multiple annuity installments

- **GIVEN** annual periodicity with several funded installments
- **WHEN** export completes
- **THEN** each installment instant MUST appear under the correct heading

---

### Requirement: Export volume limit

The system MUST enforce a documented maximum row count. If matches exceed it, the operation MUST fail; it MUST NOT succeed with a truncated file.

#### Scenario: Over maximum

- **GIVEN** candidates above the configured maximum
- **WHEN** export is requested
- **THEN** no successful full export SHALL occur

---

### Requirement: Empty export result

Zero matches MUST NOT yield a successful spreadsheet download.

#### Scenario: No rows

- **GIVEN** zero matches
- **WHEN** export is requested
- **THEN** no successful spreadsheet SHALL be delivered

## MODIFIED Requirements

_None._

## REMOVED Requirements

_None._
