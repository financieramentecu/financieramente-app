# Change Proposal: Re-structure Admin Folder to Screaming Architecture

## Status: Analysis

## Context
The current `src/features/admin` folder acts as a "catch-all" for various sub-features like `periodicities`, `currencies`, `products`, `users`, `origins`, `categories`, and `companies`. This nested structure hides the system's core domains and creates an artificial hierarchy that doesn't align with Screaming Architecture principles, where top-level folders should reveal what the system does.

## Problem
- **Visibility:** High-level features are hidden inside a generic `admin` folder.
- **Inconsistency:** Some features are at the root of `src/features/` while others are nested.
- **Maintainability:** Shared admin components in `src/features/admin/shared` might be duplicating functionality found in `src/features/shared`.

## Proposed Changes
1. **Promote Sub-features:** Move the following from `src/features/admin/` to `src/features/`:
   - `periodicities` -> `src/features/periodicities`
   - `currencies` -> `src/features/currencies`
   - `products` -> `src/features/products`
   - `users` -> `src/features/users`
   - `origins` -> `src/features/origins`
   - `categories` -> `src/features/categories`
   - `companies` -> `src/features/companies`

2. **Handle Shared Admin Logic:** 
   - Analyze `src/features/admin/shared` (`CrudModal.tsx`, `CrudTable.tsx`, etc.).
   - Evaluate if they should be moved to `src/features/shared` or if they are truly specific to administrative workflows. If specific, consider a better-named shared location or integrate them into a more global UI library.

3. **Update Imports:** Run a global refactor to update all import paths affected by the move.

4. **Verify Routes:** Ensure Next.js page routes (if they mirror this structure) are updated or maintain compatibility through rewrites/refactoring of `src/app`.

## Impact
- **Positive:** Improved domain visibility, flatter structure, easier navigation for new developers.
- **Risk:** Potential broken imports and routing issues if not handled carefully with a robust refactor tool.

## Next Steps
- [ ] Detailed mapping of all affected imports.
- [ ] Execution of file moves.
- [ ] Import refactoring using `sed` or specialized tools.
- [ ] Verification of application build and runtime.
