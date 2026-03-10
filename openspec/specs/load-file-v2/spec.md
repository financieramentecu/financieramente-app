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

The system SHALL apply Plan de Compensación rules for Poliza as in the base spec, with the following clarification for clawback percentage: when the Plan contains "CLAW", the system SHALL set `clawback_percentage` to 0 and `isClawback` to true. When the Plan does NOT contain "CLAW", the system SHALL NOT set `clawback_percentage` to null; it SHALL obtain and store the clawback percentage from the active `CommissionConfiguration` on the commission (see ADDED Requirement: Poliza clawback percentage persistence).

#### Scenario: Plan contains FRONT19

- **WHEN** processing a Poliza record
- **AND** the "Plan de Compensación" contains "FRONT19" (normalized)
- **THEN** save the record with `origin_commission = "CARTERA"`.

#### Scenario: Plan contains CLAW — override to zero

- **GIVEN** a Poliza record with "Plan de Compensación" containing "CLAW"
- **WHEN** the system saves the record to `SettlementCommission`
- **THEN** the system SHALL set `clawback_percentage` to 0
- **AND** SHALL set `isClawback` to true
- **AND** MAY override `discount_percentage` as defined for CLAW (e.g. 0)

#### Scenario: Plan does not contain CLAW — persist config clawback

- **GIVEN** a Poliza record with "Plan de Compensación" not containing "CLAW" (e.g. FRONT19 or other)
- **WHEN** the system saves the record to `SettlementCommission`
- **THEN** the system SHALL persist `clawback_percentage` from the active `CommissionConfiguration` on the commission
- **AND** SHALL set `isClawback` to false

### Requirement: Global Configuration Fetching

The system SHALL retrieve the active `CommissionConfiguration` when saving any valid synchronized or LAG record. It SHALL store `discount_percentage` (and, where applicable, `clawback_percentage`) from that configuration on the `settlement_commission` record. The system SHALL NOT store a global `commission_percentage` on the record (that column is removed). Specific logic paths (e.g. Poliza CLAW) MAY override the fetched values as defined in Poliza Special Derivations.

#### Scenario: Saving a new synchronized record

- **GIVEN** a record is ready to be saved to `SettlementCommission`
- **WHEN** the system persists the record
- **THEN** the system MUST fetch the active `CommissionConfiguration`
- **AND** MUST store `discount_percentage` (and `clawback_percentage` when applicable) on the record
- **AND** MUST NOT store `commission_percentage` on the record

### Requirement: User Visualization of Records by Status

The system SHALL allow the user to view records from a file import grouped by synchronization status, in both the post-upload flow (carga de archivo) and the history view (historial). In **historial**, the detail view for a given import SHALL be presented in a **fullscreen modal** (to make the best use of space for tables and many rows). The modal SHALL be **closeable** (e.g. close button and/or overlay/escape) so the user can return to the historial list. All other behavior (four tabs, table content, pagination, carga vs historial scope) remains as in the base requirement.

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

#### Scenario: Historial detail in fullscreen modal

- **GIVEN** the user is on the historial view and at least one file import exists
- **WHEN** the user opens the detail for a file import (e.g. "Ver detalle")
- **THEN** the system SHALL display the records-by-status view (four cards and four tabs with tables) in a **fullscreen modal**
- **AND** the modal SHALL provide a way to close it (button and/or overlay/escape)
- **AND** after closing, the user SHALL return to the historial list

#### Pagination

The endpoint that returns records by status for a file import SHALL support **pagination** so that large imports do not load all rows at once.

### Requirement: Non-Blocking Row Processing and FileImportError

The system SHALL NOT persist validation failures, duplicate matches, or processing exceptions as rows in `SettlementCommission`. Rejected rows SHALL be stored exclusively in a dedicated `FileImportError` table linked to the file import. Processing SHALL be non-blocking: when a row fails, the system SHALL log it to `FileImportError`, increment the appropriate metric (`errorRecord` or `noSincronizadoRecord`), and continue with the next row until the file is fully processed.

#### Scenario: Duplicate Voluntaria commission

- **GIVEN** a Voluntaria file import in progress
- **WHEN** a row is processed and a commission already exists with the same contract and same start/end dates (same month)
- **THEN** the system SHALL NOT insert the row into `SettlementCommission`
- **AND** SHALL insert a row into `FileImportError` with a reason such as "Duplicate commission"
- **AND** SHALL increment `errorRecord` for the file import
- **AND** SHALL continue processing the next row

#### Scenario: Unparseable or invalid row

- **GIVEN** a file import in progress
- **WHEN** a row throws a validation or parsing exception (e.g. missing required cell, invalid date)
- **THEN** the system SHALL NOT halt the batch
- **AND** SHALL persist the failure in `FileImportError` (e.g. reason "Error processing row")
- **AND** SHALL increment `errorRecord`
- **AND** SHALL continue with the next row

#### Scenario: Retrieval of error details

- **GIVEN** a file import that has one or more rows stored in `FileImportError`
- **WHEN** the UI or an API client requests error details for that file import
- **THEN** the system SHALL provide a list of errors (e.g. row number, contract, reason, rawData) from `FileImportError` for that `idFileImport`
- **AND** SHALL support pagination when the list is large

### Requirement: Encoding and Accented Column Names (Excel/CSV)

The system SHALL support Spanish accented characters in Excel/CSV column headers (e.g. "Plan de Compensación", "Valor Comisión") so that Póliza and Voluntaria files validate and process correctly.

- **Header matching:** Column names in the file MAY be written with or without accents (e.g. "Plan de Compensacion" or "Plan de Compensación"); the system SHALL treat them as equivalent for validation and column mapping (e.g. via normalized comparison).
- **Encoding:** When reading CSV (or other text-based formats), the system SHALL use explicit UTF-8 decoding so that accented characters are not corrupted (e.g. no mojibake). XLSX/XLS binary formats are read with the encoding appropriate to the format.
- **Recommendation:** CSV files SHOULD be saved as UTF-8 (or "UTF-8 with BOM") when exporting from Excel to avoid encoding issues.

#### Scenario: Header with accent matches required column

- **GIVEN** a Póliza file whose header row contains "Plan de Compensación" (with accent)
- **WHEN** the system validates required columns
- **THEN** the system SHALL consider the column present and valid if the required column is defined as "Plan de Compensación" or equivalent (normalized comparison)

#### Scenario: CSV read with UTF-8

- **GIVEN** a CSV file encoded in UTF-8 containing accented characters in headers or cells
- **WHEN** the system reads the file for validation or processing
- **THEN** the system SHALL decode the content as UTF-8 so that characters are not corrupted

### Requirement: Deletion of File Import (Historial)

The system SHALL allow deletion of a file import from the historial only when the file is in **LOAD** or **ERROR** status (not pre-liquidated or liquidated).

#### Scenario: Reject deletion when pre-liquidated or liquidated

- **GIVEN** the user is viewing historial
- **WHEN** the user requests deletion of a file import whose status is other than `LOAD` or `ERROR` (e.g. `PRE-SETTLED` or `SETTLED`)
- **THEN** the system SHALL reject the request (e.g. HTTP 400 or 409)
- **AND** SHALL return a clear message (e.g. "Solo se puede eliminar si está en estado LOAD o ERROR" or "El archivo está pre-liquidado o liquidado")

#### Scenario: Allow deletion when LOAD or ERROR

- **GIVEN** the user is viewing historial
- **WHEN** the user requests deletion of a file import whose status is `LOAD` or `ERROR`
- **THEN** the system SHALL delete the file import and all dependent data (including `FileImportError`, `SettlementCommission`, and any `ComissionDistribution`/`Clawback` linked to those commissions) in a single transaction
- **AND** SHALL perform deletes in an order that respects foreign keys so that deletion succeeds even when the file has related `FileImportError` rows
- **AND** SHALL respond with success (e.g. HTTP 200)

#### Scenario: Not found

- **GIVEN** the user requests deletion of a file import
- **WHEN** the file import does not exist or does not belong to the user
- **THEN** the system SHALL respond with not found (e.g. HTTP 404)

### Requirement: Poliza clawback percentage persistence

The system SHALL persist the clawback percentage on the commission record for Poliza files according to the Plan de Compensación. **Clawback percentage SHALL be 0 only when the Plan de Compensación includes "CLAW".** For all other plans (e.g. FRONT19, or any other value), the system SHALL obtain the clawback percentage from the active `CommissionConfiguration` and SHALL store it on the `settlement_commission` record (`clawback_percentage`).

#### Scenario: Plan contains CLAW — clawback zero

- **GIVEN** a Poliza record is being saved as SYNCHRONIZED
- **AND** the "Plan de Compensación" contains "CLAW" (case-normalized)
- **WHEN** the system persists the record
- **THEN** the system SHALL set `clawback_percentage` to 0 on the commission
- **AND** SHALL set `isClawback` to true

#### Scenario: Plan does not contain CLAW — clawback from configuration

- **GIVEN** a Poliza record is being saved as SYNCHRONIZED
- **AND** the "Plan de Compensación" does NOT contain "CLAW" (e.g. contains "FRONT19" or any other value)
- **AND** an active `CommissionConfiguration` exists with a `clawback_percentage` value
- **WHEN** the system persists the record
- **THEN** the system SHALL set `clawback_percentage` on the commission to the value from the active `CommissionConfiguration`
- **AND** SHALL set `isClawback` to false

#### Scenario: Plan does not contain CLAW and configuration has null clawback

- **GIVEN** a Poliza record is being saved as SYNCHRONIZED
- **AND** the "Plan de Compensación" does NOT contain "CLAW"
- **AND** the active `CommissionConfiguration` has `clawback_percentage` null or missing
- **WHEN** the system persists the record
- **THEN** the system MAY store 0 (or the configured default) for `clawback_percentage` so that the record remains consistent for pre-liquidación
