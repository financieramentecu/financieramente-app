# Design: mejoras-categorias-jerarquia

## Technical Approach

All changes are additive on the Prisma model (`color`, `idNextCategory`) plus a pure rename of the `BeneficiaryMode` enum values. The enum rename is handled at the DB level via a migration that uses `ALTER TYPE … RENAME VALUE` (PostgreSQL ≥ 10 — no data loss, no backfill needed). TypeScript types, Zod schemas, the mapper, and the form follow in lockstep. The seed is rewritten using an in-place "update by old code → set new code" pattern in three sequential passes so FK constraints are never violated during setup.

---

## Architecture Decisions

### Decision: Enum rename strategy

| | Detail |
|---|---|
| **Choice** | PostgreSQL `ALTER TYPE BeneficiaryMode RENAME VALUE` in a new Prisma migration |
| **Alternatives** | (a) Add new values + deprecate old ones; (b) Convert enum to `String` column |
| **Rationale** | Rename is atomic and zero-downtime on Postgres ≥ 10. No existing rows need touching — the DB engine updates the stored discriminant automatically. Adding parallel values would leave dead values in the enum forever; String loses type safety. |

### Decision: Self-referential FK vs order integer

| | Detail |
|---|---|
| **Choice** | `idNextCategory Int? @map("id_next_category")` — explicit FK to `Category` |
| **Alternatives** | Integer `sortOrder` column; separate `CategoryHierarchy` join table |
| **Rationale** | The chain is a singly-linked list where each node points to its successor. FK enforces referential integrity at the DB level, and the mapper can eager-load `nextCategory {id, name}` in a single Prisma `include`. `sortOrder` is fragile when codes are renamed; a join table is over-engineered for a fixed 7-node list. |

### Decision: Seed rename strategy

| | Detail |
|---|---|
| **Choice** | Three sequential passes: (1) upsert all 7 with new codes/names, (2) set `idNextCategory` links, (3) set `beneficiaryMode` + `idFixedBeneficiaryUser` for MIA |
| **Rationale** | Pass 1 must complete before Pass 2 because FK constraints require the target row to exist. Pass 3 is isolated so user lookup failures don't block hierarchy setup. Old code rows are renamed in-place via `upsert { where: { code: OLD }, update: { code: NEW, name: NEW } }`, preserving all FK references from other tables (`ProductConfiguration`, `ProductPercentageCommissionCategory`). |

---

## Data Flow

```
CategoryForm
  ├── color: <input type="color"> → hex string "#RRGGBB"
  ├── idNextCategory: <Select> (categories minus self)
  └── beneficiaryMode === 'BENEFICIARIO_GENERAL'
        └── idFixedBeneficiaryUser: <Select> (active users) [shown conditionally]

→ Zod schema (superRefine cross-field)
→ Server Action / API Route
→ Category Service (Prisma)
→ category table

GET /api/categories
→ prisma.category.findMany({ include: { nextCategory: { select: { idCategory, name } } } })
→ mapper: PrismaCategoryWithRelations → CategoryDomain
→ JSON response
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `color String @db.VarChar(7)` (required), `idNextCategory Int?`, `nextCategory` self-relation; rename enum values |
| `prisma/migrations/…_rename_beneficiary_enum_add_color_hierarchy/migration.sql` | Create | `ALTER TYPE` rename + `ALTER TABLE` for new columns |
| `prisma/seeds/category.ts` | Rewrite | 3-pass seed with new codes, `idNextCategory` links, MIA beneficiary setup |
| `src/features/categories/types/category.types.ts` | Modify | `BeneficiaryMode` union → `'OVERRIDE' \| 'BENEFICIARIO_GENERAL'`; add `color`, `idNextCategory`, `nextCategory` to interfaces |
| `src/features/categories/lib/category-schemas.ts` | Modify | Rename enum literals; add `color` (regex + optional); add `idNextCategory` (int, optional, nullable); update `superRefine` condition |
| `src/features/categories/mappers/category.mapper.ts` | Modify | Map `color`, `idNextCategory`, `nextCategory`; update `beneficiaryMode` guard literals |
| `src/features/categories/components/category-form.tsx` | Modify | Add color picker input; add next-category select (exclude self); rename mode guard `FIXED_BENEFICIARY` → `BENEFICIARIO_GENERAL`; default mode → `OVERRIDE` |
| `src/features/categories/components/category-table-columns.tsx` | Modify | Add color chip column (colored circle + hex text); add next-category name column |

---

## Interfaces / Contracts

```typescript
// category.types.ts
export type BeneficiaryMode = 'OVERRIDE' | 'BENEFICIARIO_GENERAL'

export interface NextCategory {
  readonly idCategory: number
  name: string
}

export interface Category extends Record<string, unknown> {
  // ...existing fields...
  color: string                        // "#RRGGBB" — required
  idNextCategory: number | null
  nextCategory?: NextCategory | null
  beneficiaryMode: BeneficiaryMode    // replaces old union
}
```

```typescript
// Zod schema additions (category-schemas.ts)
const colorHexRegex = /^#[0-9A-Fa-f]{6}$/

// inside schema object:
color: z.string().regex(colorHexRegex, 'Color inválido, debe ser #RRGGBB'),
idNextCategory: z.number().int().positive().nullable().optional(),

// superRefine — rename guard:
if (data.beneficiaryMode === 'BENEFICIARIO_GENERAL' && !data.idFixedBeneficiaryUser) {
  ctx.addIssue({ ... })
}
```

```typescript
// mapper addition (PrismaCategoryWithRelations)
nextCategory?: Pick<PrismaCategory, 'idCategory' | 'name'> | null
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — schema | `BENEFICIARIO_GENERAL` without user → error; `OVERRIDE` without user → valid; invalid hex color → error; valid hex → valid; `idNextCategory` excluded from self-validation (mapper concern, not schema) | Vitest, pure function calls on `createCategorySchema.safeParse` |
| Unit — mapper | `color` and `nextCategory` are mapped correctly; `beneficiaryMode` guard falls through to `OVERRIDE` for unknown values | Vitest with mock `PrismaCategoryWithRelations` objects |
| Unit — form | User selector hidden when `OVERRIDE`; color picker renders; next-category excludes current category's id | RTL `renderHook` + `render` with mocked `useCategoryTypes`, `useActiveUsers` |
| Integration — seed | Pass 1 upserts all 7 with new codes; Pass 2 sets correct `idNextCategory` links; Pass 3 sets MIA beneficiary | Vitest with `prisma-mock` or real test DB |

---

## Migration / Rollout

**Enum rename (migration SQL):**
```sql
ALTER TYPE "BeneficiaryMode" RENAME VALUE 'UPLINE_CHAIN' TO 'OVERRIDE';
ALTER TYPE "BeneficiaryMode" RENAME VALUE 'FIXED_BENEFICIARY' TO 'BENEFICIARIO_GENERAL';
ALTER TABLE "category" ADD COLUMN "color" VARCHAR(7);
ALTER TABLE "category" ADD COLUMN "id_next_category" INTEGER REFERENCES "category"("id_category");
```
`RENAME VALUE` is safe on live tables — no row rewrite, no lock beyond the brief DDL.

**3-pass seed order:**
1. `upsert` all 7 categories (old `code` → new `code`). Safe because `upsert where: { code: OLD }` matches existing row and patches it.
2. For each code, `update` setting `idNextCategory` to the ID of the successor. Requires all 7 to exist.
3. Look up the MIA system user by email; `updateMany` where `code: 'MIA'` to set `BENEFICIARIO_GENERAL` + `idFixedBeneficiaryUser`.

**Hierarchy chain encoded in seed data:**
```
MS_JUNIOR → MS_SENIOR → TEAM_LEADER → PERFORMANCE_LEADER → BUSINESS_LEADER → PARTNER → MIA (null)
```

---

## Open Questions

- [ ] Is the self-referential relation name `nextCategory` / `prevCategories` correct, or does the domain call it something else (e.g. `superiorCategory`)?
- [ ] Should the form's next-category select be disabled for the MIA category (it is the terminal node) or left editable?
