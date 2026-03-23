---
description: 'Task list for Product Configuration Management'
---

# Tasks: Product Configuration Management

**Input**: Design documents from `/specs/001-product-config-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are MANDATORY (Constitution: Min 80% coverage for business logic).

**Organization**: Tasks are grouped by user story + Security & Refactoring Phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: [US1], [US2], [US3], [US4]

## Phase 1: Setup & Data Model

**Purpose**: Database migration and feature structure initialization.

- [x] T001 Run database migration to update ProductConfiguration constraints in `prisma/migrations/`
- [x] T002 [P] Create feature directory structure `src/features/product-configuration/`
- [x] T003 [P] Create pages directory structure `src/app/dashboard/configuraciones-producto/`
- [x] T004 [P] Create E2E test directory structure `e2e/product-config/`

---

## Phase 2: Foundational & Security (Blocking)

**Purpose**: Core types, schemas, and CRITICAL security fixes (missing company validation).

- [x] T005 [P] Create domain types in `src/features/product-configuration/types/product-configuration.types.ts`
- [x] T006 **[CRITICAL]** Update `CreateProductConfigurationInput` with `idCompany` in `src/features/product-configuration/types/product-configuration.types.ts`
- [x] T007 **[CRITICAL]** Update `createProductConfigurationSchema` with `idCompany` validation in `src/features/product-configuration/lib/product-configuration-schemas.ts`
- [x] T008 [P] Create code generation utility in `src/features/negocios/lib/product-configuration-code.ts`
- [x] T009 [P] Create mapper for ProductConfiguration in `src/features/product-configuration/mappers/product-configuration.mapper.ts`

**Checkpoint**: Security gap closed in schemas/types.

---

## Phase 3: User Story 1 - Crear Configuración (Priority: P1)

**Goal**: Create config with company-product validation.

**Refactoring Mandate**:

1. API Route MUST return `ApiResponse<T>`.
2. Form Component MUST be Presentational. Logic in `useProductConfigurationForm`.
3. Hook MUST use `AsyncState<T>`.

### Tests for US1

- [x] T010 [P] [US1] Integration test for POST API (validating company-product match)
- [x] T011 [P] [US1] E2E test for create flow

### Implementation for US1

- [x] T012 [US1] **Refactor** POST /api/product-configurations to validate `idCompany` vs `product.idCompany` and return `ApiResponse` in `src/app/api/product-configurations/route.ts`
- [x] T013 [P] [US1] Create `useProductConfigurationForm` hook (AsyncState + Submit Logic) in `src/features/product-configuration/hooks/use-product-configuration-form.ts`
- [x] T014 [US1] **Refactor** `ProductConfigurationForm` to use hook (remove internal state/fetch) in `src/features/product-configuration/components/product-configuration-form.tsx`
- [x] T015 [US1] **Refactor** `ProductConfigurationCreateClient` to use hook if needed in `src/features/product-configuration/components/product-configuration-create-client.tsx`

---

## Phase 4: User Story 2 - Consultar (Priority: P2)

**Goal**: List with filters.

**Refactoring Mandate**:

1. API Route MUST return `ApiResponse<T>`.
2. List Component MUST be Presentational. Logic in `useProductConfigurations`.
3. Hook MUST use `AsyncState<T>`.

### Tests for US2

- [x] T016 [P] [US2] Integration test for GET API (filters)
- [ ] T017 [P] [US2] E2E test for list/search

### Implementation for US2

- [x] T018 [US2] **Refactor** GET /api/product-configurations to return `ApiResponse` in `src/app/api/product-configurations/route.ts`
- [x] T019 [P] [US2] Create `useProductConfigurations` hook (AsyncState + Fetch + Filter Logic) in `src/features/product-configuration/hooks/use-product-configurations.ts`
- [x] T020 [US2] **Refactor** `ProductConfigurationsTable` to use hook (remove internal state/fetch) in `src/features/product-configuration/components/product-configurations-table.tsx`
- [x] T021 [P] [US2] Update `ProductConfigurationsPageClient` in `src/features/product-configuration/components/product-configurations-page-client.tsx`

---

## Phase 5: User Story 3 - Actualizar (Priority: P3)

**Goal**: Update PPC reference.

### Tests for US3

- [x] T022 [P] [US3] Integration test for PUT API
- [x] T023 [P] [US3] E2E test for update flow

### Implementation for US3

- [x] T024 [US3] **Refactor** PUT /api/product-configurations/[id] to return `ApiResponse` in `src/app/api/product-configurations/[id]/route.ts`
- [x] T025 [US3] **Refactor** GET /api/product-configurations/[id]/ppcs to return `ApiResponse` in `src/app/api/product-configurations/[id]/ppcs/route.ts`
- [x] T026 [P] [US3] Update `useProductConfigurationForm` to handle Edit mode logic (fetch initial data, update mutation)

---

## Phase 6: User Story 4 - Inactivar (Priority: P4)

**Goal**: Toggle active status.

### Tests for US4

- [x] T027 [P] [US4] Integration test for PATCH API
- [x] T028 [P] [US4] E2E test for toggle

### Implementation for US4

- [x] T029 [US4] **Refactor** PATCH /api/product-configurations/[id] to return `ApiResponse` in `src/app/api/product-configurations/[id]/route.ts`
- [x] T030 [US4] Create `useProductConfigurationMutations` hook (Toggle logic) or add to existing hook in `src/features/product-configuration/hooks/use-product-configuration-mutations.ts`
- [x] T031 [US4] Connect Toggle logic to Table component

---

## Phase 7: Polish & Documentation

- [x] T032 [P] Verify 80% test coverage `npm run test:coverage`
- [x] T033 [P] Run linter `npm run lint`
- [x] T034 [P] Create README in `src/features/product-configuration/README.md`
