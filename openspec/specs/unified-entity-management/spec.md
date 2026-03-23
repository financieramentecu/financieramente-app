# Specification: unified-entity-management

## Purpose

Single source of truth for admin-related entity logic (Categories, Origins, Products): types, Zod schemas, and API adapters live in core features; Admin consumes them.

## Requirements

### Requirement: Centralized Category Management logic
The system SHALL provide a single source of truth for Category types, Zod schemas, and API adapters within `src/features/categories`.

#### Scenario: Admin consumes core categories
- **WHEN** the Admin Categories feature needs to list or modify categories
- **THEN** it SHALL use the types and schemas defined in `src/features/categories`

### Requirement: Centralized Origin Management logic
The system SHALL provide a single source of truth for Origin (Product and Client) types, Zod schemas, and API adapters within `src/features/origins`.

#### Scenario: Unification of Client Origins
- **WHEN** working with client origins
- **THEN** the system SHALL use the unified logic in `src/features/origins` (formerly `origin-client`)

### Requirement: Centralized Product Management logic
The system SHALL provide a single source of truth for Product types, Zod schemas, and API adapters within `src/features/product`.

#### Scenario: Admin consumes core products
- **WHEN** the Admin Products feature needs to manage products
- **THEN** it SHALL use the unified logic in `src/features/product`
