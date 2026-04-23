# Proposal: Fix Business Product Fallback & Enhanced Seeding

## Goal
1. Ensure all new businesses use the correct Product/Company identity.
2. Automate the creation of default commission plans for ALL products in the database to prevent configuration gaps.

## Context
The current system fails to correctly identify products during creation because of a global fallback to Skandia. Furthermore, adding new products via CSV doesn't automatically create the necessary commission plans, leading to more "unconfigured product" errors.

## Proposed Changes

### 1. Service Refactor (Logic Fix)
Modify `src/features/negocios/services/product-configuration.service.ts`:
- Filter fallback commission search by `idProduct`.
- Ensure `getPpcForNewBusinesses` only returns plans belonging to the selected product.

### 2. Action Update (Error Handling)
Modify `src/features/negocios/actions/create-business.ts`:
- Return a clear error if no commission plan (specific or fallback) exists for the product.

### 3. Seed Enhancement (Data Bootstrap)
Modify `prisma/seeds/product-percentage.ts`:
- Refactor `seedProductPercentages` to iterate over ALL products in the database.
- For each product, ensure a `ProductConfiguration` exists for:
    - Origin: "Propio"
    - Category: "JUNIOR"
- Create a default `ProductPercentageCommission` linked to this configuration.
- Assign a 60% (0.60) distribution to the "JUNIOR" category.

### 4. Unique Code Refactor
Modify `src/features/negocios/lib/product-configuration-code.ts`:
- Include `companyName` in the generated code to prevent collisions between different companies' products.

## User Review Required
> [!IMPORTANT]
> The seed will now create a 60% Junior commission for every product. Admin users will still need to manually configure the remaining distribution (or adjust the 60%) if they want 100% payout.

## Verification Plan
1. **Unit Test**: Verify the filtered fallback logic.
2. **Seed Run**: Execute `npx tsx prisma/seed.ts` and verify that all products now have at least one configuration in the "Product Configuration" view.
3. **Manual Test**: Create a business with a newly seeded product and verify success.
