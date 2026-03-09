# Tasks: Load File Process Refactor V2

## Phase 1: Foundation (Database, Types, Validators, Processor Contract)

- [x] 1.1 Update `prisma/schema.prisma`: add to `SettlementCommission` `startDate DateTime?`, `endDate DateTime?`, `contract String? @db.VarChar(50)`, `lagDate DateTime?`, `isClawback Boolean @default(false)`; remove `commissionPercentage` and `error`; set `status` default to `PENDING`; ensure `commissionType` is strictly mapped. Run `npx prisma migrate dev`.
- [x] 1.2 Add `FileImportError` model to `prisma/schema.prisma`: `idFileImportError`, `idFileImport` (relation), `rowNumber`, `contract String?`, `reason`, `rawData Json`. Run migration.
- [x] 1.3 Review `src/features/load-file/lib/file-types.ts`: ensure column mapping includes "Plan de Compensación" and required headers for POLIZA/VOLUNTARIA.
- [x] 1.4 Create `src/features/load-file/services/validators/row.validator.service.ts`: format checks, empty values, string-to-decimal, date range validations; used by processors.
- [x] 1.5 Create `src/features/load-file/services/processors/processor.interface.ts`: define `ICommissionProcessor` and `ProcessorResult` (status, isLag, idBusiness, recoveredLag?, errorReason?).

## Phase 2: Core Implementation (Processors and Batch Orchestrator)

- [x] 2.1 Implement duplicate detection: match `contract` + `startDate` + `endDate` (same month) for Voluntaria; on match do not save to `SettlementCommission`, insert `FileImportError` with reason "Duplicate commission", increment `errorRecord`.
- [x] 2.2 Create `src/features/load-file/services/processors/voluntaria.processor.ts`: implement `ICommissionProcessor`; business not found → LAG + noSincronizadoRecord; date in/out of range → SYNC/LAG; prior LAG recovery → update old + create new SYNC, set lagDate, recoveredLagsRecord + synchronizedRecord.
- [x] 2.3 Create `src/features/load-file/services/processors/poliza.processor.ts`: implement `ICommissionProcessor`; business not found → LAG; LAG recovery; Plan de Compensación: FRONT19 → CARTERA, CLAW → isClawback true and overrides; other → isClawback false.
- [x] 2.4 Create `src/features/load-file/services/processors/processor.factory.ts`: return Voluntaria or Poliza processor by `fileType`.
- [x] 2.5 Refactor `src/features/load-file/services/process-batch.service.ts` to act only as coordinator: no inline row logic; get processor from factory; query `CommissionConfiguration` once per batch; loop rows with try/catch, delegate to validator + processor; on exception or processor ERROR → create `FileImportError` ("Error processing row"), increment `errorRecord`, continue; apply metrics (synchronizedRecord, noSincronizadoRecord, errorRecord, recoveredLagsRecord); use Prisma transactions for LAG recovery + new SYNC.
- [x] 2.6 Add `GET /api/carga-archivos/[id]/errors` (or equivalent): return `FileImportError` rows for the file import with pagination; used by UI for Errores tab.

## Phase 3: Integration (Records API, Delete Service, Routes, UI)

- [x] 3.1 Add `GET /api/carga-archivos/[id]/records`: query by `fileImportId` with pagination (`page`, `pageSize`) and optional `status` (SYNCHRONIZED | NO_SYNC | REZAGADOS); auth; call `file-import-records.service.ts`; response shape: contract, baseCommission, commissionValue, isLag, isClawback, discountPercentage, clawbackPercentage, and for No sincronizados derived text ("No existe el contrato" / "La fecha de creación no está en el rango de fechas"); Rezagados = isLag true and lagDate not null.
- [x] 3.2 Create `src/features/load-file/services/file-import-records.service.ts`: `getFileImportRecords(fileImportId, userId, { page, pageSize, status })`; enforce ownership; return items + pagination.
- [x] 3.3 Create shared component (e.g. `RecordsByStatusView.tsx`): four summary cards (counts) + four tabs (Sincronizados, Errores, No sincronizados, Rezagados), each tab a table (Contrato, montos, clawback sí/no, percentages, detail/cause); Errores use `reason`; pagination.
- [x] 3.4 In `CargarArchivoTab.tsx`: after processing completes, show RecordsByStatusView for current `fileImportId`; counts from backend (e.g. `noSincronizadoRecord`); view temporary (lost on refresh).
- [x] 3.5 In `HistorialCargasTab.tsx`: add "Ver detalle" to each card; on click open **fullscreen, closeable** modal with RecordsByStatusView; load data by `fileImportId` with pagination; modal closeable (button/overlay/escape).
- [x] 3.6 In `src/features/load-file/lib/load-file-api.ts`: add getImportRecords (and getImportErrors if not present) for the new endpoints.
- [x] 3.7 Create `src/features/load-file/services/delete-file-import.service.ts`: validate file exists and belongs to user; allow delete only when `status === 'LOAD'` or `status === 'ERROR'`; else return typed result `{ ok: false, code: 'INVALID_STATUS', message }`; in one transaction delete in order: Clawback → ComissionDistribution → SettlementCommission → FileImportError → FileImport; return `{ ok: true }` or `{ ok: false, code: 'NOT_FOUND'|'INVALID_STATUS', message }`.
- [x] 3.8 In `src/app/api/carga-archivos/file-import/[id]/route.ts`: implement DELETE handler; call deleteFileImport; 200 on success, 404 on NOT_FOUND, 409 (or 400) on INVALID_STATUS with body message.
- [x] 3.9 (Optional) In historial UI or delete hook: surface backend error message when delete fails (e.g. "Solo se puede eliminar si está en estado LOAD o ERROR").

## Phase 4: Testing

- [x] 4.1 Unit: In `process-batch.service.test.ts` (or equivalent), assert Voluntaria duplicate (same contract + start/end dates) creates `FileImportError` with reason "Duplicate commission", increments `errorRecord`, does not insert into `SettlementCommission`.
- [x] 4.2 Unit: Assert Voluntaria LAG recovery: prior LAG updated to SYNCHRONIZED with lagDate, new record SYNCHRONIZED; `recoveredLagsRecord` and `synchronizedRecord` incremented.
- [x] 4.3 Unit: Assert Poliza FRONT19 → origin CARTERA; business not found → LAG and noSincronizadoRecord.
- [x] 4.4 Unit: Assert Poliza CLAW → isClawback true, clawbackPercentage 0, discountPercentage from config (or 0 per spec).
- [x] 4.5 Unit: Assert invalid/unparseable row creates `FileImportError` ("Error processing row"), increments `errorRecord`, batch continues (non-blocking).
- [x] 4.6 Unit: Assert `SettlementCommission` is never saved with ERROR status.
- [x] 4.7 Unit (optional): Add test in load-file feature for `deleteFileImport`: LOAD/ERROR → success; PRE-SETTLED/SETTLED → INVALID_STATUS; non-existent or wrong user → NOT_FOUND; transaction deletes FileImportError and FileImport.

## Phase 5: Encoding, Accents, and Cleanup

- [x] 5.1 In `src/features/load-file/lib/validate-excel-structure.ts` and `src/features/load-file/lib/process-excel-file.ts`: when the input is or is detected as CSV (or text-based), decode the file buffer as UTF-8 (e.g. `new TextDecoder('utf-8').decode(await file.arrayBuffer())`) before passing to SheetJS (e.g. `XLSX.read(decodedString, { type: 'string' })` or equivalent) so that Spanish accented headers and cells are not corrupted. Ensure both validation and processing use the same decoding path for CSV.
- [x] 5.2 Document in code or in `openspec/changes/refactor-load-file-v2/exploration.md` that header comparison is accent-insensitive via `normalizeHeaderValue` in `src/features/load-file/lib/header-utils.ts`. Add or extend a test in `__tests__/lib/validate-excel-structure.test.ts`: validate structure with a sheet whose headers use accented names (e.g. "Plan de Compensación") and again with non-accented ("Plan de Compensacion"); both MUST be accepted as valid for the same required column.

## Phase 6: Poliza clawback percentage persistence (design follow-up)

- [x] 6.1 In `src/features/load-file/services/processors/poliza.processor.ts`: before each call to `createSync`, compute `effectiveClawback` as `isClawback ? 0 : (snapshots.clawbackPercentage != null ? Number(snapshots.clawbackPercentage) : 0)`. Add a parameter `clawbackPercentage: number` to `createSync(..., clawbackPercentage)` and use it in `data.clawbackPercentage` instead of the hardcoded `0`. Pass `effectiveClawback` from both call sites (priorLag and no priorLag).
- [x] 6.2 Unit test: In `src/features/load-file/__tests__/process-batch.service.test.ts`, add a test that processes a Poliza row whose "Plan de Compensación" contains "FRONT19" (no CLAW), with an active `CommissionConfiguration` that has `clawbackPercentage` set (e.g. 0.1); assert the created `SettlementCommission` row has `clawbackPercentage` equal to that config value. Ensure existing test for Plan with "CLAW" still asserts `clawbackPercentage` 0 (spec scenario: Plan contains CLAW — clawback zero).
