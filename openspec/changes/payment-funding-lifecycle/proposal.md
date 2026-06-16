# Proposal: Payment Funding Lifecycle (SIN_FONDEAR → FONDEADO via daily cron)

## Intent

Today, payments generated on the EMITIDO transition are stamped `FONDEADO` with a non-null `dateAnchored` immediately — even for installments not yet due. This misrepresents funding state: a negocio appears funded before any money arrives. We need payments to start `SIN_FONDEAR` and be funded automatically on their due date (America/Bogota), so funding state reflects reality and the first real funding event flips the negocio to `FONDEADO`. A latent timezone bug in month-boundary logic must be fixed before the cron stamps production dates. This change also makes the **cartera lifecycle drive business status**: a negocio in collections must visibly read `CARTERA` and return to `FONDEADO` only once collections are cleared.

## Scope

### In Scope
- Default new EMITIDO payments to `SIN_FONDEAR` with `dateAnchored: null` (one-line change in `syncPaymentsStructure`).
- New cron service `fundDuePayments(today)`: funds ALL `SIN_FONDEAR` payments with due date <= today (Bogota, today and backwards) — so the first payment carrying the emission date is funded on the first run after emission; skips `EN_CARTERA` / `PAGO_ANTICIPADO`.
- First actual funding event on a business (any installment) flips Business → `FONDEADO` and stamps `Business.dateAnchored` (only if currently null).
- New business status `CARTERA` (added to `BUSINESS_STATUS` const object). Invariant: business is `CARTERA` iff it has ≥1 `EN_CARTERA` payment; `FONDEADO` iff it has ≥1 funded payment and no `EN_CARTERA` payment.
- `markCartera`: payment → `EN_CARTERA` with cartera date stamped AND business → `CARTERA`.
- `markCarteraPagado`: payment keeps existing `CARTERA_PAGADO` state (NOT FONDEADO); business returns to `FONDEADO` only when no other payment remains `EN_CARTERA`, stamping `Business.dateAnchored` only if null (never overwritten).
- Cron coexistence with CARTERA: the cron does NOT flip a `CARTERA` business back to `FONDEADO`; it only funds due payments. The FONDEADO/CARTERA invariant above is the single source of truth.
- Render `CARTERA` everywhere business status is enumerated: status badge, list status filter, dashboard donut (color + label).
- New authenticated internal route `POST /api/negocios/cron/fund-payments` (Bearer `CRON_SECRET`); system cron on DO droplet (Approach A).
- Fix the ISO-slicing timezone bug in `isSameMonthOrFuture`; standardize on America/Bogota.
- New `PATCH` endpoint for `Payment.dateAnchored` + edit modal mirroring the "adelantar pago" flow.
- UI visual state: cartera button only for current month or later; pago anticipado only strictly after current month; dedicated `SIN_FONDEAR` variant with no action buttons.
- Idempotent one-time migration `prisma/seeds/reset-future-payments-to-sin-fondear.ts`, four steps: (0) recompute and persist `expectedDate` for emitted businesses via `calculateExpectedDates` (skip+log unrecoverable ones); (1) reset `FONDEADO` payments due strictly after today (Bogota) → `SIN_FONDEAR` + `dateAnchored: null`; (2) reset all FONDEADO/SIN_FONDEAR payments of `VENTA_EFECTUADA` businesses to `SIN_FONDEAR` with null dates (schedule regenerates on emission); (3) backfill every business with ≥1 `EN_CARTERA` payment to `CARTERA`. `EN_CARTERA` payments are never modified.
- Audit logging for all mutations (new `PAYMENT_CRON_FUNDED`, `BUSINESS_CRON_FONDEADO`, `BUSINESS_CARTERA`, `BUSINESS_REFONDEADO`).
- Update affected mocks/tests (`business-id.route.test.ts`, `route.test.ts`, `payment-state.service.test.ts`, status-badge / filter / donut tests).

### Out of Scope
- Prisma schema changes for payment state (`SIN_FONDEAR` enum and nullable `dateAnchored` already exist). `CARTERA` business status is a `String` const value, not a Prisma enum change.
- Manual fondeo flows (`fondear-aportes`, `fondear-anualidades`, `fondear`) — remain explicit FONDEADO.
- In-app schedulers (node-cron/custom server) — rejected (Approach C).
- Retroactive recompute of payments due before today — the migration boundary is due date >= today (Bogota).

## Capabilities

### New Capabilities
- `payment-funding-cron`: scheduled funding of due `SIN_FONDEAR` payments, Business FONDEADO flip on first funding, Bogota date semantics, authenticated internal route.

### Modified Capabilities
- `negocios`: payment creation defaults to `SIN_FONDEAR`; funded-date PATCH editing; button-visibility rules; timezone-correct month-boundary logic; **new `CARTERA` business status with the cartera↔business lifecycle** (markCartera sets business CARTERA; markCarteraPagado returns business to FONDEADO only when no EN_CARTERA payment remains, stamping dateAnchored only if null); CARTERA rendered in badge, list filter, and dashboard donut.

## Approach

Approach A (matches `backup-db.sh` / `ssl-renew.sh`): system cron hits an authenticated Next.js route that delegates to `fundDuePayments(today)` in `payment-state.service.ts`. All "today"/month logic uses America/Bogota. The cartera↔business lifecycle lives in `markCartera` / `markCarteraPagado`, enforcing one invariant: `CARTERA` iff ≥1 `EN_CARTERA` payment, else `FONDEADO` if ≥1 funded. `Business.dateAnchored` is write-once (set only when null). Strict TDD is enabled — tasks/apply must write tests first (cron service, route auth, visual-state rules, timezone fix, cartera↔business transitions, status rendering). Migration runs in QA first, must be idempotent.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/negocios/[id]/route.ts` (~567) | Modified | Default to `SIN_FONDEAR`, `dateAnchored: null` |
| `src/features/negocios/types/business-entity.types.ts` | Modified | Add `CARTERA` to `BUSINESS_STATUS` const + `BusinessStatus` union |
| `src/features/negocios/services/payment-state.service.ts` | Modified | Add `fundDuePayments(today)`; `markCartera` sets business CARTERA; `markCarteraPagado` returns business to FONDEADO per invariant (dateAnchored write-once) |
| `src/app/api/negocios/cron/fund-payments/route.ts` | New | Authenticated cron endpoint |
| `src/app/api/negocios/[id]/aportes/[index]/date-anchored/route.ts` | New | PATCH funded date |
| `src/features/negocios/lib/aporte-visual-state.ts` | Modified | SIN_FONDEAR variant; cartera/anticipado rules; fix timezone |
| `src/features/negocios/components/ui/BusinessStatusBadge.tsx` | Modified | Add `CARTERA` badge config (label + style) |
| `src/features/negocios/components/AdvancedFiltersSheet.tsx` | Modified | Add `CARTERA` to list status filter options |
| `src/features/negocios/lib/business-api.schemas.ts` | Modified | Allow `CARTERA` in status validation enum |
| `src/features/production-dashboard/lib/by-status-colors.ts` | Modified | Add `CARTERA` color + label for donut/legend grouping |
| `src/features/negocios/components/modals/` | New/Modified | Funded-date edit modal; AporteRow rendering |
| `src/features/auth/lib/audit-logger.ts` | Modified | New AuditAction values (`PAYMENT_CRON_FUNDED`, `BUSINESS_CRON_FONDEADO`, `BUSINESS_CARTERA`, `BUSINESS_REFONDEADO`) |
| `prisma/seeds/reset-future-payments-to-sin-fondear.ts` | New | Idempotent migration: FONDEADO payments due >= today (Bogota) → SIN_FONDEAR + null dateAnchored; EN_CARTERA untouched; businesses with ≥1 EN_CARTERA payment backfilled to CARTERA |
| `terraform/scripts/setup-droplet.sh` / `docker/env.example` | Modified | Register cron; `CRON_SECRET` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| New `CARTERA` business status leaks into UI surfaces that enumerate statuses (badge, list filter, dashboard donut, schema validation) and breaks rendering/grouping | High | Enumerate all surfaces in Affected Areas; add `CARTERA` to each; cover with status-badge/filter/donut tests |
| Cartera↔business invariant drifts (business stuck in CARTERA or wrong refondeo) | Med | Single invariant: CARTERA iff ≥1 EN_CARTERA, else FONDEADO; enforce in markCartera/markCarteraPagado; transition tests |
| `Business.dateAnchored` overwritten on refondeo, losing first funding date | Med | Write-once rule: stamp only when null; explicit test |
| Migration nulls future `dateAnchored` irreversibly | Med | Idempotent; run QA first; backup before run |
| Timezone bug yields wrong "today" | Med | Centralize Bogota helper; tests-first |
| SIN_FONDEAR default breaks fixtures | High | Update mocks/tests as part of change |
| CRON_SECRET misconfig leaves route open/unreachable | Med | Reject missing/invalid Bearer; document env |

## Rollback Plan

Revert the `syncPaymentsStructure` default, the `CARTERA` status additions (types/badge/filter/donut/schema), the cartera↔business lifecycle changes in `payment-state.service.ts`, and UI commits; remove cron crontab entry and route. The migration is one-time and forward-only — restore from DB backup if a rollback of funded state is required. Existing businesses left in `CARTERA` must be reconciled to FONDEADO/EN_CARTERA per the invariant before reverting the status value.

## Dependencies

- `CRON_SECRET` env var in droplet/docker env.
- DB backup before running migration in QA/prod.

## Success Criteria

- [ ] New EMITIDO payments are `SIN_FONDEAR` with `dateAnchored: null`.
- [ ] Cron funds ALL due `SIN_FONDEAR` payments (today and backwards) using Bogota date; skips cartera/anticipado; does not flip a CARTERA business to FONDEADO.
- [ ] First funding event flips Business to FONDEADO and stamps `dateAnchored` (only if null).
- [ ] `markCartera` sets payment `EN_CARTERA` (cartera date stamped) AND business → `CARTERA`.
- [ ] `markCarteraPagado` keeps `CARTERA_PAGADO`; business returns to `FONDEADO` only when no `EN_CARTERA` payment remains; `dateAnchored` never overwritten.
- [ ] `CARTERA` renders correctly in status badge, list status filter, and dashboard donut (color + label).
- [ ] Migration resets only `FONDEADO` payments due today or later (Bogota) to `SIN_FONDEAR` + null `dateAnchored`; cartera payments untouched; businesses with ≥1 `EN_CARTERA` payment are set to `CARTERA`; re-running it is a no-op.
- [ ] Funded date editable via PATCH + modal.
- [ ] Visual-state rules and timezone fix verified by tests; affected tests/mocks green.
