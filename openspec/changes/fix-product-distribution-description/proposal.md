## Why

T- In the product configuration table, the "Distribución para nuevos negocios" column may show incorrect or inactive descriptions if multiple distributions exist and the wrong one is linked.
- The system currently allows multiple active commission distributions for the same product, which can lead to calculation ambiguities.

## Objectives
- Ensure the product table always displays the description of the currently active distribution.
- Prevent the creation or activation of more than one distribution per product configuration.

## What Changes

- **Backend Include Update**: Modify the Prisma queries in the product configuration API routes to fetch all related `productPercentageCommissions` instead of just the one linked as "New Businesses".
- **Domain Mapper Logic**: Update the `product-configuration` mapper to scan the list of related distributions and select the one where `active` is `true`.
- **Display Property**: Ensure the `newBusinessesDistributionDescription` field in the domain object is populated with the description of the *active* distribution.

## Capabilities

### New Capabilities
- `product-configuration`: Manage and display product-specific settlement configurations including commission distributions.

### Modified Capabilities
<!-- No existing spec for product-configuration in openspec/specs/ yet -->

## Impact

- **API Routes**: `src/app/api/product-configurations/route.ts` and `src/app/api/product-configurations/[id]/route.ts`.
- **Mappers**: `src/features/product-configuration/mappers/product-configuration.mapper.ts`.
- **UI Components**: `src/features/product-configuration/components/product-configurations-table.tsx`.
