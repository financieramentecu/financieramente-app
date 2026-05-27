# Tasks: Fondeo manual del primer pago (EMITIDO → FONDEADO)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–430 |
| 400-line budget risk | Medium–High |
| Chained PRs recommended | No |
| Suggested split | Single PR (size:exception pre-approved) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 8 files + tests | PR 1 | Single PR, size:exception pre-approved |

---

## Phase 1: Foundation — Types & Audit Enum

- [ ] 1.1 **[RED]** Write failing test in `src/features/negocios/lib/__tests__/aporte-visual-state.test.ts`: assert `getFirstPaymentFondeoButton` is exported and `'MARK_FONDEAR'` is a valid `AporteButton` member.
- [ ] 1.2 **[GREEN]** In `src/features/negocios/lib/aporte-visual-state.ts`: add `'MARK_FONDEAR'` to the `AporteButton` union type; export new pure function `getFirstPaymentFondeoButton(aporte: Pick<PaymentInstallmentDto,'installmentIndex'>, business: {status:string; dateAnchored:string|null}, canMutate:boolean): AporteButton[]`.
- [ ] 1.3 **[RED]** Write failing tests for `getFirstPaymentFondeoButton` truth table (4 spec scenarios: visible, hidden-fondeado, hidden-non-first, hidden-role).
- [ ] 1.4 **[GREEN]** Implement `getFirstPaymentFondeoButton` body: return `['MARK_FONDEAR']` when `business.status === 'EMITIDO' && !business.dateAnchored && aporte.installmentIndex === 1 && canMutate`, else `[]`.
- [ ] 1.5 **[GREEN]** In `src/features/auth/lib/audit-logger.ts`: add `APORTE_PRIMER_PAGO_FONDEADO = 'APORTE_PRIMER_PAGO_FONDEADO'` to `AuditAction` enum.

## Phase 2: Service — Atomic Transaction

- [ ] 2.1 **[RED]** In `src/features/negocios/services/__tests__/payment-state.service.test.ts`: add mock for `prisma.business` (`updateMany`, `findUnique`); write failing tests for `markPrimerPagoFondeado` covering: EMITIDO→FONDEADO success (both Business + Payment updated, audit logged), second call returns CONFLICT, non-EMITIDO status returns CONFLICT, business not found returns NOT_FOUND. Update the `AuditAction` mock object to include `APORTE_PRIMER_PAGO_FONDEADO`.
- [ ] 2.2 **[GREEN]** In `src/features/negocios/services/payment-state.service.ts`: implement `markPrimerPagoFondeado(businessId: number, index: number, actor: Actor, fondeoDate: Date): Promise<TransitionResult>` using `prisma.$transaction` — `business.updateMany(where: {id: businessId, status: EMITIDO}, data: {status: FONDEADO, dateAnchored: fondeoDate})` then `payment.updateMany(where: {idBusiness: businessId, installmentIndex: index}, data: {dateAnchored: fondeoDate})`; if business count===0 return CONFLICT; logAuditEvent `APORTE_PRIMER_PAGO_FONDEADO`; return `{ok:true, payment: toDto(...)}`.

## Phase 3: API Route

- [ ] 3.1 **[RED]** Create `src/app/api/negocios/[id]/aportes/[index]/fondear/route.test.ts` (or integration test file): write failing tests for 401 (no session), 403 (wrong role), 400 (missing/bad fondeoDate), 409 (CONFLICT from service), 200 (success with updated PaymentInstallmentDto). Mirror pattern from `cartera-pagado/route.ts`.
- [ ] 3.2 **[GREEN]** Create `src/app/api/negocios/[id]/aportes/[index]/fondear/route.ts`: POST handler — auth check → role gate `canFundPayments` → zod body `{fondeoDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}` → parse params → call `markPrimerPagoFondeado` service → map result to `ApiResponse<PaymentInstallmentDto>`. Mirror `cartera-pagado/route.ts` structure.

## Phase 4: Dialog Component

- [ ] 4.1 **[RED]** Create `src/features/negocios/components/modals/__tests__/ConfirmFondeoDialog.test.tsx`: write failing tests — dialog renders date input, confirm button disabled when date empty, confirm fires `onConfirm(date)`, cancel fires `onCancel`.
- [ ] 4.2 **[GREEN]** Create `src/features/negocios/components/modals/ConfirmFondeoDialog.tsx`: mirror `ConfirmCarteraPagadoDialog` — props `{open, index, onConfirm(fondeoDate:string), onCancel}`; date input pre-filled with today; confirm disabled when `!date`; icon `CheckCircle2`; label "Confirmar fondeo del primer pago".

## Phase 5: Hook

- [ ] 5.1 **[RED]** In `src/features/negocios/hooks/__tests__/use-aporte-transitions.test.ts`: add failing test that `markPrimerPagoFondeado(businessId, 1, '2024-01-15')` calls `POST /api/negocios/{id}/aportes/1/fondear` with body `{fondeoDate:'2024-01-15'}`.
- [ ] 5.2 **[GREEN]** In `src/features/negocios/hooks/use-aporte-transitions.ts`: add `markPrimerPagoFondeado(businessId: number, index: number, fondeoDate: string): Promise<ApiResponse<PaymentInstallmentDto>>` calling `callEndpoint(\`/api/negocios/${businessId}/aportes/${index}/fondear\`, 'POST', {fondeoDate})`; add to return type and return object.

## Phase 6: UI Wiring — AporteRow & FundingModal

- [ ] 6.1 **[RED]** In `src/features/negocios/components/modals/__tests__/AporteRow.test.tsx`: add failing tests — `MARK_FONDEAR` button renders when `business.status=EMITIDO`, no `dateAnchored`, `installmentIndex=1`, `canMutate=true`; button absent when `status=FONDEADO`; button absent when `installmentIndex=2`; button calls `onRequestAction('MARK_FONDEAR', 1)`.
- [ ] 6.2 **[GREEN]** In `src/features/negocios/components/modals/AporteRow.tsx`: add `business: {status:string; dateAnchored:string|null}` prop and update `AporteAction` type to include `'MARK_FONDEAR'`; call `getFirstPaymentFondeoButton(aporte, business, canMutate)` and append result to `visualState.buttons`; render Fondear button for `'MARK_FONDEAR'` (green style, `CheckCircle2` icon, label "Fondear").
- [ ] 6.3 **[RED]** In `src/features/negocios/components/modals/__tests__/annual-funding-modal.test.tsx`: add failing test that `FundingModal` passes `businessStatus` and `businessDateAnchored` down to `AporteRow` and wires `MARK_FONDEAR` → `ConfirmFondeoDialog` open.
- [ ] 6.4 **[GREEN]** In `src/features/negocios/components/modals/FundingModal.tsx`: add props `businessStatus?: string` and `businessDateAnchored?: string | null`; pass `business={{status: businessStatus ?? '', dateAnchored: businessDateAnchored ?? null}}` to each `AporteRow`; add `pendingFondeo` state `{index:number}|null`; in `handleRequestAction` handle `'MARK_FONDEAR'` → `setPendingFondeo({index})`; add `ConfirmFondeoDialog` portal at bottom; on confirm call `markPrimerPagoFondeado(businessId, index, fondeoDate)` → `handleTransitionSuccess`.

## Phase 7: REFACTOR

- [ ] 7.1 Run `npm run test:unit` — all new and existing tests must pass green.
- [ ] 7.2 Run `npm run type-check` — zero TypeScript errors.
- [ ] 7.3 Run `npm run lint` — zero lint errors.
- [ ] 7.4 Verify `AporteAction` type in `AporteRow.tsx` and `FundingModal.tsx` are consistent with `AporteButton` in `aporte-visual-state.ts` (both include `'MARK_FONDEAR'`).
