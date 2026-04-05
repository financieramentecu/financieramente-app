# Tasks: Admin Discount (Dynamic Discount Management)

> Mode: hybrid | TDD enforced | Incremental baby steps

---

## Phase 1: Foundation — Database & Domain Types

- [x] 1.1 Add `CommissionDiscount` model to `prisma/schema.prisma`: fields `id`, `name` (VarChar 100), `type` (VarChar 20), `percentage` (Decimal 5,2), `description` (Text?), `status` (VarChar 20, default "ACTIVE"), `createdAt`, `updatedAt`, `createdById?`, `updatedById?`; `@@index([status])`, `@@index([type])`, `@@map("commission_discount")`
- [x] 1.2 Add User reverse relations to `prisma/schema.prisma`: `commissionDiscountsCreated CommissionDiscount[] @relation("CreatedBy")` and `commissionDiscountsUpdated CommissionDiscount[] @relation("UpdatedBy")` on the `User` model
- [x] 1.3 Run `npx prisma migrate dev --name add_commission_discount` — verify migration SQL creates `commission_discount` table with correct columns and FK constraints
- [x] 1.4 Run `npx prisma generate` — confirm no TypeScript errors on Prisma client
- [x] 1.5 Update `prisma/seeds/discount.ts`: after existing seed logic, upsert two `CommissionDiscount` rows if none exist — `{ type: 'IMPUESTO', name: 'Impuesto estándar', percentage: 12.00, status: 'ACTIVE' }` and `{ type: 'CLAWBACK', name: 'Clawback operativo', percentage: 10.00, status: 'ACTIVE' }`
- [x] 1.6 Create `src/features/commission-discounts/types/commission-discount.types.ts`: export `CommissionDiscountType = 'IMPUESTO' | 'CLAWBACK'`, `CommissionDiscountStatus = 'ACTIVE' | 'INACTIVE'`, `CommissionDiscount` interface (all fields + optional `createdBy: { name: string }`, `updatedBy: { name: string }`), `CreateCommissionDiscountInput`, `CommissionDiscountListResponse`

---

## Phase 2: Validation Schemas (RED → GREEN)

- [x] 2.1 **[RED]** Create `src/features/commission-discounts/__tests__/commission-discount-schemas.test.ts`: write failing tests for `createCommissionDiscountSchema` — (a) valid input passes, (b) `percentage` below 0.01 fails, (c) `percentage` above 100 fails, (d) missing `name` fails, (e) invalid `type` fails, (f) optional `description` passes when omitted
- [x] 2.2 **[GREEN]** Create `src/features/commission-discounts/lib/commission-discount-schemas.ts`: implement `createCommissionDiscountSchema` with Zod (name required string, type enum `['IMPUESTO','CLAWBACK']`, percentage `z.number().min(0.01).max(100)`, description optional string) — run tests, all pass
- [x] 2.3 Add `DISCOUNT_CREATED` and `DISCOUNT_INACTIVATED` to `AuditAction` enum in `src/features/auth/lib/audit-logger.ts`

---

## Phase 3: API — GET & POST /api/admin/discounts (RED → GREEN)

- [x] 3.1 **[RED]** Create `src/app/api/admin/discounts/__tests__/route.test.ts`: write failing test — `GET /api/admin/discounts` with valid session returns `{ data: [] }` (mock `prisma.commissionDiscount.findMany`)
- [x] 3.2 **[GREEN]** Create `src/app/api/admin/discounts/route.ts`: `GET` handler — call `auth()`, return 401 if no session; call `prisma.commissionDiscount.findMany({ include: { createdBy: true, updatedBy: true }, orderBy: { createdAt: 'desc' } })`; return `ApiResponse<CommissionDiscount[]>`
- [x] 3.3 **[RED]** Add failing test — `POST /api/admin/discounts` with valid payload and no existing ACTIVE for same type returns 201 with created record
- [x] 3.4 **[GREEN]** Add `POST` handler to `src/app/api/admin/discounts/route.ts`: `auth()` → Zod parse body (400 on error) → `prisma.commissionDiscount.findFirst({ where: { type, status: 'ACTIVE' } })` → if found return 409 `"Ya existe un descuento activo de tipo {type}"` → `prisma.commissionDiscount.create({ data: { ...input, createdById: session.user.id } })` → `logAuditEvent(DISCOUNT_CREATED, ...)` → return 201
- [x] 3.5 **[RED]** Add failing test — `POST /api/admin/discounts` when ACTIVE already exists for same type returns 409 with conflict message
- [x] 3.6 **[GREEN]** Verify 409 path works (covered by 3.4 implementation) — run tests, all pass

---

## Phase 4: API — POST /api/admin/discounts/[id]/inactivate (RED → GREEN)

- [x] 4.1 **[RED]** Create `src/app/api/admin/discounts/[id]/inactivate/__tests__/route.test.ts`: write failing tests — (a) valid ACTIVE discount → 200 `{ status: 'INACTIVE' }`, (b) already INACTIVE → 400, (c) not found → 404, (d) unauthenticated → 401
- [x] 4.2 **[GREEN]** Create `src/app/api/admin/discounts/[id]/inactivate/route.ts`: `POST` handler — `auth()` → load `prisma.commissionDiscount.findUnique({ where: { id } })` → 404 if null → 400 if `status === 'INACTIVE'` → `prisma.commissionDiscount.update({ data: { status: 'INACTIVE', updatedById: session.user.id } })` → `logAuditEvent(DISCOUNT_INACTIVATED, { previousStatus: 'ACTIVE', discountId: id })` → return 200

---

## Phase 5: Feature Client & Hooks (RED → GREEN)

- [x] 5.1 Create `src/features/commission-discounts/lib/commission-discount-api.ts`: export `getCommissionDiscounts(): Promise<CommissionDiscount[]>` (calls `apiClient.get('/api/admin/discounts')`), `createCommissionDiscount(input: CreateCommissionDiscountInput)` (POST), `inactivateCommissionDiscount(id: number)` (POST `[id]/inactivate`)
- [x] 5.2 **[RED]** Create `src/features/commission-discounts/__tests__/use-commission-discounts.test.ts`: write failing test — hook returns `{ data: [], isLoading: false }` after successful fetch (mock `commission-discount-api`)
- [x] 5.3 **[GREEN]** Create `src/features/commission-discounts/hooks/use-commission-discounts.ts`: `useCommissionDiscounts()` → fetch on mount, return `AsyncState<CommissionDiscount[]>` + `refresh()` function
- [x] 5.4 **[RED]** Create `src/features/commission-discounts/__tests__/use-commission-discount-mutations.test.ts`: write failing tests — (a) `createDiscount` calls API and calls `onSuccess`, (b) `inactivateDiscount` calls API and calls `onSuccess`, (c) API error sets error state
- [x] 5.5 **[GREEN]** Create `src/features/commission-discounts/hooks/use-commission-discount-mutations.ts`: `useCommissionDiscountMutations({ onSuccess, onError })` → expose `createDiscount(input)`, `inactivateDiscount(id)`, `isSubmitting` — show toast on success/error via existing toast utility

---

## Phase 6: UI Components

- [x] 6.1 Create `src/features/commission-discounts/components/commission-discounts-table.tsx`: table with columns Name, Type (badge IMPUESTO=blue / CLAWBACK=amber), Percentage (formatted `12.00%`), Status (badge ACTIVE=green / INACTIVE=gray), Created at, Created by, Last modified, Modified by; render "Inactivar" button only for `status === 'ACTIVE'`; button: `cursor-pointer`, `min-h-[44px]`, `aria-label="Inactivar descuento"`, visible focus ring; on click call `onInactivate(discount)` prop
- [x] 6.2 Create `src/features/commission-discounts/components/commission-discount-form.tsx`: controlled form (React Hook Form + `createCommissionDiscountSchema`); fields Nombre (placeholder "Ej: Impuesto estándar 2026"), Tipo (select IMPUESTO/CLAWBACK), Porcentaje % (helper "Valor entre 0.01 y 100"), Descripción (optional textarea); show warning box (amber `#FFFBEB`) when selected `type` already has an ACTIVE discount in the list prop; submit calls `onSubmit(data)` prop; apply tokens from `financieramnete.pen` (border `#DDE9EB`, label `#00545c`, submit `#00545c`)
- [x] 6.3 Create `src/features/commission-discounts/components/inactivate-confirm-modal.tsx`: props `discount: CommissionDiscount | null`, `isOpen`, `onConfirm`, `onCancel`, `isLoading`; display message "¿Está seguro de que desea inactivar el descuento '[name]' de tipo [type] con porcentaje [X%]?..."; focus trap (initial focus on "Cancelar"); Escape key = Cancelar; "Confirmar" disabled + loading spinner when `isLoading=true`; inline error message if `error` prop is set; same visual tokens as create modal (`#00545c`, `#DDE9EB`, `#F8FAFB`)

---

## Phase 7: Page & Navigation Wiring

- [x] 7.1 Create `src/app/dashboard/admin/discounts/page.tsx`: `'use client'`; use `DashboardLayout currentPage="Administración"`; page title "Descuentos" + subtitle; "+ Crear Descuento" button (calls `setIsCreateModalOpen(true)`); `<CommissionDiscountsTable>` fed by `useCommissionDiscounts()`; loading skeleton while `isLoading`; `<CrudModal>` (or inline Sheet) with `<CommissionDiscountForm>` on create; `<InactivateConfirmModal>` wired to `inactivateDiscount`; refresh list on create/inactivate success; match layout frame "Admin Discounts - Lista" in `financieramnete.pen`
- [x] 7.2 Add "Descuentos" entry to `src/app/dashboard/admin/page.tsx`: `{ title: 'Descuentos', description: 'Gestionar descuentos de impuesto y clawback', href: '/dashboard/admin/discounts', icon: <Percent className="h-5 w-5 text-primary" /> }`; import `Percent` from `lucide-react`

---

## Phase 8: Process-batch Integration (RED → GREEN)

- [x] 8.1 **[RED]** Update `src/features/load-file/__tests__/process-batch.service.test.ts`: replace existing `prisma.commissionConfiguration.findFirst` mocks with `prisma.commissionDiscount.findMany` (or two `findFirst`) returning `[{ type: 'IMPUESTO', percentage: 12 }, { type: 'CLAWBACK', percentage: 10 }]`; add test for fallback when `findMany` returns `[]` (expect snapshots `{ discountPercentage: 0.12, clawbackPercentage: 0.1 }`)
- [x] 8.2 **[GREEN]** Modify `src/features/load-file/services/process-batch.service.ts`: replace `CommissionConfiguration` resolution with `prisma.commissionDiscount.findMany({ where: { status: 'ACTIVE', type: { in: ['IMPUESTO', 'CLAWBACK'] } } })`; compute `discountPercentage = (impuestoRow?.percentage.toNumber() ?? 100 * 0.12) / 100` and `clawbackPercentage` similarly; define `DEFAULT_DISCOUNT_PERCENTAGE = 0.12` and `DEFAULT_CLAWBACK_PERCENTAGE = 0.1` constants at top of file; snapshot shape unchanged

---

## Phase 9: Verification & Cleanup

- [x] 9.1 Run `npm run type-check` — zero TypeScript errors
- [x] 9.2 Run `npm run test:unit` — all passing, coverage ≥80% on `src/features/commission-discounts/` business logic
- [x] 9.3 Run `npm run lint` — zero lint errors
- [x] 9.4 Manual smoke test: navigate to `/dashboard/admin/discounts`, create a discount, verify it appears in list with ACTIVO badge; click Inactivar, confirm modal shows correct data, confirm → row shows INACTIVO and no Inactivar button
- [x] 9.5 Verify "Descuentos" card appears on `/dashboard/admin` and links correctly
- [x] 9.6 Confirm `process-batch` integration: run or manually trace that `discountPercentage` and `clawbackPercentage` snapshots resolve from `CommissionDiscount` table (not `CommissionConfiguration`)
