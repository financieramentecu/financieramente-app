# Proposal: Product Commission Management Properties

## Intent

Add properties to the `Product` entity to store commission-related metadata and contribution types. Currently, products lack these fields, making it difficult to define standard commission rates or differentiate between contribution types (REGULAR vs INICIO) at the product level. This information is critical for managing business operations and potentially future commission calculations.

## Scope

### In Scope
- Add `commissionPercentage` field to the `Product` model in Prisma.
- Add `contributionType` field to the `Product` model in Prisma using an Enum.
- Update the Product Management UI (Form and Table) to manage these new properties.
- Update API endpoints for creating and updating products to include these fields.
- Update TypeScript types and Zod schemas to support the new fields.
- Update the product mapper to handle the new fields.

### Out of Scope
- Integration of `commissionPercentage` into the current automated commission calculation logic (this will be addressed in a future change).
- Bulk update of existing products' contribution types (they will default to a selected value).

## Capabilities

### New Capabilities
- `product-management`: Manage products including commission percentages and contribution types.

### Modified Capabilities
None.

## Approach

The implementation will follow the project's standard Feature-Based Architecture:
1. **Database Layer**: Create a Prisma migration to add the new fields and enum to the `Product` model.
2. **Domain Layer**: Update the `Product` interface and the creation/update DTOs.
3. **Application Layer**: Update Zod schemas and the mapper to handle the new fields.
4. **UI Layer**:
   - Update `ProductForm` with a numeric input for `commissionPercentage` and a select input for `contributionType`.
   - Update `ProductsTable` to display these new columns.
5. **API Layer**: Update the route handlers to process and validate the new fields.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Added fields and enum. |
| `src/features/product/types/product.types.ts` | Modified | Updated interfaces. |
| `src/features/product/lib/product-schemas.ts` | Modified | Updated Zod validation. |
| `src/features/product/mappers/product.mapper.ts` | Modified | Updated Prisma-to-Domain mapping. |
| `src/features/product/components/product-form.tsx` | Modified | Added new form fields. |
| `src/features/product/components/products-table.tsx` | Modified | Added new table columns. |
| `src/app/api/products/route.ts` | Modified | Support new fields in creation. |
| `src/app/api/products/[id]/route.ts` | Modified | Support new fields in update. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Database migration failure | Low | Standard Prisma migration process; verify in dev environment. |
| UI breakage | Low | TypeScript will catch type mismatches; verify with existing tests. |

## Rollback Plan

1. Revert code changes in Git.
2. Run Prisma migration rollback or manually drop the added columns and enum in the database.

## Dependencies

- None.

## Success Criteria

- [ ] Prisma schema reflects the new fields.
- [ ] Administrators can set `commissionPercentage` and `contributionType` when creating/editing products.
- [ ] Product list displays the new properties correctly.
- [ ] API successfully persists and returns the new fields.
- [ ] All existing and new tests pass.
