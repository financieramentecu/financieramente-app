## Why

The `Category` model currently uses a hardcoded string field (`typeCategory`) with values like `'MMS'`, `'ALIADO'`, `'TRINITY'`. These values cannot be managed through the UI — adding, editing, or deactivating a category type requires code changes and a redeployment. Administrators need the ability to manage category types dynamically through the admin module.

## What Changes

- **New `CategoryType` model**: A new database table (`category_type`) with `name` (unique), `description`, and `status` fields, managed via autoincremental PK.
- **Full CRUD admin UI**: List, create, edit, and toggle status of category types from the administration module.
- **Duplicate name validation**: The system prevents creating category types with duplicate names, showing an appropriate error message.
- **Soft-delete with usage warning**: When deactivating a category type that is referenced by existing categories, the system saves the change but displays an informational alert that existing records won't be affected.
- **`Category` model refactor**: Replace the `typeCategory` string column with a foreign key (`idCategoryType`) referencing the new `CategoryType` table.
- **Data migration**: Existing `typeCategory` string values are migrated to `CategoryType` records, and the FK relationship is established.
- **Seed update**: The seed script is updated to populate `CategoryType` records and link existing categories to them.
- **Category form update**: The "Tipo de Categoría" select in the category form changes from hardcoded constants to a dynamic fetch from `CategoryType`.

## Capabilities

### New Capabilities
- `category-type-admin`: Full CRUD administration for category types, including list with pagination/search, create, edit, toggle status, duplicate name validation, and usage-aware deactivation warnings.

### Modified Capabilities
- `categories`: The `Category` model changes its `typeCategory` string field to a foreign key relationship with the new `CategoryType` table. The category form's "Tipo de Categoría" select becomes dynamic.

## Impact

- **Database**: New `category_type` table. `category` table loses `type_category` column, gains `id_category_type` FK column. Migration required for existing data.
- **Prisma schema**: New `CategoryType` model. `Category` model modified (field + relation change).
- **API**: New `/api/category-types` endpoints (GET list, POST create). New `/api/category-types/[id]` endpoints (GET, PUT, PATCH toggle).
- **Feature code**: New `src/features/category-types/` feature directory. Modified `src/features/categories/` (types, form, schemas, mapper).
- **Pages**: New `src/app/dashboard/admin/category-types/` pages (list, create, edit).
- **Seeds**: Updated `prisma/seeds/category.ts` to include category type seeding.
- **Navigation**: Admin sidebar updated to include "Tipo de Categoría" option.
