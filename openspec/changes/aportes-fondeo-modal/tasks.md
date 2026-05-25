# Tasks: Aportes Fondeo Modal — Cartera & Pago Anticipado

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: schema + service + API routes → PR 2: UI layer + tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema, migration, ERD, types, service, API routes, audit logger | PR 1 | Backend slice; independently deployable behind UI |
| 2 | Visual state lib, hook, UI components, FundingModal refactor, all tests | PR 2 | Depends on PR 1 types + endpoints |

---

## Phase 1: Foundation (Schema & Types)

- [x] 1.1 Add `EN_CARTERA`, `PAGO_ANTICIPADO` to `AnnualPaymentStatus` enum in `prisma/schema.prisma`; add `portfolioDate DateTime?` and `earlyPaymentDate DateTime?` to `Payment` model
- [x] 1.2 Run `npx prisma migrate dev --name aportes_cartera_anticipado` and commit generated migration folder `prisma/migrations/<ts>_aportes_cartera_anticipado/`
- [x] 1.3 Run `npx prisma generate` to update Prisma client
- [x] 1.4 Update `prisma/ERD.md`: enum block, `erDiagram` relationship lines, Payment entity field list
- [x] 1.5 Extend `AnnualPaymentStatus` union type and add `portfolioDate`, `earlyPaymentDate` to `PaymentInstallmentDto` in `src/features/negocios/types/business-api.types.ts`
- [x] 1.6 Add 3 new `AuditAction` enum values (`APORTE_CARTERA_MARKED`, `APORTE_CARTERA_UNMARKED`, `APORTE_PAGO_ANTICIPADO_MARKED`) to `src/features/auth/lib/audit-logger.ts`

## Phase 2: Service & API Routes

- [x] 2.1 Create `src/features/negocios/services/payment-state.service.ts` with `markCartera`, `unmarkCartera`, `markPagoAnticipado(businessId, index, actor)` — atomic `updateMany` with `where: { status: { in: allowedFrom } }`, check count, return `TransitionResult`, call `logAuditEvent` fire-and-forget
- [x] 2.2 Create `src/app/api/negocios/[id]/aportes/[index]/cartera/route.ts` with `PATCH` (mark) and `DELETE` (unmark) handlers — role guard via `canFundPayments()`, delegate to service, return 200/403/404/409
- [x] 2.3 Create `src/app/api/negocios/[id]/aportes/[index]/pago-anticipado/route.ts` with `POST` handler — same role guard, delegate to `markPagoAnticipado`, return 200/403/404/409

## Phase 3: UI Layer

- [x] 3.1 Create `src/features/negocios/lib/aporte-visual-state.ts` — pure function `getAporteVisualState(aporte, now, role): AporteVisualState` implementing the 4-variant matrix (FONDEADO_PAST, FONDEADO_CURRENT, EN_CARTERA, PAGO_ANTICIPADO)
- [x] 3.2 Create `src/features/shared/ui/confirm-action-dialog.tsx` — AlertDialog wrapper accepting `title`, `description`, `onConfirm`, `onCancel`, `open`
- [x] 3.3 Create `src/features/negocios/hooks/use-aporte-transitions.ts` — `AsyncState<PaymentDto>` hook exposing `markCartera`, `unmarkCartera`, `markPagoAnticipado`; uses fetch; updates local state on success
- [x] 3.4 Create `src/features/negocios/components/modals/AporteRow.tsx` — renders one row using `getAporteVisualState`, renders `ConfirmActionDialog` per action, calls hook transitions
- [x] 3.5 Refactor `src/features/negocios/components/modals/FundingModal.tsx` — replace inline row logic with `<AporteRow>`, pass `role` from session via `canFundPayments`, remove inline color ternaries

## Phase 4: Tests

- [x] 4.1 Create `src/features/negocios/lib/__tests__/aporte-visual-state.test.ts` — Vitest table-driven: 4 variants × 2 role groups (ADMIN/ANALISTA_SOPORTE vs AGENTE/COACH), verify `variant`, `rowClass`, `buttons`
- [x] 4.2 Create `src/features/negocios/services/__tests__/payment-state.service.test.ts` — mock Prisma; happy path for each of 3 transitions; conflict (count=0 → returns `{ ok: false, code: 'CONFLICT' }`); NOT_FOUND case; verify `logAuditEvent` called once per success
- [x] 4.3 Create `src/features/negocios/hooks/__tests__/use-aporte-transitions.test.ts` — `renderHook` + mock fetch; verify state transitions idle→loading→success and idle→loading→error
- [x] 4.4 Create route integration tests `src/app/api/negocios/[id]/aportes/[index]/cartera/__tests__/route.test.ts` and `pago-anticipado/__tests__/route.test.ts` — mock service + audit-logger; assert 403 for AGENTE, 409 on CONFLICT, 200 on happy path
- [x] 4.5 Create `src/features/negocios/components/modals/__tests__/AporteRow.test.tsx` — RTL: renders correct variant per status; confirm dialog gates mutation; no buttons for read-only roles
