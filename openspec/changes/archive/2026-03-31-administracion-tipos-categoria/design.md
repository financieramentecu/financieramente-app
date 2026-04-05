## Context

The `Category` model currently stores its type as a hardcoded string field (`typeCategory: VarChar(20)`) with values `'MMS'`, `'ALIADO'`, `'TRINITY'` defined as TypeScript constants. This makes it impossible for administrators to manage category types without code changes. The category type values are referenced across the system: `ProductConfiguration`, `User`, `ProductPercentageCommissionCategory`, and the category admin forms.

Current schema:
```
Category { typeCategory: String @db.VarChar(20) } // hardcoded: 'MMS' | 'ALIADO' | 'TRINITY'
```

## Goals / Non-Goals

**Goals:**
- Create a `CategoryType` model with full CRUD admin capabilities
- Replace the hardcoded `typeCategory` string in `Category` with a proper FK relationship
- Migrate existing data seamlessly (MMS, ALIADO, TRINITY → `CategoryType` records)
- Follow existing Feature-Based Architecture patterns (replicate `categories` feature structure)

**Non-Goals:**
- Re-designing the category admin module beyond the type field change
- Changing how categories interact with `ProductConfiguration` or `User`
- Supporting hierarchical or nested category types
- Internationalization of category type names

## Decisions

### 1. New `CategoryType` Prisma model with autoincremental PK

**Decision**: Create a `category_type` table with `id` (autoincrement PK), `name` (unique), `description` (nullable), `status` (boolean, default true).

**Rationale**: Matches existing catalog patterns (`ClientOrigin`, `Currency`, `BuyPeriodicity`). No need for a separate `code` field — the PK is the identifier. The `name` field has a unique constraint for duplicate validation (Escenario 2).

**Alternatives considered**:
- Enum in Prisma: Too rigid, still requires code changes to add values
- JSON/config file: Not queryable, no referential integrity

### 2. FK relationship `Category.idCategoryType → CategoryType.id`

**Decision**: Replace `Category.typeCategory` (string) with `Category.idCategoryType` (integer FK). The migration handles the transition.

**Rationale**: Referential integrity via FK constraint. Enables dynamic administration. Standard relational pattern already used throughout the schema (e.g., `Category → ProductConfiguration`).

### 3. New feature at `src/features/category-types/`

**Decision**: Create a standalone feature following the same directory structure as `categories`.

**Rationale**: Feature-Based Architecture principle — each domain concept gets its own feature directory. Keeps concerns separated from the existing `categories` feature.

### 4. Deactivation with usage check (soft delete)

**Decision**: When toggling status to inactive, query `Category` for references. If found, save the change but return a `hasReferences: true` flag so the UI shows an informational alert. The category type is deactivated regardless.

**Rationale**: Matches Escenario 3 — the system saves the state change but warns. References are not cascade-deleted or invalidated. Inactive types simply won't appear in dropdowns for new categories.

### 5. Multi-step migration with data preservation

**Decision**: Use a single Prisma migration with raw SQL to:
1. Create `category_type` table
2. Insert distinct values from existing `type_category` column
3. Add `id_category_type` column to `category`
4. Populate FK from existing string values
5. Set NOT NULL constraint
6. Add FK constraint and index
7. Drop old `type_category` column and its index

**Rationale**: Ensures zero data loss. The migration is atomic. Existing category records maintain their type association.

### 6. Seed update strategy

**Decision**: Update `prisma/seeds/category.ts` to first upsert `CategoryType` records (MMS, Aliado, Trinity), then upsert `Category` records referencing the type IDs.

**Rationale**: Seeds are idempotent (upsert pattern already used). Running seeds on a fresh DB or after migration both work correctly.

## Risks / Trade-offs

- **Migration complexity on production data** → The migration SQL is tested against seed data first. Rollback is possible by reversing the migration (re-adding `type_category` column from the FK relation).
- **Category form breaking during transition** → The `CategoryForm` must be updated simultaneously with the migration. The `CATEGORY_TYPES` constant is removed and replaced with a dynamic fetch. Risk mitigated by deploying all changes together.
- **Downstream consumers of `typeCategory` string** → Any code filtering by `typeCategory` string must be updated to use `idCategoryType` or join through the relation. Grep search shows usage is limited to the categories feature itself plus product-configuration filters.

## Open Questions

- None — all decisions confirmed during exploration phase.
