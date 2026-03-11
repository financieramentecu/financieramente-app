## 1. Database Schema & Migration

- [x] 1.1 Add `CategoryType` model to `prisma/schema.prisma` with fields: id (autoincrement PK), name (unique, VarChar 100), description (nullable Text), status (boolean default true), createdAt, updatedAt. Map to `category_type` table.
- [x] 1.2 Modify `Category` model: add `idCategoryType` (Int, FK to `CategoryType.id`), add `categoryType` relation, remove `typeCategory` string field, replace `@@index([typeCategory])` with `@@index([idCategoryType])`.
- [x] 1.3 Create Prisma migration with raw SQL to: create `category_type` table, insert existing distinct `type_category` values, add `id_category_type` column to `category`, populate FK from existing strings, set NOT NULL, add FK constraint, drop `type_category` column and old index.
- [x] 1.4 Update `prisma/seeds/category.ts` to seed `CategoryType` records (MMS, Aliado, Trinity) via upsert and seed `Category` records with `idCategoryType` FK references.
- [x] 1.5 Run migration and seed locally, verify data integrity.

## 2. Feature Types & Schemas

- [x] 2.1 Create `src/features/category-types/types/category-type.types.ts` with `CategoryType`, `CategoryTypeFilters`, `CreateCategoryTypeInput`, `UpdateCategoryTypeInput`, and `CategoryTypeListResponse` interfaces.
- [x] 2.2 Create `src/features/category-types/lib/category-type-schemas.ts` with Zod schemas for create and update validation (name required, unique check).
- [x] 2.3 Write unit tests for Zod schemas in `__tests__/lib/category-type-schemas.test.ts`.

## 3. API Layer

- [x] 3.1 Create `src/features/category-types/services/category-type.service.ts` with Prisma queries: findMany (paginated, searchable), findById, create (with unique name check), update (with unique name check and hasReferences flag), countReferences.
- [ ] 3.2 Write unit tests for category-type service.
- [x] 3.3 Create `src/features/category-types/mappers/category-type.mapper.ts` for Prisma-to-domain mapping.
- [x] 3.4 Create `src/app/api/category-types/route.ts` with GET (list with pagination/search/status filter) and POST (create with duplicate validation) handlers. Follow `ApiResponse<T>` standard.
- [x] 3.5 Create `src/app/api/category-types/[id]/route.ts` with GET (single), PUT (update with `hasReferences` flag on deactivation) handlers.
- [x] 3.6 Write integration tests for API routes.

## 4. Client-Side Data Layer

- [x] 4.1 Create `src/features/category-types/lib/category-type-api.ts` with API client functions using `apiClient`.
- [x] 4.2 Create `src/features/category-types/hooks/use-category-types.ts` hook for listing with pagination and filters, returning `AsyncState<T>`.
- [x] 4.3 Create `src/features/category-types/hooks/use-category-type.ts` hook for fetching a single category type by ID.
- [x] 4.4 Create `src/features/category-types/hooks/use-category-type-mutations.ts` hook for create, update operations with toast notifications.
- [x] 4.5 Write unit tests for hooks.

## 5. UI Components

- [x] 5.1 Create `src/features/category-types/components/category-type-form.tsx` with fields: Name (required, Input), Description (optional, Textarea), Status (required, Select with default Active). Include validation errors and loading states.
- [x] 5.2 Create `src/features/category-types/components/category-type-form-skeleton.tsx` loading skeleton.
- [x] 5.3 Create `src/features/category-types/components/category-types-table.tsx` with columns: Name, Description, Status, Actions (edit). Include pagination, search, and status filter.
- [x] 5.4 Write unit tests for form and table components.

## 6. Pages & Navigation

- [x] 6.1 Create `src/app/dashboard/admin/category-types/page.tsx` (list page, Server Component wrapping client table).
- [x] 6.2 Create `src/app/dashboard/admin/category-types/crear/page.tsx` (create page with form).
- [x] 6.3 Create `src/app/dashboard/admin/category-types/editar/[id]/page.tsx` (edit page with form, shows usage warning alert on deactivation).
- [x] 6.4 Add "Tipo de Categoría" link to admin navigation/sidebar menu.

## 7. Refactor Categories Feature

- [ ] 7.1 Update `src/features/categories/types/category.types.ts`: remove `CATEGORY_TYPES` constant, replace `typeCategory: CategoryType` with `idCategoryType: number` and add `categoryType` relation object.
- [ ] 7.2 Update `src/features/categories/lib/category-schemas.ts`: change Zod schemas from `typeCategory` string enum to `idCategoryType` number.
- [ ] 7.3 Update `src/features/categories/mappers/category.mapper.ts` to map the new `categoryType` relation.
- [ ] 7.4 Update `src/features/categories/components/category-form.tsx`: replace hardcoded `CATEGORY_TYPES` select with a dynamic fetch from `/api/category-types` (only active ones).
- [ ] 7.5 Update `src/features/categories/components/categories-table.tsx` and `category-filters.tsx` to display/filter by category type name from the relation.
- [ ] 7.6 Update `src/features/categories/hooks/` to handle the new `idCategoryType` field.
- [ ] 7.7 Update `src/app/api/categories/route.ts` and `[id]/route.ts` to use `idCategoryType` instead of `typeCategory`.
- [ ] 7.8 Update existing category feature tests to work with the new FK relationship.

## 8. Final Verification

- [ ] 8.1 Run full test suite (`npm run test:unit`) — all tests pass.
- [ ] 8.2 Run type-check (`npm run type-check`) — no type errors.
- [ ] 8.3 Run linter (`npm run lint`) — no lint errors.
- [ ] 8.4 Manual smoke test: create, edit, deactivate category type; verify categories form uses dynamic types.
