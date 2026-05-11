# Tasks: mejoras-jerarquia-level-category

## Phase 1: Database Migrations (SQL only — no Prisma yet)

- [x] 1.1 Create `prisma/migrations/20260509000000_rename_category_to_level/migration.sql`: rename table `category→level`; rename FK columns `id_categoria→id_level` (users), `id_category→id_level` (product_configuration, product_percentage_commision_category); rename `id_next_category→id_next_level` in level; drop old unique `[id_product,id_category]` and add `[id_product,id_level]` on product_configuration. **DO NOT drop `id_category_type` yet** — needed for the next migration.
- [x] 1.2 Create `prisma/migrations/20260509010000_create_category_and_populate/migration.sql`: (a) `CREATE TABLE category` with fields: id, name, description, status, id_category_type FK, created_at, updated_at; (b) `INSERT INTO category (name, description, status, id_category_type) SELECT name, descripcion, status, id_category_type FROM level` — copies all existing level rows into the new category table preserving names (MS_JUNIOR, MS_SENIOR, etc.); (c) add `id_category INT REFERENCES category(id)` column to users; (d) `UPDATE users SET id_category = c.id FROM category c JOIN level l ON c.name = l.name WHERE users.id_level = l.id_level` — assign each user their matching category based on current level name; (e) `ALTER TABLE level DROP COLUMN id_category_type` — now safe to drop.
- [x] 1.3 Create `prisma/migrations/20260509020000_rename_level_codes/migration.sql`: UPDATE level SET code per the 7 renames (MS_JUNIOR→LEVEL_0, MS_SENIOR→LEVEL_1, TEAM_LEADER→LEVEL_2, PERFORMANCE_LEADER→LEVEL_3, BUSINESS_LEADER→LEVEL_4, PARTNER→LEVEL_5, MI→GENERAL_LEVEL).
- [x] 1.4 Create `prisma/migrations/20260509030000_backfill_product_configuration_code/migration.sql`: regenerate `code = UPPER(company.name)||'-'||UPPER(product.name)||'-'||UPPER(level.code)` for all active product_configuration rows (UPPER first, same pattern as previous change).

## Phase 2: Prisma Schema Update

- [x] 2.1 Update `prisma/schema.prisma`: rename model `Category→Level` with `@@map("level")`, remove `idCategoryType`/`categoryType` from Level, rename FK fields in User/ProductConfiguration/ProductPercentageCommissionCategory to `idLevel`, rename `idNextCategory→idNextLevel`, rename self-ref relation names to `LevelSequence`. Add `User.idCategory`/`User.category` FK to new Category.
- [x] 2.2 Add new `Category` model in `prisma/schema.prisma` per spec. Update `CategoryType`: remove old `categories Category[]`, add new `categories Category[]` pointing to new Category model. Run `npx prisma generate`.
- [x] 2.3 Update `prisma/ERD.md`: update enums block, erDiagram relationship lines, entity field lists, and add index/convention notes for renamed model, new Category model, and FK changes.

## Phase 3: Seeds & Audit Logger

- [x] 3.1 Rename `prisma/seeds/category.ts` → `prisma/seeds/level.ts`; update all `prisma.category.*` calls to `prisma.level.*`; update codes to LEVEL_0…GENERAL_LEVEL; update `prisma/seed.ts` import. Create `prisma/seeds/category.ts` with seed data for new Category table (MS_JUNIOR, MS_SENIOR, TEAM_LEADER, PERFORMANCE_LEADER, BUSINESS_LEADER, PARTNER, MI) referencing existing `id_category_type` values.
- [x] 3.2 Add `LEVEL_CREATED`, `LEVEL_UPDATED`, `LEVEL_DEACTIVATED`, `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED` to `src/features/auth/lib/audit-logger.ts` AuditAction enum.

## Phase 4: Rename categories feature → levels feature

- [x] 4.1 Write failing tests in `src/features/levels/__tests__/lib/level-api.test.ts` for the levels API client (mirrors existing `category-api.test.ts` with Level naming).
- [x] 4.2 Write failing tests in `src/features/levels/__tests__/lib/level-schemas.test.ts` (mirrors `category-schemas.test.ts`).
- [x] 4.3 Write failing tests in `src/features/levels/__tests__/mappers/level.mapper.test.ts`.
- [x] 4.4 Write failing tests in `src/features/levels/__tests__/hooks/` for `use-admin-levels`, `use-admin-level-mutations`, `use-levels`, `use-level-mutations`, `use-level` (one file each, mirrors category hook tests).
- [x] 4.5 Write failing tests in `src/features/levels/__tests__/components/` for `levels-table`, `admin-levels-table`, `level-form`, `level-form-skeleton`.
- [x] 4.6 Create `src/features/levels/` by copying all files from `src/features/categories/`; rename every file and internal symbol: `Category→Level`, `category→level`, `idCategory→idLevel`; update API endpoint references to `/api/levels`.
- [x] 4.7 Rename `src/app/api/categories/route.ts` → `src/app/api/levels/route.ts`; rename `src/app/api/categories/[id]/route.ts` → `src/app/api/levels/[id]/route.ts`; update all Prisma calls from `prisma.category` → `prisma.level`; update AuditAction values to `LEVEL_*`.
- [x] 4.8 Update dashboard pages: rename `src/app/dashboard/categorias/` → `src/app/dashboard/niveles/` (all 7 pages/clients); update imports to use `src/features/levels/` and `/api/levels`.
- [x] 4.9 Update navigation: edit `src/lib/navigation/menu-items.tsx` — rename only the dashboard "Categorías" entry to "Niveles" (the admin "Categorías" entry stays, it will manage the new Category table).

## Phase 5: New Category feature (CRUD)

- [x] 5.1 Write failing tests `src/features/categories/__tests__/lib/category-api.test.ts` for new Category entity (GET list, GET by id, POST, PUT, DELETE/deactivate).
- [x] 5.2 Write failing tests `src/features/categories/__tests__/lib/category-schemas.test.ts` and `__tests__/mappers/category.mapper.test.ts`.
- [x] 5.3 Write failing hook tests: `use-categories`, `use-category`, `use-category-mutations`, `use-admin-categories`, `use-admin-category-mutations` in `src/features/categories/__tests__/hooks/`.
- [x] 5.4 Write failing component tests: `categories-table`, `admin-categories-table`, `category-form`, `category-form-skeleton` in `src/features/categories/__tests__/components/`.
- [x] 5.5 Create `src/features/categories/types/category.types.ts`, `lib/category-api.ts`, `lib/category-schemas.ts`, `mappers/category.mapper.ts` for new Category entity with `idCategoryType` field.
- [x] 5.6 Create `src/features/categories/hooks/` — `use-categories.ts`, `use-category.ts`, `use-category-mutations.ts`, `use-admin-categories.ts`, `use-admin-category-mutations.ts`.
- [x] 5.7 Create `src/features/categories/components/` — `categories-table.tsx`, `admin-categories-table.tsx`, `category-form.tsx`, `category-form-skeleton.tsx`.
- [x] 5.8 Create `src/app/api/categories/route.ts` and `src/app/api/categories/[id]/route.ts` for new Category, using `prisma.category.*` and `CATEGORY_*` audit actions.
- [x] 5.9 Update `src/app/dashboard/admin/categories/page.tsx` to use the new Category feature: replace all imports from `src/features/categories/` (now levels), rewire hooks and types to the new simpler Category model; update CrudModal fields to: name, description, status, idCategoryType (select).
- [x] 5.10 Create full CRUD dashboard pages for new Category: `src/app/dashboard/categorias/page.tsx`, `crear/page.tsx`, `editar/[id]/page.tsx`; add "Categorías" entry to navigation menu.

## Phase 6: Update cross-feature consumers

- [x] 6.1 Update `src/features/negocios/services/product-configuration.service.ts`: rename all `idCategory→idLevel`, use `user.idLevel` for ProductConfiguration lookup; the lookup MUST include `level: { status: true }` AND `product: { status: true }` in the where clause — if no active config is found (either because level or product is inactive, or config doesn't exist) → throw 422. Update `src/features/negocios/__tests__/services/product-configuration.service.test.ts`: add test cases for inactive level, inactive product, and inactive config.
- [x] 6.2 Update `src/features/negocios/__tests__/fixtures/mock-prisma-business.ts`: rename `idCategoria→idLevel` in mock User objects; add `idCategory` field.
- [x] 6.3 Update `src/features/negocios/actions/create-business.ts`: rename `idCategoria→idLevel`. Update `src/features/negocios/__tests__/actions/create-business.test.ts`.
- [x] 6.4 Update `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`: replace `configFromCategories` (name-string bucket matching) with `configFromLevel` — a direct lookup by `idLevel`: `items.find(item => item.idLevel === user.idLevel)`. Each level has its own independent commission row in `ProductPercentageCommissionLevel`; no grouping or bucketing. If no row found for the user's level → skip or throw depending on existing behavior.
- [x] 6.5 Update `src/features/pre-liquidacion/__tests__/services/pre-liquidacion.service.test.ts` and `__tests__/sincronizarYCalcularRegistroRezagado.test.ts`: replace name-based category fixtures with `idLevel`-based fixtures; one commission row per level.
- [x] 6.6 Update `src/features/pre-liquidacion/lib/resolve-beneficiary.ts` and `__tests__/lib/resolve-beneficiary.test.ts`: replace category name resolution with direct `idLevel` lookup.
- [x] 6.7 Update `src/features/admin/users/types/user.types.ts`, `lib/user-schemas.ts`, `lib/user-api.ts`: rename `idCategoria→idLevel`, add `idCategory` field; add `levelName` to the user list projection; update `users-table.tsx` to show a **"Nivel (Jerarquía)"** column displaying the level name.
- [x] 6.8 Update `src/app/api/admin/users/route.ts` and `[id]/route.ts`: rename `idCategoria→idLevel`, add `idCategory` to user create/update payloads; include `level { code, name, idNextLevel }` in user GET response.
- [x] 6.8b Add `idLevel` filter to `src/app/api/users/search/route.ts` so the leader selector can fetch users belonging to a specific level (used to populate the leader list filtered by `nextLevel`).
- [x] 6.8c Update user edit form in `src/features/admin/users/components/`: add **Categoría** select (fetches `/api/categories`), **Nivel (Jerarquía)** select (fetches `/api/levels`); add **Líder** autocomplete — label "Líder", optional, searches `/api/users/search?idLevel={selectedLevel.idNextLevel}&beneficiaryMode=OVERRIDE`, clears when level changes, shows "Sin líder asignado" when empty.
- [x] 6.9 Update `src/features/auth/lib/user-creation.ts`: rename `idCategoria→idLevel`. Update `src/features/auth/__tests__/user-creation.test.ts` and `user-validation.test.ts`.
- [x] 6.10 Update `src/features/load-file/services/processors/poliza.processor.ts` and `voluntaria.processor.ts`: rename `idCategoria→idLevel` wherever referenced.
- [x] 6.11 Update `src/lib/auth/config.ts`: rename `idCategoria→idLevel` in session shape/callbacks if present.
- [x] 6.12 Update `src/app/api/product-configurations/route.ts` and `[id]/route.ts`: rename `idCategory→idLevel` in payloads.

## Phase 7: Cleanup & Verification

- [x] 7.1 Delete the old `src/features/categories/` directory (after Phase 5 new one is confirmed working). Remove `src/app/api/categories/` old routes (replaced in Phase 4). (Phase 5 OVERWROTE categories/ with new code — no old broken imports remain; verified clean.)
- [x] 7.2 Run full type-check (`npm run type-check`) — fix any residual `idCategoria`/`idCategory` references surfaced by TS compiler. Result: 0 errors.
- [x] 7.3 Run full test suite (`npm run test:all`) — confirm all tests green. Result: 190 test files, 1843 tests passing, 3 skipped, 0 failures.
