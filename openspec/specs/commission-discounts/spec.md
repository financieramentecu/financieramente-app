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
- **CommissionConfiguration**: **Removed** — table `commission_configuration` was dropped via migration `drop_commission_configuration`. `CommissionDiscount` is the sole source of truth for settlement percentages. No seed or code references `CommissionConfiguration`.
- **Audit**: Use `AuditLog` with new actions (e.g. DISCOUNT_CREATED, DISCOUNT_INACTIVATED); include user, timestamp, and payload in `details`.

## Acceptance Criteria (summary)

- Create discount: form with name, type (Impuesto/Clawback), percentage (0.01–100), description, status (default Active). Validate no other ACTIVE for same type.
- Only one ACTIVE discount per type; inactivate existing before creating new one for that type.
- Inactivate: confirmation modal; update status; audit log; no edit/reactivate of inactive records.
- List: columns Name, Type, Percentage, Status, Created at, Created by, Last modified, Modified by, Actions (Inactivar only for ACTIVE).

---

## Requirements (from refactor-admin-discount — 2026-03-16)

### Requirement: API routes MUST NOT import or call Prisma directly

The API routes under `app/api/admin/discounts/` MUST delegate all database operations to the service layer (`commission-discount.service.ts`). Route handlers SHALL only perform: session authentication, request body parsing (Zod), service invocation, and `ApiResponse<T>` response shaping.

#### Scenario: List discounts via GET route

- GIVEN an authenticated administrator
- WHEN `GET /api/admin/discounts` is called
- THEN the route SHALL call `listDiscounts()` from the service
- AND SHALL NOT import `@/lib/prisma` in the route file
- AND SHALL return `ApiResponse<CommissionDiscount[]>`

#### Scenario: Create discount via POST route

- GIVEN an authenticated administrator with valid payload
- WHEN `POST /api/admin/discounts` is called
- THEN the route SHALL call `findActiveByType(type)` and `createDiscount(input, userId)` from the service
- AND SHALL NOT call `prisma.*` directly in the route file

#### Scenario: Inactivate discount via POST route

- GIVEN an authenticated administrator with a valid discount id
- WHEN `POST /api/admin/discounts/[id]/inactivate` is called
- THEN the route SHALL call `findDiscountById(id)` and `inactivateDiscount(id, userId)` from the service
- AND SHALL NOT call `prisma.*` directly in the route file

---

### Requirement: `useCommissionDiscounts` MUST return `AsyncState<CommissionDiscount[]>`

The `useCommissionDiscounts` hook MUST return `{ state: AsyncState<CommissionDiscount[]>, refresh: () => void }`. The hook SHALL transition through `idle → loading → success | error` states as defined in `src/features/shared/types/async-state.types.ts`.

#### Scenario: Successful fetch

- GIVEN the hook is mounted and `getCommissionDiscounts()` resolves with a list
- WHEN the fetch completes
- THEN `state.status` SHALL be `'success'`
- AND `state.data` SHALL be the resolved `CommissionDiscount[]`

#### Scenario: Fetch in progress

- GIVEN the hook is mounted and the API call is pending
- WHEN the component renders before the response arrives
- THEN `state.status` SHALL be `'loading'`
- AND `state.data` SHALL be `undefined`

#### Scenario: Fetch fails

- GIVEN the hook is mounted and `getCommissionDiscounts()` rejects
- WHEN the error is caught
- THEN `state.status` SHALL be `'error'`
- AND `state.error` SHALL be a non-empty string describing the failure

#### Scenario: Refresh re-triggers loading

- GIVEN `state.status` is `'success'`
- WHEN `refresh()` is called
- THEN `state.status` SHALL transition back to `'loading'`
- AND THEN SHALL settle to `'success'` or `'error'` after the fetch completes

---

### Requirement: Discounts page MUST consume `AsyncState<T>` for rendering decisions

The discounts admin page (`app/dashboard/admin/discounts/page.tsx`) SHALL narrow on `state.status` to decide what to render, rather than reading individual boolean flags.

#### Scenario: Page renders loading skeleton

- GIVEN `state.status === 'loading'`
- WHEN the page renders
- THEN it SHALL display a loading skeleton (not the table)

#### Scenario: Page renders table on success

- GIVEN `state.status === 'success'`
- WHEN the page renders
- THEN it SHALL pass `state.data` to `CommissionDiscountsTable`

---

### REMOVED: CommissionConfiguration as source of truth for settlement percentages

The `commission_configuration` table has been dropped from the database via migration `drop_commission_configuration`. `CommissionDiscount` is the exclusive source for IMPUESTO and CLAWBACK percentages. The seed no longer creates `CommissionConfiguration` rows.

#### Scenario: commission_configuration table does not exist after migration

- GIVEN the `drop_commission_configuration` migration has been applied
- WHEN the database schema is inspected
- THEN the `commission_configuration` table SHALL NOT exist
- AND the `CommissionConfiguration` Prisma model SHALL NOT be present in `prisma/schema.prisma`

#### Scenario: Seed does not reference CommissionConfiguration

- GIVEN `prisma/seeds/discount.ts` is executed
- WHEN the seed runs
- THEN it SHALL NOT attempt to read or write to `commission_configuration`
