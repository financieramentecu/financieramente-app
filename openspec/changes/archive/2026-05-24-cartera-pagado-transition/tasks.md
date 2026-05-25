# Tasks: Cartera → Cartera Pagado Terminal Transition

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (all layers tightly coupled through state machine) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All layers: Prisma → types → service → route → hook → UI → tests | PR 1 | single-pr; maintainer approved size-exception |

---

## Phase 1: Prisma Foundation

- [x] 1.1 Modify `prisma/schema.prisma`: add `CARTERA_PAGADO` to the `AnnualPaymentStatus` enum; add `portfolioPaymentDate DateTime?` field to `Payment` model.
- [x] 1.2 Generate migration with `npx prisma migrate dev --create-only --name cartera_pagado_transition`. Edit the resulting `migration.sql` to ensure `ALTER TYPE "AnnualPaymentStatus" ADD VALUE 'CARTERA_PAGADO';` appears as a SEPARATE statement BEFORE `ALTER TABLE "payments" ADD COLUMN "portfolio_payment_date" TIMESTAMP(3);`. **Postgres constraint: new enum values cannot be used in the same transaction where they are added — confirm the two statements run in separate implicit transactions (do NOT wrap both in one explicit `BEGIN`/`COMMIT` block).** Apply with `npx prisma migrate dev`.
- [x] 1.3 Run `npx prisma generate` to update the Prisma client types.
- [x] 1.4 Modify `prisma/ERD.md`: update the `AnnualPaymentStatus` enum block to include `CARTERA_PAGADO`; add `portfolioPaymentDate DateTime?` to the Payment entity fields in the diagram; add a note under `## Índices y convenciones` for the nullable column and terminal enum value.

## Phase 2: Types and Audit Infrastructure

- [x] 2.1 Modify `src/features/negocios/types/business-api.types.ts`: add `'CARTERA_PAGADO'` to the `AnnualInstallmentStatusUi` union type; add `portfolioPaymentDate: string | null` to `PaymentInstallmentDto`.
- [x] 2.2 Modify `src/features/auth/lib/audit-logger.ts`: add `APORTE_CARTERA_PAGADO = 'APORTE_CARTERA_PAGADO'` to the `AuditAction` enum.

## Phase 3: Service Layer

- [x] 3.1 Modify `src/features/negocios/services/payment-state.service.ts`: add `markCarteraPagado(businessId: number, index: number, actor: Actor, paymentDate: Date): Promise<TransitionResult>` — uses `updateMany WHERE status=EN_CARTERA` guard → sets `status=CARTERA_PAGADO` and `portfolioPaymentDate`; returns `CONFLICT` if no row matched (status was not EN_CARTERA), `NOT_FOUND` if business not found; calls `logAuditEvent(APORTE_CARTERA_PAGADO, ...)` with aporte index, negocioId, portfolioPaymentDate, and actor identity fields.
- [x] 3.2 Modify `toDto` in `payment-state.service.ts` to map `portfolioPaymentDate` from the Prisma model onto `PaymentInstallmentDto` (ISO string or null).

## Phase 4: API Route

- [x] 4.1 Create `src/app/api/negocios/[id]/aportes/[index]/cartera-pagado/route.ts`: `POST` handler — authenticate session (401); authorize ADMIN or ANALISTA_SOPORTE (403); validate body with Zod schema `{ paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }` (400); call `markCarteraPagado` service; map service result to `ApiResponse<PaymentInstallmentDto>` — 404 NOT_FOUND, 409 CONFLICT, 200 success, 500 on unhandled error. Do NOT call Prisma directly from the route handler.

## Phase 5: Hook

- [x] 5.1 Modify `src/features/negocios/hooks/use-aporte-transitions.ts`: extend `callEndpoint` to accept an optional `body` parameter (serialized as JSON in the fetch call with `Content-Type: application/json`); add `markCarteraPagado(businessId: number, index: number, paymentDate: string): Promise<ApiResponse<PaymentInstallmentDto>>` that calls `POST /api/negocios/${businessId}/aportes/${index}/cartera-pagado` with `{ paymentDate }` in the body; update `AsyncState<T>` transitions accordingly.

## Phase 6: Visual State

- [x] 6.1 Modify `src/features/negocios/lib/aporte-visual-state.ts`: add `CARTERA_PAGADO` branch — returns `{ variant: 'CARTERA_PAGADO', rowClass: 'bg-green-50 border-green-300', label: \`Cartera pagada: ${formatDate(portfolioPaymentDate)}\`, buttons: [] }`. This variant is terminal — no buttons for any role.

## Phase 7: UI Components

- [x] 7.1 Create `src/features/negocios/components/modals/ConfirmCarteraPagadoDialog.tsx`: props `{ open: boolean, index: number, onConfirm: (paymentDate: string) => void, onCancel: () => void }`. Controlled date input defaulting to `new Date().toISOString().slice(0, 10)`. Green border/bg styling. CheckCircle2 icon. Warning copy: "La cartera cambiará a pagado, ya no se va poder registrarlo como cartera." Confirm button: "Confirmar pago". Cancel button: "Cancelar". Do NOT use the generic `ConfirmActionDialog`.
- [x] 7.2 Modify `src/features/negocios/components/modals/AporteRow.tsx`: render the `CARTERA_PAGADO` visual variant — green row, date label, no action buttons for any role.
- [x] 7.3 Modify `src/features/negocios/components/modals/FundingModal.tsx`: add separate `pendingCarteraPagado` state (not reused from `pendingConfirm`); in `handleRequestAction`, branch `UNMARK_CARTERA` → `setPendingCarteraPagado({ index })` (forward to CARTERA_PAGADO, not revert to FONDEADO); mount `ConfirmCarteraPagadoDialog`; on `onConfirm(date)` call `markCarteraPagado` from hook then `handleTransitionSuccess`; on `onCancel` clear state.

## Phase 8: Tests — TDD (RED → GREEN for new code)

> Strict TDD is active. Write the failing test first, then implement, then refactor.

- [x] 8.1 **RED** `src/features/negocios/services/__tests__/payment-state.service.test.ts`: add failing tests for `markCarteraPagado` — success path (EN_CARTERA→CARTERA_PAGADO, portfolioPaymentDate set, audit called), CONFLICT path (status not EN_CARTERA, updateMany returns count=0), NOT_FOUND path, audit suppressed on CONFLICT.
- [x] 8.2 **RED** `src/features/negocios/lib/__tests__/aporte-visual-state.test.ts`: add failing tests for `CARTERA_PAGADO` variant — returns green class, empty buttons array, formatted date label.
- [x] 8.3 **RED** `src/features/negocios/hooks/__tests__/use-aporte-transitions.test.ts`: add failing tests for `markCarteraPagado` — posts body with paymentDate, AsyncState transitions (idle→loading→success), error JSON propagated.
- [x] 8.4 **RED** `src/features/negocios/components/modals/__tests__/ConfirmCarteraPagadoDialog.test.tsx` (create): failing tests — date input defaults to today, `onConfirm` called with selected date, `onCancel` called on cancel, warning copy rendered, dialog does not render when `open=false`.
- [x] 8.5 **RED** `src/app/api/negocios/[id]/aportes/[index]/cartera-pagado/__tests__/route.test.ts` (create): failing integration tests — 401 no session, 403 AGENTE role, 400 missing paymentDate, 400 invalid date format, 404 NOT_FOUND, 409 CONFLICT, 200 success with PaymentInstallmentDto.
- [x] 8.6 **RED** `src/features/negocios/components/modals/__tests__/AporteRow.test.tsx`: add failing test — CARTERA_PAGADO status renders green row, date label, no action buttons.
- [x] 8.7 **GREEN**: implement all production code changes (Phases 1–7) to make all RED tests pass.
- [x] 8.8 **REFACTOR**: clean up any duplication, tighten types, ensure no `any` escapes; run `npm run type-check` and `npm run lint` to confirm zero errors.

## Phase 9: Verification

- [x] 9.1 Run full test suite: `npm run test:unit` and `npm run test:integration` — all pass (224 files, 2112 tests).
- [x] 9.2 Run `npm run type-check` — zero TypeScript errors.
- [ ] 9.3 Manual browser verification: full EN_CARTERA → CARTERA_PAGADO flow; cancel dialog leaves state unchanged; existing FONDEADO/EN_CARTERA/PAGO_ANTICIPADO flows unaffected; CARTERA_PAGADO row renders green with date, no buttons.
