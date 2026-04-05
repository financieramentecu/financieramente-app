# Specification: load-file

## Purpose

TBD

## Requirements

### Requirement: Architectural Separation

The system MUST isolate Excel parsing, validation, and business logic into a dedicated Application Service within `src/features/load-file/`. Next.js Route handlers MUST NOT contain business rules.

#### Scenario: Business logic execution

- **WHEN** an Excel batch is submitted for processing
- **THEN** the API route MUST instantiate the Application Service and delegate the execution
- **THEN** the API route MUST translate the service result into the standardized HTTP response

### Requirement: Standardized API Responses

The API endpoints for `load-file` (`/api/carga-archivos/...`) MUST exclusively return responses adhering to the `ApiResponse<T>` contract.

#### Scenario: Successful batch processing

- **WHEN** the Application Service returns a successful `ProcessBatchResponse`
- **THEN** the API MUST return a 200 HTTP status with a JSON payload matching `{ data: ProcessBatchResponse, error: undefined }`

#### Scenario: Failed batch processing

- **WHEN** the Application Service throws a Domain Error or validation fails
- **THEN** the API MUST return the appropriate HTTP error status (400 or 500) with a JSON payload matching `{ data: null, error: "error message" }`

### Requirement: English State Management

The system MUST use English status terms for file imports and settlement commissions to standardize data flow and tracking.

#### Scenario: File import sync process

- **WHEN** an Excel file is synchronized, even if some rows contain errors
- **THEN** the `FileImport` status MUST remain/become `LOAD`
- **AND** the `FileImport` status MUST ONLY transition to `COMPLETED` when the related commissions are fully liquidated

#### Scenario: Commission status tracking

- **WHEN** tracking individual commission lines within an import
- **THEN** their statuses MUST strictly be one of `LAG`, `SYNCHRONIZED`, `PRE-SETTLED`, or `SETTLED`

#### Scenario: Pre-liquidation file selection

- **WHEN** an admin navigates to the pre-liquidation screen
- **THEN** the screen MUST only list `FileImport` entries that are in `LOAD` status AND have associated `SYNCHRONIZED` commissions

---

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

### Requirement: Block Pre-liquidated or Completed Periods

The system SHALL reject a new sync attempt if a `FileImport` with `status = COMPLETED` OR `status = PRE-SETTLED` exists for the same `fileType`, `month`, `year`, and `idUser`. The rejection MUST occur before any new record is created. The API route SHALL return HTTP 409.
(Previously: only blocked `COMPLETED` status).

For `status = COMPLETED`, the error response MUST include the message `"El período {month}/{year} ya fue liquidado"`. For `status = PRE-SETTLED`, the error response body SHALL contain `{ data: null, error: "Período en pre-liquidación" }`.

#### Scenario: Sync blocked when period is completed

- GIVEN a `FileImport` with `status = COMPLETED`, `fileType = POLIZA`, `month = 2`, `year = 2026`, `idUser = 10` exists
- WHEN the same user initiates an import with `fileType = POLIZA`, `month = 2`, `year = 2026`
- THEN the system SHALL return HTTP 409
- AND the response body SHALL contain `{ data: null, error: "El período 2/2026 ya fue liquidado" }`
- AND no new `FileImport` record SHALL be created

#### Scenario: Sync blocked when period is pre-settled

- GIVEN a `FileImport` with `status = PRE-SETTLED`, `fileType = POLIZA`, `month = 2`, `year = 2026`, `idUser = 10` exists
- WHEN the same user initiates an import with `fileType = POLIZA`, `month = 2`, `year = 2026`
- THEN the system SHALL return HTTP 409
- AND the response body SHALL contain `{ data: null, error: "Período en pre-liquidación" }`

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

---

### Requirement: R-UI-1 — Sync Progress Shows Current-Session Counters Only

During a sync session, the progress counters displayed in `ProcessingProgress` (sincronizados, rezagados, errores) MUST reflect only the records processed in the current sync session. Counters MUST be accumulated from the `summary` field returned in each `processBatch()` response — NOT read from `FileImport` DB fields (e.g. `sincronizadoRecord`, `rezagadoRecord`, `errorRecord`). Counters MUST be reset to zero when a new sync session starts (before the first batch is sent). The polling loop MAY continue to run to detect terminal status transitions but MUST NOT write counter values to component state.

#### Scenario: Normal session accumulation across batches

- GIVEN a sync session has started with all counters reset to zero
- WHEN `processBatch()` returns `summary = { sincronizado: 7, rezagado: 2, error: 1 }` for the first batch
- AND `processBatch()` returns `summary = { sincronizado: 5, rezagado: 0, error: 0 }` for the second batch
- THEN `ProcessingProgress` MUST display `sincronizados = 12`, `rezagados = 2`, `errores = 1`

#### Scenario: Counters reset on new session start

- GIVEN a previous sync session ended with `sincronizados = 50, rezagados = 10, errores = 3`
- WHEN the user starts a new sync session for the same `FileImport`
- THEN all counters MUST reset to zero before the first batch response is processed
- AND `ProcessingProgress` MUST display `sincronizados = 0, rezagados = 0, errores = 0` at session start

#### Scenario: LAG and ERROR records correctly counted per session

- GIVEN a sync session is in progress
- WHEN `processBatch()` returns `summary = { sincronizado: 0, rezagado: 3, error: 2 }` for a batch
- THEN the session counters MUST accumulate `rezagados += 3` and `errores += 2`
- AND the counters MUST NOT include values from any prior session or from DB fields

#### Scenario: Polling loop does not overwrite counters

- GIVEN a sync session is in progress with session counters accumulated from batch responses
- WHEN the poll interval fires and reads `FileImport` status
- THEN the poll callback MUST NOT modify `sincronizados`, `rezagados`, or `errores` in component state
- AND counter values MUST remain equal to the accumulated batch totals

---

### Requirement: R-UI-2 — History Filter by MES and AÑO

The Historial section MUST provide a MES selector and an AÑO selector to filter file import history by period. The MES selector MUST offer options for months 1–12 using Spanish uppercase month names (`ENERO`–`DICIEMBRE`) plus an "Todos" or "ALL" option to remove the month filter. The AÑO selector MUST offer a dynamic range of year options (centered on the current year) plus an "Todos" or "ALL" option to remove the year filter. Filtering MUST be server-side: the component MUST pass selected month and year as query params (`month`, `year`) to the API; the server applies the filters and returns only matching records. The component MUST NOT apply additional client-side filtering after receiving the server response.

#### Scenario: Filter by month only

- GIVEN the user selects MES = 3 (Marzo) and AÑO = ALL
- WHEN `useFileHistory` fetches
- THEN the API MUST receive `GET /api/carga-archivos/file-import?month=3` (without `year`)
- AND the Historial section MUST display only records with `month = 3` (any year)

#### Scenario: Filter by year only

- GIVEN the user selects MES = ALL and AÑO = 2026
- WHEN `useFileHistory` fetches
- THEN the API MUST receive `GET /api/carga-archivos/file-import?year=2026` (without `month`)
- AND the Historial section MUST display only records with `year = 2026` (any month)

#### Scenario: Filter by both month and year

- GIVEN the user selects MES = 3 (Marzo) and AÑO = 2026
- WHEN `useFileHistory` fetches
- THEN the API MUST receive `GET /api/carga-archivos/file-import?month=3&year=2026`
- AND the Historial section MUST display only records with `month = 3` AND `year = 2026`

#### Scenario: Clear filters resets to all results

- GIVEN MES = 3 and AÑO = 2026 are selected and filtered results are displayed
- WHEN the user sets both MES and AÑO back to ALL
- THEN the API MUST receive `GET /api/carga-archivos/file-import` with no `month` or `year` params
- AND the Historial section MUST display all available records

#### Scenario: Invalid month rejected by server

- GIVEN the API receives `GET /api/carga-archivos/file-import?month=13`
- WHEN the route handler validates the query params with Zod (`min(1).max(12)`)
- THEN the route MUST return HTTP 400 with a validation error
- AND no data MUST be returned

#### Scenario: Invalid year rejected by server

- GIVEN the API receives `GET /api/carga-archivos/file-import?year=2019`
- WHEN the route handler validates the query params with Zod (`min(2020)`)
- THEN the route MUST return HTTP 400 with a validation error
- AND no data MUST be returned

---

### Requirement: R-UI-3 — History Filter — Server-Side Only, No Client Filtering

After the server returns a filtered list of file imports, the component MUST NOT apply additional client-side filtering or transforms based on period. The `historial` array returned by `useFileHistory` MUST be rendered directly. No `filteredHistorial` derived state (or `useMemo`) that re-filters by date range, month, or year SHALL exist. Filtering responsibility belongs exclusively to the server.

#### Scenario: Server response rendered directly without client transform

- GIVEN `useFileHistory` returns `historial = [recordA, recordB]` matching `month=3, year=2026`
- WHEN `HistorialCargasTab` renders
- THEN the component MUST display exactly `recordA` and `recordB`
- AND MUST NOT discard or hide any items from the `historial` array based on client-side period logic

#### Scenario: Empty server response renders empty list

- GIVEN the server returns `historial = []` for `month=6, year=2024` (no records for that period)
- WHEN `HistorialCargasTab` renders
- THEN the component MUST display an empty state (no records found)
- AND MUST NOT attempt to fill the list from a client-side cache or prior fetch result

---

### Requirement: R-UI-4 — useFileHistory Uses AsyncState

The `useFileHistory` hook MUST manage its async data lifecycle using a single `AsyncState<CargaHistorial[]>` discriminated union (from `src/features/shared/types/async-state.types.ts`) with states `idle | loading | success | error`. The hook MUST NOT use three separate `useState` calls for `historial`, `isLoading`, and `error`. The hook's return value MUST derive `historial`, `isLoading`, and `error` from the `AsyncState` discriminant to preserve backward-compatible destructuring by consumers.

#### Scenario: Successful fetch transitions through loading to success

- GIVEN `useFileHistory` is called with any params
- WHEN the fetch starts
- THEN the internal state MUST transition to `{ status: 'loading' }`
- AND `isLoading` MUST be `true`
- WHEN the fetch resolves with data
- THEN the internal state MUST transition to `{ status: 'success', data: [...] }`
- AND `historial` MUST contain the fetched records
- AND `isLoading` MUST be `false`

#### Scenario: Failed fetch transitions to error state

- GIVEN `useFileHistory` is called with any params
- WHEN the fetch rejects or returns a non-OK response
- THEN the internal state MUST transition to `{ status: 'error', error: '<message>' }`
- AND `error` MUST be a non-null string
- AND `historial` MUST be an empty array

#### Scenario: Impossible states eliminated

- GIVEN the hook is in `loading` state
- THEN `error` MUST be `null`
- AND `historial` MUST be `[]`
- AND it MUST NOT be possible for both `isLoading = true` and `error !== null` simultaneously

---

### Requirement: API Route — GET /api/carga-archivos/file-import Accepts Period Filters

(Previously: the GET handler accepted only `page` and `limit` query params. No period filter existed on this endpoint.)

Now: The GET handler for `GET /api/carga-archivos/file-import` MUST accept optional `month` (integer 1–12) and `year` (integer 2020–2100) query params in addition to the existing `page` and `limit` params. The route MUST validate `month` and `year` with Zod coercion (`z.coerce.number().int()`). The route MUST pass validated `month` and `year` to `FileImportService.listFileImports`. The route MUST NOT call Prisma directly — all data access MUST go through `FileImportService`.

#### Scenario: GET with month and year params returns filtered results

- GIVEN the route receives `GET /api/carga-archivos/file-import?month=3&year=2026`
- WHEN Zod validates the params (both in range)
- THEN the route MUST call `FileImportService.listFileImports` with `{ ..., month: 3, year: 2026 }`
- AND return HTTP 200 with only records matching that period

#### Scenario: GET without period params returns all records

- GIVEN the route receives `GET /api/carga-archivos/file-import?page=1&limit=100` (no month/year)
- WHEN Zod validates the params (month and year are optional)
- THEN the route MUST call `FileImportService.listFileImports` with `month: undefined` and `year: undefined`
- AND return HTTP 200 with all records accessible to the user

#### Scenario: GET with out-of-range month returns 400

- GIVEN the route receives `GET /api/carga-archivos/file-import?month=0` or `month=13`
- WHEN Zod validates the params
- THEN the route MUST return HTTP 400 with a validation error message
- AND `FileImportService.listFileImports` MUST NOT be called

---

### Requirement: FileImportService.listFileImports Accepts Period Filters

(Previously: `listFileImports` accepted only `userId` and `isAdmin` params, with no optional filters.)

Now: `FileImportService.listFileImports` MUST accept optional `month?: number`, `year?: number`, `status?: string`, and `search?: string` params. When `month` is provided, the Prisma `where` clause MUST include `month = <value>`. When `year` is provided, the `where` clause MUST include `year = <value>`. When neither is provided, no period filter is applied. The `isAdmin` guard on `idUser` MUST remain in effect independently of period filters.

#### Scenario: Filter applied to Prisma where clause

- GIVEN `listFileImports` is called with `{ userId: 5, isAdmin: false, month: 3, year: 2026 }`
- WHEN the service builds the Prisma query
- THEN `where` MUST contain `{ idUser: 5, month: 3, year: 2026 }`

#### Scenario: No filter applied when params are undefined

- GIVEN `listFileImports` is called with `{ userId: 5, isAdmin: false }` (no month/year)
- WHEN the service builds the Prisma query
- THEN `where` MUST contain `{ idUser: 5 }` only (no `month` or `year` key)

#### Scenario: Admin user ignores idUser filter but respects period filter

- GIVEN `listFileImports` is called with `{ userId: 1, isAdmin: true, month: 6, year: 2025 }`
- WHEN the service builds the Prisma query
- THEN `where` MUST contain `{ month: 6, year: 2025 }` with NO `idUser` constraint

---

### Requirement: History Date-Range Filter (REMOVED)

The previous date-range filter (`dateStart` / `dateEnd` using `<input type="date">` pickers labeled "Desde" and "Hasta") has been removed. It was misaligned with the domain model, which uses `month` and `year` integer period fields — not `createdAt`. It has been replaced by the MES/AÑO period selectors defined in R-UI-2.

- `dateStart` and `dateEnd` state variables in `HistorialCargasTab` MUST NOT exist.
- The "Desde" and "Hasta" `<input type="date">` UI elements MUST NOT exist.
- Any `filteredHistorial` `useMemo` or derived state that filters by `createdAt`, `dateStart`, or `dateEnd` MUST NOT exist.

---

### Requirement: Status Labels Localization (Spanish UI)

The system MUST display all `FileImport` status values in the UI using Spanish labels. This mapping MUST apply to the Status Badge and the Status Filter in `HistorialCargasTab`.

| English Status | Spanish Label | Color/Style |
|----------------|---------------|-------------|
| `LOAD` | Cargado | Blue |
| `PROCESSING` | Procesando | Orange |
| `PRE-SETTLED` | Pre-liquidado | Purple |
| `COMPLETED` | Liquidado | Green |
| `ERROR` | Error | Red |

#### Scenario: Status displayed in Spanish

- GIVEN a `FileImport` with `status = 'PRE-SETTLED'`
- WHEN rendered in `HistorialCargasTab`
- THEN the badge MUST show the text "Pre-liquidado"
