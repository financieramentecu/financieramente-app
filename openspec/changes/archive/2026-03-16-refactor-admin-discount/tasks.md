# Tasks: Refactor Admin Discount — Service Layer, AsyncState Hooks, Menu Nav, Drop CommissionConfiguration

> Mode: hybrid | TDD enforced | Incremental baby steps

---

## Phase 1: Service Layer — Extract Prisma from Routes (RED → GREEN)

- [x] 1.1 **[RED]** Update `src/app/api/admin/discounts/__tests__/route.test.ts`: replace the `commissionDiscount` prisma mock with `vi.mock('@/features/commission-discounts/services/commission-discount.service')` exposing `listDiscounts`, `findActiveByType`, `createDiscount` — run tests, confirm they FAIL (route still imports prisma)
- [x] 1.2 **[RED]** Update `src/app/api/admin/discounts/[id]/inactivate/__tests__/route.test.ts`: replace the `commissionDiscount` prisma mock with `vi.mock('@/features/commission-discounts/services/commission-discount.service')` exposing `findDiscountById`, `inactivateDiscount` — run tests, confirm they FAIL
- [x] 1.3 **[GREEN]** Create `src/features/commission-discounts/services/commission-discount.service.ts`: export plain async functions — `listDiscounts()`, `findActiveByType(type: string)`, `createDiscount(input: CreateCommissionDiscountData, createdById: number)`, `findDiscountById(id: number)`, `inactivateDiscount(id: number, updatedById: number)` — all Prisma calls live here, no other logic
- [x] 1.4 **[GREEN]** Refactor `src/app/api/admin/discounts/route.ts`: remove `import { prisma }`, import service functions; `GET` calls `listDiscounts()`; `POST` calls `findActiveByType(input.type)` then `createDiscount(input, userId)` — run tests, all pass
- [x] 1.5 **[GREEN]** Refactor `src/app/api/admin/discounts/[id]/inactivate/route.ts`: remove `import { prisma }`, import service functions; call `findDiscountById(discountId)` then `inactivateDiscount(discountId, userId)` — run tests, all pass

---

## Phase 2: Service Unit Tests (TDD — tests for the new service itself)

- [x] 2.1 **[RED]** Create `src/features/commission-discounts/__tests__/commission-discount.service.test.ts`: write failing tests for `listDiscounts` (returns array from prisma), `findActiveByType` (calls findFirst with type+ACTIVE filter), `createDiscount` (calls create with correct data+createdById), `findDiscountById` (calls findUnique), `inactivateDiscount` (calls update with INACTIVE+updatedById) — mock `@/lib/prisma`; run tests, confirm FAIL (file doesn't exist yet)
- [x] 2.2 **[GREEN]** Verify all service tests pass against the already-created service from 1.3 — run tests, all pass; no changes needed if implementation matches

---

## Phase 3: AsyncState Hook Refactor (RED → GREEN)

- [x] 3.1 **[RED]** Update `src/features/commission-discounts/__tests__/use-commission-discounts.test.ts`: rewrite assertions to check `result.current.state.status === 'success'` and `result.current.state.data` instead of `result.current.data` / `result.current.isLoading`; add test for `status === 'error'` when fetch rejects — run tests, confirm FAIL
- [x] 3.2 **[GREEN]** Rewrite `src/features/commission-discounts/hooks/use-commission-discounts.ts`: use `AsyncState<CommissionDiscount[]>` from `@/features/shared/types/async-state.types`; initialize state as `{ status: 'idle', data: undefined, error: '' }`; set `{ status: 'loading', data: undefined, error: '' }` before fetch; set `{ status: 'success', data: discounts, error: '' }` on resolve; set `{ status: 'error', data: undefined, error: message }` on reject; return `{ state, refresh }` — run tests, all pass
- [x] 3.3 Update `src/app/dashboard/admin/discounts/page.tsx`: replace `const { data: discounts, isLoading, refresh }` with `const { state, refresh }`; replace loading check with `state.status === 'loading'`; replace table data with `state.status === 'success' ? state.data : []`; add error banner when `state.status === 'error'`

---

## Phase 4: Navigation Menu Wiring

- [x] 4.1 Update `src/lib/navigation/menu-items.tsx`: add `import { Percent } from 'lucide-react'`; add `{ title: 'Descuentos', url: '/dashboard/admin/discounts', icon: <Percent className="h-4 w-4" /> }` as the last entry in the `Administración` `subItems` array

---

## Phase 5: Drop CommissionConfiguration (Database)

- [x] 5.1 Verify no remaining references: run `grep -r "commissionConfiguration" src/` — confirm zero results (only the seed file should have it, which will be cleaned in 5.2)
- [x] 5.2 Update `prisma/seeds/discount.ts`: remove the entire block that reads `prisma.commissionConfiguration.findFirst` and creates a `CommissionConfiguration` row — keep only the `CommissionDiscount` seed logic
- [x] 5.3 Remove `CommissionConfiguration` model from `prisma/schema.prisma` (the full model block including `@@map("commission_configuration")`)
- [x] 5.4 Run `npx prisma migrate dev --name drop_commission_configuration` — verify migration SQL contains `DROP TABLE "commission_configuration"`
- [x] 5.5 Run `npx prisma generate` — confirm no TypeScript errors

---

## Phase 6: Verification

- [x] 6.1 Run `npm run type-check` — zero TypeScript errors
- [x] 6.2 Run `npx vitest run src/features/commission-discounts/ src/app/api/admin/discounts/` — all tests pass
- [x] 6.3 Run `npm run lint` — zero lint errors
- [x] 6.4 Manual smoke test: sidebar shows "Descuentos" under Administración and navigates to `/dashboard/admin/discounts`
- [x] 6.5 Manual smoke test: create a discount and inactivate one — verify the full flow still works end-to-end
