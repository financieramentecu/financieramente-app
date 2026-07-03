# Tasks: Manual Funding of First Payment (Primer Aporte)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 480–560 (additions + deletions) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: foundation + service + API (no UI) → PR 2: hook + components + wiring |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + cron exclusion + route anchor + visual-state types | PR 1 | Backward-safe; no UI change visible to users yet |
| 2 | Hook + FundedDatePickerDialog + FundFirstPaymentDialog + AporteRow FONDEAR + FundingModal wiring | PR 2 | Depends on PR 1 |

---

## Phase 1: Foundation — Types and Schema

- [ ] 1.1 **RED** Add failing tests for `fundedDate` optional field in `fondear-anualidades.schema.test.ts`: valid YYYY-MM-DD passes, invalid format rejects, omitted passes.
  - File: `src/features/negocios/lib/__tests__/fondear-anualidades.schema.test.ts`

- [ ] 1.2 **GREEN** Extend `fondearAnualidadesBodySchema` with `fundedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` and export updated `FondearAnualidadesInput`.
  - File: `src/features/negocios/lib/fondear-anualidades.schema.ts`

- [ ] 1.3 **RED** Add failing tests to `aporte-visual-state.test.ts` verifying: (a) `getAporteVisualState(SIN_FONDEAR, now, true, 1)` emits `FONDEAR` button; (b) `getAporteVisualState(SIN_FONDEAR, now, true, 2)` does NOT emit `FONDEAR`; (c) `getAporteVisualState(SIN_FONDEAR, now, false, 1)` does NOT emit `FONDEAR` (canMutate gate).
  - File: `src/features/negocios/lib/__tests__/aporte-visual-state.test.ts`

- [ ] 1.4 **GREEN** In `aporte-visual-state.ts`: add `'FONDEAR'` to `AporteButton` union; add optional `installmentIndex?: number` param to `getAporteVisualState`; inside `SIN_FONDEAR` branch, push `'FONDEAR'` when `canMutate && installmentIndex === 1`.
  - File: `src/features/negocios/lib/aporte-visual-state.ts`

---

## Phase 2: Service Layer — Cron Exclusion

- [ ] 2.1 **RED** Add failing test to `payment-state.service.test.ts`: `fundDuePayments` Prisma query must include `installmentIndex: { gt: 1 }` in the `where` clause (assert via spy on `prisma.payment.findMany`).
  - File: `src/features/negocios/services/__tests__/payment-state.service.test.ts`

- [ ] 2.2 **GREEN** In `fundDuePayments`, add `installmentIndex: { gt: 1 }` to the `prisma.payment.findMany` `where` clause (line ~348 in `payment-state.service.ts`).
  - File: `src/features/negocios/services/payment-state.service.ts`

---

## Phase 3: API Route — fundedDate Anchor

- [ ] 3.1 **RED** Add failing integration test for `POST /fondear-aportes` in a new or existing route test file: when `fundedInstallmentIndexes: [1]` and `fundedDate: '2026-07-01'`, `payment.update` is called with `dateAnchored = dateOnlyToBogotaNoonUtc('2026-07-01')`; when `fundedDate` absent and index > 1, fallback to `row.expectedDate ?? now` as before.
  - File: `src/features/negocios/__tests__/api/fondear-aportes.route.test.ts` (new)

- [ ] 3.2 **GREEN** In `fondear-aportes/route.ts`: destructure `fundedDate` from `parsed.data`; inside the transaction loop, compute `anchorDate = (fundedDate && row.installmentIndex === 1) ? dateOnlyToBogotaNoonUtc(fundedDate) : (row.expectedDate ?? now)`; apply that anchor to `payment.update` and `businessAnchorDate` accumulation. Keep existing `EMITIDO → FONDEADO` flip logic unchanged. Add `AuditAction.APORTE_PRIMER_PAGO_FONDEADO` to details JSON when index 1 is funded.
  - File: `src/app/api/negocios/[id]/fondear-aportes/route.ts`

---

## Phase 4: New Hook

- [ ] 4.1 **RED** Add failing tests for `useFundFirstPayment` hook: idle initial state; loading → success cycle with correct `POST /api/negocios/:id/fondear-aportes` body `{ fundedInstallmentIndexes:[1], fundedDate }`; error state when response is not ok.
  - File: `src/features/negocios/hooks/__tests__/use-fund-first-payment.test.ts` (new)

- [ ] 4.2 **GREEN** Create `use-fund-first-payment.ts` following the `useUpdateFundedDate` pattern: `AsyncState<BusinessEntity>`, function `fundFirstPayment(fundedDate: string)` that POSTs `{ fundedInstallmentIndexes: [1], fundedDate }` to `/api/negocios/${businessId}/fondear-aportes`.
  - File: `src/features/negocios/hooks/use-fund-first-payment.ts` (new)

---

## Phase 5: New UI Components

- [ ] 5.1 Create `FundedDatePickerDialog.tsx` — pure presentational dialog: props `open`, `title`, `subtitle`, `isLoading`, `error`, `onConfirm(date: string)`, `onCancel`. Renders `<Input type="date">` defaulted to today (`bogotaDateOnly(new Date())`), Confirm + Cancel buttons. No hook dependency.
  - File: `src/features/negocios/components/modals/FundedDatePickerDialog.tsx` (new)

- [ ] 5.2 Create `FundFirstPaymentDialog.tsx` — container: accepts `open`, `businessId`, `onSuccess(business: BusinessEntity)`, `onCancel`; calls `useFundFirstPayment(businessId)`; maps result to `onSuccess`.
  - File: `src/features/negocios/components/modals/FundFirstPaymentDialog.tsx` (new)

---

## Phase 6: UI Wiring

- [ ] 6.1 In `AporteRow.tsx`: (a) extend `AporteAction` type to `'MARK_CARTERA' | 'UNMARK_CARTERA' | 'MARK_ANTICIPADO' | 'FONDEAR'`; (b) add `installmentIndex` prop to `AporteRowProps`; (c) call `getAporteVisualState(aporte, now, canMutate, installmentIndex)`; (d) render a FONDEAR button (green/teal variant) when `allButtons.includes('FONDEAR')` that calls `onRequestAction('FONDEAR', aporte.installmentIndex)`.
  - File: `src/features/negocios/components/modals/AporteRow.tsx`

- [ ] 6.2 **RED** Add failing tests for FONDEAR routing in `FundingModal.test.tsx`: when AporteRow fires `onRequestAction('FONDEAR', 1)`, `FundFirstPaymentDialog` should open; confirm success closes it and updates installments list.
  - File: `src/features/negocios/components/modals/__tests__/FundingModal.test.tsx` (new)

- [ ] 6.3 **GREEN** In `FundingModal.tsx`: (a) add `pendingFondearIndex: number | null` state; (b) extend `handleRequestAction` to handle `'FONDEAR'` → `setPendingFondearIndex(index)`; (c) pass `installmentIndex={row.installmentIndex}` to each `<AporteRow>`; (d) render `<FundFirstPaymentDialog>` when `pendingFondearIndex !== null`, wiring `onSuccess` to `handleTransitionSuccess` + reset state.
  - File: `src/features/negocios/components/modals/FundingModal.tsx`

---

## Phase 7: Test Verification

- [ ] 7.1 Update `AporteRow.test.tsx` to pass `installmentIndex` prop and verify FONDEAR button appears/disappears per index + canMutate combinations.
  - File: `src/features/negocios/components/modals/__tests__/AporteRow.test.tsx`

- [ ] 7.2 Verify date timezone round-trip: `dateOnlyToBogotaNoonUtc('2026-07-01')` → stored UTC → `formatDateBogota` displays `'1 jul 2026'` (no ±1 day drift). Add assertion to route test from 3.1.
  - File: `src/features/negocios/__tests__/api/fondear-aportes.route.test.ts`

- [ ] 7.3 Run full test suite (`npm run test:unit`) and confirm all existing tests still pass (no regressions on cron or aporte-visual-state).

---

## Spec Requirements Traceability

| Task | Spec Requirement |
|------|-----------------|
| 1.1–1.4 | FONDEAR affordance on installment 1 (SIN_FONDEAR) with date selection |
| 2.1–2.2 | Cron excludes installmentIndex 1 from auto-funding |
| 3.1–3.2 | fund installment 1: SIN_FONDEAR → FONDEADO + EMITIDO → FONDEADO with chosen date |
| 4.1–4.2 | Hook calls correct endpoint with fundedDate |
| 5.1–5.2 | Date-picker dialog pattern; separate container from presentation |
| 6.1–6.3 | Full UI wiring; operators can trigger FONDEAR from funding modal |
| 7.1–7.3 | Date timezone correctness; no regression in existing behavior |
