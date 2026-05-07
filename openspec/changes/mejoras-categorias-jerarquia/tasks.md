# Tasks: mejoras-categorias-jerarquia

## Phase 1: Schema + Migration

- [x] 1.1 `prisma/schema.prisma` — Add `color String @db.VarChar(7)` (required) and `idNextCategory Int?` self-ref FK to Category model; rename enum values `UPLINE_CHAIN→OVERRIDE` and `FIXED_BENEFICIARY→BENEFICIARIO_GENERAL`.
- [x] 1.2 `prisma/migrations/` — Generate migration with `npx prisma migrate dev --name mejoras-categorias-jerarquia`; verify SQL contains two `ALTER TYPE … RENAME VALUE` statements plus two `ALTER TABLE ADD COLUMN` statements.

## Phase 2: Types + Zod Schema (TDD)

- [x] 2.1 RED: `__tests__/lib/category-schemas.test.ts` — Add failing tests for: (a) `createCategorySchema` rejects missing `color`; (b) `color` with non-hex value fails regex; (c) `BENEFICIARIO_GENERAL` without `idFixedBeneficiaryUser` fails superRefine; (d) `OVERRIDE` without user passes; (e) default `beneficiaryMode` is `OVERRIDE`; (f) `idNextCategory` is optional number.
- [x] 2.2 GREEN: `src/features/categories/lib/category-schemas.ts` — Rename enum literals to `OVERRIDE`/`BENEFICIARIO_GENERAL`, add `color` field with `/^#[0-9A-Fa-f]{6}$/` regex (required), add `idNextCategory z.number().int().positive().nullable().optional()`, update `superRefine` guard and default.
- [x] 2.3 GREEN: `src/features/categories/types/category.types.ts` — Update `BeneficiaryMode` union to `'OVERRIDE' | 'BENEFICIARIO_GENERAL'`, add `color: string`, `idNextCategory: number | null`, `nextCategory: { id: number; name: string } | null` fields.

## Phase 3: Mapper (TDD)

- [x] 3.1 RED: `__tests__/mappers/category.mapper.test.ts` — Add failing tests for: (a) maps `color` from Prisma model; (b) maps `idNextCategory` and `nextCategory: { id, name }` when relation present; (c) maps `nextCategory: null` when absent; (d) maps `beneficiaryMode` with new enum literals.
- [x] 3.2 GREEN: `src/features/categories/mappers/category.mapper.ts` — Map `color`, `idNextCategory`, `nextCategory` (id + name); update `beneficiaryMode` guard to use `OVERRIDE`/`BENEFICIARIO_GENERAL`.

## Phase 4: Seed

- [x] 4.1 `prisma/seeds/category.ts` — Rewrite as 3-pass: (1) upsert categories with new `code`/`name`/`color` values; (2) set `idNextCategory` links between category records; (3) set `idFixedBeneficiaryUser` for MIA beneficiary category using seeded user lookup.

## Phase 5: UI — Form + Table (TDD)

- [x] 5.1 RED: `__tests__/components/category-form.test.tsx` — Add failing tests for: (a) color input renders with `type="color"`; (b) next-category select renders options excluding current category id; (c) switching to `OVERRIDE` clears user selector; (d) form submit blocked when color empty; (e) `BENEFICIARIO_GENERAL` label appears (not `FIXED_BENEFICIARY`).
- [x] 5.2 GREEN: `src/features/categories/components/category-form.tsx` — Add `<input type="color">` for color (required); add next-category `<Select>` filtering out self (`idCategory`); rename `FIXED_BENEFICIARY` guard/label to `BENEFICIARIO_GENERAL`; update default `beneficiaryMode` to `OVERRIDE`.
- [x] 5.3 RED: `__tests__/components/categories-table.test.tsx` — Add failing tests for: (a) color chip cell renders with correct hex value; (b) next-category name column renders category name or `—`.
- [x] 5.4 GREEN: `src/features/categories/components/categories-table.tsx` — Add color chip column (small colored circle with `data-testid="color-chip"`) and next-category name column (display `nextCategory.name` or `—`).

## Phase 6: API Route

- [x] 6.1 `src/app/api/categories/route.ts` (GET handler) — Ensure Prisma query includes `nextCategory: { select: { idCategory: true, name: true } }` so the API response includes the relation.

## Phase 7: Verify

- [x] 7.1 Fix soft delete en DELETE handler — `prisma.category.update({ status: false })`
- [x] 7.2 Fix color e idNextCategory no persistidos en PUT — agregar a `updateData` en `[id]/route.ts`
- [x] 7.3 Fix enum rename migration — SQL manual con `ALTER TYPE RENAME VALUE` + `prisma migrate deploy`
- [x] 7.4 Fix referencias viejas al enum en 10 archivos de src/
- [x] 7.5 Agregar prop `categories` a create/edit clients para mostrar select de siguiente categoría
- [x] 7.6 Audit log en POST/PUT/DELETE — `logAuditEvent()` con `CATEGORY_CREATED/UPDATED/DEACTIVATED`
- [x] 7.7 Filtro de tipo dinámico en tabla — reemplazar hardcoded por `useCategoryTypes()`

## Phase 8: Verify

- [ ] 8.1 Run `pnpm vitest` — all existing + new tests must pass.
- [ ] 8.2 Run `pnpm type-check` — zero TypeScript errors.
