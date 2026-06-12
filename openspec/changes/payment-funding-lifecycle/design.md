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

### Decision 7: Migration script
**Choice**: `prisma/seeds/reset-future-payments-to-sin-fondear.ts`, idempotent, `--dry-run` flag (log counts, no writes). Step 1: `updateMany` payments `where: { status: FONDEADO, expectedDate: { gte: startOfTodayBogota } }` → `{ status: SIN_FONDEAR, dateAnchored: null }`. Step 2: backfill `business.updateMany` for every business with ≥1 `EN_CARTERA` payment (subquery via `findMany distinct idBusiness`) → `status: 'CARTERA'`. Each step in its own transaction; re-run is a no-op (where-clauses self-exclude).
**Rationale**: Boundary `>= today Bogota` per decision log; EN_CARTERA never matched; idempotent by construction.
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
| `src/app/api/negocios/[id]/route.ts` (~567) | Modify | Default new payments `SIN_FONDEAR`, `dateAnchored: null` |
| `src/app/api/negocios/cron/fund-payments/route.ts` | Create | Bearer-auth POST → fundDuePayments |
| `src/app/api/negocios/[id]/aportes/[index]/date-anchored/route.ts` | Create | PATCH funded date |
| `src/features/negocios/types/business-entity.types.ts` | Modify | Add `CARTERA` to const + union |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | Add `CARTERA` to `BUSINESS_STATUS_VALUES` |
| `src/features/negocios/components/ui/BusinessStatusBadge.tsx` | Modify | CARTERA badge config |
| `src/features/negocios/components/AdvancedFiltersSheet.tsx` | Modify | CARTERA filter option |
| `src/features/production-dashboard/lib/by-status-colors.ts` + `types/production-kpi.types.ts` | Modify | CARTERA donut color/label/allowed-key |
| `src/features/negocios/components/modals/EditFundedDateModal.tsx` | Create | Edit funded date modal component |
| `src/features/negocios/hooks/use-update-funded-date.ts` | Create | `useUpdateFundedDate` hook (AsyncState) |
| `src/features/negocios/components/modals/AporteRow.tsx` | Modify | Edit affordance for funded variants |
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
