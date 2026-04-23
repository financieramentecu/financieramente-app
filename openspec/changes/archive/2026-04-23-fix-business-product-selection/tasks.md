# Tasks: Fix Business Product Selection Identity

## Phase 1: Logic and Foundation

- [x] 1.1 Update `buildProductConfigurationCode` in `src/features/negocios/lib/product-configuration-code.ts` to include `companyName` (4 segments).
- [x] 1.2 Refactor `getPpcForNewBusinesses` in `src/features/negocios/services/product-configuration.service.ts` to implement Priority 2 fallback (Product only) and add debug logging.
- [x] 1.3 Update the Product Configurations API route in `src/app/api/product-configurations/route.ts` to include the company name when generating codes.

## Phase 2: Seeding and Data Integrity

- [x] 2.1 Refactor `prisma/seeds/product-percentage.ts` to:
    - [x] Iterate over all active products with their companies.
    - [x] Set `active: true` for all configurations.
    - [x] Ensure `idProductPercentageCommissionNewBusinesses` is always set.
    - [x] Create a "Propio" Junior 60% fallback for every product.

## Phase 3: Verification and Testing

- [x] 3.1 Update unit tests in `src/features/negocios/__tests__/lib/product-configuration-code.test.ts` for the 4-segment format.
- [x] 3.2 Update unit tests in `src/features/negocios/__tests__/services/product-configuration.service.test.ts` for strictly product-based fallback.
- [x] 3.3 Execute `npx tsx prisma/seed.ts` and verify completion (Exit code 0).
- [x] 3.4 Manual verification: Create a business with a non-Skandia product and verify it doesn't default to Skandia.

## Phase 4: Cleanup

- [x] 4.1 Synchronize all artifacts (`proposal`, `design`, `spec`, `tasks`) to `openspec/changes/fix-business-product-selection/`.
- [ ] 4.2 Run `sdd-archive` to merge delta specs.
