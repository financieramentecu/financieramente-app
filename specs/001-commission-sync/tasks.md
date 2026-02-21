# Tasks: Commission Sync & Pre-liquidation

**Input**: Design documents from `/specs/001-commission-sync/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create file type constants and header maps in `src/app/dashboard/carga-archivos/lib/file-types.ts`
- [x] T002 [P] Add shared helpers for header normalization in `src/app/dashboard/carga-archivos/lib/header-utils.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 Update data model and mappings in `prisma/schema.prisma` (commission renames, new columns, removed legacy fields)
- [x] T004 Create migration in `prisma/migrations/<timestamp>_commission_sync/` reflecting schema changes
- [x] T005 [P] Extend audit actions and details support in `src/features/auth/lib/audit-logger.ts` (add import error action)
- [x] T006 [P] Implement robust numeric parsing in `src/app/dashboard/carga-archivos/lib/number-utils.ts` (currency symbols, thousands, parentheses)
- [x] T007 Update clawback ownership and balance models in `prisma/schema.prisma` (Clawback id_user, ClawbackBalance table)
- [x] T008 Create migration in `prisma/migrations/<timestamp>_clawback_owner_balance/` for new clawback fields
- [x] T029 Validate user existence before creating FileImport in `src/app/api/carga-archivos/file-import/route.ts` to avoid FK `file_import_id_user_fkey`
- [x] T030 Fix user detail include to remove invalid `categoria` relation in `src/app/api/admin/users/[id]/route.ts` (Unknown field 'categoria' error)

**Checkpoint**: Schema and shared utilities ready; user story work can begin.

---

## Phase 3: User Story 1 - Cargar archivo por tipo (Priority: P1) 🎯 MVP

**Goal**: Permitir selección del tipo de archivo y validar headers por tipo antes de procesar.

**Independent Test**: Carga POLIZA y VOLUNTARIA con headers correctos/incorrectos y verifica aceptación/rechazo.

### Tests for User Story 1

- [x] T009 [P] [US1] Add header validation tests in `src/app/dashboard/carga-archivos/lib/__tests__/validate-excel-structure.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Update header validation to accept fileType in `src/app/dashboard/carga-archivos/lib/validate-excel-structure.ts`
- [x] T011 [US1] Update file parsing to require columns by type in `src/app/dashboard/carga-archivos/lib/process-excel-file.ts`
- [x] T012 [US1] Add file type selector and wire requests in `src/app/dashboard/carga-archivos/components/CargarArchivoTab.tsx`
- [x] T013 [US1] Require `fileType` in create import API in `src/app/api/carga-archivos/file-import/route.ts`
- [x] T014 [US1] Accept `fileType` in batch API request shape in `src/app/api/carga-archivos/process-batch/route.ts`

**Checkpoint**: Upload works for both types with header validation.

---

## Phase 4: User Story 2 - Sincronizar registros y estados (Priority: P2)

**Goal**: Mantener estados/contadores y aplicar parsing/errores/auditoría por registro.

**Independent Test**: Procesar registros con negocio/no negocio, fechas válidas/invalidas y valores monetarios formateados.

### Tests for User Story 2

- [x] T015 [P] [US2] Add numeric parsing tests in `src/app/dashboard/carga-archivos/lib/__tests__/number-utils.test.ts`
- [x] T016 [P] [US2] Add batch processing error/audit tests in `src/app/api/carga-archivos/process-batch/__tests__/route.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Apply currency parsing/validation in `src/app/dashboard/carga-archivos/lib/process-excel-file.ts`
- [x] T018 [US2] Implement mapping by fileType and lag rules in `src/app/api/carga-archivos/process-batch/route.ts`
- [x] T019 [US2] Add audit logging for invalid numeric values in `src/app/api/carga-archivos/process-batch/route.ts`
- [x] T020 [US2] Load CommissionConfiguration (or defaults 12%/10%) and store snapshots in `src/app/api/carga-archivos/process-batch/route.ts`
- [x] T021 [US2] Persist POLIZA-specific fields (`origin_commission`, `clawback_percentage`, `descripcion`) in `src/app/api/carga-archivos/process-batch/route.ts`

**Checkpoint**: Sync states/contadores preservados y errores auditados por fila.

---

## Phase 5: User Story 3 - Pre-liquidar con nuevas reglas (Priority: P3)

**Goal**: Calcular distribuciones con base_commission y porcentajes según origen (CARTERA vs distribución).

**Independent Test**: Pre-liquidar un archivo con POLIZA y VOLUNTARIA y validar cálculo.

### Tests for User Story 3

- [x] T022 [P] [US3] Update pre-liquidation calculation tests in `src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts`

### Implementation for User Story 3

- [x] T023 [US3] Update formulas to use base_commission and snapshots in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`
- [x] T024 [US3] Use porcentaje_portfolio when `origin_commission = CARTERA` in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`
- [x] T025 [US3] Replace `fechaPago` range filter with a supported field (e.g., `createdAt`) in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`
- [x] T026 [US3] Update Prisma model usages after commission renames in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`

**Checkpoint**: Pre-liquidación correcta con reglas nuevas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T027 [P] Update docs references in `docs/sync-preliquidacion-flow.md` if needed
- [ ] T028 [P] Run quickstart validation steps in `specs/001-commission-sync/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → User Stories (US1 → US2 → US3) → Polish
- US1 depends on Phase 2 (schema/utilities available)
- US2 depends on US1 API shape (fileType in requests)
- US3 depends on schema changes from Phase 2 and sync changes from US2

## Parallel Opportunities

- T002, T005, T006 can run in parallel during Phase 1/2
- Tests (T009, T015, T016, T022) can run in parallel with implementation after shared utilities exist
- Doc updates (T027) can be done in parallel late in the cycle
