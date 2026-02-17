# Tasks: Adjust File Loading and Commission Calculations

**Input**: Design documents from `/specs/005-adjust-commission-file-loading/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema updates and basic type definitions

- [ ] T001 Update `prisma/schema.prisma` with `fileType` in `FileImport` and role/type fields in `ComissionDistribution`
- [ ] T002 Run `npx prisma migrate dev` to apply schema changes
- [ ] T003 [P] Add `FileType` enum and update `AsyncState` usage in `src/features/pre-liquidacion/types/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core calculation logic and row validation

- [ ] T004 Update row validation schema in `src/features/pre-liquidacion/lib/pre-liquidacion-schemas.ts` to include `idBusiness` and `valorComision`
- [ ] T005 Create `CommissionCalculationService` factory in `src/features/pre-liquidacion/services/calculation-service.ts`
- [ ] T006 Implement base percentage lookup helper in `src/features/negocios/services/product-configuration.service.ts`
- [ ] T007 [P] Create unit test suite for calculation engine in `src/features/pre-liquidacion/__tests__/calculation-service.test.ts`

---

## Phase 3: User Story 1 - Import Voluntarias File (Priority: P1) 🎯 MVP

**Goal**: Import "Voluntarias" files and calculate hierarchical commissions (Coach, Leader, Agency) with a 12% tax discount.

**Independent Test**: Upload file named `VOLUNTARIAS_test.xlsx`, verify `pre-liquidacion/detalles` returns Coach (64.19%), Leader (5.502% of Coach Bruta), Agency (4.5% of total), all with 12% discount applied to Bruta.

- [ ] T008 [US1] Implement filename-based `fileType` detection in `src/app/api/carga-archivos/process-batch/route.ts`
- [ ] T010 [US1] Implement hierarchical calculation engine for Voluntarias in `src/features/pre-liquidacion/services/calculation-service.ts`
- [ ] T011 [US1] Implement `procesarPreLiquidacion` logic for Voluntarias in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`
- [ ] T012 [US1] Verify Voluntarias import flow and hierarchy calculations

---

## Phase 4: User Story 2 - Import Polizas File with Origin Logic (Priority: P1)

**Goal**: Import "Polizas" files with origin-based Coach percentages and 10% Clawback retention.

**Independent Test**: Upload file named `POLIZAS_test.xlsx` with a "Propio" record, verify Coach (77.9449%) and verify 10% Clawback is subtracted after the 12% tax discount.

- [ ] T013 [US2] Implement origin-based lookup logic in `src/features/pre-liquidacion/services/calculation-service.ts`
- [ ] T014 [US2] Implement 10% Clawback retention logic for Polizas in the calculation engine
- [ ] T015 [US2] Integrate `Clawback` table record creation in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`
- [ ] T016 [US2] Verify Polizas import flow with origin-specific percentages and retentions

---

## Phase 5: User Story 3 - Dynamic Hierarchy & Claw Variations (Priority: P2)

**Goal**: Handle "claw" records to reduce reserves and support dynamic hierarchy levels (skipping missing leaders).

**Independent Test**: Upload record with `Tipo Comisión` = 'claw', verify negative distribution entry and reduction in user's virtual reserve balance.

- [ ] T017 [US3] Implement dynamic hierarchy resolution (recursive leader search) in calculation service
- [ ] T018 [US3] Implement "claw" record handling (negative value generation) in `src/features/pre-liquidacion/services/calculation-service.ts`
- [ ] T019 [US3] Verify "claw" processing and dynamic hierarchy resolution edge cases

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T020 Update pre-liquidation preview UI to display Bruta/Neta/Clawback columns in `src/features/pre-liquidacion/components/`
- [ ] T021 [P] Run all pre-liquidation tests to ensure zero regressions
- [ ] T022 Final E2E validation with provided Excel example datasets

---

## Dependencies & Execution Order

1. **Phase 1 -> Phase 2**: Database and types must exist before calculation logic.
2. **Phase 2 -> Phase 3**: Calculation engine must exist before Voluntarias story.
3. **Phase 3 -> Phase 4**: Polizas story integrates with base engine but adds origin/clawback logic.
4. **Phase 4 -> Phase 5**: Claw records and dynamic hierarchy build on the base engine handlers.
5. **Phase 6**: UI and cleanup after all logic is verified.

## Parallel Execution Examples

```bash
# Foundational tests and types
Task: "T003 Add FileType enum and update AsyncState usage"
Task: "T007 Create unit test suite for calculation engine"

# Calculation engine components (different files)
Task: "T006 Implement base percentage lookup helper"
Task: "T005 Create CommissionCalculationService factory"
```

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Schema & Types (Phase 1)
2. Calculation Engine Base (Phase 2)
3. Voluntarias Logic (Phase 3)
4. **MVP Check**: Verify Voluntarias import works as per user screenshot logic.
