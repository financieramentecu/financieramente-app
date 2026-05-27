# Proposal: Fondeo manual del primer pago

## Intent

Admin/asistente need a way to manually fund a business from the first-payment row. Today there is no UI action to record a funding date and advance a business from `EMITIDO` to `FONDEADO` — the lifecycle exists in the spec but the manual transition is missing. This blocks the canonical `EMITIDO → FONDEADO → LIQUIDADO` flow at its first hop and leaves `Business.dateAnchored` / `Payment.dateAnchored` unset.

## Scope

### In Scope
- "Fondear" button on the first-payment row, visible when `business.status === 'EMITIDO' && !business.dateAnchored && aporte.installmentIndex === 1`.
- Confirmation dialog where the user enters the funding date manually.
- Transaction that sets `Business.status = FONDEADO`, `Business.dateAnchored`, and `Payment.dateAnchored` (installment 1) atomically.
- New endpoint, service, hook wiring, audit action, and visual-state condition.
- Role gate: ADMIN and ANALISTA_SOPORTE only.

### Out of Scope
- Migrations or schema changes (all fields already exist).
- Removing the obsolete `SIN_FONDEAR` value from code/UI beyond what this transition needs.
- Funding from installments other than the first.
- Settlement / `LIQUIDADO` promotion (already covered elsewhere).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `negocios`: add a manual first-payment funding transition (`EMITIDO → FONDEADO`) that records funding dates on both business and payment; supersede the `SIN_FONDEAR` initial-state requirement (installments are `FONDEADO`-tracked; the funding gate is business-level, not per-payment).

## Approach

Mirror the existing `cartera-pagado` transition end-to-end: `ConfirmFondeoDialog` (new) → `use-aporte-transitions.markPrimerPagoFondeado` → `POST /api/negocios/[id]/aportes/[index]/fondear` → `payment-state.service.markPrimerPagoFondeado()` wrapped in a `prisma.$transaction` with a status guard. Visual-state gating moves to business level: `AporteRow` evaluates the button condition with business context passed down through `FundingModal`, since `getAporteVisualState` currently only sees the payment.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/negocios/lib/aporte-visual-state.ts` | Modified | Business-level funding condition |
| `src/features/negocios/components/modals/AporteRow.tsx` | Modified | Render MARK_FONDEAR button |
| `src/features/negocios/components/modals/FundingModal.tsx` | Modified | Pass business context, wire action |
| `src/features/negocios/components/modals/ConfirmFondeoDialog.tsx` | New | Funding-date confirmation dialog |
| `src/features/negocios/hooks/use-aporte-transitions.ts` | Modified | `markPrimerPagoFondeado` call |
| `src/features/negocios/services/payment-state.service.ts` | Modified | Transactional `markPrimerPagoFondeado()` |
| `src/app/api/negocios/[id]/aportes/[index]/fondear/route.ts` | New | HTTP endpoint, role gate |
| `src/features/auth/lib/audit-logger.ts` | Modified | `APORTE_PRIMER_PAGO_FONDEADO` action |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `getAporteVisualState` lacks business context | High | Pass business through `FundingModal`/`AporteRow`; evaluate gate at row level |
| Concurrent funding double-applies | Low | Conditional update guarded on `status = EMITIDO` inside transaction |
| Manual date diverges from real funding | Med | Validate date in dialog + audit log records actor and value |

## Rollback Plan

Pure additive change. Revert the feature branch: remove the new endpoint, dialog, service method, audit action, and the visual-state/button edits. No data migration to undo; any `dateAnchored` already set is valid funding data and may remain.

## Dependencies

- Reference implementation: `cartera-pagado` transition (dialog + service + route) must stay as the mirrored pattern.

## Success Criteria

- [ ] Button appears only when `EMITIDO`, no `dateAnchored`, and `installmentIndex === 1`.
- [ ] Confirming sets `Business.status = FONDEADO`, `Business.dateAnchored`, and `Payment.dateAnchored` atomically.
- [ ] Only ADMIN / ANALISTA_SOPORTE can invoke the endpoint.
- [ ] An `APORTE_PRIMER_PAGO_FONDEADO` audit entry is written per funding.
