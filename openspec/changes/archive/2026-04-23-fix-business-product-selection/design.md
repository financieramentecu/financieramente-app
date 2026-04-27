# Design: Fix Business Product Fallback & Enhanced Seeding

## 1. Commission Resolve Logic (Service)
Implemented via a filtered search in `product-configuration.service.ts`:
```typescript
{
    where: {
        active: true,
        productConfiguration: { idProduct: idProduct, active: true }
    }
}
```

## 2. Seed Refactor (Bootstrap)
Iterate over all products and create a baseline `ProductConfiguration` and `ProductPercentageCommission`.

## 3. Unique Identifier Strategy
Updated `buildProductConfigurationCode` to:
`[COMPANY]-[PRODUCT]-[ORIGIN]-[CATEGORY]`
This ensures uniqueness across the entire system.

## Affected Components
- `src/features/negocios/services/product-configuration.service.ts`
- `src/features/negocios/actions/create-business.ts`
- `prisma/seeds/product-percentage.ts`
- `src/features/negocios/lib/product-configuration-code.ts`
- `src/features/negocios/__tests__/services/product-configuration.service.test.ts`
- `src/features/negocios/__tests__/lib/product-configuration-code.test.ts`

## Verification
- Seed execution passed successfully for 91 products.
- Unit tests for fallback logic and code generation passed.
