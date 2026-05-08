# Design: Company Validation and Soft Delete Fixes

## Technical Approach

The overall strategy is to relax the Zod schema validation for `idCurrency` to support both string and numeric inputs, and to ensure that the soft delete (deactivation) logic is robust and consistent across both update (PUT) and deletion (DELETE) endpoints.

1.  **Schema Relaxation**: Use `z.coerce.string()` for `idCurrency`. This is the most resilient approach as it handles numbers from the API client and strings from the form without breaking validation.
2.  **Soft Delete Enforcement**: Maintain the existing logic that prevents deactivating or "deleting" (deactivating) a company if it has active products associated with it.

## Architecture Decisions

### Decision: Coerce Currency ID to String

**Choice**: Use `z.coerce.string()` instead of `z.union([z.string(), z.number()])`.
**Alternatives considered**: `z.union`, `z.preprocess`.
**Rationale**: `z.coerce.string()` is cleaner and more idiomatic in Zod for values that might arrive as numbers but need to be treated as identifiers (strings). It also simplifies the mapping logic in the API handlers where `parseInt` is already being used.

### Decision: Centralized Impact Validation

**Choice**: Keep the impact validation (checking for active products) inside the API route handlers.
**Alternatives considered**: Move to a service layer.
**Rationale**: Given the current project structure, the API routes handle the orchestration of validation and database calls. While a service layer would be more "hexagonal", keeping it in the routes follows the existing pattern in `src/app/api/admin/companies/`.

## Data Flow

The flow for updating a company remains the same, but with more flexible validation:

    Form/Client ──→ API Route (PUT) ──→ Zod Validation (Coerce) ──→ Impact Check ──→ Prisma Update
                                               │
                                               └─→ Failure (400) if invalid format

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/company/lib/company-schemas.ts` | Modify | Update `idCurrency` to use `z.coerce.string()`. |
| `src/features/company/__tests__/lib/company-schemas.test.ts` | Modify | Add test cases for numeric `idCurrency`. |

## Interfaces / Contracts

The Zod schemas will be updated as follows:

```typescript
// src/features/company/lib/company-schemas.ts
export const createCompanySchema = z.object({
  // ...
  idCurrency: z.coerce.string().min(1, 'La moneda es obligatoria'),
  // ...
})

export const updateCompanySchema = z.object({
  // ...
  idCurrency: z.coerce.string().min(1, 'La moneda es obligatoria').optional(),
  // ...
})
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Zod Schema Validation | Verify that `idCurrency` accepts strings, numbers, and rejects empty values. |
| Integration | API PUT / DELETE | Verify that deactivation/deletion is blocked if active products exist. |

## Migration / Rollout

No migration required. This is a logic fix for existing endpoints.

## Open Questions

None. The existing code already implements most of the requested behavior (impact checks); the primary fix is the schema discrepancy.
