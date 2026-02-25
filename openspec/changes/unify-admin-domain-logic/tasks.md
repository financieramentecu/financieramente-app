## 1. Unify Category Logic

- [ ] 1.1 Move `src/features/admin/categories/types` to `src/features/categories/types` (merging and resolving conflicts)
- [ ] 1.2 Move and refactor `src/features/admin/categories/lib/category-schemas.ts` into `src/features/categories/lib/category-schemas.ts`
- [ ] 1.3 Update `src/features/categories/lib/category-api.ts` to include Admin-specific endpoints if missing
- [ ] 1.4 Refactor `src/features/admin/categories/hooks` to consume `src/features/categories` logic
- [ ] 1.5 Verify Categories Admin UI and run unit tests

## 2. Unify Origin Logic

- [ ] 2.1 Rename `src/features/origin-client` to `src/features/origins`
- [ ] 2.2 Merge `src/features/admin/origins/types` into `src/features/origins/types`
- [ ] 2.3 Merge `src/features/admin/origins/lib/origin-schemas.ts` into `src/features/origins/lib/origin-schemas.ts`
- [ ] 2.4 Update `src/features/origins/lib/origin-api.ts` with Product Origin endpoints
- [ ] 2.5 Refactor `src/features/admin/origins/hooks` to consume `src/features/origins` logic
- [ ] 2.6 Verify Origins Admin UI and run unit tests

## 3. Unify Product Logic

- [ ] 3.1 Merge `src/features/admin/products/types` into `src/features/product/types`
- [ ] 3.2 Merge `src/features/admin/products/lib/product-schemas.ts` into `src/features/product/lib/product-schemas.ts`
- [ ] 3.3 Update `src/features/product/lib/product-api.ts` with Admin endpoints
- [ ] 3.4 Refactor `src/features/admin/products/hooks` to consume `src/features/product` logic
- [ ] 3.5 Verify Products Admin UI and run unit tests

## 4. Final Validation

- [ ] 4.1 Run full unit test suite
- [ ] 4.2 Run `openspec validate unify-admin-domain-logic`
