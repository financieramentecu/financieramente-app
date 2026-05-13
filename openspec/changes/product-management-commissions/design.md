# Design: Product Commission Management Properties

## Technical Approach

Extend the `Product` aggregate with two persisted attributes (`commissionPercentage: Decimal`, `contributionType: ContributionType`) and propagate them through the existing CRUD pipeline of the `product` feature: types -> Zod schemas -> mapper -> API routes (POST/PUT) -> form -> table. The Prisma schema and migration are already in place; the work is mostly threading the fields through existing layers and adding a one-shot CSV sync seed that reuses the established `prisma/seeds/*` pattern.

The change reuses current architecture (no new layer, no new service abstraction). API routes still call Prisma directly because the `product` feature has not yet been migrated to a `services/` layer (consistent with current code). Audit logging continues via `logAuditEvent` for create/update, capturing the new fields in the human-readable `details`.

## Architecture Decisions

| # | Decision | Alternatives | Rationale |
|---|----------|--------------|-----------|
| 1 | Range validation (0-100) at Zod layer only | DB CHECK constraint; app + DB | Zod already gates all writes (POST/PUT). Adding a DB constraint requires a second migration with low marginal value. Single source of truth in `product-schemas.ts`. |
| 2 | `contributionType` required on create, no domain default | Default `REGULAR` in Zod | Spec #747 says "no domain default". Forces explicit choice. Form may pre-select `REGULAR` as a UX hint, but Zod must require the field. |
| 3 | `commissionPercentage` stored as `Decimal`, exposed as `number` | Keep `Decimal` end-to-end | Mapper already calls `.toNumber()`. Consistent with how percentages surface elsewhere (`product-percentage` seed). |
| 4 | CSV match by `(companyName, productName)` case-insensitive | Match by product name only | Product names are unique per company, not globally. Existing `sync-product-commissions.ts` already uses the company+product pair. |
| 5 | CSV percentage stored as 0-100 (NOT 0-1) | Normalize to 0-1 | Form input uses 0-100, table renders `{value}%`, Zod validates `min(0).max(100)`. Existing seed divides by 100 (storing 0.7650), conflicting with UI. **Fix the seed**: strip `%`, store raw number. |
| 6 | Reuse existing form/table layout | New section/tabs | Already implemented in `product-form.tsx` and `products-table.tsx`. No redesign needed. |
| 7 | Audit reuses `PRODUCT_UPDATED` with diff details | New audit actions | `[id]/route.ts` already logs field-level diffs; just keep `commissionPercentage` and `contributionType` rows in the diff list. |

## Data Flow

```
CSV file ──► sync-product-commissions seed ──► prisma.product.update
                                                      │
                                                      ▼
ProductForm ──► Zod validate ──► POST/PUT /api/products ──► prisma.product
     ▲                                  │                          │
     │                                  ▼                          ▼
     │                          logAuditEvent              prismaProductToProduct
     │                                                             │
ProductsTable ◄── GET /api/products ◄── prismaProductListToProducts
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | done | Fields and migration already in place |
| `src/features/product/types/product.types.ts` | done | `ContributionType` and fields already declared |
| `src/features/product/lib/product-schemas.ts` | Modify | Remove `.default('REGULAR')` per Decision #2; add explicit error messages for range and required enum |
| `src/features/product/mappers/product.mapper.ts` | done | Mapper already maps both fields |
| `src/app/api/products/route.ts` | done | POST persists fields and audits |
| `src/app/api/products/[id]/route.ts` | Modify | Add missing `ContributionType` import (used at line 157); audit diff already present |
| `src/features/product/components/product-form.tsx` | done | Both fields rendered |
| `src/features/product/components/products-table.tsx` | done | Both columns present |
| `prisma/seeds/sync-product-commissions.ts` | Modify | Apply Decision #5 (store raw 0-100); confirm `UNICO -> INICIO`; emit summary log |
| `src/features/product/__tests__/product-schemas.test.ts` | Create | Zod rules: range, required enum |
| `src/features/product/__tests__/product.mapper.test.ts` | Create | Decimal -> number, enum passthrough |
| `src/app/api/products/__tests__/route.test.ts` | Create/Modify | POST persists fields, PUT diffs audit, 400 on invalid range |

## Interfaces / Contracts

```ts
// product-schemas.ts (post-change)
commissionPercentage: z.coerce
  .number({ required_error: 'El porcentaje es obligatorio' })
  .min(0, 'El porcentaje no puede ser negativo')
  .max(100, 'El porcentaje no puede exceder 100')
  .default(0),
contributionType: z.enum(['REGULAR', 'INICIO'], {
  required_error: 'El tipo de aporte es obligatorio',
  invalid_type_error: 'Tipo de aporte inválido',
}),
```

CSV row contract (`docs/product-percentage-payment-commission.csv`):
`companyName, _, productName, _, contributionTypeRaw, percentageRaw`
- `contributionTypeRaw`: `UNICO` -> `INICIO`, anything else -> `REGULAR`
- `percentageRaw`: strip `%`, `parseFloat`, store as-is (0-100)

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Zod range/enum, mapper Decimal->number | Vitest, pure functions |
| Integration | POST/PUT persists fields, audit details include diffs, 400 on out-of-range | Vitest + mocked Prisma + mocked `auth()` |
| Manual | CSV seed against staging; verify `updatedCount` matches expected | `npx tsx prisma/seeds/sync-product-commissions.ts` |

E2E not required: no new user journey, only field additions to existing CRUD flows.

## Migration / Rollout

DB migration `20260513031441_add_product_commission_properties` already applied. `commissionPercentage` defaults to 0; existing rows are backfilled safely. After merge, run `sync-product-commissions.ts` once per environment to populate real values from the CSV. No feature flag required.

## Open Questions

- [ ] Confirm with product owner: is `76.50%` from the CSV meant to be stored as `76.50` (Decision #5) or `0.7650`? Current seed uses `0.7650` which contradicts UI/Zod. Design assumes 0-100.
- [ ] Should the Prisma DB-level default for `contributionType` be removed to align with "no domain default" wording? Currently harmless because Zod requires it at API layer.
