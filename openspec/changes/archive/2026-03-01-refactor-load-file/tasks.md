## 1. Sub-system Setup (Domain & Utilities)

- [x] 1.1 Create `src/features/load-file/types/load-file.types.ts` and migrate all types/interfaces from the current implementations (`ProcessBatchRequest`, `ProcessedRecord`, etc.).
- [x] 1.2 Move constants and utilities (`file-types.ts`, `validate-excel.ts`, `business-matcher.ts`, `number-utils.ts`, `process-excel-file.ts`) from `src/app/dashboard/carga-archivos/lib/` to `src/features/load-file/lib/`.
- [x] 1.3 Update internal imports within the moved utility files to point to their new locations.

## 2. Application Logic (Use Cases & Validation) - TDD Phase

- [x] 2.1 **[TDD - Red]** Setup `src/features/load-file/__tests__/process-batch.service.test.ts` and write failing test assertions for Lag, Sync, and Error scenarios based on current logic.
- [x] 2.2 **[TDD - Green]** Extract the core record processing logic into `src/features/load-file/services/process-batch.service.ts` ensuring it returns the standard domain types, and make tests pass.
- [x] 2.3 Create `src/features/load-file/lib/load-file-api.ts` exposing robust typing logic using the global `ApiResponse<T>` contract.

## 3. Presentation Layer Migration

- [x] 3.1 Migrate UI components (`CargarArchivoTab.tsx`, `HistorialCargasTab.tsx`, `ProcessingProgress.tsx`, `ProcessingResultModal.tsx`, `ProcessingSummary.tsx`) from the dashboard folder to `src/features/load-file/components/`.
- [x] 3.2 Update React hook internal imports in UI components and ensure they utilize `load-file-api` instead of `fetch` directly.

## 4. API & UI Adapters (Thin Wrappers)

- [x] 4.1 Update API Route `src/app/api/carga-archivos/process-batch/route.ts` to be a thin adapter using `ProcessBatchService`, extracting values and returning standard `ApiResponse` formatted JSON.
- [x] 4.2 Update API Route `src/app/api/carga-archivos/file-import/route.ts` to reflect paths and return types.
- [x] 4.3 Update the main UI Page `src/app/dashboard/carga-archivos/page.tsx` to point to the components in `features/load-file/components/`.
- [x] 4.4 Run all test suites (`npm run test` or equivalent) to verify TDD assertions and compile checks pass before finishing.

## 5. State Management Standardization & Pre-Liquidación Integration

- [x] 5.1 Generate Prisma database migration to adjust column constraints/defaults if state ENUMs exist, converting Spanish states to English (`LOAD`, `COMPLETED`, `SYNCHRONIZED`, `LAG`, `PRE-SETTLED`, `SETTLED`).
- [x] 5.2 Update `features/load-file/services/process-batch.service.ts` to push `LOAD` as `FileImport` status regardless of underlying errors, capturing errors purely on the specific records.
- [x] 5.3 Update `features/pre-liquidacion` screens and backend controllers to filter dropdown lists retrieving files in `LOAD` status housing `SYNCHRONIZED` commissions.
- [x] ~~5.4 Map final state `COMPLETED` trigger for when a file is definitively liquidated.~~ _(Removed: `COMPLETED` state is no longer necessary for pre-liquidation)_
- [x] 5.5 Extract Prisma querying logic from `api/pre-liquidacion/archivos/route.ts` to the pre-liquidacion service module to enforce `frontend-standards.mdc`.
- [x] 5.6 Refactor `use-pre-liquidacion.ts` hook to unpack the normalized `ApiResponse<T>` contract.
- [x] 5.7 Refactor `dashboard/pre-liquidacion/page.tsx` tabs logic (Pending vs Historic) to split exclusively based on `LOAD` state matching internal `sincronizados` and `registrosPreliquidados` counters, discarding the outdated state strings (`COMPLETADO`, `PRELIQUIDADO`). chanfe `PRELIQUIDADO` to `PRE-SETTLED` and `SINCRONIZADO` to `SYNCHRONIZED` on settlement, for files the estate is `LOAD`
