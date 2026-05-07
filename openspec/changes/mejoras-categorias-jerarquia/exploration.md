# Exploration: mejoras-categorias-jerarquia

## Current State

Categories ("Jerarquía de la empresa") are a fully implemented CRUD feature. The Prisma model `Category` handles all data. The feature lives at `src/features/categories/` with the standard layered structure: `types/`, `lib/`, `mappers/`, `hooks/`, `components/`, `__tests__/`. Public read + write is handled by `/api/categories` and `/api/categories/[id]`. Seed data is orchestrated by `prisma/seed.ts` calling `prisma/seeds/category.ts`.

## Affected Areas

- `prisma/schema.prisma` — Category model: 2 new fields + self-referential FK + enum rename
- `prisma/seeds/category.ts` — all 7 codes/names must be renamed + new fields seeded (3-pass)
- `src/features/categories/types/category.types.ts` — Category, CreateCategoryInput, UpdateCategoryInput
- `src/features/categories/lib/category-schemas.ts` — Zod schemas for create + update
- `src/features/categories/mappers/category.mapper.ts` — PrismaCategoryWithRelations + mapper
- `src/features/categories/components/category-form.tsx` — color picker + next-category selector + conditional user selector
- `src/features/categories/components/admin-categories-table.tsx` — color swatch + next category column
- `src/features/categories/__tests__/fixtures/mock-category.ts` — mock must include new fields
- `src/app/api/categories/route.ts` — POST validation + GET include nextCategory
- `src/app/api/categories/[id]/route.ts` — PUT must handle new fields

## Schema Analysis

Current `Category` model fields:

| Field | Type | Notes |
|-------|------|-------|
| `idCategory` | Int PK | autoincrement |
| `code` | String @unique VarChar(20) | already unique at DB level |
| `name` | String VarChar(50) | |
| `descripcion` | String? | |
| `status` | Boolean default true | |
| `idCategoryType` | Int FK → CategoryType | |
| `beneficiaryMode` | BeneficiaryMode enum | `UPLINE_CHAIN \| FIXED_BENEFICIARY`, default `UPLINE_CHAIN` |
| `idFixedBeneficiaryUser` | Int? FK → User | required when mode is `FIXED_BENEFICIARY` |

Missing:
- `color` — not in schema, not in types, not in UI
- `idNextCategory` — self-referential FK for hierarchy sequence

## Seed Data

Current categories and requested renames:

| Old code | Old name | New code | New name |
|----------|----------|----------|----------|
| JUNIOR | Junior | MS_JUNIOR | MS Junior |
| SENIOR | Senior | MS_SENIOR | MS Senior |
| LIDER | Líder | TEAM_LEADER | Team Leader |
| COACH | Coach | PERFORMANCE_LEADER | Performance Leader |
| GENERAL | General | BUSINESS_LEADER | Business Leader |
| PRESIDENTE | Presidente | PARTNER | Partner |
| AGENCIA | Agencia | MIA | MIA |

Hierarchy: `MS_JUNIOR → MS_SENIOR → TEAM_LEADER → PERFORMANCE_LEADER → BUSINESS_LEADER → PARTNER → MIA`

## Approaches

### 1. Self-referential FK for nextCategory (recommended)
- Add `color String? @db.VarChar(7)`
- Add `idNextCategory Int?` self-referential FK with Prisma relation
- Rename enum: `UPLINE_CHAIN → OVERRIDE`, `FIXED_BENEFICIARY → BENEFICIARIO_GENERAL`
- 3-pass seed: create all 7 → set nextCategory links → set beneficiary user links
- Pros: semantically correct, queryable as graph, follows existing 2-pass seed pattern
- Cons: self-referential FK requires seed ordering care
- Effort: Medium

### 2. Integer `order` field
- Add `order Int @unique` (1=MS_JUNIOR…7=MIA) instead of FK
- Pros: simpler, no circular dependency in seed
- Cons: doesn't encode the graph explicitly, next must be computed as order+1
- Effort: Low

## Recommendation

Approach 1 (self-referential FK). Correctly models the domain as a linked list. 3-pass seed pattern follows existing `seedCategoryBeneficiaryLinks` convention.

## Risks

- Enum rename in PostgreSQL requires `ALTER TYPE ... RENAME VALUE` — Prisma may not generate this correctly, manual SQL review needed
- Renaming codes in seed: old codes may have FK references in `ProductPercentageCommissionCategory` or `User` — update in-place, never delete+recreate
- Self-referential FK: both categories must exist before linking (solved by 3-pass seed)
- Color picker may emit hex with alpha — validate with regex `^#[0-9a-fA-F]{6}$`

## Ready for Proposal

Yes.
