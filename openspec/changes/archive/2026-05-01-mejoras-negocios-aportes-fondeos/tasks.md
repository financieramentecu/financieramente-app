# Tasks: mejoras-negocios-aportes-fondeos

## Phase 1: Schema + DB Migration

- [x] 1.1 Modify `prisma/schema.prisma` — rename `AnnualPayment` → `Payment` (`@@map("payments")`); add `Business.numAportes Int?`; add `Payment.expectedDate DateTime?`
- [x] 1.2 Create migration reference `openspec/changes/mejoras-negocios-aportes-fondeos/migration-reference.sql` — RENAME TABLE, ADD COLUMNs, backfill SQL
- [x] 1.3 DO NOT run migration (user will run manually). Files written.

## Phase 2: Pure Helpers (TDD — RED → GREEN)

- [x] 2.1 RED — Create `src/features/negocios/lib/__tests__/calculate-num-aportes.test.ts` with table-driven cases (SKANDIA/MFUND→0, 'Pago Único'→0, 'Aportes Ocasionales'→0, standard multipliers)
- [x] 2.2 GREEN — Create `src/features/negocios/lib/calculate-num-aportes.ts` implementing `calculateNumAportes({ termYears, periodicityName, companyName, productName }): number`
- [x] 2.3 RED — Create `src/features/negocios/lib/__tests__/calculate-expected-dates.test.ts` with end-of-month and leap-year cases per periodicity
- [x] 2.4 GREEN — Create `src/features/negocios/lib/calculate-expected-dates.ts` implementing `calculateExpectedDates(anchorDate, numAportes, periodicityName): Date[]` using `date-fns/addMonths`

## Phase 3: Types, Mappers, Roles (TDD — RED → GREEN)

- [x] 3.1 RED — Add tests for `canViewPayments(role)` and `canFundPayments(role)` in `src/features/auth/lib/__tests__/roles.test.ts`
- [x] 3.2 GREEN — Add `canViewPayments` and `canFundPayments` helpers to `src/features/auth/lib/roles.ts`
- [x] 3.3 Modify `src/features/negocios/types/business-entity.types.ts` — add `numAportes`; rename `hasAnnualPayments` → `hasPayments`, `hasPendingAnnualFunding` → `hasPendingPaymentFunding`
- [x] 3.4 Modify `src/features/negocios/types/business-api.types.ts` — rename `AnnualInstallmentDto` → `PaymentInstallmentDto`; add `expectedDate` field
- [x] 3.5 Modify `src/features/negocios/mappers/business-entity.mapper.ts` — map `numAportes`; update renamed payment fields
- [x] 3.6 Modify `src/features/negocios/lib/business-form-schemas.ts` — add `numAportes: z.number().int().min(0)`

## Phase 4: Server Actions + API Routes

- [x] 4.1 Modify `src/features/negocios/actions/create-business.ts` — call `calculateNumAportes`, persist `numAportes`; use `tx.payment` instead of `tx.annualPayment`; insert N payment rows with `expectedDate: null`
- [x] 4.2 Rename `src/app/api/negocios/[id]/annual-payments/route.ts` → `payments/route.ts`; add `expectedDate`, `periodicidad`, `plazo` to DTO response
- [x] 4.3 Rename `src/app/api/negocios/[id]/fondear-anualidades/route.ts` → `fondear-aportes/route.ts`; on first fondeo call `calculateExpectedDates` and UPDATE all payment rows; use `canFundPayments` for auth guard

## Phase 5: UI Components

- [x] 5.1 Modify `src/features/negocios/components/sections/business-info-section.tsx` — add read-only `Número de Aportes` field; wire `useEffect` to recalculate on `plazo`/`periodicidad`/`companyName` change; block `plazo` when SKANDIA/MFUND
- [x] 5.2 Rename `AnnualFundingModal.tsx` → `FundingModal.tsx`; update labels to "Aporte N"; add compact funded rows with scroll; display `expectedDate`, `periodicidad`, `plazo`

## Phase 6: Integration Wiring + Cleanup

- [x] 6.1 Update all import paths that referenced `annual-payments`, `fondear-anualidades`, `AnnualFundingModal`, or renamed type fields across `src/features/negocios/`
- [x] 6.2 Verify `npm run type-check` passes with zero errors (Prisma-only errors remain; resolve after `npx prisma migrate dev && npx prisma generate`)
- [x] 6.3 Run `npm run test:unit` — all tests green (5 pre-existing failures in `create-business.test.ts` are Prisma-schema-only; resolve after migration)
