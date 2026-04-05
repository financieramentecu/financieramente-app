# Tasks: sync-pre-liquidacion-improvements

## Phase 1: Foundation (Backend Logic)

- [x] 1.1 Add `PeriodPreSettledError` class to `src/features/load-file/services/file-import.service.ts`.
- [x] 1.2 Implement sync guard in `FileImportService.initiateImport` to block periods with `PRE-SETTLED` status.
- [x] 1.3 Update `FileImportService.listFileImports` default filter to include `PRE-SETTLED` files.
- [x] 1.4 Modify `PreLiquidacionService.procesarPreLiquidacion` to update `FileImport.status` to `PRE-SETTLED`.
- [x] 1.5 Implement `PreLiquidacionService.obtenerComisionesPreliquidadas` to fetch records for the detail view.

## Phase 2: API & Integration

- [x] 2.1 Update `POST` handler in `src/app/api/carga-archivos/file-import/route.ts` to return `409 Conflict` on `PeriodPreSettledError`.

## Phase 3: Frontend UI & Localization

- [x] 3.1 Implement localized status labels in `src/features/load-file/components/HistorialCargasTab.tsx`.
- [x] 3.2 Add "IR a PRELIQUIDACIÓN" button in `src/features/load-file/components/HistorialCargasTab.tsx`.
- [x] 3.3 Update status filter labels to Spanish in `HistorialCargasTab.tsx`.
- [x] 3.4 Localize `ConfirmModal` message for re-sync warnings in `HistorialCargasTab.tsx`.
- [x] 3.5 Update `src/app/dashboard/pre-liquidacion/page.tsx` tab filters to handle the new `PRE-SETTLED` status.
- [x] 3.6 Localize table headers and summaries in `src/app/dashboard/pre-liquidacion/page.tsx`.

## Phase 4: Testing & Verification

- [x] 4.1 Unit test `FileImportService` sync guard (blocked periods).
- [x] 4.2 Integration test the File Import API for conflict status (409).
- [x] 4.3 Unit test `PreLiquidacionService` for correct `FileImport` status transitions.
- [x] 4.4 Component test `HistorialCargasTab` for Spanish labels and action button visibility.
- [x] 4.5 Manual verification of the full pre-liquidation flow in Spanish.
