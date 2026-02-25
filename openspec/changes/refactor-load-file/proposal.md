## Why

The current implementation of the file import feature (`carga-archivos`) tightly couples API routing, business logic, framework-specific data (Next.js Request/Response), and database interactions (Prisma) within a single 800+ line file (`src/app/api/carga-archivos/process-batch/route.ts`). This structure violates Clean Architecture (Screaming Architecture) principles, making the code hard to test, maintain, and scale. Refactoring this into a distinct feature module (`src/features/load-file`) will align the code with the project's architectural standards, improving separation of concerns.

## What Changes

- Extract the Excel batch processing logic from the API route to a dedicated Application Service (`process-batch.service.ts`).
- Create standard API clients in `src/features/load-file/lib/load-file-api.ts` following the pattern used in `empresas`.
- Standardize the API responses to use the shared `ApiResponse<T>` contract.
- Relocate UI components and hooks from `src/app/dashboard/carga-archivos` to `src/features/load-file/components|hooks`.
- Retain the Next.js routes (`/api/carga-archivos/...` and `/dashboard/carga-archivos/...`) as thin wrappers to prevent breaking changes to the UI or existing integrations.

## Capabilities

### New Capabilities

- **State Management Standardization (English states)**:
  - `FileImport` records will remain in state: `LOAD` (when synchronized, even with errors). The `COMPLETED` state is NOT necessary for pre-liquidation.
  - `SettlementCommission` records will use states: `LAG`, `SYNCHRONIZED`, `PRE-SETTLED` and `SETTLED`.
  - The API explicitly filters and returns `LOAD` files containing actively `SYNCHRONIZED` settlements.
  - The UI Pre-liquidación screen (`page.tsx`) will be refactored to align with these new definitions: it will rely on the `estado === 'LOAD'` identifier alongside counter heuristics (`sincronizados > 0` vs `registrosPreliquidados > 0`) to dynamically split the list into the "Pendientes / Pre-liquidar" and "Histórico" tabs, removing the obsolete `COMPLETADO` and `PRELIQUIDADO` UI hardcodings.

### Modified Capabilities

- `load-file`: The architectural structure and API response shapes are changing, but the underlying business rules (lag detection, synchronization, Excel parsing) remain strictly identical.

## Impact

- **API Routes**: `/api/carga-archivos/process-batch/route.ts` and `/api/carga-archivos/file-import/route.ts` will become thin adapters.
- **UI Components**: The dashboard page `/dashboard/carga-archivos/page.tsx` will have its internal imports updated to point to the new `features/load-file` module.
- **Dependencies**: The newly created services will directly depend on Prisma (in the Application layer) and the existing Excel parsing utilities.
- **Testing**: The new structure allows for isolated unit testing of the `ProcessBatchService` without mocking Next.js HTTP objects.
