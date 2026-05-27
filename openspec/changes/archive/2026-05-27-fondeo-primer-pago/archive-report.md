# Archive Report: Fondeo manual del primer pago

**Change**: fondeo-primer-pago
**Project**: financieramente-app
**Archived**: 2026-05-27
**Status**: CLOSED — READY TO MERGE

---

## What Was Built

Admin/asistente can now manually record the first annual installment funding to transition a business from EMITIDO to FONDEADO. A "Fondear" button appears on the first-payment row (index=1) when the business is in EMITIDO state with no dateAnchored. Clicking it opens a date-input dialog; on confirm, an atomic transaction updates Business (status → FONDEADO, dateAnchored) and Payment (index=1 dateAnchored) simultaneously.

---

## Files Changed (19 total — committed in d24da66)

| File | Action | Description |
|------|--------|-------------|
| src/features/negocios/lib/aporte-visual-state.ts | Modified | Added MARK_FONDEAR to AporteButton; added getFirstPaymentFondeoButton pure function |
| src/features/negocios/lib/__tests__/aporte-visual-state.test.ts | Modified | 6 new truth-table tests for getFirstPaymentFondeoButton |
| src/features/auth/lib/audit-logger.ts | Modified | Added APORTE_PRIMER_PAGO_FONDEADO to AuditAction enum |
| src/features/negocios/services/payment-state.service.ts | Modified | Added markPrimerPagoFondeado with prisma.$transaction; updated markCarteraPagado to also fondear business when index=1 + EMITIDO |
| src/features/negocios/services/__tests__/payment-state.service.test.ts | Modified | 3 new markPrimerPagoFondeado scenarios; markCarteraPagado tests updated (4→8 scenarios) |
| src/app/api/negocios/[id]/aportes/[index]/fondear/route.ts | Created | POST endpoint: auth + role gate + zod validation + service call |
| src/app/api/negocios/[id]/aportes/[index]/fondear/__tests__/route.test.ts | Created | 8 integration tests (401, 403, 400, 409, 200) |
| src/features/negocios/components/modals/ConfirmFondeoDialog.tsx | Created | Date-input confirmation dialog (mirrors ConfirmCarteraPagadoDialog) |
| src/features/negocios/components/modals/__tests__/ConfirmFondeoDialog.test.tsx | Created | 6 component tests |
| src/features/negocios/hooks/use-aporte-transitions.ts | Modified | Added markPrimerPagoFondeado hook function |
| src/features/negocios/hooks/__tests__/use-aporte-transitions.test.ts | Modified | 1 new hook test |
| src/features/negocios/components/modals/AporteRow.tsx | Modified | Added business prop + getFirstPaymentFondeoButton composition + Fondear button render |
| src/features/negocios/components/modals/__tests__/AporteRow.test.tsx | Modified | 4 new MARK_FONDEAR button visibility tests |
| src/features/negocios/components/modals/FundingModal.tsx | Modified | Added businessStatus/businessDateAnchored as internal state + pendingFondeo + ConfirmFondeoDialog wiring + onFondeoSuccess callback |
| src/features/negocios/components/modals/__tests__/annual-funding-modal.test.tsx | Modified | 3 new FundingModal wiring tests |
| src/app/dashboard/negocios/negocios-page-client.tsx | Modified | Passes businessStatus, businessDateAnchored, onFondeoSuccess={refetch} to FundingModal |
| src/features/negocios/components/BusinessTableSection.tsx | Modified | Migrated date formatting to formatDateBogota |
| src/features/negocios/components/modals/AnnualFundingModal.tsx | Modified | Migrated date formatting to formatDateBogota |
| src/features/shared/lib/format-date.ts | Created | formatDateBogota utility — normalizes YYYY-MM-DD strings to T12:00:00Z before parsing |

---

## Test Evidence

| Check | Final Result |
|-------|-------------|
| `npm run test:unit` | **2127 passed** / 3 skipped / 0 failed (224 files) |
| `npm run type-check` | **0 errors** |
| `npm run lint` | **0 errors** (39 pre-existing warnings) |

---

## Spec Compliance

All 13 requirements from delta spec verified and passing. See verify-report.md.

---

## Post-Verify Scope Additions

### 1. markCarteraPagado fondea negocio cuando index=1 + EMITIDO
When the first payment transitions from EN_CARTERA → CARTERA_PAGADO and the business is still EMITIDO, the service atomically updates business.status → FONDEADO and business.dateAnchored = paymentDate. FundingModal updates internal state immediately.

### 2. getFirstPaymentFondeoButton EN_CARTERA guard
Fondear button is hidden when `aporte.status === 'EN_CARTERA'`. The function Pick now includes `status`. Prevents showing Fondear while payment is in transit through cartera.

---

## Architecture Decisions

1. **New pure function** `getFirstPaymentFondeoButton` separates first-payment business-level logic from per-payment visual state (ISP/SRP compliance).
2. **prisma.$transaction** spans Business + Payment mutation for atomic consistency.
3. **POST /fondear** endpoint mirrors cartera-pagado pattern for API consistency.
4. **ConfirmFondeoDialog** mirrors ConfirmCarteraPagadoDialog UI pattern.
5. **formatDateBogota** normalizes all date strings to noon UTC before formatting to prevent UTC-midnight → Bogotá previous-day display bug.

---

## Known Limitations

- `ConfirmFondeoDialog` default date uses UTC midnight. Near Bogotá midnight the default may show yesterday. Low priority — `formatDateBogota` normalizes at display.
- FundingModal `businessStatus`/`businessDateAnchored` are optional props — existing callers compile without changes but should pass real values for full functionality.

---

## Engram Artifact IDs

| Artifact | Observation |
|----------|-------------|
| Explore | #811 |
| Proposal | #812 |
| Spec | #813 |
| Design | #814 |
| Tasks | #815 |
| Apply Progress | #816 |
| Verify Report | #817 |
| Archive Report | #818 |
