# Design: Mejoras Jerarquia — Level + Category split

## Technical Approach

Split the overloaded `Category` model into two: `Level` (commission hierarchy, ex-Category) and a new `Category` (presentation/grouping). The split happens by RENAMING the existing table `category → level` (preserving data + FKs), creating a NEW empty `category` table, and renaming dependent FK columns. Code follows: feature `categories/` is renamed to `levels/`, a new lean `categories/` feature is added, and `pre-liquidacion` swaps fragile name-based matching (`configFromCategories`) for a deterministic `levelNumber` lookup. Implementation is TDD per spec from `levels/spec.md` + `categories/spec.md`.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Schema split | Rename table `category → level`; create new empty `category` | Add `levelNumber` to Category in place; never split | Clean domain separation; eliminates table-name conflict via ordered migrations |
| Migration ordering | 4 sequential SQL migrations (rename → create → seed → backfill code) | Single mega-migration | Each step independently revertable; seed runs only after structure is stable |
| `configFromCategories` replacement | Lookup by `levelNumber` (Int) on `Level` | Match by `code` string; keep name matching | `levelNumber` is the canonical hierarchy axis; integers eliminate locale/typo risk |
| Position semantics | `levelNumber 0..5` for hierarchy; `null` for `GENERAL_LEVEL` | Sentinel `-1` or `999` for general | Null is unambiguous "out of chain"; matches Prisma optional |
| Feature folder | Rename `src/features/categories/ → levels/` and create new `categories/` from scratch | Keep `categories/` for old hierarchy + add `levels/` | Screaming Architecture: feature folder name MUST match domain |
| Code generator | `buildProductConfigurationCode(company, product, level.code)` unchanged signature | Use `levelNumber` as the segment | `code` is human-readable in admin UI/CSV exports; `LEVEL_2` reads better than `2` |
| User FKs | `User.idLevel` (replaces `idCategoria`) + new optional `User.idCategory` | Keep `idCategoria` as alias | Forces explicit migration of all callers; surfaces shadow uses at compile time |
| Resolver field | `UplineChainLink.idLevel` (rename from `idCategoria`) | Add new and keep old | Single source of truth for the hierarchy axis |

## Data Flow

    Business creation:
      User → user.idLevel ─┐
                           ▼
        ProductConfiguration.findUnique([idProduct, idLevel])
                           │
                           ▼
                ProductPercentageCommission (active)

    Pre-liquidacion:
      SettlementCommission ─→ Business.PPC
                                    │
                                    ▼
                  PPCCategory[] include level   ← (renamed from category)
                                    │
                                    ▼
        configFromLevel(items, usePortfolio)    ← lookup by levelNumber
                                    │
                                    ▼
            ConfiguracionPorcentajes { general?, agencia?, lider?, coach? }

## File Changes

### Schema + migrations + seeds

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Rename `model Category → Level` (`@@map("level")`); drop `idCategoryType` from Level; add `levelNumber Int? @map("level_number")`; rename relations (`idNextCategory` stays as field — references self `Level`); add new `model Category` (id, name, description, status, idCategoryType FK, timestamps); rename `User.idCategoria → idLevel`, add `User.idCategory Int?`; rename `ProductConfiguration.idCategory → idLevel`; rename `ProductPercentageCommissionCategory.idCategory → idLevel`; update unique `[idProduct, idLevel]` and indexes; on `CategoryType`, replace reverse relation to point to new `Category` |
| `prisma/migrations/{ts}_rename_category_to_level/migration.sql` | Create | `ALTER TABLE category RENAME TO level;` + rename FK columns: `users.id_categoria → id_level`, `product_configuration.id_category → id_level`, `product_percentaje_commision_category.id_category → id_level`; drop column `level.id_category_type`; rename indexes/constraints; drop unique `[id_product,id_category]`; add unique `[id_product,id_level]` |
| `prisma/migrations/{ts}_create_category_and_link_user/migration.sql` | Create | Create new `category` table (id_category, name, description, status, id_category_type FK, created_at, updated_at); add `users.id_category INT NULL` + FK |
| `prisma/migrations/{ts}_seed_level_codes_and_numbers/migration.sql` | Create | `UPDATE level SET code='LEVEL_0' WHERE code='MS_JUNIOR';` … `UPDATE level SET code='LEVEL_5' WHERE code='PARTNER';` `UPDATE level SET code='GENERAL_LEVEL' WHERE code='MIA';` then `UPDATE level SET level_number=0..5` per row and `level_number=NULL` for `GENERAL_LEVEL` |
| `prisma/migrations/{ts}_backfill_product_configuration_code/migration.sql` | Create | Regenerate `product_configuration.code = upper(company.name)||'-'||upper(product.name)||'-'||level.code` for every row; verify uniqueness |
| `prisma/seeds/category.ts` | Rename → `prisma/seeds/level.ts` | Replace `MS_JUNIOR..MIA` map with `LEVEL_0..5 + GENERAL_LEVEL`; add `levelNumber`; update `NEXT_CATEGORY_CHAIN` and references; rename function `seedCategories → seedLevels`, `seedMiaBeneficiaryLink → seedGeneralLevelBeneficiary` |
| `prisma/seeds/category-presentation.ts` | Create | Optional empty seed for new `Category` (no rows by default) |
| `prisma/ERD.md` | Modify | Rename `Category` block to `Level` (drop `id_category_type`, add `level_number`); add new `Category` block; update relations (`Level ||--o{ User`, `CategoryType ||--o{ Category`, etc.); update enum/note section |

### Levels feature (renamed from categories)

| File | Action | Description |
|------|--------|-------------|
| `src/features/categories/**` | Rename → `src/features/levels/**` | Bulk rename folder; rename symbols `Category → Level`, `idCategory → idLevel`, `category-* → level-*`, `CATEGORY_* → LEVEL_*`; in `types/level.types.ts` add `levelNumber: number \| null` and drop `typeCategory`/`idCategoryType` |
| `src/features/levels/lib/level-api.ts` | Modify | Endpoints `/api/levels` (was `/api/categories`); accept `levelNumber` filter |
| `src/features/levels/lib/level-schemas.ts` | Modify | Drop `idCategoryType`; add optional `levelNumber: z.number().int().nullable()`; reject `code` mutation in update schema |
| `src/app/api/categories/route.ts` + `[id]/route.ts` | Rename → `src/app/api/levels/route.ts` + `[id]/route.ts` | Move handlers; route delegates to renamed service |
| `src/app/dashboard/categorias/**` | Modify | Page client, create/edit clients: rename references; pages route to `/api/levels`; add `levelNumber` field in form |

### New Categories feature

| File | Action | Description |
|------|--------|-------------|
| `src/features/categories/types/category.types.ts` | Create | `Category { idCategory, name, description, status, idCategoryType, createdAt, updatedAt }`; Create/Update inputs |
| `src/features/categories/lib/category-schemas.ts` | Create | Zod create/update; `idCategoryType` required on create, optional on update |
| `src/features/categories/lib/category-api.ts` | Create | Client to `/api/categories` |
| `src/features/categories/services/category.service.ts` | Create | Prisma calls (create, update, list with `idCategoryType` filter, soft delete) |
| `src/features/categories/mappers/category.mapper.ts` | Create | DB → DTO mapper |
| `src/features/categories/hooks/*` | Create | `useCategories`, `useCategory`, `useCategoryMutations` (mirror old patterns) |
| `src/features/categories/components/*` | Create | `categories-table`, `category-form`, `category-form-skeleton`, `admin-categories-table` (lean; no color, no nextCategory, no beneficiary mode) |
| `src/features/categories/__tests__/**` | Create | Mirror existing test layout |
| `src/app/api/categories/route.ts` | Recreate | Now lists/creates the NEW Category (delegates to feature service) |
| `src/app/api/categories/[id]/route.ts` | Recreate | GET/PUT/PATCH for new Category |

### Cross-cutting changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `LEVEL_CREATED`, `LEVEL_UPDATED`, `LEVEL_DEACTIVATED` (CATEGORY_* already exist and are reused for new Category) |
| `src/features/negocios/services/product-configuration.service.ts` | Modify | Rename param `idCategory → idLevel`; `findUnique({ where: { idProduct_idLevel } })` |
| `src/features/negocios/actions/create-business.ts` | Modify | Read `user.idLevel` (was `idCategoria`); pass `idLevel` to `getPpcForNewBusinesses` |
| `src/features/negocios/actions/find-product-percentage-commission.ts` | Modify | Switch lookup to `idLevel` |
| `src/features/negocios/lib/product-configuration-code.ts` | Keep | Same signature; receives `level.code` (`LEVEL_0`..`GENERAL_LEVEL`) |
| `src/features/pre-liquidacion/lib/resolve-beneficiary.ts` | Modify | `UplineChainLink.idCategoria → idLevel`; `CategoryForBeneficiaryResolve` keeps semantic but type imports `Level` types; FK comparison uses `level.idLevel` |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | Rename `ConfigCategoryItem → ConfigLevelItem` with `level: LevelForBeneficiaryResolve`; replace `configFromCategories(name)` with `configFromLevel(items)` keyed by `level.levelNumber`: `0→general` (or per business mapping below), `null→agencia` for GENERAL_LEVEL — see Interfaces; update all `prisma.category` includes to `prisma.level` and `productPercentageCommissionCategory.category → .level` |
| `src/features/product-configuration/**` | Modify | Replace `idCategory` references with `idLevel`; types/mappers/schemas/forms |
| `src/features/distribution-commission/**` | Modify | `commission-rule.types.ts`, mappers, schemas, components: `idCategory → idLevel`; PPC categories field renamed |
| `src/features/admin/users/components/user-actions-card.tsx` | Modify | `idCategoria → idLevel`; new `idCategory` form input |
| `src/app/api/admin/users/route.ts` + `[id]/route.ts` | Modify | Persist both `idLevel` and `idCategory`; `select` field renamed |
| `src/app/api/negocios/[id]/route.ts` + tests | Modify | Use renamed FK |
| `src/app/api/users/search/__tests__/route.test.ts` | Modify | Update fixtures |
| `__tests__` mocks (`mock-prisma-business.ts`, `mock-category.ts`, `mock-commission-rule.ts`, fixtures, etc.) | Modify | Rename `Category` props/fields; add `levelNumber`; new mock for new Category |
| `src/features/auth/__tests__/user-validation.test.ts`, `user-creation.test.ts` | Modify | `idCategoria → idLevel` |
| `src/features/pre-liquidacion/__tests__/**` | Modify | Update fixtures + assertions for `level` includes and `levelNumber`-based config |

## Interfaces / Contracts

```ts
// src/features/levels/types/level.types.ts
export interface Level {
  readonly idLevel: number
  code: string                       // LEVEL_0..LEVEL_5 | GENERAL_LEVEL
  name: string
  descripcion: string | null
  color: string                      // #RRGGBB
  status: boolean
  beneficiaryMode: BeneficiaryMode
  idFixedBeneficiaryUser: number | null
  fixedBeneficiaryUser?: FixedBeneficiaryUser | null
  idNextLevel: number | null         // self-ref (renamed from idNextCategory in code; column kept as id_next_category to minimize SQL churn — see open question)
  nextLevel: Pick<Level, 'idLevel' | 'name'> | null
  levelNumber: number | null         // 0..5 or null (GENERAL_LEVEL)
  readonly createdAt: string
  readonly updatedAt: string
}

// src/features/categories/types/category.types.ts (NEW)
export interface Category {
  readonly idCategory: number
  name: string
  description: string | null
  status: boolean
  idCategoryType: number
  readonly createdAt: string
  readonly updatedAt: string
}

// pre-liquidacion replacement
type LevelForConfig = { levelNumber: number | null; code: string }
function configFromLevel(
  items: ReadonlyArray<{ level: LevelForConfig; porcentajeDistribucion: Decimal; porcentajePortfolio: Decimal | null }>,
  usePortfolio: boolean
): ConfiguracionPorcentajes
```

The bucket assignment in `configFromLevel` is the load-bearing contract (replaces fragile name `includes`):

| levelNumber | code | bucket |
|-------------|------|--------|
| 0 | LEVEL_0 | (skip — agent retains; no general bucket) |
| 1, 2 | LEVEL_1/LEVEL_2 | `lider` |
| 3, 4 | LEVEL_3/LEVEL_4 | `coach` |
| 5 | LEVEL_5 | `general` |
| null | GENERAL_LEVEL | `agencia` |

(Confirmed against current `configFromCategories` semantics: `MS Junior/Senior → lider`, `Team/Performance Leader → coach`, `Business Leader/Partner → general`, `MIA → agencia`. Validate with team — see Open Questions.)

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit (TDD RED first) | Schemas, mappers, code generator, `configFromLevel`, `resolveBeneficiaryUserId` (with `idLevel`) | Vitest; pure functions; per-feature `__tests__` |
| Service | Levels CRUD service, Categories CRUD service, `getPpcForNewBusinesses(idProduct, idLevel)`, `obtenerConfiguracionPorcentajes` returns same buckets pre/post | Vitest with `vi.mock('@/lib/prisma')` matching existing patterns |
| Integration | API routes `/api/levels`, `/api/levels/[id]`, `/api/categories`, `/api/categories/[id]` | Vitest with NextRequest fixtures (existing pattern in `__tests__/route.test.ts`) |
| Migration | Apply migrations to throwaway DB; assert: 7 levels with new codes + levelNumber; new `category` table empty; `users.id_level` and `id_category` exist; `product_configuration.code` regenerated; unique `[id_product,id_level]` enforced | Manual checklist + smoke `prisma migrate dev` on local DB |
| Regression | `pre-liquidacion` golden test: same baseline `commissionValue` → identical `comissionDistribution.valueComissionFinal` per beneficiary before/after migration | Existing `pre-liquidacion.service.test.ts` extended with fixture per `levelNumber` |

## Migration / Rollout

1. Apply 4 SQL migrations in order on `develop`; run `prisma generate`.
2. Run `npm run test:all` against the new schema (RED → GREEN per feature/batch).
3. Smoke test: create business, run pre-liquidacion against existing fixture file; compare totals to prior production baseline.
4. Deploy: production migrations apply automatically; if rollback needed, run inverse SQL (rename `level → category`, drop new `category`, restore FK names, restore codes via inverse seed). Snapshot DB pre-deploy is the safety net.

## Open Questions

- [ ] **Level↔bucket mapping**: confirm with product team that `LEVEL_1/2 → lider`, `LEVEL_3/4 → coach`, `LEVEL_5 → general`, `GENERAL_LEVEL → agencia` is correct. Currently inferred from `configFromCategories` string semantics; needs explicit signoff before TDD baseline is locked.
- [ ] **`idNextCategory` column rename**: keep DB column as `id_next_category` (cheaper) and only rename the Prisma field to `idNextLevel`, OR rename the column too. Recommendation: **keep column name**; rename only Prisma field + relation name to `LevelSequence`. Reduces migration risk; column name is internal.
- [ ] **`AuditAction.CATEGORY_*` reuse**: enum values `CATEGORY_CREATED/UPDATED/DEACTIVATED` already exist (currently used for the OLD Category-as-hierarchy). Decision: rename existing values to `LEVEL_*` (semantic correction) AND add fresh `CATEGORY_*` for the new model. Confirm acceptable — historical audit rows would still read `CATEGORY_*` strings; need to decide whether to backfill.
- [ ] **Removing `categoryType` relation from Level**: spec says "drop `idCategoryType` from Level". Current `seeds/category.ts` tags every level with `type: 'MIA'` (a `CategoryType`). After drop, that linkage is lost; if any reporting depends on it, we lose it silently. Verify no consumer depends on `level.categoryType`.
