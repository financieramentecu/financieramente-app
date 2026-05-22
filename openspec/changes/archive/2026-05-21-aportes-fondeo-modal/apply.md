# Apply Report: aportes-fondeo-modal

**Status**: complete (updated with payment lifecycle clarification)
**Branch**: feat/aportes-fondeo-modal  
**Delivery**: size:exception (single PR, user approved)

## Payment Lifecycle Rule (final, confirmed by user)

- Payments are created ONLY when negocio is in `EMITIDO` status
- Created with `status=FONDEADO`, `expectedDate=calculatedDate`, `dateAnchored=calculatedDate`
- `VENTA_EFECTUADA` negocios have NO payments
- On structural sync: `expectedDate` is always recalculated; `dateAnchored` is preserved from previous value (not overwritten)
- `portfolioDate` and `earlyPaymentDate` are preserved on structural sync

---

## Bugs Found and Fixed Post-Apply

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | `Error interno del servidor` on Pago Anticipado | `payment-state.service.ts` used string literals `'FONDEADO'` instead of `AnnualPaymentStatus.FONDEADO` — Prisma rejects strings at runtime | Imported `AnnualPaymentStatus` enum and replaced all string literals |
| 2 | Transaction P2028 timeout on negocio update | `route.ts [id]` had N sequential `tx.payment.update()` inside `$transaction` (5s default timeout) | SOLID refactor: extracted `syncPaymentsStructure()` and `recalculatePaymentExpectedDates()` helpers; payment date recalculation moved outside `$transaction` using `Promise.all` |
| 3 | No action buttons visible in modal | `roleCode` prop not passed to `FundingModal` in `negocios-page-client.tsx` → `canFundPayments(undefined)` = false → `canMutate=false` | Added `roleCode={_currentUser?.role?.code}` to FundingModal usage |
| 4 | React crash on confirm dialog open | `ConfirmActionDialog` rendered inside `FundingModal`'s `<DialogContent>` → nested Radix UI portal conflict | Lifted `ConfirmActionDialog` outside `<Dialog>` tag; `AporteRow` now emits `onRequestAction` callback instead of managing its own dialog |
| 5 | All aportes showing as gray (FONDEADO_CURRENT) | `isSameMonthOrFuture(null)` returned `true` — migrated records had `expectedDate: null` | Changed `isSameMonthOrFuture(null)` to return `false`; added `resolveReferenceDate(expectedDate ?? dateAnchored)` as fallback |
| 6 | Fondear button not showing on EMITIDO negocios | `hasPendingPaymentFunding` checked for `SIN_FONDEAR` — always false with new model | Changed mapper to `payments.some(p => p.status === FONDEADO || p.status === EN_CARTERA)` |
| 7 | New negocios still had SIN_FONDEAR payments | `create-business.ts` hardcoded `AnnualPaymentStatus.SIN_FONDEAR` | Changed to `AnnualPaymentStatus.FONDEADO` |

---

## UI Changes (post-spec)

- **AporteRow**: buttons hidden by default, revealed on hover (`group-hover`); icons per action (Briefcase/Zap/X); past rows compact (text-xs); per-row loading spinner (`Loader2`) while API processes
- **FundingModal**: footer "Guardar fondeo" only shown when `hasSinFondear`; `DIALOG_CONFIG` at module level; `loadingIndex` tracks which row is in-flight
- **aporte-visual-state**: dates shown for all states; copy "Se fondeará en:" for current/future FONDEADO; "Fondeado:" for past; "En cartera:" / "Pago anticipado:" with their respective dates

---

## New Files

| File | Purpose |
|------|---------|
| `prisma/seeds/migrate-payments-to-fondeado.ts` | One-time migration: SIN_FONDEAR → FONDEADO, sets dateAnchored = expectedDate ?? now |
| `src/features/negocios/services/payment-state.service.ts` | markCartera, unmarkCartera, markPagoAnticipado with atomic updateMany guard |
| `src/features/negocios/lib/aporte-visual-state.ts` | Pure getAporteVisualState function — 4-variant matrix |
| `src/features/negocios/hooks/use-aporte-transitions.ts` | AsyncState hook returning ApiResponse for caller to handle |
| `src/features/negocios/components/modals/AporteRow.tsx` | Per-row component — pure UI, emits onRequestAction |
| `src/features/shared/ui/confirm-action-dialog.tsx` | AlertDialog wrapper for mutation confirmations |
| `src/app/api/negocios/[id]/aportes/[index]/cartera/route.ts` | PATCH (mark) + DELETE (unmark) cartera |
| `src/app/api/negocios/[id]/aportes/[index]/pago-anticipado/route.ts` | POST mark pago anticipado |

---

## Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | EN_CARTERA, PAGO_ANTICIPADO enum values; portfolioDate, earlyPaymentDate fields |
| `prisma/ERD.md` | Updated enum block + Payment entity |
| `src/features/negocios/types/business-api.types.ts` | Extended PaymentInstallmentDto + AnnualInstallmentStatusUi |
| `src/features/auth/lib/audit-logger.ts` | 3 new AuditAction values |
| `src/features/negocios/mappers/business-entity.mapper.ts` | hasPendingPaymentFunding logic |
| `src/features/negocios/actions/create-business.ts` | Payments created as FONDEADO |
| `src/features/negocios/components/modals/FundingModal.tsx` | Major refactor — ConfirmDialog lifted, roleCode, loadingIndex, hasSinFondear |
| `src/features/negocios/components/BusinessTableSection.tsx` | Removed hasPendingPaymentFunding gate on Fondear button |
| `src/app/api/negocios/[id]/route.ts` | SOLID refactor — extracted helpers, payment ops outside $transaction |
| `src/app/api/negocios/[id]/annual-payments/route.ts` | Status cast includes EN_CARTERA | PAGO_ANTICIPADO |
| `src/app/api/negocios/[id]/payments/route.ts` | Same |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Added roleCode prop to FundingModal |
