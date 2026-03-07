# Specification: load-file-v2

## Purpose

TBD - Defines the rigorous rule engine for loading and synchronizing Commission Files (Voluntaria and Poliza).

## Requirements

### Requirement: Voluntaria Business Logic, Exclusivity, and Contract Persistence

The system SHALL evaluate each Voluntaria record. Control flow MUST be mutually exclusive (IF/ELSE IF/ELSE) to guarantee a record's status is evaluated exactly once and never overwritten by subsequent conditions. **Every saved record MUST persist the contract ID**, regardless of its final status (`SYNCHRONIZED` or `LAG`).

#### Scenario: Business exists and has duplicate commission (Same Month)

- **WHEN** processing a Voluntaria record
- **AND** the business exists and has > 0 prior commissions
- **AND** a commission with the same contract ID already exists in the **same processing month/year** (e.g., matching the month of the "Desde" column)
- **THEN** mark the record as ERROR, do not save it to DB, and immediately return to process the next record.

#### Scenario: Business exists with prior LAG record

- **WHEN** processing a Voluntaria record
- **AND** the business exists and has > 0 prior commissions
- **AND** there is a prior commission marked as `is_lag = true`
- **THEN** update the prior record to `SYNCHRONIZED` (`is_lag = false`) adding the business relation
- **AND** create the NEW record as `SYNCHRONIZED` (`is_lag = false`) associated with the business
- **AND** save the contract ID in the new record.
- **AND** immediately terminate evaluation for this record (return).

#### Scenario: Business exists but no prior commissions (Inside processing month)

- **WHEN** processing a Voluntaria record
- **AND** the business exists with 0 prior commissions
- **AND** the record date is INSIDE the processing month
- **THEN** create the new record as `SYNCHRONIZED` (`is_lag = false`) associated with the business
- **AND** save the contract ID.
- **AND** immediately terminate evaluation.

#### Scenario: Business exists but no prior commissions (Outside processing month)

- **WHEN** processing a Voluntaria record
- **AND** the business exists with 0 prior commissions
- **AND** the record date is OUTSIDE the processing month
- **THEN** create the new record as `LAG` (`is_lag = true`) associated with the business
- **AND** save the contract ID.
- **AND** immediately terminate evaluation.

#### Scenario: Business does NOT exist

- **WHEN** processing a Voluntaria record
- **AND** the business does NOT exist
- **THEN** create the new record as `LAG` (`is_lag = true`)
- **AND** save the contract ID.
- **AND** immediately terminate evaluation.

### Requirement: Poliza Special Derivations

The system SHALL apply specific rules based on the "Plan de Compensación" column for Poliza files.

#### Scenario: Plan contains FRONT19

- **WHEN** processing a Poliza record
- **AND** the "Plan de Compensación" contains "FRONT19" (normalized)
- **THEN** save the record with `origin_commission = "CARTERA"`.

#### Scenario: Plan contains CLAW

- **WHEN** processing a Poliza record
- **AND** the "Plan de Compensación" contains "CLAW"
- **THEN** set `isClawback = true` on the record to maintain the historical penalty flag.
- **AND** DO NOT calculate or fetch any clawback percentage (it is not needed for Poliza).
- **AND** apply ONLY the global `discount_percentage` (no `commission_percentage` needed).

#### Scenario: Plan does NOT contain CLAW

- **WHEN** processing a Poliza record
- **AND** the "Plan de Compensación" does not contain "CLAW"
- **THEN** set `clawback_percentage = null`
- **AND** set `isClawback = false`.

### Requirement: Global Configuration Fetching

The system SHALL retrieve global commission settings before saving any valid record.

#### Scenario: Saving a new synchronized record

- **WHEN** a record is ready to be saved
- **THEN** the system MUST fetch the active `commission_configuration`
- **AND** store the `commission_percentage` and `discount_percentage` in the `settlement_commission` record.

### Requirement: User Visualization of Records by Status

The system SHALL allow the user to view records from a file import grouped by synchronization status, in both the post-upload flow (carga de archivo) and the history view (historial).

#### Categories (four tabs)

- **Sincronizados**: Records that ended in `SYNCHRONIZED` (`status = 'SYNCHRONIZED'`).
- **Errores**: Records that could not be registered and generated an error; stored in `FileImportError`; the **cause** SHALL be displayed (field `reason`).
- **No sincronizados**: Records that were not accepted and remained as LAG (e.g. business not found or date out of range). The detail/cause SHALL be shown using **hardcoded text only**: either "No existe el contrato" or "La fecha de creación no está en el rango de fechas" (no new DB field).
- **Rezagados**: Records that were in LAG and were brought into the synchronization flow. Identified by `isLag = true` AND `lagDate` is not null (i.e. they had a lag date set when recovered).

#### Table content per tab

Each tab SHALL display a **table** with relevant information: Contrato, montos (when applicable, e.g. LAG), is clawback (yes/no), percentages used for calculation, and detail/cause (for errors: `reason`; for no sincronizados: one of the two hardcoded messages above).

#### Scope

- **Carga de archivo**: After processing, show the summary cards and tabs with tables for the current import; data is loaded from the API by `fileImportId`. If the user refreshes the page, this view is lost (data remains in DB; user can open the same import from Historial).
- **Historial**: Each history card SHALL allow opening a detail view (e.g. modal/drawer) with the same four cards and four tabs with tables for that import. Data SHALL be fetched by `fileImportId` from the API.

#### Pagination

The endpoint that returns records by status for a file import SHALL support **pagination** so that large imports do not load all rows at once.
