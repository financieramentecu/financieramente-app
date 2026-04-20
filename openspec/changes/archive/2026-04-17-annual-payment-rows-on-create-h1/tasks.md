# Tasks: Annual payment rows on create (H1)

## Phase 1: Schema & limits

- [x] 1.1 Add `AnnualPaymentStatus` enum + `AnnualPayment` model and `annualPayments` on `Business` in `prisma/schema.prisma` (cascade delete, `@@unique([idBusiness, installmentIndex])`, `@@map("annual_payment")`).
- [x] 1.2 Run `prisma migrate dev` (name migration); verify SQL creates table, FK to `business`, unique constraint.
- [x] 1.3 Run `prisma generate`; fix any TS breaks from new client types only if strictly required elsewhere.

## Phase 2: Shared term cap (UI + server)

- [x] 2.1 Create `src/features/negocios/lib/business-term-limits.ts` exporting `BUSINESS_TERM_MAX = 25`.
- [x] 2.2 Update `src/features/negocios/lib/business-form-schemas.ts`: `terms` uses `.max(BUSINESS_TERM_MAX, …)` (replace 1200 cap).

## Phase 3: Create business action

- [x] 3.1 Extend Zod in `src/features/negocios/actions/create-business.ts`: when `term` present, `.int().min(1).max(BUSINESS_TERM_MAX)` using same constant.
- [x] 3.2 After commission resolution, `findUnique` `buyPeriodicity` by `idBuyPeriodicity`; if missing/null periodicity, skip annual rows (same as no Anual).
- [x] 3.3 If `name === 'Anual'`: require `term`; return `ApiResponse` error if absent or out of 1…25 (Spanish message, no DB write).
- [x] 3.4 Wrap `business.create` + conditional `annualPayment.createMany` (indices 1…`term`, `SIN_FONDEAR`, `dateAnchored` null) in `prisma.$transaction`; non-Anual: only `business.create`.

## Phase 4: Seeds (if applicable)

- [x] 4.1 Inspect `prisma/seeds/business.ts`: if any seeded business uses periodicidad Anual, set `term` ≤ 25 and/or document follow-up so seeds stay valid post-migration.

## Phase 5: Tests & verify

- [x] 5.1 Add `src/features/negocios/__tests__/actions/create-business.test.ts`: mock `prisma.$transaction`; assert Anual+`term=n` → `createMany` with `n` payloads; non-Anual → no annual calls; Anual sin term / term>25 / term=0 → error, no create.
- [x] 5.2 Run `npm run test:unit` for negocios scope; fix failures.
- [ ] 5.3 Manual smoke: crear negocio Anual en dev con plazo 3 y verificar `n=3` filas en DB (Studio o query).
