# Delta for Commission Discounts

This delta applies to `openspec/specs/commission-discounts/spec.md`.

---

## MODIFIED Requirements

### Requirement: API routes MUST NOT import or call Prisma directly

The API routes under `app/api/admin/discounts/` MUST delegate all database operations to the service layer (`commission-discount.service.ts`). Route handlers SHALL only perform: session authentication, request body parsing (Zod), service invocation, and `ApiResponse<T>` response shaping.

(Previously: routes called `prisma.commissionDiscount.*` directly.)

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

(Previously: hook returned `{ data: CommissionDiscount[], isLoading: boolean, error: string | null, refresh: () => void }` — a non-standard custom shape.)

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

## REMOVED Requirements

### Requirement: CommissionConfiguration as source of truth for settlement percentages

(Reason: Fully superseded by `CommissionDiscount`. The `commission_configuration` table is being dropped from the database. `CommissionDiscount` is the exclusive source for IMPUESTO and CLAWBACK percentages. The seed no longer creates `CommissionConfiguration` rows.)

#### Scenario: commission_configuration table does not exist after migration

- GIVEN the `drop_commission_configuration` migration has been applied
- WHEN the database schema is inspected
- THEN the `commission_configuration` table SHALL NOT exist
- AND the `CommissionConfiguration` Prisma model SHALL NOT be present in `prisma/schema.prisma`

#### Scenario: Seed does not reference CommissionConfiguration

- GIVEN `prisma/seeds/discount.ts` is executed
- WHEN the seed runs
- THEN it SHALL NOT attempt to read or write to `commission_configuration`
