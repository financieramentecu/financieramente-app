# Tasks: Payment Funding Lifecycle

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800 – 1 100 (new files + modifications across 18 paths) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (see work units below) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending — user must choose before apply |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: types, bogota-date lib, audit actions, visual-state fix, SIN_FONDEAR default | PR 1 | No new routes; pure logic + type changes; self-contained; all existing fixtures updated here |
| 2 | Backend: fundDuePayments + cron route + PATCH date-anchored + markCartera/markCarteraPagado refactor + migration script | PR 2 | Depends on PR 1 (Actor type, audit actions, bogota-date) |
| 3 | UI: CARTERA badge/filter/donut, EditFundedDateModal, AporteRow edit affordance, infra docs | PR 3 | Depends on PR 2 (new status value, new endpoint) |

---

## Open Questions — Resolved Before Tasks

- [x] **AdvancedFiltersSheet vs AdvancedFiltersModal**: `AdvancedFiltersSheet` is wired to the business list in `BusinessTableSection.tsx` (line 581). The Modal variant is a separate component not wired to the list. The status filter task targets `AdvancedFiltersSheet.tsx`.

---

## Phase L0 — Foundation: Types, Helpers, Audit Actions (PR 1)

- [x] **L0.1** RED: Write unit tests in `src/features/negocios/lib/__tests__/bogota-date.test.ts` covering `todayBogota()`, `bogotaYearMonth()`, `isSameMonthOrFuture()`, `isStrictlyFutureMonth()` at UTC midnight edge (UTC 03:00 = Bogota 22:00 prior day; UTC 06:00 = Bogota 01:00 next day). Spec: Bogota Timezone Semantics scenarios.

- [x] **L0.2** GREEN: Create `src/features/negocios/lib/bogota-date.ts` with `todayBogota()`, `bogotaYearMonth(d)`, `isSameMonthOrFuture(ref, now)`, `isStrictlyFutureMonth(ref, now)` using `Intl.DateTimeFormat` with `America/Bogota`. All fns accept injectable `now`. Tests pass.

- [x] **L0.3** GREEN: Add `CARTERA` to `src/features/negocios/types/business-entity.types.ts` (`BUSINESS_STATUS` const + `BusinessStatus` union). Add to `src/features/negocios/lib/business-api.schemas.ts` `BUSINESS_STATUS_VALUES`. Acceptance: `CARTERA` accepted in type/schema validation (spec negocios CARTERA scenarios).

- [x] **L0.4** GREEN: Modify `src/features/auth/lib/audit-logger.ts` — add `AuditAction` enum values: `PAYMENT_CRON_FUNDED`, `BUSINESS_CRON_FONDEADO`, `BUSINESS_CARTERA`, `BUSINESS_REFONDEADO`. Acceptance: enum compiles, no existing usages broken.

- [x] **L0.5** GREEN: Change `Actor.userId` type in `src/features/negocios/services/payment-state.service.ts` from `number` to `number | undefined`. Acceptance: existing callers still compile (userId was always provided; now optional for system actor).

- [x] **L0.6** RED: Write unit tests in `src/features/negocios/lib/__tests__/aporte-visual-state.test.ts` (or update existing) covering: SIN_FONDEAR → no buttons; FONDEADO past/current/future month variants with Bogota edge; `isStrictlyFutureMonth` for anticipado; `isSameMonthOrFuture` for cartera. Spec: Aporte Visual State Rendering scenarios.

- [x] **L0.7** GREEN: Modify `src/features/negocios/lib/aporte-visual-state.ts` — replace inline ISO slicing with `bogota-date.ts` helpers; add `SIN_FONDEAR` variant (no buttons); use `isSameMonthOrFuture` for cartera, `isStrictlyFutureMonth` for anticipado. Tests pass.

- [x] **L0.8** Fixture update: Update `src/app/api/negocios/__tests__/[id]/route.test.ts` and any `mock-prisma-business.ts` fixtures that create payments with a `FONDEADO` default — change to `SIN_FONDEAR` + `dateAnchored: null`. Acceptance: existing tests still pass after the route change in L0.9.

- [x] **L0.9** GREEN: Modify `src/app/api/negocios/[id]/route.ts` (~line 567) — new payments created in `syncPaymentsStructure` MUST default to `status: SIN_FONDEAR` and `dateAnchored: null`. Acceptance: spec scenario "New EMITIDO payments start SIN_FONDEAR"; existing FONDEADO payments not downgraded.

---

## Phase L1 — Core Service Layer (PR 2)

- [x] **L1.1** RED: Write unit tests in `src/features/negocios/services/__tests__/payment-state.service.test.ts` for `fundDuePayments`: due payment funded, overdue funded, future skipped, EN_CARTERA skipped, PAGO_ANTICIPADO skipped, first-flip EMITIDO→FONDEADO (with BUSINESS_CRON_FONDEADO audit), write-once dateAnchored, CARTERA business not flipped, audit PAYMENT_CRON_FUNDED. Mock `prisma.$transaction`, `updateMany`. Spec: all payment-funding-cron scenarios.

- [x] **L1.2** GREEN: Implement `fundDuePayments(today: Date)` in `payment-state.service.ts`: query `SIN_FONDEAR` ≤ today, group by business, delegate per-business work to `fundSingleBusiness` helper (extracted per SRP constraint). `fundSingleBusiness(tx, businessId, paymentIndexes, today, actor)` runs `updateMany` payments→FONDEADO then conditional `updateMany` business guard `(EMITIDO, dateAnchored: null)`. Returns `{ fundedPayments, fondeadoBusinesses }`.

- [x] **L1.3** RED+GREEN: Add private `countRemainingCartera(tx, businessId): Promise<number>` helper. Update `markCartera` and `markCarteraPagado` to call this shared helper (no re-derivation). Write/update unit tests covering: markCartera→CARTERA + BUSINESS_CARTERA audit; markCarteraPagado last-EN_CARTERA→FONDEADO + BUSINESS_REFONDEADO audit + write-once dateAnchored; markCarteraPagado with remaining EN_CARTERA stays CARTERA. Spec: markCartera and markCarteraPagado requirement scenarios.

- [x] **L1.4** RED: Write unit tests for `updatePaymentDateAnchored(businessId, index, actor, date)`: success path (FONDEADO payment), rejection when status ≠ FONDEADO (409), audit log entry. Spec: Funded Date PATCH endpoint scenarios.

- [x] **L1.5** GREEN: Implement `updatePaymentDateAnchored` in `payment-state.service.ts`: allowed only for `FONDEADO` status; `new Date(\`${date}T12:00:00Z\`)` conversion; `logAuditEvent`. Tests pass.

- [x] **L1.6** RED: Write integration tests in `src/app/api/negocios/cron/__tests__/fund-payments.route.test.ts` covering: valid Bearer → 200 + summary; missing Authorization → 401; wrong secret → 401; `fundDuePayments` called with Bogota today. Spec: Authenticated Cron Route scenarios.

- [x] **L1.7** GREEN: Create `src/app/api/negocios/cron/fund-payments/route.ts` — `POST` handler; `Authorization: Bearer` header check via `crypto.timingSafeEqual` with length pre-check (returns 401 if lengths differ before comparison); calls `fundDuePayments(todayBogota())`; returns 200 with summary. `CRON_SECRET` read from `process.env.CRON_SECRET`. Tests pass.

- [x] **L1.8** RED: Write integration tests in `src/app/api/negocios/[id]/aportes/[index]/date-anchored/__tests__/route.test.ts` covering: ADMIN/ANALISTA_SOPORTE → 200; AGENTE/COACH → 403; invalid body → 400; non-FONDEADO payment → 409. Spec: Funded Date PATCH endpoint scenarios.

- [x] **L1.9** GREEN: Create `src/app/api/negocios/[id]/aportes/[index]/date-anchored/route.ts` — `PATCH` handler; `auth()` + `canFundPayments` guard; Zod body `{ dateAnchored: 'YYYY-MM-DD' }`; calls `updatePaymentDateAnchored`. Tests pass.

- [x] **L1.10** Create `prisma/seeds/reset-future-payments-to-sin-fondear.ts` — idempotent migration script: Step 1 in own transaction: `updateMany` FONDEADO + expectedDate ≥ startOfTodayBogota → SIN_FONDEAR + dateAnchored null; Step 2 in own transaction: backfill businesses with ≥1 EN_CARTERA payment → CARTERA. `--dry-run` flag logs counts, no writes. Logs ONE batch-level `AuditLog` entry per step via `logAuditEvent` with system actor `{ email: 'system@migration', ip: 'system', ua: 'migration/reset-future-payments' }`. Acceptance: idempotent (second run is no-op per where-clauses).

---

## Phase L2 — UI Layer (PR 3)

- [x] **L2.1** RED: Write component tests for `BusinessStatusBadge` covering `CARTERA` renders with amber label. Spec: CARTERA badge renders scenario.

- [x] **L2.2** GREEN: Modify `src/features/negocios/components/ui/BusinessStatusBadge.tsx` — add `CARTERA: { label: 'Cartera', className: 'bg-amber-100 text-amber-800 hover:bg-amber-200' }`. Tests pass.

- [x] **L2.3** RED: Write component/unit test for `AdvancedFiltersSheet` — CARTERA present in status filter options; COMISIONANDO absent. Spec: Renewed list status filter scenarios.

- [x] **L2.4** GREEN: Modify `src/features/negocios/components/AdvancedFiltersSheet.tsx` — add `CARTERA` filter option; ensure `COMISIONANDO` is not included. Tests pass.

- [x] **L2.5** RED: Write unit tests for `src/features/production-dashboard/lib/by-status-colors.ts` and `types/production-kpi.types.ts` — CARTERA present in `STATUS_DONUT_ALLOWED`, correct color `#f59e0b`, label `'Cartera'`. Spec: CARTERA appears in dashboard donut scenario.

- [x] **L2.6** GREEN: Modify `by-status-colors.ts` and `production-kpi.types.ts` — add `CARTERA` to `STATUS_DONUT_ALLOWED`, `STATUS_COLORS['CARTERA'] = '#f59e0b'`, label `'Cartera'`. Tests pass.

- [x] **L2.7** RED: Write unit tests for `src/features/negocios/hooks/use-update-funded-date.ts` — idle→loading→success/error state transitions using `AsyncState<T>`; calls `PATCH` endpoint with correct path.

- [x] **L2.8** GREEN: Create `src/features/negocios/hooks/use-update-funded-date.ts` — `useUpdateFundedDate(businessId, index)` returns `AsyncState<T>` (idle|loading|success|error); React 19 (no useMemo/useCallback). Tests pass.

- [x] **L2.9** RED: Write component tests for `EditFundedDateModal.tsx` — renders date input defaulting to today; calls hook on confirm; shows loading/error states.

- [x] **L2.10** GREEN: Create `src/features/negocios/components/modals/EditFundedDateModal.tsx` — date Input, today default, confirmation. Mirrors `ConfirmFondeoDialog`. React 19 conventions. Tests pass.

- [x] **L2.11** GREEN: Modify `src/features/negocios/components/modals/AporteRow.tsx` — add edit affordance (pencil/trigger for `EditFundedDateModal`) rendered only for `FONDEADO_PAST` and `FONDEADO_CURRENT` variants. Acceptance: AGENTE/COACH do not see the affordance (role check via `canFundPayments`).

---

## Phase L3 — Infrastructure & Docs

- [x] **L3.1** Modify `terraform/scripts/run-script.md` — append cron entry: `0 6 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/negocios/cron/fund-payments` (6 UTC = 1 AM Bogota). Mirror `ssl-renew` format.

- [x] **L3.2** Modify `docker/env.example` — add `CRON_SECRET=` placeholder. Acceptance: documented alongside other env vars; no value committed.

---

## Phase L4 — Final Verification

- [x] **L4.1** Run `npm run test:unit` — all new and modified unit tests green. Zero regressions.
- [x] **L4.2** Run `npm run test:integration` — cron route, PATCH route, and route fixture tests green.
- [x] **L4.3** Run `npm run type-check` — zero TS errors across all modified files.
- [x] **L4.4** Run `npm run lint` — no lint errors.
- [ ] **L4.5** (Manual / staging) Run migration script with `--dry-run`; verify logged counts match expectations before running for real.
