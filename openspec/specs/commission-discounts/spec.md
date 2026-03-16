# Specification: Commission Discounts (Dynamic Discount Management)

**Diseño:** En este proyecto, siempre que se hable de diseño o se implemente UI/UX se usa el skill **ui-ux-pro-max**; referencia visual: **`financieramnete.pen`**. Ver `.cursor/rules/design.mdc`.

## Purpose

Allow system administrators to manage discount percentages (Impuesto and Clawback) dynamically from the application, with one active discount per type and full audit trail. No technical intervention required to change percentages; traceability of the discount used in each commission distribution is preserved.

## Naming and Placement

| Concept | Value |
|--------|--------|
| **Prisma model** | `CommissionDiscount` |
| **Database table** | `commission_discount` (`@@map("commission_discount")`) |
| **Feature folder** | `src/features/commission-discounts/` (root of features, **not** under `admin`) |
| **UI entry** | Under Administración: page at `app/dashboard/admin/discounts/`, link from admin panel |
| **API routes** | `app/api/admin/discounts/` (admin-scoped routes; feature logic lives in `commission-discounts`) |

## Feature Structure (align with existing root features)

Follow the same structure and principles as `distribution-commission`, `categories`, `negocios`:

```
src/features/commission-discounts/
├── components/          # React components (table, form, modals)
├── hooks/               # useCommissionDiscounts, useCommissionDiscountMutations, etc.
├── lib/                 # commission-discount-api.ts, commission-discount-schemas.ts
├── types/               # commission-discount.types.ts
├── services/            # (optional) domain services if needed
├── mappers/             # (optional) Prisma <-> domain mappers
└── __tests__/           # Colocated unit/integration tests
```

- **Types**: Domain types in `types/`; no Prisma types in components.
- **Lib**: Zod schemas (create, validations), API helpers or fetch wrappers used by hooks.
- **Hooks**: Data fetching and mutations; return `AsyncState<T>` for async data.
- **Components**: UI only; use hooks and types from the same feature.
- **Imports**: Use `@/` path aliases; no relative `../..` outside the feature when crossing boundaries.

## Data Model (CommissionDiscount)

- **name**: string, required.
- **type**: enum `IMPUESTO` | `CLAWBACK`, required.
- **percentage**: decimal (0.01–100), required.
- **description**: string, optional.
- **status**: `ACTIVE` | `INACTIVE`, default `ACTIVE`.
- **createdAt**, **updatedAt**: timestamps.
- **createdById**, **updatedById**: optional FK to User for audit (or rely on AuditLog only).

**Constraint**: At most one row with `status = 'ACTIVE'` per `type` (partial unique index or application-level check).

## Integration with Existing Code

- **load-file (process-batch)**: Resolve active discount by type (IMPUESTO → `discountPercentage`, CLAWBACK → `clawbackPercentage`). Fallback to current defaults (e.g. 0.12 / 0.1) when no active discount for a type.
- **CommissionConfiguration**: To be deprecated or migrated; new source of truth for percentages is CommissionDiscount (one active per type).
- **Audit**: Use `AuditLog` with new actions (e.g. DISCOUNT_CREATED, DISCOUNT_INACTIVATED); include user, timestamp, and payload in `details`.

## Acceptance Criteria (summary)

- Create discount: form with name, type (Impuesto/Clawback), percentage (0.01–100), description, status (default Active). Validate no other ACTIVE for same type.
- Only one ACTIVE discount per type; inactivate existing before creating new one for that type.
- Inactivate: confirmation modal; update status; audit log; no edit/reactivate of inactive records.
- List: columns Name, Type, Percentage, Status, Created at, Created by, Last modified, Modified by, Actions (Inactivar only for ACTIVE).
