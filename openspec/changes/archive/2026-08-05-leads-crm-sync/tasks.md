# Tasks: Leads module — CRM sync + read-only Kanban funnel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2000-2500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 -> PR2 -> PR3 -> PR4 -> PR5 -> PR6 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (user decision) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Prisma models + migration + ERD + seed + audit actions + pure lib (`api-key-guard`, `rate-limiter`, `build-lead-upsert-data`, `build-lead-list-where`) with unit tests | PR 1 | `npm run test:unit -- lib` | N/A — no route/UI yet, pure functions only | Revert migration + delete `src/features/leads/lib` |
| 2 | Ingestion webhook: `lead-sync.service.ts` + `POST /api/leads/crm-sync` route + integration tests | PR 2 | `npm run test:integration -- crm-sync` | `curl -X POST localhost:3000/api/leads/crm-sync -H "x-api-key: $KEY"` | Delete `lead-sync.service.ts` + route, no DB rows depend on it |
| 3 | Board/detail: `lead-board.service.ts` + `GET /api/leads[/id]` + hook + Kanban UI + nav entry | PR 3 | `npm run test:unit -- lead-board` | Manual: load `/leads` in dev server | Remove nav entry + `src/app/(dashboard)/leads/page.tsx` |
| 4 | Column admin: `lead-funnel-column.service.ts` + `funnel-columns` routes + admin UI + nav sub-entry | PR 4 | `npm run test:integration -- funnel-columns` | Manual: admin CRUD in dev server | Remove admin page + routes; seeded "Sin mapear" column untouched |
| 5 | Conversion: mapper + `lead-conversion.service.ts` + modify `create-business.ts`/`crear/page.tsx`/`business-wrapper.tsx` | PR 5 | `npm run test:integration -- create-business` | Manual: convert a seeded lead end to end | Revert 3 modified files (all additive/optional params) |
| 6 | Integration verification + docs/env | PR 6 | `npm run test:all` | `npm run test:e2e -- leads` (optional) | No production code, safe to drop |

## Phase 1: Data Foundation & Audit

- [x] 1.1 Add `Lead` + `LeadFunnelColumn` models to `prisma/schema.prisma` per design Data Model (FKs to `User`/`Business`, `@@index`, soft delete `active`, unique `idBusiness`)
- [x] 1.2 Run `npx prisma migrate dev --name add_leads_module` + `npx prisma generate` (see risk note: hand-authored `migration.sql` + `prisma generate` run; `migrate dev` itself blocked by pre-existing unrelated drift on the shared Neon dev DB — not applied/recorded, needs owner action before deploy)
- [x] 1.3 Update `prisma/ERD.md`: entities, relationship lines to `User`/`Business`, index note
- [x] 1.4 Create `prisma/seeds/lead-funnel-columns.ts` — idempotent upsert of "Sin mapear" (`isFallback: true`, `externalStatusKey: '__unmapped__'`)
- [x] 1.5 Add 7 `LEAD_*` `AuditAction` values to `src/features/auth/lib/audit-logger.ts`
- [x] 1.6 Scaffold `src/features/leads/{components,hooks,lib,services,actions,types,mappers,__tests__}/`
- [x] 1.7 Create `src/features/leads/types/lead.types.ts` + `crm-sync.schema.ts` (Zod contract per design API Contracts)

## Phase 2: Pure Lib Functions (TDD)

- [x] 2.1 RED `lib/__tests__/api-key-guard.test.ts`: wrong same-length key rejected via `timingSafeEqual` (assert no raw `===` on secret), missing header rejected, wrong-length key rejected without throwing
- [x] 2.2 GREEN implement `lib/api-key-guard.ts` — SHA-256 digest both sides + `crypto.timingSafeEqual`, reads `LEADS_CRM_SYNC_API_KEY`
- [x] 2.3 RED `lib/__tests__/rate-limiter.test.ts`: 120 req/60s succeed, 121st throttled, window slides, keys tracked independently
- [x] 2.4 GREEN implement `lib/rate-limiter.ts` — in-memory `Map<string, number[]>` sliding window
- [x] 2.5 RED `lib/__tests__/build-lead-upsert-data.test.ts`: absent/empty optional fields never overwrite stored values (all fields incl. owner), present non-empty fields overwrite
- [x] 2.6 GREEN implement `lib/build-lead-upsert-data.ts` (pure partial-merge)
- [x] 2.7 RED `lib/__tests__/build-lead-list-where.test.ts`: bypass role sees all; non-bypass scoped to `visibleUserIds` WITHOUT `OR idUser: null` (explicit assertion the clause is absent, owner-less leads excluded); always `active: true`
- [x] 2.8 GREEN implement `lib/build-lead-list-where.ts`

## Phase 3: Ingestion Webhook (TDD)

- [x] 3.1 RED `services/__tests__/lead-sync.service.test.ts`: `resolveFunnelColumn()` falls back to "Sin mapear"; `resolveOwner()` reassigns different owner / preserves on absent / nulls+audits on unmatched
- [x] 3.2 GREEN implement `services/lead-sync.service.ts::upsertLeadFromCrm()` (resolveFunnelColumn, resolveOwner, buildLeadUpsertData, `prisma.lead.upsert`, `logAuditEvent`)
- [x] 3.3 RED `src/app/api/leads/crm-sync/__tests__/route.test.ts` (mirror `origins/__tests__/route.test.ts`): 401 missing/invalid key, 429 over limit, 400 Zod on missing required fields, 200 create, 200 idempotent re-post, 200 partial-merge preserves value, unmatched owner still 200 + audited
- [x] 3.4 GREEN implement `src/app/api/leads/crm-sync/route.ts` (apiKeyGuard -> rateLimiter -> Zod -> service -> `ApiResponse`)

## Phase 4: Board, Detail & Navigation

- [x] 4.1 RED `services/__tests__/lead-board.service.test.ts`: groups leads by column server-side; excludes owner-less leads for non-bypass roles
- [x] 4.2 GREEN implement `services/lead-board.service.ts` (board query + grouping, `getLeadDetail`)
- [x] 4.3 RED `src/app/api/leads/__tests__/route.test.ts` + `[id]/__tests__/route.test.ts`: auth required, hierarchy-scoped, 404 out-of-scope detail
- [x] 4.4 GREEN implement `src/app/api/leads/route.ts` (GET board) + `src/app/api/leads/[id]/route.ts` (GET detail)
- [x] 4.5 Create `hooks/use-leads-board.ts` (`AsyncState<T>` per project rule)
- [x] 4.6 Create UI: `LeadsBoard` (container) -> `LeadFunnelColumnView` (presentational) -> `LeadCard`; `LeadDetailSheet` with conditional "Ver en CRM"
- [x] 4.7 RED/GREEN component tests: no drag/drop affordance rendered; "Ver en CRM" visibility toggles on `externalUrl` (deviation: written alongside the component rather than strictly test-first, since the component's prop shape had to be finalized first — see Deviations)
- [x] 4.8 Create `src/app/dashboard/leads/page.tsx` Server Component shell (board service + auth) — path corrected from design's `src/app/(dashboard)/leads/page.tsx`; this codebase uses `src/app/dashboard/` as a literal URL segment wrapped by `DashboardLayout`, not an Next.js route group (see Deviations)
- [x] 4.9 Add `Leads` top-level entry to `ALL_MENU_ITEMS`

## Phase 5: Funnel Column Admin

- [x] 5.1 RED `services/__tests__/lead-funnel-column.service.test.ts`: create/rename/reorder persists+audits; duplicate `externalStatusKey` rejected; `isFallback` column delete blocked; delete blocked with active leads (409); delete allowed when empty
- [x] 5.2 GREEN implement `services/lead-funnel-column.service.ts`
- [x] 5.3 RED/GREEN `src/app/api/leads/funnel-columns/route.ts` (GET/POST) + `[id]/route.ts` (PATCH/DELETE), admin-role guard
- [x] 5.4 Create `FunnelColumnsAdminTable` component + admin page under Administración/Configuración (`src/app/dashboard/admin/lead-funnel-columns/page.tsx`; no dedicated component test — thin client CRUD table exercised indirectly via the route tests it calls)
- [x] 5.5 Add column-admin sub-entry to `ALL_MENU_ITEMS` under Administración

## Phase 6: Conversion to Negocio

- [x] 6.1 RED `mappers/__tests__/lead-to-business-defaults.test.ts`: null -> `''`, `lastName` -> `lastNames`, absent `identityNumber` handled
- [x] 6.2 GREEN implement `mappers/lead-to-business-defaults.ts`
- [x] 6.3 RED `services/__tests__/lead-conversion.service.test.ts`: `getLeadForConversion()` rejects out-of-hierarchy and already-converted (`idBusiness != null`) leads
- [x] 6.4 GREEN implement `services/lead-conversion.service.ts` (`getLeadForConversion`, `linkLeadToBusinessTx` with in-transaction re-check)
- [x] 6.5 RED extend `src/features/negocios/actions/__tests__/create-business.test.ts`: regression — `createBusiness()` without `idLead` behaves identically to baseline; new — `createBusiness({ idLead })` sets `Lead.idBusiness` in-transaction; already-converted lead throws, whole tx rolls back, no `Business` created
- [x] 6.6 GREEN modify `src/features/negocios/actions/create-business.ts` — optional `idLead` on schema/input, call `linkLeadToBusinessTx` inside existing `$transaction`
- [x] 6.7 Modify `src/app/dashboard/negocios/crear/page.tsx` — read `searchParams.leadId`, `getLeadForConversion`, guard (not found/not visible/converted -> redirect), map via `mapLeadToBusinessDefaults`, pass `defaultValues`+`leadId` (also threaded `leadId`/`defaultValues` through `BusinessFormProps` -> `useBusinessForm` -> `createBusiness({ idLead })`, not explicitly called out in tasks.md but required for the wiring to actually work end-to-end)
- [x] 6.8 Modify `src/features/negocios/components/business-wrapper.tsx` — accept/forward `defaultValues`/`leadId` to `BusinessForm` (existing prop, additive only)
- [x] 6.9 Add "Convertir a negocio" button to `LeadDetailSheet` — links `/dashboard/negocios/crear?leadId=<id>`, becomes "Ver negocio" when `lead.idBusiness != null`
- [x] 6.10 RED/GREEN component test for the button-visibility guard in `LeadDetailSheet`

## Phase 7: Integration & Verification

- [x] 7.1 Integration test: webhook create -> board visibility -> conversion happy path, full audit trail (`src/features/leads/__tests__/leads-full-flow.integration.test.ts`)
- [x] 7.2 Run `npm run test:unit && npm run test:integration && npm run type-check && npm run lint` — all green: 354/354 unit files (3124 tests, 3 pre-existing skips), 3/3 integration files (16 tests), 0 type errors, 0 lint errors/warnings
- [ ] 7.3 (Optional) Playwright E2E: board renders, no DnD, detail opens, admin CRUD, conversion flow — NOT done (explicitly optional per tasks.md; skipped given scope/time, see Risks)
- [x] 7.4 Document `LEADS_CRM_SYNC_API_KEY` in deployment notes — done in `docs/ENVIRONMENT_VARIABLES.md` (NOT in `.env.example`: that file is sandbox-permission-denied for Read/Edit in this environment; a human with file access must add the `LEADS_CRM_SYNC_API_KEY=` line to `.env.example` before merge, see Risks)

## Review Workload Forecast — Outcome Status Extension (Phase 8-12)

Incremental round, additive over the already-implemented module (D11-D18). Smaller than round 1 (2000-2500 lines) but touches many small files plus fixture updates across 3 existing test files.

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR7 -> PR8 -> PR9 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (user decision) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 7 | Schema/migration + audit actions + pure lib (`lead-outcome-status`, promoted `bogota-date-range`, `lead-board-filters`, `build-lead-upsert-data` param) | PR 7 | `npm run test:unit -- lib` | N/A — pure functions + migration only, no route/UI | Revert migration + delete new lib files; `negocios/lib/bogota-date-range.ts` reverts to standalone copy |
| 8 | Webhook + query extension incl. the `WON`-is-terminal lock (D19-D23): `crm-sync.schema.ts`, `lead-outcome-status.ts` (two-arg `resolveOutcomeStatus(raw, current)`), `lead-sync.service.ts` (reuses already-fetched `existing` row, emits `LEAD_OUTCOME_STATUS_LOCKED`), `build-lead-list-where.ts`, `route.ts` (GET), `lead-board.service.ts`, + fixture/mock updates (incl. `LEAD_OUTCOME_STATUS_LOCKED`) in `lead-sync.service.test.ts`/`lead-conversion.service.test.ts` | PR 8 | `npm run test:integration -- crm-sync leads` | `curl -X POST localhost:3000/api/leads/crm-sync -H "x-api-key: $KEY" -d '{"externalCrmId":"x","statusKey":"y","outcomeStatus":"won"}'` | Revert the 6 modified files; DB column stays NOT NULL DEFAULT 'OPEN', no data loss |
| 9 | UI: badge in `lead-card.tsx`/`lead-detail-sheet.tsx`, new `leads-board-filters.tsx`, wiring in `use-leads-board.ts`/`leads-board.tsx`, + `leads-full-flow.integration.test.ts` extension | PR 9 | `npm run test:unit -- lead-card leads-board-filters` | Manual: load `/dashboard/leads`, toggle outcome chips + date range | Remove `leads-board-filters.tsx` + revert wiring; board still renders unfiltered |

## Phase 8: Outcome Status Data Foundation

- [x] 8.1 Add Prisma enum `LeadOutcomeStatus { OPEN WON LOST ABANDONED }` + `Lead.outcomeStatus @default(OPEN)` NOT NULL `@map("outcome_status")` + `@@index([outcomeStatus, createdAt])` to `prisma/schema.prisma`
- [x] 8.2 Hand-author `prisma/migrations/*_add_lead_outcome_status/migration.sql` (`CREATE TYPE` + `ALTER TABLE ADD COLUMN ... NOT NULL DEFAULT 'OPEN'` + composite index); run `npx prisma validate` + `npx prisma generate`; do NOT attempt `migrate dev` against the shared Neon dev DB — document the same pre-existing unrelated-drift blocker noted in task 1.2, requiring owner action before deploy
- [x] 8.3 Update `prisma/ERD.md`: add `LeadOutcomeStatus` enum block, `Lead.outcomeStatus` field, composite index note under "Índices y convenciones"
- [x] 8.4 Add `LEAD_OUTCOME_STATUS_CHANGED` + `LEAD_OUTCOME_STATUS_UNRESOLVED` + `LEAD_OUTCOME_STATUS_LOCKED` to `AuditAction` in `src/features/auth/lib/audit-logger.ts` (per design D19-D23: `WON` is terminal — the lock lives in `resolveOutcomeStatus()`, not in a DB trigger or the upsert builder)

## Phase 9: Outcome Status Pure Lib (TDD)

- [x] 9.1 RED `leads/lib/__tests__/lead-outcome-status.test.ts`: `resolveOutcomeStatus(raw, current)` — two-argument signature per design D19-D23, table-driven `it.each` over `(current, raw)`. `current` not `'WON'` (incl. `undefined` for create): absent/empty -> `{value: undefined, unresolved: false, locked: false}`; recognized case-insensitive (`won`/`WON`/`Won`) -> `{value: 'WON', unresolved: false, locked: false}` for all 4 enum values; unrecognized (`in_review`) -> `{value: 'OPEN', unresolved: true, locked: false}`. `current === 'WON'`: `raw` absent/empty -> `{value: undefined, unresolved: false, locked: false}` (no attempt, stored value preserved by omission); `raw` re-posting `'WON'`/`'won'` -> `{value: 'WON', unresolved: false, locked: false}` (idempotent, no false-positive lock); `raw` a different recognized value (e.g. `'lost'`) -> `{value: 'WON', unresolved: false, locked: true}`; `raw` unrecognized (e.g. `'CLOSED'`) -> `{value: 'WON', unresolved: true, locked: true}`. Explicit case: `current: undefined` (new lead) can never yield `locked: true` regardless of `raw`
- [x] 9.2 GREEN implement `leads/lib/lead-outcome-status.ts` — `resolveOutcomeStatus(raw: string | undefined, current: LeadOutcomeStatus | undefined): { value: LeadOutcomeStatus | undefined; unresolved: boolean; locked: boolean }` (pure, no DB access per D19); `unresolved` is computed from `raw` before the lock is applied so it can be `true` independently of `locked` (D21); when locked, returns the explicit `'WON'` literal, never `undefined` (D20) — plus the exhaustive ES label/badge-variant map per enum value
- [x] 9.3 RED `src/features/shared/lib/__tests__/bogota-date-range.test.ts` (promoted from `negocios`): existing `parseBogotaInclusiveUtcRange` cases + new `currentBogotaMonthRange()` boundary cases — day 1 before 05:00 UTC and last day after 19:00 Bogotá, computed via `TZDate` not native UTC `Date`
- [x] 9.4 GREEN promote `parseBogotaInclusiveUtcRange` + `BOGOTA_TZ` to `src/features/shared/lib/bogota-date-range.ts`, add `currentBogotaMonthRange()`; turn `src/features/negocios/lib/bogota-date-range.ts` into a re-export shim
- [x] 9.5 Regression: run `src/features/negocios/__tests__/lib/bogota-date-range.test.ts` unmodified and confirm the ~4 existing `negocios` importers of `bogota-date-range` still resolve via the shim with no import-path changes
- [x] 9.6 RED `leads/lib/__tests__/lead-board-filters.test.ts`: `getDefaultLeadBoardFilters()` returns `outcomeStatuses: ['OPEN']` + current Bogotá month `createdAtRange`, using `vi.setSystemTime`
- [x] 9.7 GREEN implement `leads/lib/lead-board-filters.ts::getDefaultLeadBoardFilters()`
- [x] 9.8 RED extend `leads/lib/__tests__/build-lead-upsert-data.test.ts`: new `resolvedOutcomeStatus` param — `undefined` omits the key from the upsert payload, a defined enum value writes it
- [x] 9.9 GREEN extend `leads/lib/build-lead-upsert-data.ts` — accept `resolvedOutcomeStatus` exactly like the existing `resolvedOwnerId` param

## Phase 10: Webhook & Board Query Extension (TDD)

- [x] 10.1 RED extend `leads/types/__tests__/crm-sync.schema.test.ts`: `outcomeStatus` optional, trimmed + uppercased, absent/empty parse without error
- [x] 10.2 GREEN extend `leads/types/crm-sync.schema.ts` with `outcomeStatus: z.string().transform(v => v.trim().toUpperCase()).optional()`; add `LEAD_OUTCOME_STATUS_VALUES` to `leads/types/lead.types.ts`
- [x] 10.3 RED extend `leads/services/__tests__/lead-sync.service.test.ts`: add `outcomeStatus: 'OPEN'` to every existing `Lead` fixture + `LEAD_OUTCOME_STATUS_CHANGED`/`LEAD_OUTCOME_STATUS_UNRESOLVED`/`LEAD_OUTCOME_STATUS_LOCKED` to the mocked `AuditAction` object. Cases where stored `outcomeStatus` is NOT `WON` (existing D14 coverage): create without `outcomeStatus` defaults `OPEN`; update omitting it preserves stored value; recognized value overwrites (e.g. `OPEN` -> `LOST`); unrecognized value -> `OPEN` + `LEAD_OUTCOME_STATUS_UNRESOLVED` audited with the raw string + still 200; resolved value differs from `existing.outcomeStatus` -> exactly one `LEAD_OUTCOME_STATUS_CHANGED`; identical re-post -> no new audit entry. New lock cases where stored `outcomeStatus` IS `WON` (per design D19-D23 / spec `WON Outcome Status Is Terminal`): payload with a different recognized `outcomeStatus` (e.g. `'LOST'`) plus a new `statusKey` -> HTTP 200, `lead.upsert` called with `outcomeStatus: 'WON'`, the funnel column IS updated per the new `statusKey`, exactly one `LEAD_OUTCOME_STATUS_LOCKED`, **zero** `LEAD_OUTCOME_STATUS_CHANGED`; payload omitting `outcomeStatus` entirely -> no lock audit at all (no attempt was made); payload re-posting `outcomeStatus: 'WON'` -> no lock audit, no `LEAD_OUTCOME_STATUS_CHANGED` (idempotent); payload with an unrecognized `outcomeStatus` (e.g. `'CLOSED'`) -> both `LEAD_OUTCOME_STATUS_UNRESOLVED` and `LEAD_OUTCOME_STATUS_LOCKED` emitted, lead stays `WON`; lock behaves identically whether `existing.idBusiness` is `null` or set (lock is independent of conversion, per spec scenario "WON lock applies independently of manual conversion")
- [x] 10.4 GREEN extend `leads/services/lead-sync.service.ts::upsertLeadFromCrm()` — call `resolveOutcomeStatus(payload.outcomeStatus, existing?.outcomeStatus)` reusing the `existing` row already fetched at the top of the function (no extra query, per D22: `existing` is `null` on create so `current` is `undefined` and the lock can never fire on a new lead), pass `value` into `buildLeadUpsertData()` unchanged (still writes whenever not `undefined`, per D20 — the lock is entirely upstream in the resolver), emit `LEAD_OUTCOME_STATUS_CHANGED` on diff and `LEAD_OUTCOME_STATUS_UNRESOLVED` when off-enum per D14, and emit `LEAD_OUTCOME_STATUS_LOCKED` when `locked === true` per D23 (`details` records the raw incoming string and `externalCrmId`)
- [x] 10.5 RED extend `leads/lib/__tests__/build-lead-list-where.test.ts`: `outcomeStatuses` empty/undefined -> no filter clause; non-empty -> `IN` clause OR-combined and AND'd with existing hierarchy conditions; `createdAtRange` -> `createdAt: {gte, lte}` AND'd into the same `whereConditions` array
- [x] 10.6 GREEN extend `leads/lib/build-lead-list-where.ts::buildLeadListWhere()` — `LeadListFilterInput` gains `outcomeStatuses?: LeadOutcomeStatus[]` and `createdAtRange?: {gte, lte}`
- [x] 10.7 RED extend `src/app/api/leads/__tests__/route.test.ts`: repeated `?outcomeStatus=OPEN&outcomeStatus=WON` + `createdFrom`/`createdTo` parsed and forwarded to the service; no query params -> service applies `getDefaultLeadBoardFilters()`
- [x] 10.8 GREEN extend `src/app/api/leads/route.ts` (parse repeated `outcomeStatus` + `createdFrom`/`createdTo`, fallback to `getDefaultLeadBoardFilters()`) and `leads/services/lead-board.service.ts` (thread `outcomeStatuses`/`createdAtRange` into `buildLeadListWhere()`); add `outcomeStatus: 'OPEN'` to fixtures + `LEAD_OUTCOME_STATUS_*` to the mocked `AuditAction` in `lead-board.service.test.ts`

## Phase 11: UI — Outcome Badge & Board Filters

- [x] 11.1 RED/GREEN `leads/components/__tests__/lead-card.test.tsx` + `leads/components/lead-card.tsx`: badge renders correct label/variant per `outcomeStatus` using the map from 9.2, independent of and without altering the card's column placement
- [x] 11.2 Create `leads/components/leads-board-filters.tsx` — presentational, reuses shared `MultiSelect` (outcome chips) + `DateRangePicker` (`createdAt` range), initial state from `getDefaultLeadBoardFilters()`
- [x] 11.3 RED/GREEN `leads/components/__tests__/leads-board-filters.test.tsx`: default selection is `['OPEN']` + current month; selecting/deselecting chips or changing the range calls `onChange` with the new filter state, additive OR semantics on `outcomeStatuses`
- [x] 11.4 GREEN modify `leads/hooks/use-leads-board.ts` — accept filter state param, serialize into the `GET /api/leads` query string, refetch on filter change (`AsyncState<T>` unchanged)
- [x] 11.5 GREEN modify `leads/components/leads-board.tsx` — mount `leads-board-filters.tsx`, wire its state to `use-leads-board.ts`
- [x] 11.6 GREEN modify `leads/components/lead-detail-sheet.tsx` — render the same outcome badge in detail view for consistency with the card, read-only

## Phase 12: Regression & Integration

- [x] 12.1 RED/GREEN extend `leads/__tests__/leads-full-flow.integration.test.ts`: add `outcomeStatus: 'OPEN'` to fixtures + `LEAD_OUTCOME_STATUS_CHANGED`/`LEAD_OUTCOME_STATUS_UNRESOLVED`/`LEAD_OUTCOME_STATUS_LOCKED` to the mocked `AuditAction`; scenario — webhook create defaults `OPEN` -> webhook update to `WON` emits exactly one `LEAD_OUTCOME_STATUS_CHANGED` -> board query `outcomeStatus=WON` returns the lead -> a later webhook with an unrecognized value falls back to `OPEN` + `LEAD_OUTCOME_STATUS_UNRESOLVED` audited; new lock scenario (per design D19-D23) — a further webhook against that same now-`WON` lead carrying `outcomeStatus: 'LOST'` returns 200, `Lead.outcomeStatus` stays `WON`, `LEAD_OUTCOME_STATUS_LOCKED` is audited, and the board query for `outcomeStatus=WON` still returns the lead unchanged
- [x] 12.2 Add `outcomeStatus: 'OPEN'` to every `Lead`-typed fixture in `leads/services/__tests__/lead-conversion.service.test.ts` + `LEAD_OUTCOME_STATUS_CHANGED`/`LEAD_OUTCOME_STATUS_UNRESOLVED`/`LEAD_OUTCOME_STATUS_LOCKED` to its mocked `AuditAction` object (fixture-only, no behavior change — conversion does not touch `outcomeStatus`, and the lock is independent of `idBusiness` per spec scenario "WON lock applies independently of manual conversion")
- [x] 12.3 Run `npm run test:unit && npm run test:integration && npm run type-check && npm run lint` — confirm 0 type errors, 0 lint errors, and no regression against the round-1 baseline (354 unit files / 3124 tests). Result: 360/360 unit test files, 3183 passed + 3 skipped (3186 total, same 3 pre-existing skips as baseline); 3/3 integration test files, 17/17 tests; 0 type errors; 0 lint errors/warnings

## Phase 13: Funnel Column Admin UX Polish

Small, user-requested amendment scoped to a single already-implemented component (`FunnelColumnsAdminTable`). No product decision from D1-D23 is reopened; see design.md "Amendment: funnel column admin — drag & drop reorder + row editing" for full rationale. Backend (`PATCH /api/leads/funnel-columns/[id]`) already accepted `{ name?, position?, externalStatusKey? }` — no backend change needed **at this phase**.

> **SUPERSEDED IN PART BY PHASE 14.** The "inline edit" described in 13.4/13.5 below shipped as written, then was replaced: `externalStatusKey` became immutable (D24) and the editor became a **modal** editing `name` only (D25). Tasks 13.4/13.5 are annotated inline; the current behavior is Phase 14.

- [x] 13.1 `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` — no DnD library previously existed in the project
- [x] 13.2 RED `leads/lib/__tests__/reorder-funnel-columns.test.ts`: pure `reorderFunnelColumns(columns, activeId, overId)` — moves active to over's index and reassigns `position` 0..n-1; returns only rows whose position changed; no-op (same array reference, empty `changed`) when ids are equal or either id is not found; unaffected rows keep their position
- [x] 13.3 GREEN implement `leads/lib/reorder-funnel-columns.ts` (mirrors `arrayMove()` from `@dnd-kit/sortable`)
- [x] 13.4 RED rewrite `leads/components/__tests__/funnel-columns-admin-table.test.tsx` (replaces the old ↑/↓-buttons suite, which no longer applies): (a) `KeyboardSensor` drag & drop reorders and persists via `PATCH` per changed row (focus drag handle → `Space` → `ArrowDown` → `Space`, with `getBoundingClientRect` mocked per-row since jsdom's all-zero rects otherwise make `sortableKeyboardCoordinates` unable to distinguish rows) + a rollback-on-PATCH-failure case; (b) row edit of `name`/`externalStatusKey` saves via the correct minimal `PATCH` body; (c) empty name/key blocked client-side before any request; (d) backend `externalStatusKey` collision surfaced via `toast.error` with edit mode staying open; (e) cancel discards changes and fires no request; (f) descriptive label + help text for `externalStatusKey` present in both the creation form and edit mode — **superseded by 14.6/14.7: (b) is now name-only in a modal and (d) was dropped, since `externalStatusKey` can no longer be edited**
- [x] 13.5 GREEN implement `leads/components/funnel-columns-admin-table.tsx`: replace ↑/↓ buttons with `DndContext` (`PointerSensor` + `KeyboardSensor`) + `SortableContext` (`verticalListSortingStrategy`) wrapping a new `FunnelColumnRow` (`useSortable`) subcomponent with a drag-handle button (`aria-label="Reordenar columna"`); add per-row inline edit (Editar/Guardar/Cancelar) calling `PATCH` with a minimal diff patch — **superseded by 14.7: the inline-in-row expansion was replaced by a `Dialog` modal editing `name` only**; replace the `externalStatusKey` placeholder with a `<label>` ("Clave de estado del CRM") + help text referencing `docs/LEADS_CRM_SYNC_TESTING_GUIDE.md` in both the creation form and the edit inputs (label/help text still current)
- [x] 13.6 Run `npx vitest run src/features/leads`, `npx tsc --noEmit -p .`, `npx eslint` on the touched files — 19/19 leads test files, 119/119 tests green (incl. the 5 new `reorder-funnel-columns` unit tests and the 8 rewritten `funnel-columns-admin-table` tests); 0 new type errors; 0 lint errors/warnings
- [x] 13.7 Document the amendment in `design.md` and this phase in `tasks.md`; persist both to Engram (`sdd/leads-crm-sync/design`, `sdd/leads-crm-sync/tasks`, upsert)

## Phase 14: Post-launch UX fixes & shared component bugfix

**Retroactive documentation of work already implemented and verified.** This round was applied directly with the user in a fast iteration loop rather than through a formal `sdd-apply` cycle; every task below is already done with green tests. See design.md "Amendment: UX/bugfix round — navigation, immutable key, delete confirmation, styling, shared DateRangePicker fix" (D24-D33) for the full rationale. No schema change, no migration, no API-contract change.

### Navigation bugfix — "Leads" was invisible to every role

- [x] 14.1 Fix `src/lib/navigation/menu-builder.ts`: Phase 4.9 added `Leads` to `ALL_MENU_ITEMS` but never wired a branch into `buildMenuByRole()`, which is an allow-list — the item was silently dropped for every non-`AGENTE` role. Added `if (item.title === 'Leads') { filteredItems.push(item); continue }`, unconditionally visible, mirroring the existing `Mis distribuciones` branch (no `permissions.leads` flag exists; real scoping is the module's hierarchy filter, per design)
- [x] 14.2 Fix `src/lib/navigation/menu-items.tsx`: add the `Leads` entry to `AGENTE_MENU_ITEMS` too — `buildMenuByRole()` returns that separate array early for `AGENTE`, bypassing the filter loop entirely, so 14.1 alone does not cover that role
- [x] 14.3 Rename the admin sub-entry "Columnas de Leads" → "Columnas del Funnel de Leads" in `src/lib/navigation/menu-items.tsx` (user request, copy-only; URL `/dashboard/admin/lead-funnel-columns` unchanged)

### `externalStatusKey` normalization (D26/D27)

- [x] 14.4 RED/GREEN `src/features/leads/lib/normalize-funnel-status-key.ts` + `lib/__tests__/normalize-funnel-status-key.test.ts`: pure `normalizeFunnelStatusKey(value)` = `trim().toUpperCase().replace(/\s+/g, '_')`; tests cover lowercase → uppercase, surrounding whitespace trimmed, single and multiple inner spaces collapsed to one `_`, and idempotence on an already-canonical value
- [x] 14.5 GREEN apply it on both sides: `lead-funnel-column.service.ts` (`createLeadFunnelColumn` / `updateLeadFunnelColumn`, before persisting) and `lead-sync.service.ts::resolveFunnelColumn()` (before matching the incoming webhook `statusKey` against `LeadFunnelColumn.externalStatusKey`). Fixes the reported bug where an admin-typed lowercase key never matched a CRM-sent uppercase one and every lead fell into "Sin mapear"
- [x] 14.6 GREEN `funnel-columns-admin-table.tsx`: the creation form's `externalStatusKey` input transforms live while typing (uppercase + spaces → `_`) **without** trimming, so the space the user just typed is not eaten; the authoritative `trim()` stays in the service (D27)

### `externalStatusKey` immutability + modal editor (D24/D25)

- [x] 14.7 GREEN `lead-funnel-column.service.ts::updateLeadFunnelColumn()`: when the input carries `externalStatusKey`, `findUnique` the current row and compare the normalized requested value against the stored one — different → return `{ data: null, error: 'externalStatusKey no se puede modificar después de creada' }` without calling `prisma.update`; identical → `delete` the field from the payload as a harmless no-op and let the rest of the patch through; row missing → "Columna no encontrada". Enforced in the **service** so the route and any future caller inherit the guard, not in the UI only
- [x] 14.8 GREEN `funnel-columns-admin-table.tsx`: replace the Phase 13 inline-in-row edit with a shadcn `Dialog` modal — `name` is the only editable input, `externalStatusKey` renders `disabled` with a note explaining it cannot change after creation. Supersedes 13.4(b)/13.5; the 13.4(d) `externalStatusKey`-collision test case was dropped because the field is no longer editable
- [x] 14.9 RED/GREEN component tests for the modal: opens per row with `name` editable and `externalStatusKey` disabled; save sends the minimal `PATCH`; cancel fires no request

### Soft-delete key-reuse bugfix (D28)

- [x] 14.10 RED/GREEN `lead-funnel-column.service.ts::deleteLeadFunnelColumn()`: `externalStatusKey` has a hard DB-level `@unique`, so a soft-deleted column kept occupying its value forever and permanently blocked re-creating one with the same key. The soft delete now writes `active: false` **and** `externalStatusKey: \`${key}__deleted_${id}\`` in the same update, freeing the original value while preserving the historical row. The `isFallback` and active-leads guards are unchanged
- [x] 14.11 GREEN reinforce `createLeadFunnelColumn()`'s duplicate check with `active: true` so a tombstoned key can never block a new creation. Tests cover both the tombstone write and the unblocked re-creation

### Delete confirmation (D29)

- [x] 14.12 RED/GREEN `funnel-columns-admin-table.tsx`: "Eliminar" no longer deletes directly — it opens the existing shared `ConfirmActionDialog` (`src/features/shared/ui/confirm-action-dialog.tsx`) explaining that a column with active leads cannot be deleted; the `DELETE` request only fires on confirm

### Admin table layout (D30)

- [x] 14.13 GREEN move the drag handle (`GripVertical`) from the trailing "Acciones" cell to a dedicated **leading** column with an `sr-only` header ("Reordenar")
- [x] 14.14 GREEN fix the clipped-rows layout bug: shared `Table`'s container is `h-full min-h-0 overflow-auto` (designed for fixed-height panels) and collapsed on this height-less page, hiding rows. Pass `containerClassName="h-auto min-h-0 max-h-none overflow-visible"` to `<Table>` in this usage only — the shared component in `src/features/shared/ui/table.tsx` is deliberately **not** modified, so no other table in the app regresses

### Kanban styling (D31)

- [x] 14.15 GREEN `src/features/leads/components/lead-funnel-column-view.tsx`: green column styling per user request — header `bg-green-100` / `text-green-900`, container `border-2 border-green-200`, body `bg-green-50/60`, with `dark:` equivalents (`green-900` / `green-950`)

### Shared `DateRangePicker` bugfix — app-wide (D32/D33)

- [x] 14.16 Root-cause the missing range highlight: `src/app/tailwind.css` does `@import 'tailwindcss'` (v4) but never loads `tailwind.config.js` — the `@config` directive is absent, so no custom color name (`primary`, `accent`, …) generates a real utility class. The app only looks right where someone hand-patched it with `!important` in `globals.css` (the pre-existing "Forzar estilos de botones…" comment is that workaround). `CalendarDayButton`'s conditional classes (`data-[range-start=true]:bg-primary`, `data-[range-middle=true]:bg-accent`, …) had never been patched, so **no date-range picker anywhere in the app showed a selected range**. Pre-existing bug, not introduced by Leads
- [x] 14.17 GREEN fix in `src/app/globals.css`, inside the same `@layer base` as the existing `!important` patches: `[data-slot='calendar'] [data-selected-single='true'] , [data-range-start='true'] , [data-range-end='true']` → `hsl(var(--primary))`; `[data-range-middle='true']` → `hsl(var(--accent))`. Fixes range highlighting **app-wide**, not just in Leads. Adding `@config` (the true root fix) was deliberately NOT done here — it would activate every custom-color utility at once and needs its own change with a full visual pass (see Risks in design.md)
- [x] 14.18 GREEN add optional `calendarStyle?: CSSProperties` to `src/features/shared/ui/date-range-picker.tsx`, forwarded as `style` to `<Calendar>` (`src/features/shared/ui/calendar.tsx`), which `react-day-picker` places on the `data-slot="calendar"` root. CSS custom properties inherit, so this reaches the 14.17 rules with no build-time class generation. The prop is optional and unset for every existing caller — no other picker in the app changes
- [x] 14.19 GREEN `src/features/leads/components/leads-board-filters.tsx`: pass `calendarStyle={DATE_RANGE_CALENDAR_STYLE}` to the "Fecha de creación" picker — `--primary: 142 76% 26%` (dark green, range start/end) and `--accent: 142 60% 70%` (light green, range middle) plus their foregrounds. Scoped to Leads only; the rest of the app keeps its default theme colors, now visible thanks to 14.17

### Docs & verification

- [x] 14.20 Create `docs/LEADS_CRM_SYNC_TESTING_GUIDE.md` — manual testing guide with ready-to-run `curl`s for `POST /api/leads/crm-sync` (creation, status change, `WON` lock, `outcomeStatus` fallback, error and rate-limit cases), the full payload contract, and what to verify in the UI
- [x] 14.21 Verification green: leads unit/component tests, `normalize-funnel-status-key` unit tests, `lead-funnel-column.service` service tests (immutability, tombstone, normalization), type-check and lint on the touched files — all passing
- [x] 14.22 Document this round in `design.md` (amendment D24-D33), correct the now-superseded "inline edit" wording in the Phase 13 sections of both documents, and add this phase to `tasks.md`; persist both to Engram (`sdd/leads-crm-sync/design`, `sdd/leads-crm-sync/tasks`, upsert)
