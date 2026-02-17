# Tasks: Adjust File Loading and Commission Calculations

**Input**: Design documents from `/specs/005-adjust-commission-file-loading/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/pre-liquidacion-api.md

## Phase 1: Setup (Migration & Standardization)

**Purpose**: Establish the new English schema and configuration baseline.

- [x] T001 Update `prisma/schema.prisma` with English names and new entities:
    - [x] Rename `Discount` to `CommissionConfiguration` (map to `config_commission`).
    - [x] Rename `percentage` to `discountPercentage`.
    - [x] Add `clawbackPercentage`.
    - [x] Create `ClawbackBalance` table (Total reserve).
    - [x] Update `Clawback` table with `idUser` and states `ACUMULADO`/`DESCONTADO`.
    - [x] **Decouple**: Remove hard relations between calculation records and `CommissionConfiguration`.
- [x] T002 Execute migration: `npx prisma migrate dev --name standardize_spelling_and_config`
- [x] T003 Generate Prisma Client: `npx prisma generate`
- [x] T004 [P] Update local types in `src/features/pre-liquidacion/types/types.ts` matching `contracts/`.

---

## Phase 2: Foundational Engine

**Purpose**: Core utilities and blocking logic for all user stories.

- [x] T005 [P] Implement 3-decimal (Half-Up) rounding utility in `src/features/shared/lib/math-utils.ts`.
- [x] T006 Implement base hierarchy resolution service in `src/features/pre-liquidacion/lib/hierarchy-resolver.ts`.
- [x] T007 [P] Create shared parser interfaces for Excel files in `src/features/pre-liquidacion/lib/excel-parser.ts`.
- [x] T008 [P] Scaffold API Route Handlers in `src/app/api/` matching `contracts/pre-liquidacion-api.md`.

---

## Phase 3: [US1] Import Voluntarias File (Priority: P1)

**Goal**: Process Voluntarias files with hierarchical distribution and tax discount.
**Independent Test Criteria**: Upload a Voluntarias file via API and verify Coach (64.19%), Leader (5.502% of Coach Bruta), and Agency (4.5% total) amounts after a 12% discount.

- [x] T009 [US1] Implement `POST /api/carga-archivos/file-import`: Parsing logic for Voluntarias (Source A) in `excel-parser.ts`.
- [x] T010 [US1] Implement Voluntarias-specific distribution engine in `src/features/pre-liquidacion/lib/calculation-engine.ts`.
- [x] T011 [US1] Implement `POST /api/pre-liquidacion/procesar`: Trigger engine and snapshot `appliedDiscountPercentage`.
- [x] T012 [US1] Update `ExcelMapperService` to map Voluntarias headers to DB fields.
- [x] T013 [US1] Implement basic UI for upload and triggering process.

---

## Phase 4: [US2] Import Polizas File & Retentions (Priority: P1)

**Goal**: Process Polizas with origin-based Coach % and 10% clawback retention.
**Independent Test Criteria**: Upload a Polizas file and verify Coach % varies by origin (Propio vs Vortex) and 10% is correctly retained in the Clawback reserve.

- [x] T014 [US2] Update `ExcelMapperService` to support Source B (Polizas) headers.
- [x] T015 [US2] Implement 'CARTERA' origin mapping for `PROMOTOR_FRONT19_OMPEV` value in `excel-parser.ts`.
- [x] T016 [US2] Update calculation engine to support Origin-based Coach % lookup.
- [x] T017 [US2] Implement automatic Clawback retention logic (Record `ACUMULADO` in `Clawback` table).
- [x] T018 [US2] Implement atomic balance updates for `ClawbackBalance` table.

---

## Phase 5: [US3] Dynamic Hierarchy & Claw Adjustments (Priority: P2)

**Goal**: Handle manual adjustments via 'claw' records and recursive hierarchy skips.
**Independent Test Criteria**: Process a record with 'claw' in description and verify it reduces the user's ClawbackBalance. Verify distribution skips a missing Leader.

- [x] T019 [US3] Implement 'claw' keyword detection and negative distribution logic in `excel-parser.ts`.
- [x] T020 [US3] Implement manual adjustment movement recording (`Clawback` table, state `DESCONTADO`).
- [x] T021 [US3] Refine `HierarchyService` with recursive skip-level fallback when parents are missing in DB.

---

## Phase 6: Polish & Cross-Cutting (UX & API)

**Goal**: Complete the feedback loop with progress bars, summaries, and export capabilities.

- [x] T022 [P] Implement `GET /api/pre-liquidacion/resultados/[fileId]`: Return progress % and summary statistics.
- [x] T023 [P] Implement `GET /api/pre-liquidacion/exportar/[fileId]`: Generate and serve Excel report.
- [x] T024 Connect UI to Results endpoint for Real-time Progress Bar.
- [x] T025 Implement detailed post-import summary with validation error collection.
- [x] T026 Add validation to block imports for settlement periods marked as `CLOSED`.
- [x] T027 Final cross-story integration tests.

### 7. Refinement (User Feedback)
- [x] T028: Add Select Component to CargarArchivoTab for file type override.
- [x] T029: Clean up database schema (English column names) & confirm migration. English and drop unused fields (Migration).

---

## Implementation Strategy
1. **MVP (Phase 1-3)**: Deliver full support for Voluntarias files via API.
2. **Incremental (Phase 4)**: Add calibration for Polizas and Claws.
3. **UX (Phase 6)**: Polish the feedback loop with progress bars and exports.

## Dependencies Graph
`Phase 1` -> `Phase 2` -> `Phase 3 (US1)` -> `Phase 4 (US2)` -> `Phase 5 (US3)` -> `Phase 6`

## Parallel Execution Examples
- [T005, T007, T008] can be done in parallel once Phase 1 is migration-complete.
- [T022, T023] can be done independently of the core engine logic.
