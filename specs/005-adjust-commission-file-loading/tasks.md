# Tasks: Adjust File Loading and Commission Calculations

**Input**: Design documents from `/specs/005-adjust-commission-file-loading/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema updates and basic type definitions

- [ ] T001 Update `prisma/schema.prisma` with `fileType` in `FileImport`
- [ ] T002 Update `prisma/schema.prisma` with `bruta`, `neta`, `clawback` fields in `ComissionDistribution`
- [ ] T003 Run `npx prisma migrate dev` to apply schema changes
- [ ] T004 [P] Add `FileType` enum and update `AsyncState` usage in `src/features/pre-liquidacion/types/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for header mapping and recursive hierarchy

- [ ] T005 Create `ExcelMapperService` in `src/features/pre-liquidacion/lib/excel-mapper.ts` with support for Voluntarias vs Polizas headers
- [ ] T006 Implement `HierarchyService` for recursive leader resolution in `src/features/pre-liquidacion/services/hierarchy.service.ts`
- [ ] T007 [P] Create unit test suite for mapping engine in `src/features/pre-liquidacion/__tests__/excel-mapper.test.ts`

---

## Phase 3: Flow 1 - File Upload (Carga) (Priority: P1)

**Goal**: Save raw data, detect type, and normalize currency formats.

**Independent Test**: Upload `Polizas.xlsx`. Verify `FileImport.fileType === 'POLIZAS'`. Check `SettlementCommission.valorComision` is numeric (normalized from "$ (x.xxx)").

- [ ] T008 [P] [US1] Implement header-based `fileType` detection in `src/app/api/carga-archivos/process-batch/route.ts`
- [ ] T009 [US1] Implement currency cleaning utility for Polizas "Valor Comisión" formats in `src/features/pre-liquidacion/lib/excel-mapper.ts`
- [ ] T010 [US1] Update `processAndSaveRecord` to use header mapper and currency cleaner based on detected type
- [ ] T011 [US1] Verify "Carga de Archivos" correctly maps headers and cleans currency for both formats

---

## Phase 4: Flow 2 - User Story 1 (Voluntarias) (Priority: P1) 🎯 MVP

**Goal**: Calculate hierarchical commissions for Voluntarias with 12% discount.

**Independent Test**: Trigger pre-liquidation for a Voluntarias file. Verify Coach (64.19%), Leader (5.502% of Coach), and Agency (4.5% total) with 12% discount.

- [ ] T012 [US1] Implement `CalculationService` factory for Voluntarias logic in `src/features/pre-liquidacion/services/calculation-service.ts`
- [ ] T013 [P] [US1] Implement hierarchical calculation engine for Voluntarias (Coach -> Leader -> Agency)
- [ ] T014 [US1] Update `procesarPreLiquidacion` in `pre-liquidacion.service.ts` to use Step-by-Step distribution logic
- [ ] T015 [US1] Verify Voluntarias distribution values match acceptance scenarios

---

## Phase 6: Flow 2 - User Story 2 (Polizas) (Priority: P1)

**Goal**: Calculate Polizas commissions with origin-based percentages and 10% clawback.

**Independent Test**: Trigger pre-liquidation for `Polizas.xlsx`. Verify Coach (Origin lookup) and verify 10% clawback is subtracted after 12% discount.

- [ ] T016 [US2] Implement origin-based lookup logic in `CalculationService` (Note: Ignore BASE column)
- [ ] T017 [P] [US2] Implement 10% Clawback retention logic for roles in Polizas files
- [ ] T018 [US2] Integrate `Clawback` table retention creation in `pre-liquidacion.service.ts`
- [ ] T019 [US2] Verify Polizas distribution values match acceptance scenarios

---

## Phase 6: Flow 3 - User Story 3 (Claws & Dynamic Hierarchy) (Priority: P2)

**Goal**: Handle return records and reduce reserves.

**Independent Test**: Process a 'claw' record. Verify negative distribution entry and update to the user's reserve balance in the `Clawback` table.

- [ ] T020 [US3] Implement dynamic hierarchy resolution (recursive leader search) in hierarchy service
- [ ] T021 [US3] Implement 'claw' record detection and negative distribution generation
- [ ] T022 [US3] Implement reserve balance update logic (summing RETENIDO state)
- [ ] T023 [US3] Verify "claw" processing and dynamic hierarchy resolution

---

## Phase 7: Polish & UI

- [ ] T024 Update Pre-Liquidation detail UI to display Bruta/Neta/Clawback columns
- [ ] T025 [P] Run all pre-liquidacion tests to ensure zero regressions
- [ ] T026 Final validation and commit of all logic changes
