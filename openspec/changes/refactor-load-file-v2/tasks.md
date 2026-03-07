# Tasks: Load File Process Refactor V2

## 1. Clean Code Database & Architecture Setup

- [x] 1.1 Update `prisma/schema.prisma` mapping for `SettlementCommission`:
  - Add `startDate DateTime?` and `endDate DateTime?`.
  - Add `contract String? @db.VarChar(50)`.
  - Add `lagDate DateTime?`.
  - Add `isClawback Boolean @default(false)`.
  - Remove `commissionPercentage` column.
  - Remove `error` string column.
  - Update `status` to default to `PENDING` instead of expecting an `ERROR` state.
  - Ensure `commissionType` is strictly mapped without optional nulls.
- [x] 1.2 Create new `FileImportError` model: `idFileImportError Int @id @default(autoincrement())`, `idFileImport Int` (relation to `FileImport`), `rowNumber Int`, `contract String?`, `reason String`, `rawData Json`. Run `npx prisma migrate dev`.
- [x] 1.3 Review and update `src/features/load-file/lib/file-types.ts` to ensure exact column mapping for "Plan de Compensación".
- [x] 1.4 Create `src/features/load-file/services/validators/row.validator.service.ts`. Extract fundamental format checks, empty value checks, String->Decimal transformations, and date range validations into this reusable unit.
- [x] 1.5 Create `src/features/load-file/services/processors/processor.interface.ts`. Defines `ICommissionProcessor` ensuring unified returning of processing status and metrics increment values.

## 2. Refactor Processor Modules (Strategy Pattern)

- [x] 2.1 Refactor Matcher logic: Update logic to verify past commissions exactly matching `startDate` and `endDate` scopes within the exact same `contract` string to detect duplicates. If matched, it's discarded, saved on `FileImportError` table with reason 'Duplicate commission' and increments `errorRecord` counter.
- [x] 2.2 Create `src/features/load-file/services/processors/voluntaria.processor.ts`. Implements `ICommissionProcessor`. Contains logic isolated for VOLUNTARIA: business not found, date existence validation, anti-duplicate mapping, and LAG recovery.
- [x] 2.3 Create `src/features/load-file/services/processors/poliza.processor.ts`. Implements `ICommissionProcessor`. Deals uniquely with business not found, LAG recovery, identifying FRONT19 -> CARTERA and CLAW overrides (`clawbackPercentage = 0`, `discountPercentage = 0`, `isClawback = true`).
- [x] 2.4 Create `src/features/load-file/services/processors/processor.factory.ts`. Dynamically yields either the Voluntaria or Poliza processor singleton based strictly on `fileType`.

## 3. High-Level Batch Orchestrator Refactor

- [x] 3.1 Refactor `process-batch.service.ts` to serve strictly as Coordinator. Purge massive native row extraction functions here. Initialize the Factory dynamically per request.
- [x] 3.2 Live Default Sourcing: The orchestrator handles querying `CommissionConfiguration` ONCE per batch context to broadcast `discountPercentage` and `clawbackPercentage` parameters to processors.
- [x] 3.3 Non-Blocking Error Safety Handler. Loop over rows feeding them to `row.validator.service.ts` and then the processor in a `try-catch`. Any business or format error seamlessly creates a new row in `FileImportError` with reason 'Error processing row' and increments `errorRecord`. The process loop continues gracefully.
- [x] 3.4 Strict Metric Processing: Increment UI counts according to strictly formulated returned tuples:
  - Recovering a LAG increments `recoveredLagsRecord` and `synchronizedRecord`.
  - Format errors and Valid duplicate rejections log to `FileImportError` and increment `errorRecord`.
  - Valid business rule rejections (e.g., date out of range, business not found) save to `SettlementCommission` as `LAG` and increment `noSincronizadoRecord`.
- [x] 3.5 Database Transactions: Use Prisma transactions strictly for multi-row creation scenarios (like old LAG recovery + new SYNC creation).
- [x] 3.6 Create Error Retrieval Endpoint: Implement a new controller/service endpoint (e.g., `GET /api/carga-archivos/:id/errors`) to efficiently fetch and return the `FileImportError` records for a specific file import to supply the UI.

## 4. Testing

- [x] 4.1 Update `process-batch.service.test.ts` to confirm Voluntaria scenario: "Duplicate commission in the same month triggers an error log entry in `FileImportError`, increments `errorRecord`, and prevents saving to the `SettlementCommission` DB".
- [x] 4.2 Update tests to verify Voluntaria LAG logic correctly cascades through the `> 0 previous commissions` rules, increments `recoveredLagsRecord` and `synchronizedRecord` properly including recovered LAGs, and sets `lagDate`.
- [x] 4.3 Update tests to cover Poliza scenario: "Poliza with FRONT19 correctly assigns CARTERA origin" and "Business not found saves as LAG and increments noSincronizadoRecord".
- [x] 4.4 Update tests to firmly assert that Poliza records marked `CLAW` accurately force `discountPercentage = 0` and `clawbackPercentage = 0` and `isClawback = true` regardless of global settings.
- [x] 4.5 Run full suite tests ensuring existing validations for empty fields remain intact during the refactor, correctly populating `FileImportError` and incrementing `errorRecord` without halting the batch process.
- [x] 4.6 Verify that the `ERROR` status is no longer used or expected for `SettlementCommission`.

## 5. Visualization of Records by Status (UI + API)

- [x] 5.1 Add endpoint (e.g. `GET /api/carga-archivos/[id]/records`) that returns records for a file import grouped or filterable by status (Sincronizados, No sincronizados, Rezagados), with pagination (e.g. `page`, `pageSize`, optional `status`). Reuse existing `GET .../errors` for Errores; cause = `reason`.
- [x] 5.2 Define response shape: include contract, montos (baseCommission, commissionValue), isLag, isClawback, discountPercentage, clawbackPercentage, and for "No sincronizados" a derived detail string using only hardcoded text: "No existe el contrato" or "La fecha de creación no está en el rango de fechas". Rezagados = `isLag = true` and `lagDate` not null.
- [x] 5.3 Create shared UI component: four summary cards (counts) + four tabs (Sincronizados, Errores, No sincronizados, Rezagados), each tab rendering a table with columns: Contrato, montos (if LAG), clawback (sí/no), percentages, detail/cause. Errores tab uses `reason` as cause.
- [x] 5.4 Integrate the shared component into the post-upload flow (carga de archivo): after processing completes, show the view for the current `fileImportId` (data from API; view is temporary and lost on refresh).
- [x] 5.5 Integrate into Historial: add "Ver detalle" (or equivalent) to each history card; on click, open a **fullscreen, closeable** modal with the same shared component and load data by `fileImportId` with pagination (modal fullscreen to make the best use of space; user can close to return to the list).
- [x] 5.6 Ensure the records endpoint and UI support pagination so large imports do not load all rows at once.

## 6. Deletion of File Import (Historial)

- [x] 6.1 In the load-file feature service: validate that the file import exists, belongs to the current user, and has `status === 'LOAD'` or `status === 'ERROR'` before performing any delete. If status is not LOAD nor ERROR (e.g. PRE-SETTLED or SETTLED), return a typed error (e.g. `INVALID_STATUS`) with a clear message so the API can respond 400/409.
- [x] 6.2 In the same service, within a single transaction, delete dependent records in FK-safe order: Clawback (for ComissionDistributions of this file's settlements), ComissionDistribution (for this file's SettlementCommissions), SettlementCommission (where idFileImport = id), FileImportError (where idFileImport = id), then FileImport. This fixes the "related errors" failure when the file has FileImportError rows.
- [x] 6.3 In the DELETE API route for file-import/[id]: call the new service; on success return 200; on validation failure (e.g. INVALID_STATUS) return 400 or 409 with the service message in the response body.
- [x] 6.4 (Optional) In the historial UI or the hook that triggers delete, surface the backend error message when the delete request fails (e.g. "Solo se puede eliminar si está en estado LOAD o ERROR").
