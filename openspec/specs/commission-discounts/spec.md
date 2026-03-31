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
# Delta for Commission Discounts

This delta specifies the requirements and scenarios introduced by the admin-discount change. The main spec is `openspec/specs/commission-discounts/spec.md`.

## ADDED Requirements

### Requirement: CommissionDiscount model and one-active-per-type constraint

The system SHALL persist commission discounts in a `CommissionDiscount` model (table `commission_discount`) with fields: name (required), type (IMPUESTO | CLAWBACK), percentage (0.01–100), description (optional), status (ACTIVE | INACTIVE, default ACTIVE), timestamps, and optional createdBy/updatedBy. The system SHALL enforce that at most one discount per type has status ACTIVE (via partial unique index or equivalent application check).

#### Scenario: Create first active discount for a type

- GIVEN no ACTIVE CommissionDiscount exists for type IMPUESTO
- WHEN an administrator creates a discount with type IMPUESTO, percentage 12, name "Impuesto vigente", status ACTIVE
- THEN the system SHALL persist the record
- AND SHALL set status to ACTIVE

#### Scenario: Reject second active discount for same type

- GIVEN an ACTIVE CommissionDiscount already exists for type CLAWBACK
- WHEN an administrator attempts to create another discount with type CLAWBACK and status ACTIVE
- THEN the system SHALL reject the request (e.g. validation or unique constraint)
- AND SHALL NOT persist a second ACTIVE discount for CLAWBACK

#### Scenario: Inactivate then create new active for same type

- GIVEN an ACTIVE CommissionDiscount exists for type IMPUESTO
- WHEN the administrator inactivates it and then creates a new discount with type IMPUESTO and status ACTIVE
- THEN the system SHALL persist the new record as ACTIVE
- AND SHALL allow at most one ACTIVE per type at any time

### Requirement: Admin API for discounts

The system SHALL expose admin-scoped API routes under `app/api/admin/discounts/`: GET list of discounts, POST create, POST [id]/inactivate. Routes SHALL be protected by existing admin auth and role checks.

#### Scenario: List discounts

- GIVEN the user is an authenticated administrator
- WHEN the user requests GET /api/admin/discounts
- THEN the system SHALL return a list of CommissionDiscount records
- AND SHALL include at least: id, name, type, percentage, status, createdAt, createdBy (or equivalent), updatedAt, updatedBy

#### Scenario: Create discount (valid)

- GIVEN the user is an authenticated administrator
- AND no ACTIVE discount exists for the given type (or the request will inactivate the existing one first)
- WHEN the user sends POST /api/admin/discounts with valid payload (name, type, percentage 0.01–100, optional description, status)
- THEN the system SHALL create the CommissionDiscount
- AND SHALL return success with the created resource

#### Scenario: Create discount — validation error (percentage out of range)

- GIVEN the user is an authenticated administrator
- WHEN the user sends POST /api/admin/discounts with percentage outside 0.01–100
- THEN the system SHALL reject the request with validation error
- AND SHALL NOT persist the record

#### Scenario: Inactivate discount

- GIVEN the user is an authenticated administrator
- AND a CommissionDiscount with status ACTIVE exists with a given id
- WHEN the user sends POST /api/admin/discounts/[id]/inactivate
- THEN the system SHALL set status to INACTIVE for that record
- AND SHALL NOT allow edit or reactivate of inactive records (read-only for history)

#### Scenario: Unauthorized access to discount API

- GIVEN the user is not an administrator (or not authenticated)
- WHEN the user requests GET /api/admin/discounts or POST create/inactivate
- THEN the system SHALL respond with unauthorized (e.g. 401 or 403)

### Requirement: Admin UI entry and Descuentos page

The system SHALL provide an entry "Descuentos" under Administración in the dashboard, linking to `app/dashboard/admin/discounts/`. The discounts page SHALL list discounts with required columns and allow create and inactivate (with confirmation for inactivate).

#### Scenario: Admin sees Descuentos entry

- GIVEN the user is an authenticated administrator
- WHEN the user navigates to the admin section of the dashboard
- THEN the system SHALL display a "Descuentos" card (or link) that navigates to the discounts page

#### Scenario: List page shows required columns

- GIVEN the user is on the admin discounts page
- WHEN the list is loaded
- THEN the system SHALL display at least: Name, Type, Percentage, Status, Created at, Created by, Last modified, Modified by, Actions
- AND SHALL show "Inactivar" only for rows with status ACTIVE

#### Scenario: Inactivate with confirmation

- GIVEN the user is on the admin discounts page and a discount is ACTIVE
- WHEN the user clicks Inactivar
- THEN the system SHALL show a confirmation modal
- AND upon confirm SHALL call the inactivate API and SHALL update the list (and SHALL record audit log)

### Requirement: Audit log for discount actions

The system SHALL record audit log entries for discount lifecycle events. New actions SHALL be DISCOUNT_CREATED and DISCOUNT_INACTIVATED. Each entry SHALL include user, timestamp, and payload (or relevant details) in details.

#### Scenario: Audit on create

- GIVEN the user is an authenticated administrator
- WHEN a new CommissionDiscount is created via the API
- THEN the system SHALL create an AuditLog entry with action DISCOUNT_CREATED
- AND SHALL include in details at least: user (or userId), timestamp, and payload (e.g. name, type, percentage, id)

#### Scenario: Audit on inactivate

- GIVEN the user is an authenticated administrator
- WHEN an active CommissionDiscount is inactivated via the API
- THEN the system SHALL create an AuditLog entry with action DISCOUNT_INACTIVATED
- AND SHALL include in details at least: user (or userId), timestamp, and payload (e.g. discount id, previous status)

### Requirement: Migration path from CommissionConfiguration

The system SHALL migrate or deprecate existing CommissionConfiguration so that CommissionDiscount becomes the single source of truth for settlement percentages. If migration is chosen, the system SHALL ensure at least one ACTIVE discount per type exists after migration (or seed); process-batch SHALL use CommissionDiscount with fallback defaults when none active.

#### Scenario: Process-batch uses CommissionDiscount (see load-file-v2 delta)

- GIVEN process-batch is saving a synchronized or LAG record
- WHEN the system resolves discount and clawback percentages
- THEN the system SHALL resolve active CommissionDiscount by type (IMPUESTO → discountPercentage, CLAWBACK → clawbackPercentage)
- AND SHALL fall back to 0.12 for IMPUESTO and 0.1 for CLAWBACK when no ACTIVE discount exists for that type
