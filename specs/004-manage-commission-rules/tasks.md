# Tasks: Distribución de Comisión

**Feature**: `Manage Commission Rules`
**Status**: In Progress
**Source**: [Plan](./plan.md), [Spec](./spec.md)

## Phase 1: Database & Domain Setup

**Goal**: Prepare database schema and project structure for the new feature.

- [x] T001 [US1] Rename Prisma models in `schema.prisma` (`ProductPercentageCommission`) and add `description` field in `prisma/schema.prisma`
- [x] T002 [US1] Update Prisma schema: Rename relations and fields in `Business` and `ProductConfiguration`
- [x] T003 [US1] Run Prisma migration `rename-ppc-models-add-description` and generate client
- [x] T004 [US1] Create feature directory structure in `src/features/distribution-commission` (types, lib, mappers, hooks, components, tests)
- [x] T005 [P] [US1] Define domain interfaces in `src/features/distribution-commission/types/commission-rule.types.ts`
- [x] T006 [P] [US1] Create mock data fixtures in `src/features/distribution-commission/__tests__/fixtures/mock-commission-rule.ts`
- [x] T007 [P] [US1] Implement Zod schemas (`createCommissionRuleSchema`, `updateCommissionRuleSchema`) in `src/features/distribution-commission/lib/commission-rule-schemas.ts`
- [x] T008 [P] [US1] Add unit tests for Zod schemas in `src/features/distribution-commission/__tests__/lib/commission-rule-schemas.test.ts`
- [x] T009 [P] [US1] Implement Prisma-to-Domain mappers in `src/features/distribution-commission/mappers/commission-rule.mapper.ts`
- [x] T010 [P] [US1] Add unit tests for mappers in `src/features/distribution-commission/__tests__/mappers/commission-rule.mapper.test.ts`
- [x] T011 [US1] Update existing code references in `src/features/product-configuration/` to use new Prisma model names
- [x] T012 [US1] Update existing code references in `src/features/negocios/` to use new Prisma model names

## Phase 2: API Implementation

**Goal**: Implement CRUD API endpoints for Commission Rules.

- [x] T013 [US1] Create API client wrappers in `src/features/distribution-commission/lib/commission-rule-api.ts`
- [x] T014 [US2] Implement `GET /api/.../distribution-commission/route.ts` (list)
- [x] T015 [US2] Implement `POST /api/.../distribution-commission/route.ts` (create)
- [x] T016 [US2] Implement `GET /api/.../distribution-commission/[ruleId]/route.ts` (details)
- [x] T017 [US2] Implement `PUT /api/.../distribution-commission/[ruleId]/route.ts` (update)
- [x] T018 [US2] Implement `PATCH /api/.../distribution-commission/[ruleId]/route.ts` (toggle active)
- [x] T019 [US3] Implement `POST /api/.../assign-new-businesses/route.ts` (assign default)
- [ ] T020 [P] [US1] Add integration tests for API routes in `src/features/distribution-commission/__tests__/lib/commission-rule-api.test.ts`

## Phase 3: UI Implementation

**Goal**: Implement User Interface components and pages for managing rules.

- [x] T021 [US4] Create `useCommissionRules` (list) hook in `src/features/distribution-commission/hooks/use-commission-rules.ts`
- [x] T022 [US4] Create `useCommissionRule` (single) hook in `src/features/distribution-commission/hooks/use-commission-rule.ts`
- [x] T023 [US4] Create `useCommissionRuleMutations` hook in `src/features/distribution-commission/hooks/use-commission-rule-mutations.ts`
- [x] T024 [US4] Create `CommissionRulesTable` component in `src/features/distribution-commission/components/commission-rules-table.tsx`
- [x] T025 [US4] Implement List Page in `src/app/dashboard/distribucion-comisiones/[id]/reglas/page.tsx`
- [x] T026 [US4] Create `CommissionRuleForm` component (Basic Metadata) in `src/features/distribution-commission/components/commission-rule-form.tsx`
- [x] T027 [US4] Implement Create Page in `src/app/dashboard/distribucion-comisiones/[id]/reglas/crear/page.tsx`
- [x] T028 [US4] Implement Edit Page in `src/app/dashboard/distribucion-comisiones/[id]/reglas/editar/[ruleId]/page.tsx`
- [x] T029 [US2] Create column schemas for Category Lines in `src/features/distribution-commission/lib/commission-rule-schemas.ts`
- [x] T030 [US2] Create `CategoryPercentageRow` component in `src/features/distribution-commission/components/category-percentage-row.tsx`
- [x] T031 [US2] Update `CommissionRuleForm` to include dynamic categories list (useFieldArray)
- [x] T032 [US2] Update POST/PUT API logic to handle `productPercentageCommissionCategories` transactionally
- [x] T033 [US2] Add validation logic: No duplicate categories, valid percentages
- [x] T034 [P] [US2] Add unit tests for Form validation logic

## Phase 4: Integration & Polish

**Goal**: Connect to Product Configuration list and ensure robust UX.

- [x] T035 [US3] Update `ProductConfigurationsTable` to add "Gestionar Distribución" action in `src/features/product-configuration/components/product-configurations-table.tsx`
- [x] T036 [US3] Add "Assign as Default" button/action in `CommissionRulesTable`
- [x] T037 [US3] Connect button to `useCommissionRuleMutations` assignment mutation
- [x] T038 [P] [US3] Add integration test for assignment endpoint
- [x] T039 [US3] Add "Distribución de comisión" sidebar item in `src/features/shared/layout/menu-items.tsx`
- [x] T040 Implement `CommissionRuleFormSkeleton` loading state
- [x] T041 Add specific error handling for "Deactivation Blocked" (Business Association)
- [x] T042 Add specific error handling for "Impact Warning" on Edit
- [x] T043 Verify all UI inputs handle percentage conversion correctly (Whole Number <-> Fraction)

## Phase 5: Refactoring & Cleanup (Renaming & Fixes)

**Goal**: Finalize renaming to "Distribution Commission" and fix layout/import issues.

- [x] T044 **Refactor**: Rename `src/features/commission-rules` directory to `src/features/distribution-commission`
- [x] T045 **Refactor**: Fix import paths in API routes to use `features/distribution-commission`
- [x] T046 **Refactor**: Rename UI terms from "Regla" to "Distribución de Comisión" in all components
- [x] T047 **Refactor**: Ensure all dashboard pages (`list`, `create`, `edit`) use `DashboardLayout` wrapper
- [x] T048 **Fix**: `useCommissionRules` hook error handling for null error responses

## Phase 6: Refactoring & Updates (Round 2)

**Goal**: Polish UI/UX and fix bugs based on user feedback.

- [x] T053 Remove "Distribución de comisión" from sidebar in `src/features/shared/layout/menu-items.tsx`
- [x] T054 Rename action "Gestionar Distribución" to "Configuración comisión" and style as button in `src/features/product-configuration/components/product-configurations-table.tsx`
- [x] T055 Display categories as Chips/Badges in `src/features/distribution-commission/components/commission-rules-table.tsx`
- [x] T056 Rename "Predeterminada" label to "Nuevos negocios" in `src/features/distribution-commission/components/commission-rules-table.tsx`
- [x] T057 Fix errors when creating/editing percentages (ensure proper type conversion)
- [x] T058 Fix errors when creating/editing the distribution rule itself

## Phase 8: Bug Fix - Toast Error on Save

**Goal**: Ensure generic success toast appears correctly by fixing API response structure.

- [x] T059 Remove `error: null` from API success responses in `src/app/api/product-configurations/[id]/distribution-commission/route.ts`
- [x] T060 Remove `error: null` from API success responses in `src/app/api/product-configurations/[id]/distribution-commission/[ruleId]/route.ts`
- [x] T061 Update `useCommissionRuleMutations` in `src/features/distribution-commission/hooks/use-commission-rule-mutations.ts` to check `response.error` truthiness
- [x] T062 Remove `error: null` from API success responses in `src/app/api/product-configurations/[id]/distribution-commission/[ruleId]/assign-new-businesses/route.ts`
- [x] T063 Verify/Implement immediate UI update for Assign Default (optimistic or router.refresh)
- [x] T064 Remove `error: null` from `GET` success response in `src/app/api/product-configurations/[id]/distribution-commission/[ruleId]/route.ts`

## Phase 7: Verification

**Goal**: Verify implementation end-to-end.

- [ ] T049 Final Unit Tests run for mappers and schemas `src/features/distribution-commission/__tests__/`
- [ ] T050 Verify Manual Flows: Create Distribution -> Add Categories -> Save -> Edit -> Assign Default -> Toggle Active
- [ ] T051 Check sidebar navigation and breadcrumbs consistency
- [ ] T052 Final E2E smoke test with Playwright

## Phase 9: UI Refinements (Edit Page)

**Goal**: Implement user-requested UI changes for better clarity.

- [x] T065 [US4] Rename "Comisión de Porcentaje" section to "Distribución de comisión" in `src/features/product-configuration/components/product-configuration-form.tsx`
- [x] T066 [US4] Update "Assign Default" select label to "Seleccione la distribución de comisión" in `src/features/product-configuration/components/product-configuration-form.tsx`
- [x] T067 [US4] Update "Assign Default" select options to display full description in `src/features/product-configuration/components/product-configuration-form.tsx`

## Phase 10: UI Detail Improvements & Bug Fixes

**Goal**: Implement requested UI refinements and fix data loading bug.

- [x] T068 [US4] UI Update: Rename page title to "Configuración del producto" and add Product Code to subtitle in `src/app/dashboard/distribucion-comisiones/[id]/reglas/page.tsx`
- [x] T069 [US4] UI Update: Rename section title "Distribuciones Registradas" to "Distribución de comisión" in `src/app/dashboard/distribucion-comisiones/[id]/reglas/page.tsx`
- [x] T070 [Bug] Investigate and fix missing commission percentages (categories) in `CommissionRulesTable` and/or List API Endpoint
- [x] T071 [Bug] Detalle de distribución: al cargar la lista de comisiones por categoría aparece `Error: null`. Investigar causa y corregir el flujo de error/success.

## Phase 11: UI Update Product Configuration Table

**Goal**: Show default distribution for new businesses in `/configuraciones-producto` table with improved visibility.

- [x] T072 Update product configuration list API to include default distribution description for new businesses in `src/app/api/product-configurations/route.ts`
- [x] T073 Update product configuration types to include new businesses distribution description in `src/features/product-configuration/types/product-configuration.types.ts`
- [x] T074 Update product configuration mapper to map default distribution description in `src/features/product-configuration/mappers/product-configuration.mapper.ts`
- [x] T075 Add "Distribución nuevos negocios" column with toggle-style visibility to Product Configurations table in `src/features/product-configuration/components/product-configurations-table.tsx`

## Phase 12: Fix Assign New Businesses Refresh

**Goal**: Ensure assigning "Nuevos negocios" refreshes the list immediately without manual reload.

- [x] T076 Update assignment mutation to trigger UI refresh (router.refresh or query invalidation) in `src/features/distribution-commission/hooks/use-commission-rule-mutations.ts`
- [x] T077 Ensure list page reflects updated default assignment after mutation in `src/features/distribution-commission/components/commission-rules-table.tsx`
- [x] T078 Add/adjust tests for immediate UI update after assignment in `src/features/distribution-commission/__tests__/components/commission-rules-table.test.tsx`
