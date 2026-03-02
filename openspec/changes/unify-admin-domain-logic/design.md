## Context

Currently, `financieramente-app` has duplicated logic for managing core entities (Categories, Origins, Products) across two feature structures:
1. `src/features/admin/[feature]`: Used primarily for CRUD operations in the administration dashboard.
2. `src/features/[feature]`: Used for consumption in the main application domain.

This leads to duplicated types, Zod schemas, API adapters, and React hooks, increasing the risk of business logic drift.

## Goals / Non-Goals

**Goals:**
- Consolidate types, schemas, and API logic into the core domain features (`src/features/[feature]`).
- Refactor `admin` features to consume these centralized core components.
- Standardize on `ApiResponse<T>` and `AsyncState<T>` patterns across all unified features.
- Ensure 100% feature parity after unification.

**Non-Goals:**
- Merging UI components (Admin tables vs Domain lists) - UI remains separate for now to avoid styling/layout complexity.
- Refactoring backend controllers/routes (focused on frontend/logic layer).

## Decisions

### 1. Centralize Logic in Domain Features
We will move all shared logic (types, schemas, API clients, hooks) to the non-admin feature directories.
- **Rationale**: The core domain should be the single source of truth. Admin is a specific use-case of the domain.
- **Alternative**: Moving everything to `admin` (Incorrect, domain needs them too) or a `shared` feature (Adds overhead and pollutes shared).

### 2. Rename `origin-client` to `origins`
Refactor `src/features/origin-client` to `src/features/origins` to house both Product and Client origins.
- **Rationale**: Consistency with other plural feature names (`categories`, `products`).
- **Alternative**: Keep `origin-client`, but it becomes confusing when adding Product origins.

### 3. Unified Hook Signatures
Adopt the domain hook pattern: hooks return `{ state: AsyncState<T>, ...actions }`.
- **Rationale**: Consistent with the project's core principles and provides better loading/error state handling.

## Risks / Trade-offs

- **[Risk] Broken Admin Dashboard** → **Mitigation**: Comprehensive smoke testing of the Admin panel after each entity migration.
- **[Risk] Path Alias Conflicts** → **Mitigation**: Use explicit `@/features/...` imports and verify with TypeScript compiler.
- **[Risk] Differing validation rules** → **Mitigation**: Use `z.object(...).partial()` or specific sub-schemas if Admin needs more/less strict validation than Domain.
