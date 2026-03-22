# Delta for load-file

> **Base spec**: `openspec/specs/load-file/spec.md`
> **Change**: `mejora-ui-sincronizacion`
> **Date**: 2026-03-14

---

## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: History Date-Range Filter (dateStart / dateEnd)

(Reason: The previous implementation filtered history by `createdAt` date range using two `<input type="date">` pickers labeled "Desde" and "Hasta". This filter was misaligned with the domain model, which uses `month` and `year` integer period fields — not `createdAt`. Users could not reliably express period-based queries using calendar date pickers. The date-range filter is replaced by the MES/AÑO period selectors defined in R-UI-2.)

- `dateStart` and `dateEnd` state variables in `HistorialCargasTab` MUST be removed.
- The "Desde" and "Hasta" `<input type="date">` UI elements MUST be removed.
- Any `filteredHistorial` `useMemo` or derived state that filters by `createdAt`, `dateStart`, or `dateEnd` MUST be removed.

---

### Requirement: Client-Side filteredHistorial Derived State

(Reason: With all filtering now server-side, maintaining a `filteredHistorial` computed variable creates a double-filter risk and produces incorrect results when the server has already filtered by period. The `historial` array returned by the server is the final result and MUST be rendered directly.)

- The `filteredHistorial` variable (and its backing `useMemo`) MUST be removed from `HistorialCargasTab`.
- The component MUST render the `historial` array from `useFileHistory` directly.
- No client-side filtering by date range, period, or any other criterion derived from `dateStart`/`dateEnd` state SHALL remain.
