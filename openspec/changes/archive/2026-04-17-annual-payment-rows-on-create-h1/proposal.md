# Proposal: Annual payment rows on create (PRD H1)

## Intent

When periodicity is **Anual** and plazo is **n**, persist **n** annual installment rows for fondeo tracking. DB and `createBusiness` lack `annual_payment` today. Delivers **H1** from `PRDs/bussines-report/financieramente-reporte-negocios-prd.md` only.

## Scope

### In Scope

- Prisma + migration: `annual_payment` (`id_business`, `installment_index` 1…n unique per business, `status` `SIN_FONDEAR`|`FONDEADO`, `date_anchored` nullable, timestamps).
- `create-business.ts`: in a **transaction**, if `BuyPeriodicity.name === 'Anual'` and `term === n`, `createMany` **n** rows; else only `business` (no rows for non-Anual).
- Zod: **require** `term` when periodicity is Anual.
- Tests: Anual→n rows, non-Anual→0, Anual without `term`→error. Fix seeds for Anual if needed.

### Out of Scope

H2–H8 (`date_issued`, funding UI, Excel, origin rules). **COMISIONANDO→LIQUIDADO** and spec deltas conflict with current `openspec/specs/negocios/spec.md`—later change.

## Approach

Resolve periodicity by ID; if name `'Anual'` (seed), validate `term`. `$transaction`: `business.create` then `annualPayment.createMany` for indices `1..term`. Unique `(id_business, installment_index)`.

## Affected Areas

| Area | Impact |
| --- | --- |
| `prisma/schema.prisma` | New model + relation |
| `create-business.ts` | Transaction + conditional rows |
| `prisma/seeds/business.ts` | Optional align Anual fixtures |
| `src/features/negocios/__tests__/**` | New cases |

## Risks

| Risk | L | Mitigation |
| --- | --- | --- |
| Legacy Anual businesses without rows | M | Separate backfill if needed |
| `term` optional breaks H1 | H | Conditional Zod |

## Rollback

Revert migration + code; redeploy prior build. Coordinate if parallel work on business create.

## Dependencies

DB migration window.

## Success Criteria

- [ ] Anual + term n → **n** rows, `SIN_FONDEAR`, indices 1…n.
- [ ] Non-Anual → **0** rows.
- [ ] Anual without term → rejected.
- [ ] First creation without contract remains `VENTA_EFECTUADA`.
- [ ] Unit tests pass for touched code.
