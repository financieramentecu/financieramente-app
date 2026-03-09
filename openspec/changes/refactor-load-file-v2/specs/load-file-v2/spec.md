# Delta for load-file-v2

This delta describes changes to the behavior defined in `openspec/specs/load-file-v2/spec.md` for the refactor-load-file-v2 change.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Global Configuration Fetching

(Previously: The system fetched and stored `commission_percentage` and `discount_percentage` from the active commission configuration when saving a record.)

The system SHALL retrieve the active `CommissionConfiguration` when saving any valid synchronized or LAG record. It SHALL store `discount_percentage` (and, where applicable, `clawback_percentage`) from that configuration on the `settlement_commission` record. The system SHALL NOT store a global `commission_percentage` on the record (that column is removed). Specific logic paths (e.g. Poliza CLAW) MAY override the fetched values as defined in Poliza Special Derivations.

#### Scenario: Saving a new synchronized record

- **GIVEN** a record is ready to be saved to `SettlementCommission`  
- **WHEN** the system persists the record  
- **THEN** the system MUST fetch the active `CommissionConfiguration`  
- **AND** MUST store `discount_percentage` (and `clawback_percentage` when applicable) on the record  
- **AND** MUST NOT store `commission_percentage` on the record

### Requirement: User Visualization of Records by Status

(Previously: Historial allowed opening a "detail view (e.g. modal/drawer)" for an import.)

The system SHALL allow the user to view records from a file import grouped by synchronization status, in both the post-upload flow (carga de archivo) and the history view (historial). In **historial**, the detail view for a given import SHALL be presented in a **fullscreen modal** (to make the best use of space for tables and many rows). The modal SHALL be **closeable** (e.g. close button and/or overlay/escape) so the user can return to the historial list. All other behavior (four tabs, table content, pagination, carga vs historial scope) remains as in the base requirement.

#### Scenario: Historial detail in fullscreen modal

- **GIVEN** the user is on the historial view and at least one file import exists  
- **WHEN** the user opens the detail for a file import (e.g. "Ver detalle")  
- **THEN** the system SHALL display the records-by-status view (four cards and four tabs with tables) in a **fullscreen modal**  
- **AND** the modal SHALL provide a way to close it (button and/or overlay/escape)  
- **AND** after closing, the user SHALL return to the historial list

## REMOVED Requirements

None. (Schema removal of `commission_percentage` and `error` column from `SettlementCommission` is reflected in MODIFIED Global Configuration Fetching and in ADDED Non-Blocking Row Processing and FileImportError.)
