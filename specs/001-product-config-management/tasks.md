# Tasks: Administración de Configuración de Producto

**Input**: Design documents from `/specs/001-product-config-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Included — the plan specifies unit tests for all modules (schemas, API client, mapper, hooks, components).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration, types, schemas, mapper, and API client — shared foundation for all user stories.

- [x] T001 Add `active` field to ProductConfiguration model in `prisma/schema.prisma`
- [x] T002 Run Prisma migration: `npx prisma migrate dev --name add-active-to-product-configuration`
- [x] T003 Run `npx prisma generate` to regenerate client types
- [x] T004 Update mock fixture `src/features/negocios/__tests__/fixtures/mock-prisma-business.ts` to include `active: true` in productConfiguration
- [x] T005 [P] Create types in `src/features/product-configuration/types/product-configuration.types.ts` (ProductConfiguration, CreateProductConfigurationInput, UpdateProductConfigurationInput, ProductConfigurationFilters, ProductConfigurationListResponse)
- [x] T006 [P] Create Zod schemas in `src/features/product-configuration/lib/product-configuration-schemas.ts` (createProductConfigurationSchema, updateProductConfigurationSchema)
- [x] T007 [P] Create mapper in `src/features/product-configuration/mappers/product-configuration.mapper.ts` (prismaProductConfigToProductConfig, prismaProductConfigListToProductConfigs)
- [x] T008 Create API client in `src/features/product-configuration/lib/product-configuration-api.ts` (getProductConfigurations, getProductConfiguration, createProductConfiguration, updateProductConfiguration, toggleActive)
- [x] T009 [P] Create test fixtures in `src/features/product-configuration/__tests__/fixtures/mock-product-configuration.ts` (createMockProductConfiguration, createMockProductConfigurationListResponse, createMockPrismaProductConfiguration)

**Checkpoint**: Shared infrastructure ready — types, schemas, mapper, API client, and test fixtures all in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Hooks and shared test infrastructure that ALL user stories depend on.

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete.

- [x] T010 Create hook `src/features/product-configuration/hooks/use-product-configurations.ts` (list with pagination, search, active filter)
- [x] T011 [P] Create hook `src/features/product-configuration/hooks/use-product-configuration.ts` (single fetch by id)
- [x] T012 [P] Create hook `src/features/product-configuration/hooks/use-product-configuration-mutations.ts` (create, update, toggleActive with independent AsyncState)
- [x] T013 [P] Create schema tests in `src/features/product-configuration/__tests__/lib/product-configuration-schemas.test.ts`
- [x] T014 [P] Create API client tests in `src/features/product-configuration/__tests__/lib/product-configuration-api.test.ts`
- [x] T015 [P] Create mapper tests in `src/features/product-configuration/__tests__/mappers/product-configuration.mapper.test.ts`
- [x] T016 [P] Create hook tests in `src/features/product-configuration/__tests__/hooks/use-product-configurations.test.ts`
- [x] T017 [P] Create hook tests in `src/features/product-configuration/__tests__/hooks/use-product-configuration.test.ts`
- [x] T018 [P] Create hook tests in `src/features/product-configuration/__tests__/hooks/use-product-configuration-mutations.test.ts`

**Checkpoint**: Foundation ready — hooks and their tests complete. User story implementation can now begin.

---

## Phase 3: User Story 1 — Crear Configuración de Producto (Priority: P1) 🎯 MVP

**Goal**: Administrators can create a product configuration by selecting a product, client origin, and category. The system auto-generates the identifier code (`PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME`), auto-creates a PPC in a single transaction, and validates uniqueness, active status, and code length.

**Independent Test**: Create a configuration with existing active product/origin/category, verify code generation, PPC auto-creation, and that duplicates are rejected with 409.

### Tests for User Story 1

- [x] T019 [P] [US1] Create component tests in `src/features/product-configuration/__tests__/components/product-configuration-form.test.tsx` — create mode tests (form title, selects, submit button, loading state, cancel button)

### Implementation for User Story 1

- [x] T020 [US1] Create API route POST in `src/app/api/product-configurations/route.ts` — validate body with Zod schema, check product/origin/category exist and are active, check uniqueness (409), generate code via `buildProductConfigurationCode()`, validate code ≤ 50 chars, execute `prisma.$transaction()` (create config → create PPC → update config with PPC ref), re-fetch with includes, return 201
- [x] T021 [P] [US1] Create form component `src/features/product-configuration/components/product-configuration-form.tsx` — create mode with cascading selects: Company→Product (filtered by company, active only), ClientOrigin (active only), Category (active only), submit "Crear Configuración"
- [x] T022 [US1] Create client component `src/features/product-configuration/components/product-configuration-create-client.tsx` — renders form in create mode, POST on submit, toast notifications, navigate to list on success
- [x] T023 [US1] Create server page `src/app/dashboard/configuraciones-producto/crear/page.tsx` — auth() check + DashboardLayout + ProductConfigurationCreateClient

**Checkpoint**: User Story 1 complete — can create product configurations with auto-generated code and PPC.

---

## Phase 4: User Story 2 — Consultar y Buscar Configuraciones de Producto (Priority: P2)

**Goal**: Administrators can view a paginated list of all configurations (active/inactive) with search by code/product/origin/category and filter by active status.

**Independent Test**: Access the list, verify columns (code, product, company, origin, category, status badge), search filters results, pagination works with >10 items.

### Tests for User Story 2

- [x] T024 [P] [US2] Create component tests in `src/features/product-configuration/__tests__/components/product-configurations-table.test.tsx` — header, create button, columns rendering (code, product, company, origin, category), active/inactive badges, multiple configs, search placeholder

### Implementation for User Story 2

- [x] T025 [US2] Create API route GET in `src/app/api/product-configurations/route.ts` — search across code, product.name, clientOrigin.name, category.name (case-insensitive OR), filter by active, pagination, include product→company/clientOrigin/category/ppc, use mapper
- [x] T026 [P] [US2] Create table component `src/features/product-configuration/components/product-configurations-table.tsx` — columns: Código, Producto, Compañía, Origen, Categoría, Estado (Badge), Acciones (edit, toggle); search placeholder; status filter Select (Todos/Activo/Inactivo); pagination
- [x] T027 [US2] Create client component `src/features/product-configuration/components/product-configurations-page-client.tsx` — debounced search (500ms), active filter, pagination (10/page), navigate to crear/editar routes
- [x] T028 [US2] Create server page `src/app/dashboard/configuraciones-producto/page.tsx` — auth() check + DashboardLayout + ProductConfigurationsPageClient

**Checkpoint**: User Story 2 complete — list, search, filter, and pagination all functional.

---

## Phase 5: User Story 3 — Actualizar Configuración de Producto (Priority: P3)

**Goal**: Administrators can update the PPC reference for new businesses on an existing configuration. Product/origin/category/code are immutable and shown as readonly.

**Independent Test**: Select an existing configuration, change the PPC reference, save, and confirm the change persists on reload. Verify product/origin/category/code fields are disabled.

### Tests for User Story 3

- [x] T029 [P] [US3] Create component tests in `src/features/product-configuration/__tests__/components/product-configuration-form.test.tsx` — edit mode tests (form title, readonly company/product/origin/category/code, save button, loading state, PPC section)

### Implementation for User Story 3

- [x] T030 [US3] Create API route GET in `src/app/api/product-configurations/[id]/route.ts` — fetch by id with includes, map, return 404 if not found
- [x] T031 [US3] Create API route PUT in `src/app/api/product-configurations/[id]/route.ts` — parse with updateProductConfigurationSchema, validate PPC belongs to config (`idProductConfiguration === config.id`), update `idProductPercentajeCommisionNewBusinesses`, return updated
- [x] T032 [US3] Create API route GET in `src/app/api/product-configurations/[id]/ppcs/route.ts` — fetch all PPCs for a configuration, return `{ idProductPercentajeCommision, active }[]`
- [x] T033 [P] [US3] Update form component `src/features/product-configuration/components/product-configuration-form.tsx` — edit mode with readonly/disabled fields (company, product, origin, category, code) + PPC Reference select dropdown
- [x] T034 [US3] Create client component `src/features/product-configuration/components/product-configuration-edit-client.tsx` — fetch config by id + PPCs, render form in edit mode, PUT on submit, error state with back button, toast + navigate
- [x] T035 [US3] Create server page `src/app/dashboard/configuraciones-producto/editar/[id]/page.tsx` — auth() check + DashboardLayout + ProductConfigurationEditClient with ID parsing
- [x] T036 [P] [US3] Create loading skeleton `src/app/dashboard/configuraciones-producto/editar/[id]/loading.tsx`

**Checkpoint**: User Story 3 complete — can edit PPC reference on existing configurations.

---

## Phase 6: User Story 4 — Inactivar y Reactivar Configuración de Producto (Priority: P4)

**Goal**: Administrators can toggle the active status of a configuration (inactivate/reactivate) with confirmation dialog. Inactive configs are not available for new business creation but existing businesses are unaffected.

**Independent Test**: Inactivate an active configuration (confirm dialog), verify status badge changes to "Inactivo". Reactivate and verify it returns to "Activo".

### Implementation for User Story 4

- [x] T037 [US4] Create API route PATCH in `src/app/api/product-configurations/[id]/route.ts` — toggle `active` field, body: `{ active: boolean }`, return updated config
- [x] T038 [US4] Add toggle active confirmation dialog in `src/features/product-configuration/components/product-configurations-page-client.tsx` — AlertDialog with confirmation message, on confirm PATCH toggle, toast notifications, refetch list

**Checkpoint**: User Story 4 complete — can toggle active status with confirmation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Sidebar navigation, form skeleton, and final verification.

- [x] T039 Add sidebar link in `src/lib/navigation/menu-items.tsx` — import `Sliders` from lucide-react, add `{ title: 'Config. Producto', url: '/dashboard/configuraciones-producto', icon: <Sliders /> }` to Administración subItems
- [x] T040 [P] Create form skeleton `src/features/product-configuration/components/product-configuration-form-skeleton.tsx`
- [x] T041 Run `npm run type-check` — verify 0 TypeScript errors
- [x] T042 Run `npm run lint` — verify 0 linting errors
- [x] T043 Run `npx vitest run src/features/product-configuration/` — verify all 98 tests pass
- [x] T044 Run existing negocios tests to confirm no regressions from Prisma schema change

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types, schemas, mapper must exist for hooks)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs hooks, API client)
- **User Story 2 (Phase 4)**: Depends on Phase 2 (needs hooks, table component)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (needs hooks, form component from US1)
- **User Story 4 (Phase 6)**: Depends on Phase 2 (needs hooks, list page from US2)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2. No dependency on other stories.
- **User Story 2 (P2)**: Can start after Phase 2. Independent of US1 (uses own list hook).
- **User Story 3 (P3)**: Can start after Phase 2. Shares form component with US1 (dual mode).
- **User Story 4 (P4)**: Can start after Phase 2. Shares page client with US2 (toggle integrated in list).

### Within Each User Story

- Tests written alongside or before implementation
- API routes before client components
- Client components before server pages
- Core implementation before integration

### Parallel Opportunities

- T005, T006, T007 (types, schemas, mapper) can run in parallel
- T010, T011, T012 (hooks) can run in parallel
- T013–T018 (all test files) can run in parallel
- T019, T024, T029 (component tests) can run in parallel
- User Stories 1–4 can proceed in parallel after Phase 2

---

## Parallel Example: Phase 1 Setup

```bash
# Launch parallel tasks after Prisma migration:
Task T005: "Create types in src/features/product-configuration/types/"
Task T006: "Create Zod schemas in src/features/product-configuration/lib/"
Task T007: "Create mapper in src/features/product-configuration/mappers/"
Task T009: "Create test fixtures in __tests__/fixtures/"
```

## Parallel Example: Phase 2 Foundation

```bash
# Launch all hooks in parallel:
Task T010: "Create use-product-configurations hook"
Task T011: "Create use-product-configuration hook"
Task T012: "Create use-product-configuration-mutations hook"

# Launch all test files in parallel:
Task T013-T018: "All schema/API/mapper/hook test files"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (Prisma + types + schemas + mapper + API client)
2. Complete Phase 2: Foundational (hooks + tests)
3. Complete Phase 3: User Story 1 (create configuration)
4. **STOP and VALIDATE**: Test creation flow end-to-end
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. User Story 1 → Create configurations → Deploy/Demo (MVP!)
3. User Story 2 → List/search/filter → Deploy/Demo
4. User Story 3 → Edit PPC reference → Deploy/Demo
5. User Story 4 → Toggle active/inactive → Deploy/Demo
6. Polish → Sidebar link, skeleton, final verification

---

## Implementation Status

**All 44 tasks are COMPLETE** ✅

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Setup | T001–T009 | ✅ Complete |
| Phase 2: Foundational | T010–T018 | ✅ Complete |
| Phase 3: US1 — Crear | T019–T023 | ✅ Complete |
| Phase 4: US2 — Consultar | T024–T028 | ✅ Complete |
| Phase 5: US3 — Actualizar | T029–T036 | ✅ Complete |
| Phase 6: US4 — Inactivar | T037–T038 | ✅ Complete |
| Phase 7: Polish | T039–T044 | ✅ Complete |

### Verification Results

- `npm run type-check`: 0 errors ✅
- `npm run lint`: 0 errors ✅
- `npx vitest run src/features/product-configuration/`: 98/98 tests pass ✅
- Existing negocios tests: 147/147 pass (no regressions) ✅

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All tasks use `[x]` checkbox because implementation is complete
- The form component (`product-configuration-form.tsx`) serves both US1 (create mode) and US3 (edit mode)
- The page client (`product-configurations-page-client.tsx`) serves both US2 (list) and US4 (toggle active)
- API route files contain multiple HTTP methods: `route.ts` has GET+POST, `[id]/route.ts` has GET+PUT+PATCH
