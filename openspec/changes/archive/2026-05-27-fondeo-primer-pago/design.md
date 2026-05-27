# Design: Fondeo manual del primer pago

## Technical Approach

Mirror the existing `cartera-pagado` transition end-to-end (dialog → hook → route → service), but extend the service to a `prisma.$transaction` because this transition mutates TWO entities atomically: `Business` (status + dateAnchored) and `Payment` (index 1 dateAnchored). The visual-state gate is BUSINESS-level, not payment-level, so the button condition is evaluated outside `getAporteVisualState` and injected as a new `MARK_FONDEAR` button. Pure additive change; no schema migration (fields exist).

## Architecture Decisions

### Decision: Where to evaluate the business-level button gate

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A. Extend `getAporteVisualState(aporte, now, canMutate, business?)` | Pollutes a payment-only pure fn with business concern; breaks ISP — every caller now passes business it may not have | Rejected |
| B. Evaluate condition in `AporteRow`, append `MARK_FONDEAR` to `buttons` | Mixes derivation logic into a render component; harder to unit-test | Rejected |
| C. New pure helper `getFirstPaymentFondeoButton(aporte, business, canMutate)` in `aporte-visual-state.ts`, composed in `AporteRow` | Keeps each fn single-responsibility (SRP), independently testable, no signature break for existing callers | **Chosen** |

**Rationale**: Option C respects SRP/ISP. The existing `getAporteVisualState` stays payment-only and untouched; the business gate lives in a focused, pure, testable helper. `AporteRow` composes both and merges results — composition over a fat signature.

### Decision: Service mutation shape

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Two sequential `updateMany` calls | Non-atomic; partial failure leaves Business/Payment inconsistent | Rejected |
| `prisma.$transaction` with status-guarded `business.updateMany(where status=EMITIDO)` then `payment.updateMany(where index=1)` | Atomic; status guard prevents concurrent double-apply | **Chosen** |

**Rationale**: Funding spans two tables — atomicity is mandatory. Guarding the Business update on `status = EMITIDO` inside the transaction makes the operation idempotent under concurrency (second caller gets `count === 0` → `CONFLICT`).

### Decision: Endpoint verb and path

**Choice**: `POST /api/negocios/[id]/aportes/[index]/fondear`, body `{ fondeoDate: 'YYYY-MM-DD' }`. **Alternatives**: PATCH on the business resource. **Rationale**: Mirrors `cartera-pagado` (POST, date body, same params shape) for consistency; the action is recorded against the first-payment row in the UI.

## Data Flow

    AporteRow (gate: getFirstPaymentFondeoButton)
        │ onRequestAction('MARK_FONDEAR', 1)
        ▼
    FundingModal ──→ ConfirmFondeoDialog (user picks fondeoDate)
        │ markPrimerPagoFondeado(businessId, 1, fondeoDate)
        ▼
    use-aporte-transitions ──→ POST .../fondear
        ▼
    route (auth + canFundPayments gate) ──→ markPrimerPagoFondeado() service
        ▼
    prisma.$transaction:
        business.updateMany(where status=EMITIDO → FONDEADO + dateAnchored)
        payment.updateMany(where index=1 → dateAnchored)
        logAuditEvent(APORTE_PRIMER_PAGO_FONDEADO)
        ▼
    returns updated PaymentInstallmentDto → row refreshes

`AporteRow` only sees the payment today, so `FundingModal` must pass `business { status, dateAnchored }` down as a new prop.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/aporte-visual-state.ts` | Modify | Add `'MARK_FONDEAR'` to `AporteButton`; add pure `getFirstPaymentFondeoButton(aporte, business, canMutate)` |
| `components/modals/AporteRow.tsx` | Modify | New `business` prop; compose fondeo button; render Fondear button; emit `MARK_FONDEAR` |
| `components/modals/FundingModal.tsx` | Modify | Accept `businessStatus`/`businessDateAnchored`, pass to rows; handle `MARK_FONDEAR` → open dialog → call hook |
| `components/modals/ConfirmFondeoDialog.tsx` | Create | Funding-date input dialog (mirror ConfirmCarteraPagadoDialog) |
| `hooks/use-aporte-transitions.ts` | Modify | Add `markPrimerPagoFondeado(businessId, index, fondeoDate)` |
| `services/payment-state.service.ts` | Modify | Add transactional `markPrimerPagoFondeado(businessId, index, actor, fondeoDate)` |
| `app/api/negocios/[id]/aportes/[index]/fondear/route.ts` | Create | POST handler, auth + `canFundPayments` gate, zod body |
| `auth/lib/audit-logger.ts` | Modify | Add `APORTE_PRIMER_PAGO_FONDEADO` action |

## Interfaces / Contracts

```typescript
// aporte-visual-state.ts — pure, business-level gate
type FondeoButtonContext = { status: string; dateAnchored: string | null }
export function getFirstPaymentFondeoButton(
  aporte: Pick<PaymentInstallmentDto, 'installmentIndex'>,
  business: FondeoButtonContext,
  canMutate: boolean
): AporteButton[] // ['MARK_FONDEAR'] when EMITIDO && !dateAnchored && index===1 && canMutate, else []

// payment-state.service.ts — reuses existing TransitionResult union
export async function markPrimerPagoFondeado(
  businessId: number, index: number, actor: Actor, fondeoDate: Date
): Promise<TransitionResult>
```

Endpoint body: `{ fondeoDate: string /* /^\d{4}-\d{2}-\d{2}$/ */ }`. Returns `ApiResponse<PaymentInstallmentDto>`. Errors: 401/403/404/409 (`INVALID_TRANSITION` when status ≠ EMITIDO).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getFirstPaymentFondeoButton` truth table (EMITIDO/dateAnchored/index/canMutate) | Vitest pure-fn assertions |
| Unit | `AporteRow` renders Fondear only when gate true, emits `MARK_FONDEAR` | Testing Library + click |
| Integration | service: EMITIDO→FONDEADO sets both dates atomically; second call → CONFLICT; non-EMITIDO → CONFLICT | Prisma mock / test db |
| Integration | route: 403 for non-ADMIN/ANALISTA_SOPORTE, 400 bad date, 200 success | request mock |

## Migration / Rollout

No migration required. Fields (`Business.dateAnchored`, `Payment.dateAnchored`) already exist. Pure additive; revert by removing the feature branch.

## Open Questions

- [ ] Should the manual `fondeoDate` be validated as not-future, or is any past/future date allowed? (Proposal lists this as a Med risk; default to no future-date guard unless product confirms.)
