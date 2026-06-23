# Design: Payment Funding Lifecycle

## Technical Approach

Approach A (proposal): system cron → authenticated Next.js route → `fundDuePayments(today)` service. All "today"/month logic uses America/Bogota via ONE new helper. Services own all Prisma; routes are HTTP-only. CARTERA business status is a `String` const value (no schema change). Strict TDD: every new unit accepts an injectable `today: Date` and a mockable `prisma`.

## Architecture Decisions

### Decision 1: Bogota date helper (centralized)
**Choice**: New `src/features/negocios/lib/bogota-date.ts` exporting `todayBogota(): Date` (UTC instant of Bogota midnight), `bogotaYearMonth(d): string` (`YYYY-MM`), `isSameMonthOrFuture(ref, now)`, `isStrictlyFutureMonth(ref, now)`. `aporte-visual-state.ts` imports these instead of inlining slicing.
**Alternatives**: extend `format-date.ts` (display-only, wrong layer); inline `Intl` per call site (duplication, the current bug).
**Rationale**: One source of truth for the timezone fix; pure + injectable `now` for tests. Bug fix: derive `nowYearMonth` from `Intl.DateTimeFormat(BOGOTA_TZ)` parts, not `now.getMonth()` (server-local). `anticipado` uses the strict-future variant; `cartera` uses same-month-or-future.

### Decision 2: `fundDuePayments(today)` transaction shape
**Choice**: Single function. (1) `payment.findMany` where `status=SIN_FONDEAR` AND `expectedDate <= endOfTodayBogota`, select `idBusiness, installmentIndex, expectedDate`. (2) One `$transaction` per affected business: `updateMany` payments→FONDEADO stamping `dateAnchored = today` (the cron run's Bogota date — per requirement, the funded date records when the funding happened, not the due date; this is why the field stays user-editable via the PATCH endpoint); then the race-free first-funding flip via conditional `updateMany` on the business (`where: { idBusiness, status: 'EMITIDO', dateAnchored: null }, data: { status: 'FONDEADO', dateAnchored: today }`). Returns `{ fundedPayments, fondeadoBusinesses }` counts.
**Round 6 addendum (manual Fondear flow removed):** The manual "Fondear primer pago" button that previously let an operator flip EMITIDO→FONDEADO through the UI is removed. The cron (Decision 2) now exclusively owns this transition for new businesses, and the migration script (Decision 7) backfills legacy businesses. Deleted artifacts: `getFirstPaymentFondeoButton` lib function, `MARK_FONDEAR` from `AporteButton`, the Fondear button in `AporteRow`, `ConfirmFondeoDialog` component, `markPrimerPagoFondeado` hook/service, and the `POST /api/negocios/[id]/aportes/[index]/fondear` API route.
**Alternatives**: one giant transaction for all (long lock, poor partial-failure isolation); per-payment transactions (N flips race on the business row).
**Rationale**: `updateMany` with `status='EMITIDO'` guard is the race-free flip — only the first matching write succeeds; concurrent runs are idempotent. CARTERA invariant respected: the flip guard is `status='EMITIDO'`, so a CARTERA business is never touched, and `dateAnchored: null` keeps it write-once.
**Implementation constraint (SRP / transaction-helper rule):** The per-business `$transaction` body MUST be extracted into a named private helper, e.g. `async function fundSingleBusiness(tx: PrismaTransactionClient, businessId: number, paymentIndexes: number[], today: Date, actor: Actor): Promise<void>`. `fundDuePayments` only queries, groups, and delegates to this helper per business — never a `$transaction` block with 4+ distinct operations in a single body.
**CARTERA invariant helper (no derived-state duplication):** Both `markCartera` (business → CARTERA) and `markCarteraPagado` (business → FONDEADO when no `EN_CARTERA` remains) need the query "does this business have remaining EN_CARTERA payments?". It MUST be derived exactly once via a shared private helper, e.g. `async function countRemainingCartera(tx: PrismaTransactionClient, businessId: number): Promise<number>`, called inside each function's transaction. Re-deriving it independently per function is prohibited.

### Decision 3: Cron reachability + auth
**Choice**: System cron entry in `terraform/scripts/run-script.md` (manual crontab append, matching `ssl-renew`): `0 6 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/negocios/cron/fund-payments`. 6 UTC = 1 AM Bogota. Route reads `Authorization` header and compares to `process.env.CRON_SECRET` via `crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(expected))` with a length pre-check returning 401 first (timingSafeEqual throws on length mismatch); missing/invalid → 401. `CRON_SECRET` added to `docker/env.example` and prod compose env.
**Alternatives**: through nginx/HTTPS (extra TLS hop, host header concerns); `npx tsx` script (bypasses service-layer observability).
**Rationale**: localhost:3000 already used by health checks; mirrors existing cron precedent exactly.

### Decision 4: PATCH funded-date endpoint
**Choice**: `src/app/api/negocios/[id]/aportes/[index]/date-anchored/route.ts`, method `PATCH`. Zod body `{ dateAnchored: 'YYYY-MM-DD' }`. New service `updatePaymentDateAnchored(businessId, index, actor, date)`: allowed only when payment status ∈ {`FONDEADO`}; converts via `new Date(`${date}T12:00:00Z`)` (matches `markPrimerPagoFondeado`). Auth: `auth()` + `canFundPayments`, identical to sibling routes.
**Alternatives**: PUT (semantics = full replace); allow editing in any state (would corrupt cartera/anticipado dates).
**Rationale**: Path/zod/actor pattern mirrors `aportes/[index]/fondear`; restricting to FONDEADO keeps the field meaning ("funded date").

### Decision 5: Edit-date modal
**Choice**: New `EditFundedDateModal.tsx` mirroring `ConfirmFondeoDialog` (date `Input`, today default). Hook `useUpdateFundedDate` in `src/features/negocios/hooks/use-update-funded-date.ts` using shared `AsyncState<T>` (idle|loading|success|error) — per architecture rules, hooks live in `hooks/`, never in `components/`. `AporteRow` renders an edit affordance only for `FONDEADO_PAST`/`FONDEADO_CURRENT` variants.
**Rationale**: Reuses the established "adelantar pago"/fondeo dialog flow; React 19 (no useMemo/useCallback).

### Decision 6: CARTERA visual identity
**Choice**: Badge: `CARTERA → { label: 'Cartera', className: 'bg-amber-100 text-amber-800 hover:bg-amber-200' }` (amber slot is free; red=cancelado, indigo=fondeado). Donut: add `CARTERA` to `STATUS_DONUT_ALLOWED`, `STATUS_COLORS['#f59e0b']` (amber-500), label `'Cartera'`.
**Rationale**: Amber is the only unused semantic slot and reads as "attention/collections".

### Decision 7: Migration script (v3 — five steps, schedule recompute)
**Choice**: `prisma/seeds/reset-future-payments-to-sin-fondear.ts`, idempotent, `--dry-run` flag (log counts, no writes). Local-data analysis (34 businesses / 2,882 payments mass-stamped FONDEADO on 2026-05-25 with `expectedDate` null) showed no date-field filter can identify future installments — the schedule must be recomputed. Steps: (0) backfill `expectedDate` for emitted businesses (`EMITIDO`/`FONDEADO`/`CARTERA`) via `calculateExpectedDates(dateIssued, numAportes, periodicityName)`, skipping+logging businesses with missing inputs or unknown periodicity (the helper falls back to a 0-month increment, which would clone dates — guarded); (1) reset FONDEADO payments with `expectedDate` strictly after today (Bogota) → `SIN_FONDEAR` + `dateAnchored: null` (`updateMany`, scoped to emitted businesses); (2) reset FONDEADO/SIN_FONDEAR payments of `VENTA_EFECTUADA` businesses to `SIN_FONDEAR` with BOTH dates null (schedule regenerates on emission; cartera/anticipado anomalies logged); (3) flip `EMITIDO` businesses with ≥1 FONDEADO payment and no EN_CARTERA payment → `FONDEADO`, stamping `Business.dateAnchored` with the earliest payment funding date (write-once) — closes the legacy gap the cron cannot resolve; (4) cartera invariant backfill → `CARTERA`. Re-run is a no-op (where-clauses self-exclude).
**Rationale**: "Future" is decided by the recomputed CALENDAR, not by contaminated date fields (decision log rounds 4–6); EN_CARTERA never modified; idempotent by construction. Audits batch-level: `PAYMENT_MIGRATION_RESET` (steps 0–2), `BUSINESS_MIGRATION_FONDEADO` (step 3), `BUSINESS_CARTERA` (step 4). Verified on dev DB: 1,136 schedules recovered, 1,757 future payments reset, 1,095 non-emitted cleaned, 69 businesses flipped, second run all zeros.
**Audit logging stance:** per the mandatory audit rule, the script logs ONE `AuditLog` entry per step (batch-level, with affected counts) via `logAuditEvent` using the system actor `{ email: 'system@migration', ip: 'system', ua: 'migration/reset-future-payments' }` — not one entry per row, to avoid flooding AuditLog with bulk noise. `--dry-run` logs to stdout only.

### Decision 8: Audit logging for cron (no session)
**Choice**: Cron actor = `{ userId: undefined, email: 'system@cron', ip: 'system', ua: 'cron/fund-payments' }`. New `AuditAction`: `PAYMENT_CRON_FUNDED`, `BUSINESS_CRON_FONDEADO`, `BUSINESS_CARTERA`, `BUSINESS_REFONDEADO`. `logAuditEvent` already accepts optional `userId` (verified `audit-logger.ts:63`), never throws.
**Required `Actor` type change:** `Actor` in `payment-state.service.ts` currently types `userId: number` (non-optional). It MUST change to `userId: number | undefined` to support the system actor — included in the File Changes table.
**Rationale**: AuditLog requires no FK on user; a stable sentinel identity makes cron mutations traceable.

## Data Flow

    system cron ──curl+Bearer──▶ POST /cron/fund-payments
        │  (CRON_SECRET check)         │
        ▼                              ▼
    401 if bad             fundDuePayments(todayBogota())
                                       │ findMany SIN_FONDEAR ≤ today
                                       ▼
                     per-business $transaction:
                       payments → FONDEADO (dateAnchored=today Bogota)
                       business updateMany guard(EMITIDO,null) → FONDEADO
                                       │
                                       ▼  audit: PAYMENT_CRON_FUNDED / BUSINESS_CRON_FONDEADO

    markCartera: payment→EN_CARTERA + business→CARTERA        (audit BUSINESS_CARTERA)
    markCarteraPagado: payment→CARTERA_PAGADO; if no EN_CARTERA left → business→FONDEADO
                       (dateAnchored only if null)            (audit BUSINESS_REFONDEADO)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/lib/bogota-date.ts` | Create | Centralized Bogota today/month helpers |
| `src/features/negocios/lib/aporte-visual-state.ts` | Modify | Use helpers; SIN_FONDEAR no-buttons variant; cartera=same-month+, anticipado=strict-future |
| `src/features/negocios/services/payment-state.service.ts` | Modify | `fundDuePayments` (+ `fundSingleBusiness` helper); `updatePaymentDateAnchored`; `markCartera`→business CARTERA; `markCarteraPagado` refondeo invariant + write-once (shared `countRemainingCartera` helper); `Actor.userId` → `number \| undefined` |
| `src/app/api/negocios/[id]/route.ts` (~567) | Modify | Default new payments `SIN_FONDEAR`, `dateAnchored: null`; `recalculatePaymentExpectedDates` updates ONLY `expectedDate` — it must never stamp/overwrite `dateAnchored` (the real funding date) |
| `src/app/api/negocios/cron/fund-payments/route.ts` | Create | Bearer-auth POST → fundDuePayments |
| `src/app/api/negocios/[id]/aportes/[index]/date-anchored/route.ts` | Create | PATCH funded date |
| `src/features/negocios/types/business-entity.types.ts` | Modify | Add `CARTERA` to const + union |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | Add `CARTERA` to `BUSINESS_STATUS_VALUES` |
| `src/features/negocios/components/ui/BusinessStatusBadge.tsx` | Modify | CARTERA badge config |
| `src/features/negocios/components/AdvancedFiltersSheet.tsx` | Modify | CARTERA filter option |
| `src/features/production-dashboard/lib/by-status-colors.ts` + `types/production-kpi.types.ts` | Modify | CARTERA donut color/label/allowed-key |
| `src/features/negocios/components/modals/EditFundedDateModal.tsx` | Create | Edit funded date modal component |
| `src/features/negocios/hooks/use-update-funded-date.ts` | Create | `useUpdateFundedDate` hook (AsyncState) |
| `src/features/negocios/components/modals/AporteRow.tsx` | Modify | Edit affordance for funded variants; remove `business` prop, `isPrimerPagoFondeado` logic, `MARK_FONDEAR` button (Round 6) |
| `src/features/negocios/components/modals/FundingModal.tsx` | Modify | Remove `businessStatus`, `businessDateAnchored`, `onFondeoSuccess` props; remove `ConfirmFondeoDialog` and fondeo state (Round 6) |
| `src/features/negocios/lib/aporte-visual-state.ts` | Modify (R6) | Remove `getFirstPaymentFondeoButton`; drop `MARK_FONDEAR` from `AporteButton` |
| `src/features/negocios/services/payment-state.service.ts` | Modify (R6) | Remove `markPrimerPagoFondeado` |
| `src/features/negocios/hooks/use-aporte-transitions.ts` | Modify (R6) | Remove `markPrimerPagoFondeado` |
| `src/features/negocios/components/modals/ConfirmFondeoDialog.tsx` | Delete (R6) | No other callers |
| `src/app/api/negocios/[id]/aportes/[index]/fondear/route.ts` | Delete (R6) | No other callers |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modify (R6) | Remove removed FundingModal props + state |
| `src/features/auth/lib/audit-logger.ts` | Modify | 4 new AuditAction values |
| `prisma/seeds/reset-future-payments-to-sin-fondear.ts` | Create | Idempotent migration + dry-run |
| `terraform/scripts/run-script.md` + `docker/env.example` | Modify | Cron entry + CRON_SECRET |

## Interfaces / Contracts

```ts
// bogota-date.ts
export function todayBogota(): Date
export function bogotaYearMonth(d: Date): string  // 'YYYY-MM'
export function isSameMonthOrFuture(ref: string | null, now: Date): boolean
export function isStrictlyFutureMonth(ref: string | null, now: Date): boolean

// aporte-visual-state.ts — AporteVariant gains a new member:
export type AporteVariant = 'FONDEADO_PAST' | 'FONDEADO_CURRENT' | 'EN_CARTERA'
  | 'PAGO_ANTICIPADO' | 'CARTERA_PAGADO' | 'SIN_FONDEAR'
// SIN_FONDEAR → scheduled look, label only, buttons: []

// payment-state.service.ts
export async function fundDuePayments(today: Date):
  Promise<{ fundedPayments: number; fondeadoBusinesses: number }>
export async function updatePaymentDateAnchored(
  businessId: number, index: number, actor: Actor, date: Date
): Promise<TransitionResult>
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | bogota-date month logic, anticipado strict-future, timezone fix | Pure fn, injected `now` across month boundaries / UTC-5 edge |
| Unit | `fundDuePayments` (due≤today, skip cartera/anticipado, first-flip, no CARTERA flip, write-once) | Mock prisma `$transaction`/`updateMany`, injected `today` |
| Unit | markCartera→CARTERA, markCarteraPagado refondeo-only-when-no-EN_CARTERA | Mock prisma |
| Unit | visual-state SIN_FONDEAR=no buttons | Pure fn |
| Integration | cron route 401 on bad/missing Bearer, 200 path | Mock service, set CRON_SECRET |
| Integration | PATCH date-anchored state guard | Mock service |
| Component | CARTERA badge/filter/donut render | RTL |
| Fixtures | update mocks expecting FONDEADO default → SIN_FONDEAR | `mock-prisma-business.ts`, route tests |

## Migration / Rollout

Run `--dry-run` in QA, back up DB, run for real, verify counts; then prod. Forward-only; rollback restores from backup and reconciles CARTERA per invariant.

## Open Questions

- [ ] Confirm DELETE-free; n/a here (no deletes).
- [ ] AdvancedFiltersSheet vs AdvancedFiltersModal — confirm which is wired to list status filter during tasks.
