# Proposal: Manual Funding of First Payment (Primer Aporte)

## Intent

Today the cron (`fundDuePayments`) auto-funds EVERY `SIN_FONDEAR` payment whose
`expectedDate <= today`, regardless of `installmentIndex`. Since installment 1's
`expectedDate` equals the issue date, it gets auto-funded on the next run — so the
first payment appears FONDEADO without any human verification. Operations needs the
first payment to be a deliberate operator action with an explicit funding date,
because it is the financial confirmation that the contract actually went live.

## Scope

### In Scope
- A "FONDEAR" affordance on installment 1 (`SIN_FONDEAR`) in the funding modal, with operator date selection.
- Funding installment 1: `SIN_FONDEAR → FONDEADO` using the chosen date as `dateAnchored`.
- Business transition `EMITIDO → FONDEADO` stamped with that same chosen date.
- Cron exclusion: auto-fund only `installmentIndex > 1`.
- Confirm operators can still edit the funded date for any payment post-funding (reuse `EditFundedDateModal`).

### Out of Scope
- Changing how `expectedDate` is calculated or scheduled.
- Manual-funding UI for installments 2+ (they remain cron-driven).
- Cartera / pago anticipado / liquidación flows.
- Bulk first-funding of multiple businesses at once.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `negocios`: first payment (installment 1) requires manual operator funding with a chosen date; cron auto-funds only installments after the first.

## Approach

- **Cron**: add `installmentIndex: { gt: 1 }` to the `fundDuePayments` query so installment 1 is never auto-funded. First-funding business flip (`EMITIDO → FONDEADO`) becomes operator-driven.
- **API**: extend `POST /api/negocios/[id]/fondear-aportes` to accept an optional `fundingDate` (validated `YYYY-MM-DD` via existing schema). When index 1 is funded, use `fundingDate` for both payment `dateAnchored` and business `dateAnchored` instead of `expectedDate`.
- **UI**: extend `aporte-visual-state` to emit a `FONDEAR` button for `SIN_FONDEAR` installment 1; `AporteRow` renders it; reuse a date-picker dialog (pattern from `EditFundedDateModal`/`ConfirmCarteraPagadoDialog`) to capture the date before calling the funding hook.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/payment-state.service.ts` | Modified | Exclude `installmentIndex === 1` from cron funding |
| `api/negocios/[id]/fondear-aportes/route.ts` | Modified | Accept + apply operator `fundingDate` for first payment |
| `lib/fondear-anualidades.schema.ts` | Modified | Add optional `fundingDate` field |
| `lib/aporte-visual-state.ts` | Modified | Add `FONDEAR` button for `SIN_FONDEAR` index 1 |
| `components/modals/AporteRow.tsx` + funding date dialog | Modified/New | Render FONDEAR + capture date |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing businesses already auto-funded at index 1 | High | Change is forward-only; no backfill — document; verify cron filter |
| Date timezone drift (Bogotá/UTC) | Med | Use `dateOnlyToBogotaNoonUtc()` + `formatDateBogota()` per project convention |
| Business flip no longer happens (cron no longer flips on index 1) | Med | Ensure manual fondear path performs `EMITIDO → FONDEADO` flip with chosen date |
| `fundingDate` omitted by older clients | Low | Field optional; fallback only valid for index > 1 |

## Rollback Plan

Revert the four edited files. Cron resumes funding all installments including index 1; UI FONDEAR button disappears. No schema migration involved, so rollback is purely code-level and immediate.

## Dependencies

- Existing Bogotá date helpers (`bogota-date.ts`, `format-date.ts`).
- `canFundPayments` role gate and `logAuditEvent` (new `AuditAction` for manual first-payment funding may be required).

## Success Criteria

- [ ] Installment 1 shows a FONDEAR button with date selection while `SIN_FONDEAR`.
- [ ] Confirming funds installment 1 `→ FONDEADO` with the chosen `dateAnchored`.
- [ ] Business goes `EMITIDO → FONDEADO` with the same chosen date.
- [ ] Cron leaves installment 1 untouched and funds only installments 2+.
- [ ] Operators can still edit the funded date of any payment afterward.
