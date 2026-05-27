# Apply Progress: Fondeo manual del primer pago (EMITIDO → FONDEADO)

**Mode**: Strict TDD (RED → GREEN → REFACTOR)
**Delivery**: Single PR, size:exception pre-approved
**Status**: ALL 21 TASKS COMPLETE — 2025-05-26

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| 1.1 | ✓ test written | ✓ | ✓ |
| 1.2 | combined with 1.4 | ✓ MARK_FONDEAR added to AporteButton | ✓ |
| 1.3 | ✓ truth table 4 scenarios | ✓ | ✓ |
| 1.4 | ✓ | ✓ getFirstPaymentFondeoButton body | 25/25 pass |
| 1.5 | n/a | ✓ APORTE_PRIMER_PAGO_FONDEADO in AuditAction | ✓ |
| 2.1 | ✓ 3 service scenarios | ✓ | ✓ |
| 2.2 | ✓ | ✓ prisma.$transaction impl | 12/12 pass |
| 3.1 | ✓ 7 route scenarios | ✓ | ✓ |
| 3.2 | ✓ | ✓ fondear/route.ts created | 8/8 pass |
| 4.1 | ✓ 5 dialog scenarios | ✓ | ✓ |
| 4.2 | ✓ | ✓ ConfirmFondeoDialog.tsx created | 6/6 pass |
| 5.1 | ✓ hook test | ✓ | ✓ |
| 5.2 | ✓ | ✓ markPrimerPagoFondeado added to hook | 7/7 pass |
| 6.1 | ✓ 4 AporteRow scenarios | ✓ | ✓ |
| 6.2 | ✓ | ✓ AporteRow.tsx modified | 12/12 pass |
| 6.3 | ✓ 3 FundingModal scenarios | ✓ | ✓ |
| 6.4 | ✓ | ✓ FundingModal.tsx modified | 8/8 pass |
| 7.1 | n/a | n/a | ✓ 224 files, 2125 pass |
| 7.2 | n/a | n/a | ✓ 0 TS errors |
| 7.3 | n/a | n/a | ✓ 0 lint errors |
| 7.4 | n/a | n/a | ✓ AporteAction consistent |

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/lib/aporte-visual-state.ts` | Modified | Added MARK_FONDEAR to AporteButton; added getFirstPaymentFondeoButton |
| `src/features/negocios/lib/__tests__/aporte-visual-state.test.ts` | Modified | 6 new tests for getFirstPaymentFondeoButton |
| `src/features/auth/lib/audit-logger.ts` | Modified | Added APORTE_PRIMER_PAGO_FONDEADO |
| `src/features/negocios/services/payment-state.service.ts` | Modified | Added markPrimerPagoFondeado |
| `src/features/negocios/services/__tests__/payment-state.service.test.ts` | Modified | 3 new tests + business/$transaction mocks |
| `src/app/api/negocios/[id]/aportes/[index]/fondear/route.ts` | Created | POST endpoint |
| `src/app/api/negocios/[id]/aportes/[index]/fondear/__tests__/route.test.ts` | Created | 8 route tests |
| `src/features/negocios/components/modals/ConfirmFondeoDialog.tsx` | Created | Funding date dialog |
| `src/features/negocios/components/modals/__tests__/ConfirmFondeoDialog.test.tsx` | Created | 6 dialog tests |
| `src/features/negocios/hooks/use-aporte-transitions.ts` | Modified | Added markPrimerPagoFondeado |
| `src/features/negocios/hooks/__tests__/use-aporte-transitions.test.ts` | Modified | 1 new test |
| `src/features/negocios/components/modals/AporteRow.tsx` | Modified | business prop + Fondear button |
| `src/features/negocios/components/modals/__tests__/AporteRow.test.tsx` | Modified | 4 new MARK_FONDEAR tests |
| `src/features/negocios/components/modals/FundingModal.tsx` | Modified | businessStatus/businessDateAnchored + pendingFondeo + ConfirmFondeoDialog |
| `src/features/negocios/components/modals/__tests__/annual-funding-modal.test.tsx` | Modified | 3 new FundingModal wiring tests |

## Completed Tasks (all 21)

- [x] 1.1 RED: test getFirstPaymentFondeoButton export + MARK_FONDEAR type
- [x] 1.2 GREEN: add MARK_FONDEAR to AporteButton union type
- [x] 1.3 RED: getFirstPaymentFondeoButton truth table tests
- [x] 1.4 GREEN: implement getFirstPaymentFondeoButton body
- [x] 1.5 GREEN: add APORTE_PRIMER_PAGO_FONDEADO to AuditAction
- [x] 2.1 RED: markPrimerPagoFondeado service tests
- [x] 2.2 GREEN: implement markPrimerPagoFondeado with prisma.$transaction
- [x] 3.1 RED: fondear route tests
- [x] 3.2 GREEN: create fondear/route.ts
- [x] 4.1 RED: ConfirmFondeoDialog tests
- [x] 4.2 GREEN: create ConfirmFondeoDialog.tsx
- [x] 5.1 RED: markPrimerPagoFondeado hook test
- [x] 5.2 GREEN: add markPrimerPagoFondeado to useAporteTransitions
- [x] 6.1 RED: AporteRow MARK_FONDEAR button tests
- [x] 6.2 GREEN: modify AporteRow.tsx
- [x] 6.3 RED: FundingModal MARK_FONDEAR wiring tests
- [x] 6.4 GREEN: modify FundingModal.tsx
- [x] 7.1 REFACTOR: all tests pass
- [x] 7.2 REFACTOR: type-check passes
- [x] 7.3 REFACTOR: lint passes
- [x] 7.4 REFACTOR: type consistency verified

## Notes

- `$transaction` mock: wrapped as `vi.fn((cb) => cb({business: {updateMany: vi.fn()}, payment: {updateMany: vi.fn()}}))` per risk warning — confirmed working
- `FundingModal` callers: `businessStatus` and `businessDateAnchored` are optional with defaults — existing callers compile without changes; pass real values for full gate behavior
- `AporteAction` in `AporteRow.tsx` is defined locally and now includes `MARK_FONDEAR` — consistent with `AporteButton` in `aporte-visual-state.ts`
