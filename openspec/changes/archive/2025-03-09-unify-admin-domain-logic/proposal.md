## Why

Redundant logic between the administration module (`src/features/admin/*`) and the core domain features leads to code duplication, synchronization issues in business rules, and increased maintenance effort. Unifying these logic paths ensures a single source of truth for entity management.

## What Changes

- Consolidation of API adapters, Zod schemas, and hooks between `admin/categories` and `categories`.
- Consolidation of API adapters, Zod schemas, and hooks between `admin/origins` and `origin-client`.
- Consolidation of API adapters, Zod schemas, and hooks between `admin/products` and `product`.
- Standardization of the `admin` sub-features to consume core domain logic instead of having their own parallel implementation.

## Capabilities

### New Capabilities
- `unified-entity-management`: A centralized framework for entity CRUD (Create, Read, Update, Delete) that serves both admin and domain-specific views.

### Modified Capabilities
- `category-management`: Update to use unified API adapters and schemas.
- `origin-management`: Update to use unified API adapters and schemas.
- `product-management`: Update to use unified API adapters and schemas.

## Impact

- **Affected Directories**:
  * `src/features/admin/categories/`
  * `src/features/categories/`
  * `src/features/admin/origins/`
  * `src/features/origin-client/`
  * `src/features/admin/products/`
  * `src/features/product/`
- **Dependencies**: Streamlined internal imports, reducing cross-feature redundancy.
- **Architectural Integrity**: Better alignment with Screaming Architecture and DRY principles.
