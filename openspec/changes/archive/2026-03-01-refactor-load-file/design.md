## Context

The `carga-archivos` module allows admins to upload Excel files containing commission settlement data.
Currently, the API endpoints (`src/app/api/carga-archivos/process-batch/route.ts` and `file-import/route.ts`) contain all the complex parsing, validation, database interactions, and business rule enforcement. The UI components living in `src/app/dashboard/carga-archivos` are directly coupled to these endpoints and contain some shared utilities.
This violates the Screaming Architecture principles adopted in other parts of the system (like `empresas` and `origin-client`), where business logic resides in `src/features/[feature-name]`.

## Goals / Non-Goals

**Goals:**

- Decouple business logic from Next.js routing infrastructure.
- Implement a clear folder structure in `src/features/load-file/` (`components`, `hooks`, `lib`, `types`).
- Standardize the API responses to use the shared `ApiResponse<T>` contract.
- Maintain existing mathematical and logical calculations for data categorization (Sync, Lag, etc.).
- Enforce strict Test-Driven Development (TDD) for the newly extracted Domain and Application logic.
- Standardize state values dynamically across the DB mapping to English statuses (`LOAD`, `COMPLETED` for import streams, `SYNCHRONIZED`, `LAG`, `PRE-SETTLED`, `SETTLED` for settlements).

**Non-Goals:**

- Altering the mathematical calculations or conditions for determining "Sync", "Lag", or "Error" records.
- Creating a generic file parsing core (we focus solely on the existing `load-file` logic).

## Decisions

### 1. Folder Structure in `src/features/load-file/`

**Decision:** Adopt the standard feature pattern: `components/`, `hooks/`, `lib/`, `types/`, and `services/`.
**Rationale:** Consistency with `empresas`. `services/` will contain pure TS classes/functions for use cases (e.g., `process-batch.service.ts`). `lib/` will hold API client wrappers and pure util functions.

### 2. API Response Standardization

**Decision:** The new API endpoints will exclusively return `ApiResponse<T>` types.
**Rationale:** The current implementation returns arbitrary JSON shapes depending on success or error. Embracing `ApiResponse<T>` ensures the frontend can safely handle the result identically across the application.

### 3. Controller vs Internal Service Error Handling

**Decision:** Services will throw standard Domain Errors (or return failure types). The Next.js Route handlers will catch these and translate them into `ApiResponse<T>` formatted JSON with the corresponding HTTP code (e.g., 400 for validation, 500 for internal errors).
**Rationale:** Isolates the Service layer from HTTP concerns.

### 4. Consolidated State Management in English

**Decision:** Migrate and standardize DB state columns for `FileImport` and `SettlementCommission` to exclusively use English terminology.

- `FileImport`: Remains in `LOAD` after sync (recording errors individually without dropping the file status), transitioning only to `COMPLETED` when fully liquidated.
- `SettlementCommission`: Statuses will map exactly to `LAG`, `SYNCHRONIZED`, `PRE-SETTLED`, `SETTLED`, and potentially `ERROR`.
- `Pre-Liquidación` views: Only files actively in `LOAD` with valid `SYNCHRONIZED` settlements will populate the selection lists.
  **Rationale:** Standardizes status reporting logically preventing broken file histories when a subset of rows contains parsing exceptions, and enforces internationalized variables reducing localization debt.

## Risks / Trade-offs

- **Risk: Breaking UI parsing behavior.** → _Mitigation_: We are migrating existing `.tsx` components and `.ts` utility functions "as-is" into the new directory structure, only correcting import paths. We will not alter the React logic or internal Excel parsing libraries.
- **Risk: Sync/Lag Logic regressions.** → _Mitigation_: Apply strict TDD. Before writing or moving the `processAndSaveRecord` loop, comprehensive failing unit tests MUST be written for `features/load-file/services/process-batch.service.ts` to ensure calculations remain valid without an HTTP context.

## Migration Plan

1. Scaffold the directories in `src/features/load-file/`.
2. Move Domain Types and define API Contracts (`types/load-file.types.ts`).
3. **[TDD]** Write failing unit tests for internal domain logic and the core batch processing service.
4. Move utilities (`lib/process-excel-file.ts`, `validate-excel.ts`, etc.) to `features/load-file/lib/` and pass the tests.
5. Create the Service Layer (`features/load-file/services/process-batch.service.ts`) and ensure tests pass (Green phase).
6. Create the API client (`features/load-file/lib/load-file-api.ts`).
7. Update UI Components (`components`, `hooks`) and move them to the feature directory.
8. Refactor the Next.js API Routes (`app/api/carga-archivos/...`) to be thin wrappers.
9. Update the Next.js Page (`app/dashboard/carga-archivos/page.tsx`) to import the top-level feature components.
10. Generate and apply Prisma DB Migrations to enforce `LOAD`/`COMPLETED` & `SYNCHRONIZED`/`LAG`/`PRE-SETTLED`/`SETTLED` across schemas.
11. Update pre-liquidation logic and UI screens to filter `FileImport` by `LOAD` strictly querying `SYNCHRONIZED` settlements.
