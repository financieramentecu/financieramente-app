# Tasks: Gestión de Reglas de Comisión

**Feature**: `Manage Commission Rules`
**Status**: Pending
**Source**: [Plan](./plan.md), [Spec](./spec.md)

## Phase 1: Setup & Infrastructure

**Goal**: Prepare database schema and project structure for the new feature.

- [x] T001 Update Prisma schema: Rename `ProductPercentajeCommision` models and add `description` field in `prisma/schema.prisma`
- [x] T002 Update Prisma schema: Rename relations and fields in `Business` and `ProductConfiguration` in `prisma/schema.prisma`
- [x] T003 Run Prisma migration `rename-ppc-models-add-description` and generate client
- [x] T004 Create feature directory structure in `src/features/commission-rules/` (types, lib, mappers, hooks, components, **tests**)

## Phase 2: Foundational

**Goal**: Implement shared types, schemas, and helpers required by all user stories.

- [x] T005 [P] Define domain interfaces in `src/features/commission-rules/types/commission-rule.types.ts`
- [x] T006 [P] Create mock data fixtures in `src/features/commission-rules/__tests__/fixtures/mock-commission-rule.ts`
- [x] T007 [P] Implement Zod schemas (`createCommissionRuleSchema`, `updateCommissionRuleSchema`) in `src/features/commission-rules/lib/commission-rule-schemas.ts`
- [x] T008 [P] Add unit tests for Zod schemas in `src/features/commission-rules/__tests__/lib/commission-rule-schemas.test.ts`
- [x] T009 [P] Implement Prisma-to-Domain mappers in `src/features/commission-rules/mappers/commission-rule.mapper.ts`
- [x] T010 [P] Add unit tests for mappers in `src/features/commission-rules/__tests__/mappers/commission-rule.mapper.test.ts`
- [x] T011 Update existing code references in `src/features/product-configuration/` to use new Prisma model names
- [x] T012 Update existing code references in `src/features/negocios/` to use new Prisma model names

## Phase 3: User Story 1 - Manage Commission Rules (P1)

**Goal**: CRUD (List, Create, Toggle, Get, Update) for Commission Rules.
**Independent Test**: Can create, list, and toggle rules via UI.

- [x] T013 [US1] Create API client wrappers in `src/features/commission-rules/lib/commission-rule-api.ts`
- [x] T014 [US1] Implement GET/POST API route in `src/app/api/product-configurations/[id]/commission-rules/route.ts`
- [x] T015 [US1] Implement GET/PUT/PATCH API route in `src/app/api/product-configurations/[id]/commission-rules/[ruleId]/route.ts`
- [x] T016 [US1] Implement `useCommissionRules` (list) hook in `src/features/commission-rules/hooks/use-commission-rules.ts`
- [x] T017 [US1] Implement `useCommissionRule` (single) hook in `src/features/commission-rules/hooks/use-commission-rule.ts`
- [x] T018 [US1] Implement `useCommissionRuleMutations` hook in `src/features/commission-rules/hooks/use-commission-rule-mutations.ts`
- [x] T019 [US1] Create `CommissionRulesTable` component in `src/features/commission-rules/components/commission-rules-table.tsx`
- [x] T020 [US1] Implement List Page in `src/app/dashboard/configuraciones-producto/[id]/reglas/page.tsx`
- [x] T021 [US1] Create `CommissionRuleForm` component (Basic Metadata) in `src/features/commission-rules/components/commission-rule-form.tsx`
- [x] T022 [US1] Implement Create Page in `src/app/dashboard/configuraciones-producto/[id]/reglas/crear/page.tsx`
- [x] T023 [US1] Implement Edit Page in `src/app/dashboard/configuraciones-producto/[id]/reglas/editar/[ruleId]/page.tsx`
- [ ] T024 [P] [US1] Add integration tests for API routes in `src/features/commission-rules/__tests__/lib/commission-rule-api.test.ts`

## Phase 4: User Story 2 - Configure Category Distribution (P1)

**Goal**: Add aggregation UI for categories and store percentage distributions.
**Independent Test**: Can add/remove categories and percentages to a rule.

- [ ] T025 [US2] Create column schemas for Category Lines in `src/features/commission-rules/lib/commission-rule-schemas.ts`
- [ ] T026 [US2] Create `CategoryPercentageRow` component in `src/features/commission-rules/components/category-percentage-row.tsx`
- [ ] T027 [US2] Update `CommissionRuleForm` to include dynamic categories list (useFieldArray)
- [ ] T028 [US2] Update POST/PUT API logic to handle `productPercentageCommissionCategories` transactionally
- [ ] T029 [US2] Add validation logic: No duplicate categories, valid percentages
- [ ] T030 [P] [US2] Add unit tests for Form validation logic

## Phase 5: User Story 3 - List Configurations & Assign Default (P2)

**Goal**: Navigate from Config list and assign a default rule for new businesses.
**Independent Test**: Can navigate from Config list to Rules list; can set a rule as default.

- [ ] T031 [US3] Update `ProductConfigurationsTable` to add "Gestionar Reglas" action in `src/features/product-configuration/components/product-configurations-table.tsx`
- [ ] T032 [US3] Implement POST API for assignment in `src/app/api/product-configurations/[id]/commission-rules/[ruleId]/assign-new-businesses/route.ts`
- [ ] T033 [US3] Add "Assign as Default" button/action in `CommissionRulesTable`
- [ ] T034 [US3] Connect button to `useCommissionRuleMutations` assignment mutation
- [ ] T035 [P] [US3] Add integration test for assignment endpoint

## Phase 6: Polish & Cross-Cutting

**Goal**: Ensure robust error handling, loading states, and UX details.

- [ ] T036 Implement `CommissionRuleFormSkeleton` loading state
- [ ] T037 Add specific error handling for "Deactivation Blocked" (Business Association)
- [ ] T038 Add specific error handling for "Impact Warning" on Edit
- [ ] T039 Verify all UI inputs handle percentage conversion correctly (Whole Number <-> Fraction)
- [ ] T040 Final E2E smoke test with Playwright (create config -> create rule -> assign category -> assign default)

## Dependencies

- Phase 2 must be completed before Phase 3, 4, 5.
- Phase 3 (Basic Rules) must be completed before Phase 4 (Categories) can be fully verified end-to-end, though P-tagged tasks can start earlier.
- Phase 1 (Schema) allows parallel work on Phase 2 (Types/Schemas).

## Implementation Strategy

1.  **Foundational First**: We will secure the database schema and domain types first.
2.  **Vertical Slice (Basic Rule)**: We will implement the ability to create a "shell" rule (description only) to prove the flow.
3.  **Complex Logic (Categories)**: We will then add the complex aggregation logic for categories.
4.  **Integration**: Finally, we perform the deep integration with Product Configuration (Default assignment).
