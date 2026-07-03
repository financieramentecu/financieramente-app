# Design: Manual Funding of First Payment (Primer Aporte)

## Technical Approach

Make installment 1 funding an explicit operator action with a chosen date, while the cron keeps auto-funding installments 2+. Three layers change in lockstep: (1) cron query excludes index 1; (2) `fondear-aportes` accepts an optional operator `fundedDate` applied to the first-payment fondeo and the EMITIDO→FONDEADO flip; (3) the funding modal renders a `FONDEAR` affordance on index 1 that captures a date before calling the funding endpoint. Forward-only, no schema migration.

## Architecture Decisions

### Decision: Funding endpoint for index 1
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reuse `date-anchored` (`updatePaymentDateAnchored`) | Returns 409 when status ≠ FONDEADO — **cannot fund a SIN_FONDEAR row**, and never flips the business | Rejected |
| Extend `fondear-aportes` with optional `fundedDate` | Already does SIN_FONDEAR→FONDEADO + EMITIDO→FONDEADO flip atomically | **Chosen** |

Rationale: `date-anchored` only edits an already-funded date; it cannot perform the state transition nor the business flip. `fondear-aportes` is the only path that does both in one transaction. The proposal's data-flow note suggesting `EditFundedDateModal`/`date-anchored` is therefore invalid for funding — it remains valid only for editing a date AFTER funding.

### Decision: Date-capture UI
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reuse `EditFundedDateModal` directly | Bound to `useUpdateFundedDate` → `date-anchored` (wrong endpoint) | Rejected |
| Add optional submit override prop to `EditFundedDateModal` | Mixes two concerns in one container (ISP/SRP smell) | Rejected |
| Extract presentational `FundedDatePickerDialog`; two thin containers | Clean SRP: UI vs. data wiring; existing edit flow unchanged | **Chosen** |

Rationale: extract the date-picker UI (date state, confirm/cancel, loading/error) into a presentational component. Keep `EditFundedDateModal` as-is (date-anchored container). Add a new `FundFirstPaymentDialog` container wired to a new `useFundFirstPayment` hook hitting `fondear-aportes`. Open/Closed: extend by adding, not modifying working code.

### Decision: `installmentIndex` plumbing into visual state
**Choice**: pass `aporte.installmentIndex` into `getAporteVisualState`; emit `FONDEAR` button only for `SIN_FONDEAR && installmentIndex === 1` (regardless of expectedDate). **Alternatives**: branch in `AporteRow`. **Rationale**: visual-state derivation belongs in `lib/`, not the component (Screaming Architecture).

## Data Flow

    FundingModal ── index 1 SIN_FONDEAR ──→ getAporteVisualState → FONDEAR button
         │ click
         ▼
    FundFirstPaymentDialog (date picker, defaults today)
         │ confirm(date YYYY-MM-DD)
         ▼
    useFundFirstPayment → POST /fondear-aportes { fundedInstallmentIndexes:[1], fundedDate }
         ▼
    route: dateOnlyToBogotaNoonUtc(fundedDate) → tx:
       payment1 → FONDEADO (dateAnchored = chosen)
       business EMITIDO → FONDEADO (dateAnchored = chosen)
       logAuditEvent
         ▼
    ApiResponse<BusinessEntity> → modal updates row → FONDEADO badge

Cron path (unchanged for 2+): `fundDuePayments` query adds `installmentIndex: { gt: 1 }`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `services/payment-state.service.ts` | Modify | Add `installmentIndex: { gt: 1 }` to `fundDuePayments` due-query |
| `lib/fondear-anualidades.schema.ts` | Modify | Add optional `fundedDate: z.string().regex(YYYY-MM-DD)` |
| `app/api/negocios/[id]/fondear-aportes/route.ts` | Modify | When `fundedDate` present, use `dateOnlyToBogotaNoonUtc(fundedDate)` as anchor for payment + business flip; audit it |
| `lib/aporte-visual-state.ts` | Modify | Add `installmentIndex` param; add `'FONDEAR'` to `AporteButton`; emit FONDEAR for SIN_FONDEAR index 1 |
| `components/modals/AporteRow.tsx` | Modify | Pass `installmentIndex`; render FONDEAR button → `onRequestAction('FONDEAR', 1)`; extend `AporteAction` |
| `components/modals/FundFirstPaymentDialog.tsx` | Create | Container: date picker → `useFundFirstPayment` |
| `components/modals/FundedDatePickerDialog.tsx` | Create | Presentational date-picker (extracted from EditFundedDateModal UI) |
| `hooks/use-fund-first-payment.ts` | Create | `AsyncState`-based POST to `fondear-aportes` |
| `components/modals/FundingModal.tsx` | Modify | Route `FONDEAR` action → open FundFirstPaymentDialog |

## Interfaces / Contracts

```ts
// fondear-anualidades.schema.ts
fundedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()

// aporte-visual-state.ts
export type AporteButton = 'MARK_CARTERA' | 'UNMARK_CARTERA' | 'MARK_ANTICIPADO' | 'FONDEAR'
getAporteVisualState(aporte, now, canMutate, installmentIndex?: number)

// route anchor selection (index 1 only)
const anchorDate = fundedDate ? dateOnlyToBogotaNoonUtc(fundedDate) : (row.expectedDate ?? now)
```

Audit: reuse existing `AuditAction.APORTE_PRIMER_PAGO_FONDEADO` (already defined) for the manual first-payment fondeo; keep `BUSINESS_PAYMENT_FUNDED` for the generic path.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | visual-state emits FONDEAR for SIN_FONDEAR index 1; not for index ≥2 | extend `aporte-visual-state.test.ts` (pass installmentIndex) |
| Unit | `fundDuePayments` skips index 1 | `payment-state.service.test.ts` query assertion |
| Integration | `fondear-aportes` with `fundedDate` → payment+business anchored at chosen noon-UTC date | `fondear-aportes/route.test.ts` |
| Component | FONDEAR routes to FundFirstPaymentDialog → hook called | `FundingModal.test.tsx` |
| Date | input YYYY-MM-DD → noon-UTC store → `formatDateBogota` display | helper assertion |

Strict TDD: write failing test first per unit.

## Migration / Rollout

No schema migration. Forward-only: businesses whose index 1 was already cron-funded are NOT backfilled. Rollback = revert the listed files; cron resumes funding index 1.

## Open Questions

- [ ] Confirm `APORTE_PRIMER_PAGO_FONDEADO` audit action exists (verified present in `payment-state.service.ts`); no new enum value required.
