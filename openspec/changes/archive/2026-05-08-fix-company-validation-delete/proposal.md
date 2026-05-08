# Proposal: Fix Company Validation and Soft Delete

## Intent
Resolve a usability bug where updating a company's currency fails due to a Zod type mismatch (string vs number). Additionally, refine the "soft delete" logic for companies to ensure consistency across the administrative module.

## Scope

### In Scope
- Fix Zod schemas in `company-schemas.ts` to support both string and number for `idCurrency`.
- Adjust `POST` and `PUT` API routes for companies to handle the flexibilized schema.
- Refine `DELETE` logic for companies to ensure it correctly implements soft delete (status=false) with proper impact validation.
- Update unit tests to verify the fix and the soft delete behavior.

### Out of Scope
- Changing the database schema for companies.
- Refactoring the entire administrative module.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- **company-management**: Update validation requirements for currency and soft delete behavior.

## Approach
1. **Flexibilize Schema**: Use `z.coerce.string()` or `z.union([z.string(), z.number()])` in `company-schemas.ts` for `idCurrency`. This allows the form (string) and the API client (number) to both pass validation.
2. **Standardize Soft Delete**: Ensure the `DELETE` route uses the `status` flag and returns a consistent response. Verify that the impact check (checking for active products) is robust.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/company/lib/company-schemas.ts` | Modified | Flexibilize `idCurrency` type. |
| `src/app/api/admin/companies/route.ts` | Modified | Ensure POST handles the schema change. |
| `src/app/api/admin/companies/[id]/route.ts` | Modified | Ensure PUT and DELETE handle the schema and soft delete logic. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Type mismatch in database | Low | The API already uses `parseInt()` before querying Prisma. |
| Active products left orphan | Low | Keep the existing check for active products before deactivating. |

## Rollback Plan
Revert changes in `company-schemas.ts` and API routes to the previous commit.

## Success Criteria
- [ ] Company can be updated with a new currency without "Invalid input" error.
- [ ] Deleting a company sets `status: false` and prevents deletion if active products exist.
- [ ] Unit tests for company validation pass.
