# Proposal: Cartera → Cartera Pagado Terminal Transition

## Intent

When an admin/asistente confirms the client paid an aporte currently in `EN_CARTERA`, the system MUST transition forward to a new terminal state `CARTERA_PAGADO` and record the date of payment (`portfolioPaymentDate`). Today the action reverts the aporte to `FONDEADO`, losing historical record of the cartera lifecycle and incorrectly allowing the aporte to be re-marked. This change makes the cartera lifecycle auditable and terminal.

## Scope

### In Scope
- New enum value `CARTERA_PAGADO` in `AnnualPaymentStatus` (Prisma).
- New `portfolioPaymentDate DateTime?` field on `Payment` model + migration.
- New service function `markCarteraPagado` (EN_CARTERA → CARTERA_PAGADO).
- New API route `POST /api/negocios/[id]/aportes/[index]/cartera-pagado`.
- New feature-specific dialog `ConfirmCarteraPagadoDialog` (date input + green styling + warning copy).
- Wire `FundingModal` UNMARK_CARTERA action to the new dialog and hook method.
- Visual state + type updates: `AporteVariant`, `AnnualInstallmentStatusUi`, `PaymentInstallmentDto`.
- New audit action `APORTE_CARTERA_PAGADO` logged via `logAuditEvent`.

### Out of Scope
- Reverting a `CARTERA_PAGADO` aporte (terminal — no admin override in this change).
- Modifying the shared `ConfirmActionDialog` to accept children.
- Reporting/analytics over cartera payment dates.
- Removing the legacy DELETE `/cartera` revert handler (kept until follow-up cleanup).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `negocios`: aporte state machine adds terminal `CARTERA_PAGADO` state with `portfolioPaymentDate`; UNMARK_CARTERA action semantics change from revert to forward terminal transition with confirmation modal.

## Approach

Forward-only state transition mirroring the existing `markPagoAnticipado` pattern: dedicated POST endpoint, dedicated service function, dedicated feature-specific confirmation modal, audit log entry. The Prisma migration adds one enum value and one nullable column — backwards compatible with existing rows (`portfolioPaymentDate` defaults to `null`). UI shows a new green terminal variant with no action buttons. The hook exposes `markCarteraPagado(businessId, index, date)` consuming the new endpoint.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add enum value + `portfolioPaymentDate` field |
| `prisma/migrations/*` | New | Migration for enum + column |
| `prisma/ERD.md` | Modified | Reflect new enum + field |
| `src/features/negocios/services/payment-state.service.ts` | Modified | New `markCarteraPagado` function |
| `src/features/negocios/types/business-api.types.ts` | Modified | Add `CARTERA_PAGADO` + `portfolioPaymentDate` |
| `src/features/negocios/lib/aporte-visual-state.ts` | Modified | New green terminal variant |
| `src/features/negocios/components/modals/AporteRow.tsx` | Modified | Render new variant |
| `src/features/negocios/components/modals/FundingModal.tsx` | Modified | Wire new dialog |
| `src/features/negocios/components/modals/ConfirmCarteraPagadoDialog.tsx` | New | Custom modal with date input |
| `src/features/negocios/hooks/use-aporte-transitions.ts` | Modified | New `markCarteraPagado` method |
| `src/app/api/negocios/[id]/aportes/[index]/cartera-pagado/route.ts` | New | POST handler delegating to service |
| `src/features/auth/lib/audit-logger.ts` | Modified | `APORTE_CARTERA_PAGADO` action |
| `__tests__` (colocated) | New | Service + hook + dialog tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing rows already in `EN_CARTERA` confused by new state | Low | New state is opt-in via UI; `portfolioPaymentDate` nullable |
| Stale Prisma client types after enum change | Med | Run `npx prisma generate` + restart TS server |
| Legacy DELETE `/cartera` endpoint still allows revert | Med | Keep for admin recovery; document as deprecated; remove in follow-up |
| Audit log entries missing actor | Low | Reuse existing session + IP helpers from logger |

## Rollback Plan

1. Revert Prisma migration (drop column + remove enum value via down migration).
2. Run `npx prisma generate`.
3. Revert code changes (single feature branch — `git revert`).
4. Legacy DELETE `/cartera` path remains, so UI falls back to previous revert flow automatically.

## Dependencies

- Prisma migration tooling (`npx prisma migrate dev`).
- No external services or third-party SDK changes.

## Success Criteria

- [ ] Aporte in `EN_CARTERA` can be transitioned to `CARTERA_PAGADO` via the new modal.
- [ ] `portfolioPaymentDate` is persisted and rendered in the row.
- [ ] `CARTERA_PAGADO` is terminal — no transition buttons visible.
- [ ] Audit log entry `APORTE_CARTERA_PAGADO` recorded with userId, IP, UA, and date.
- [ ] All existing aporte flows (FONDEADO, EN_CARTERA, PAGO_ANTICIPADO) remain unchanged.
- [ ] Unit/integration tests pass; type-check + lint clean.
