# Load-File Specification

## Purpose

This spec covers the `load-file` feature domain for period-aware file synchronization. It defines how `FileImport` records are scoped to a specific month/year period, how duplicates are deduplicated, how completed periods are blocked, how file names are standardized, how prior errors are resolved on successful re-sync, how `SettlementCommission.syncDate` is stamped, and how counters are updated atomically during re-sync.

---

## Requirements

### Requirement: Period Fields on FileImport

The system SHALL store a `month` (Int, nullable) and `year` (Int, nullable) on every `FileImport` record created after this change takes effect. `month` MUST be an integer in the range 1–12. `year` MUST be a 4-digit integer. Existing rows with `month = null` and `year = null` SHALL remain valid and SHALL NOT be included in deduplication lookups.

#### Scenario: New import stores period

- GIVEN a user initiates a file import with `fileType = POLIZA`, `month = 2`, `year = 2026`
- WHEN the system creates the `FileImport` record
- THEN the record SHALL have `month = 2` and `year = 2026`
- AND `nameFile` SHALL be `SINCRONIZACION-POLIZA-FEBRERO-2026`

#### Scenario: Legacy rows not affected

- GIVEN a `FileImport` row with `month = null` and `year = null` (created before this change)
- WHEN the system runs deduplication lookup for a new import
- THEN the legacy row SHALL NOT match the dedup query
- AND the system SHALL create a new `FileImport` record for the requested period

---

### Requirement: Period Selector UI Defaults

The system SHALL provide a period selector (month + year) in the `CargarArchivoTab` component. The default values SHALL be computed once at component mount as follows: `month = currentMonth - 1`; `year = currentYear`. When `currentMonth === 1` (January), the system SHALL wrap defaults to `month = 12` and `year = currentYear - 1`. The selector SHALL be fully controlled: the user MAY change both month and year before submitting.

#### Scenario: Default period in February or later

- GIVEN today is any date in February through December
- WHEN `CargarArchivoTab` mounts
- THEN `selectedMonth` SHALL default to `currentMonth - 1`
- AND `selectedYear` SHALL default to `currentYear`

#### Scenario: Default period in January (wrap to December / prior year)

- GIVEN today is any date in January
- WHEN `CargarArchivoTab` mounts
- THEN `selectedMonth` SHALL default to `12`
- AND `selectedYear` SHALL default to `currentYear - 1`

#### Scenario: User overrides default

- GIVEN `CargarArchivoTab` has mounted with defaults applied
- WHEN the user selects a different month or year
- THEN the selector SHALL update to the user-selected value
- AND the selected month and year SHALL be sent to the API on submit

---

### Requirement: Deduplication of LOAD Imports

The system SHALL NOT create a new `FileImport` record if a record with `status = LOAD`, the same `fileType`, the same `month`, and the same `year` already exists. The system SHALL instead reuse the existing record (return it as the active import). Deduplication scope SHALL be limited to the same `idUser`; imports from different users SHALL NOT be merged.

#### Scenario: Reuse existing LOAD import on re-upload

- GIVEN a `FileImport` with `status = LOAD`, `fileType = POLIZA`, `month = 2`, `year = 2026`, and `idUser = 10` exists
- WHEN the same user initiates an import with `fileType = POLIZA`, `month = 2`, `year = 2026`
- THEN the system SHALL return `{ created: false, fileImport: <existing> }`
- AND no new `FileImport` row SHALL be created
- AND the API route SHALL return HTTP 200

#### Scenario: Different user does not trigger dedup

- GIVEN a `FileImport` with `status = LOAD`, `fileType = POLIZA`, `month = 2`, `year = 2026`, and `idUser = 10` exists
- WHEN `idUser = 20` initiates an import with the same `fileType`, `month`, and `year`
- THEN the system SHALL create a new `FileImport` record for `idUser = 20`
- AND the API route SHALL return HTTP 201

#### Scenario: New period creates a new import

- GIVEN no `FileImport` with `status = LOAD` for `fileType = POLIZA`, `month = 3`, `year = 2026` exists
- WHEN a user initiates an import with `fileType = POLIZA`, `month = 3`, `year = 2026`
- THEN the system SHALL create a new `FileImport` record
- AND the API route SHALL return HTTP 201

---

### Requirement: Block Completed Periods

The system SHALL reject a new sync attempt if a `FileImport` with `status = COMPLETED` exists for the same `fileType`, `month`, `year`, and `idUser`. The rejection MUST occur before any new record is created. The error response MUST include the message `"El período {month}/{year} ya fue liquidado"` (with the actual numeric month and year substituted). The API route SHALL return HTTP 409.

#### Scenario: Sync blocked when period is completed

- GIVEN a `FileImport` with `status = COMPLETED`, `fileType = POLIZA`, `month = 2`, `year = 2026`, `idUser = 10` exists
- WHEN the same user initiates an import with `fileType = POLIZA`, `month = 2`, `year = 2026`
- THEN the system SHALL return HTTP 409
- AND the response body SHALL contain `{ data: null, error: "El período 2/2026 ya fue liquidado" }`
- AND no new `FileImport` record SHALL be created

#### Scenario: Completed period for different fileType does not block

- GIVEN a `FileImport` with `status = COMPLETED`, `fileType = POLIZA`, `month = 2`, `year = 2026`, `idUser = 10` exists
- WHEN the same user initiates an import with `fileType = VOLUNTARIA`, `month = 2`, `year = 2026`
- THEN the system SHALL NOT block the request
- AND SHALL proceed normally (dedup or create)

#### Scenario: Completed period for different user does not block

- GIVEN a `FileImport` with `status = COMPLETED`, `fileType = POLIZA`, `month = 2`, `year = 2026`, `idUser = 10` exists
- WHEN `idUser = 20` initiates an import with the same `fileType`, `month`, and `year`
- THEN the system SHALL NOT block the request for `idUser = 20`

---

### Requirement: Standardized File Name

The system SHALL generate the `nameFile` field on every new `FileImport` record using the pattern `SINCRONIZACION-{TIPO}-{MES}-{AÑO}`, where `{TIPO}` is the `fileType` in uppercase, `{MES}` is the Spanish uppercase month name for the given `month` integer, and `{AÑO}` is the 4-digit year. The original uploaded filename SHALL NOT be stored as `nameFile`. The Spanish month names MUST be: `ENERO`, `FEBRERO`, `MARZO`, `ABRIL`, `MAYO`, `JUNIO`, `JULIO`, `AGOSTO`, `SEPTIEMBRE`, `OCTUBRE`, `NOVIEMBRE`, `DICIEMBRE`.

#### Scenario: Standardized name for POLIZA / February / 2026

- GIVEN `fileType = POLIZA`, `month = 2`, `year = 2026`
- WHEN the system generates the file name
- THEN `nameFile` SHALL be `SINCRONIZACION-POLIZA-FEBRERO-2026`

#### Scenario: Standardized name for VOLUNTARIA / December / 2025

- GIVEN `fileType = VOLUNTARIA`, `month = 12`, `year = 2025`
- WHEN the system generates the file name
- THEN `nameFile` SHALL be `SINCRONIZACION-VOLUNTARIA-DICIEMBRE-2025`

#### Scenario: Invalid month throws error

- GIVEN `month = 0` or `month = 13`
- WHEN the name-generation utility is invoked
- THEN the system SHALL throw an error indicating the month is invalid
- AND no `FileImport` record SHALL be created

---

### Requirement: Error Resolution on Re-Sync

The system SHALL track whether a `FileImportError` has been resolved. Each `FileImportError` record SHALL have a `resolved` field (Boolean, default `false`) and a `resolvedAt` field (DateTime, nullable). When a sync pass processes a row and the result is `SYNCHRONIZED` for a contract that has at least one unresolved `FileImportError` on the same `idFileImport`, the system SHALL mark those matching `FileImportError` records as resolved by setting `resolved = true` and `resolvedAt` to the current timestamp. Matching SHALL be done by `idFileImport + contract`. `FileImportError` records without a `contract` (e.g. format errors) SHALL remain unresolved.

#### Scenario: Prior error resolved on successful re-sync

- GIVEN a `FileImportError` with `idFileImport = 5`, `contract = "C-123"`, `resolved = false` exists
- WHEN a re-sync processes contract `"C-123"` against `idFileImport = 5` and the result is `SYNCHRONIZED`
- THEN the `FileImportError` record SHALL have `resolved = true`
- AND `resolvedAt` SHALL be set to the current timestamp

#### Scenario: No error to resolve — no update performed

- GIVEN there are no `FileImportError` records with `idFileImport = 5`, `contract = "C-456"`, `resolved = false`
- WHEN a sync processes contract `"C-456"` against `idFileImport = 5` and the result is `SYNCHRONIZED`
- THEN no `FileImportError` update is performed
- AND `resolvedErrors` contribution for this record SHALL be 0

#### Scenario: Format error not resolved by contract

- GIVEN a `FileImportError` with `idFileImport = 5`, `contract = null`, `resolved = false` exists (a row with a format/parse error)
- WHEN any re-sync pass runs for `idFileImport = 5`
- THEN that `FileImportError` record SHALL remain `resolved = false`

#### Scenario: Error for different import not resolved

- GIVEN a `FileImportError` with `idFileImport = 7`, `contract = "C-123"`, `resolved = false` exists
- WHEN a re-sync processes contract `"C-123"` against `idFileImport = 5`
- THEN the error on `idFileImport = 7` SHALL NOT be updated

---

### Requirement: syncDate on SettlementCommission

The system SHALL populate `syncDate` (DateTime, nullable) on a `SettlementCommission` record when the record transitions to status `SYNCHRONIZED`. The `syncDate` SHALL be set to the current timestamp at the moment of the `create` or `update` call. `SettlementCommission` records with status `LAG` SHALL have `syncDate = null`. The system SHALL NOT set `syncDate` on any code path that creates or updates LAG records.

#### Scenario: syncDate set for SYNCHRONIZED commission

- GIVEN a row is processed by a processor and its computed status is `SYNCHRONIZED`
- WHEN the processor persists the `SettlementCommission` record
- THEN `syncDate` SHALL be set to the current timestamp (non-null)

#### Scenario: syncDate is null for LAG commission

- GIVEN a row is processed by a processor and its computed status is `LAG`
- WHEN the processor persists the `SettlementCommission` record
- THEN `syncDate` SHALL be `null`

#### Scenario: syncDate not affected on re-sync if record already SYNCHRONIZED

- GIVEN a `SettlementCommission` already has `syncDate` set from a prior sync
- WHEN a re-sync creates a new commission for the same contract in the same period
- THEN the new record SHALL have a fresh `syncDate` reflecting the current sync timestamp

---

### Requirement: Atomic Counter Updates on Re-Sync

The system SHALL update the counters on `FileImport` at the end of each processed batch using atomic increment/decrement operators. The updates SHALL occur inside the same database transaction as the commission saves for that batch. Counter update rules per batch:

- `successRecord`: increment by the count of newly `SYNCHRONIZED` records in the batch.
- `errorRecord`: decrement by the count of `FileImportError` records resolved in the batch (`resolvedErrors` accumulator); increment by any new errors in the batch.
- `rezagadoRecord`: increment by the count of new `LAG` records in the batch.
- `totalRecord`: increment by the total number of rows processed in the batch.

If the transaction fails, all counter changes for that batch SHALL be rolled back.

#### Scenario: Counter increments on successful batch

- GIVEN a batch of 10 rows where 7 are `SYNCHRONIZED`, 2 are `LAG`, and 1 is `ERROR`
- WHEN the batch completes successfully
- THEN `successRecord` SHALL increment by 7
- AND `rezagadoRecord` SHALL increment by 2
- AND `errorRecord` SHALL increment by 1
- AND `totalRecord` SHALL increment by 10

#### Scenario: Error resolution decrements errorRecord

- GIVEN a re-sync batch of 5 rows where 3 previously-errored contracts now sync successfully (`resolvedErrors = 3`)
- WHEN the batch completes
- THEN `errorRecord` SHALL decrement by 3
- AND `successRecord` SHALL increment by 3

#### Scenario: Counter rollback on batch failure

- GIVEN a batch transaction fails midway
- WHEN the transaction rolls back
- THEN no counter changes for that batch SHALL persist on the `FileImport` record

#### Scenario: Mixed batch with both new errors and resolved errors

- GIVEN a batch where 2 new errors occur and 4 prior errors are resolved
- WHEN the batch completes
- THEN `errorRecord` SHALL change by `+2 - 4 = -2` (net decrement of 2)

---

### Requirement: API Route — No Direct Prisma Access

The system's API route handler for `POST /api/carga-archivos/file-import` MUST NOT call Prisma directly. All database access for `FileImport` operations (dedup lookup, COMPLETED guard, create) SHALL be performed through `FileImportService`. The route MUST only: authenticate, validate the request body with Zod (including `month` and `year`), call the service, and shape the HTTP response.

#### Scenario: Route delegates to service — new import

- GIVEN a valid POST body with `fileType`, `month`, `year`
- WHEN the route handler processes the request
- THEN the route SHALL call `FileImportService.initiateImport(...)` and return the result as the response
- AND the route SHALL NOT contain any `prisma.*` calls

#### Scenario: Route validates month range

- GIVEN a POST body with `month = 0` or `month = 13`
- WHEN the route handler validates the body
- THEN the route SHALL return HTTP 400 with a validation error
- AND `FileImportService.initiateImport` SHALL NOT be called

#### Scenario: Route validates year range

- GIVEN a POST body with `year = 2019` (below allowed minimum)
- WHEN the route handler validates the body
- THEN the route SHALL return HTTP 400 with a validation error

---

### Requirement: Async State for Blocked-Period Error in UI

The system's `CargarArchivoTab` component SHALL use `AsyncState<T>` (from `src/features/shared/types/async-state.types.ts`) as the single discriminated state for managing the import initiation request lifecycle (`idle` | `loading` | `success` | `error`). The component SHALL NOT use three separate `useState` calls for `isLoading`, `data`, and `error`. When the API returns HTTP 409 (period completed), the component SHALL transition to the `error` state and display the message returned by the API.

#### Scenario: Blocked-period error displayed to user

- GIVEN the user selects a period that has `status = COMPLETED`
- WHEN the user submits the form and the API returns HTTP 409
- THEN the component SHALL transition to `AsyncState` error state
- AND SHALL display `"El período {month}/{year} ya fue liquidado"` to the user

#### Scenario: Successful import transitions to success state

- GIVEN the user selects a valid period (not COMPLETED, not duplicate LOAD)
- WHEN the API returns HTTP 201
- THEN the component SHALL transition to `AsyncState` success state
- AND SHALL proceed to the batch upload flow

#### Scenario: Dedup reuse transitions to success state

- GIVEN the user selects a period with an existing LOAD import
- WHEN the API returns HTTP 200 with `{ created: false, fileImport: ... }`
- THEN the component SHALL transition to `AsyncState` success state
- AND SHALL proceed to the batch upload flow using the existing `fileImport.id`
