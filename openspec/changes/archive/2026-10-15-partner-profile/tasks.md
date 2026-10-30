# Tasks: Partner Profile (COM-41)

## Review Workload Forecast

| Field                   | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| Estimated changed lines | ~3,500 (range 3,000-4,000, incl. tests, migration, seeds)          |
| 400-line budget risk    | High                                                               |
| Chained PRs recommended | No (maintainer accepted exception)                                 |
| Suggested split         | Single PR with `size:exception`, delivered as 11 work-unit commits |
| Delivery strategy       | exception-ok                                                       |
| Chain strategy          | size-exception                                                     |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Accepted exception: the user explicitly accepted ONE PR (`size:exception`, ~3.5k lines, review_budget_lines=800). Each work unit below is an independent revert boundary inside that PR.

Conventions: STRICT TDD. Every `RED` task precedes its `GREEN` task. `[TM]` = threat-matrix row from design (propagate unchanged with its RED test). `[AUD]` = audit logging. `[SD]` = soft-delete compliance. Overrides from design "Resolved by product owner (2026-10-10)" are marked `[PO]`. All identifiers and comments in English; Spanish only in user-facing strings.

### Suggested Work Units

| Unit | Goal                                                               | Likely PR | Focused test command                                                      | Runtime harness                                                             | Rollback boundary             |
| ---- | ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------- |
| U1   | Schema, migration, ERD, seeds, constants (Ph1)                     | PR 1      | `npx vitest run prisma src/features/shared/lib/level-codes`               | `npx prisma migrate dev` + `npm run prisma:seed:partner` twice (idempotent) | revert migration + seed files |
| U2   | Edge role claim, allowlist, revalidation (Ph2a)                    | PR 1      | `npx vitest run src/lib/auth`                                             | `npm run dev`, PARTNER cookie vs `/api/admin/users`                         | revert middleware/auth config |
| U3   | business-access service + routes + action guard inventory (Ph2b)   | PR 1      | `npx vitest run src/features/negocios src/app/api/negocios`               | curl agent vs foreign business id                                           | revert service + route edits  |
| U4   | Tokens, activation, forgot/reset, login gates, emails, pages (Ph3) | PR 1      | `npx vitest run src/features/auth src/app/api/account`                    | manual activate/reset with dev mail log                                     | revert auth files + pages     |
| U5   | Admin Partners module + users guards + impersonation (Ph4)         | PR 1      | `npx vitest run src/features/admin`                                       | admin creates partner in UI                                                 | revert admin/partners         |
| U6   | Negocios parity (Ph5)                                              | PR 1      | `npx vitest run src/features/negocios src/features/comments`              | partner creates/lists/exports business                                      | revert negocios edits         |
| U7   | Pre-liquidation exclusion (Ph6)                                    | PR 1      | `npx vitest run src/features/carga-archivos src/features/pre-liquidacion` | upload mixed partner/agent file                                             | revert processor edits        |
| U8   | Dashboard, nav, calculadora (Ph7)                                  | PR 1      | `npx vitest run src/features/production-dashboard src/lib/navigation`     | leader heatmap with partner                                                 | revert dashboard/nav edits    |
| U9   | E2E, docs, changeset, checklist, full gate (Ph8)                   | PR 1      | `npm run test:all && npm run lint && npm run type-check`                  | `npm run test:e2e` partner flow                                             | revert docs/e2e               |

## Phase 1: Foundation (schema, seeds, constants) [U1]

- [x] 1.1 RED: unit tests for `src/features/shared/lib/level-codes.ts` (`PARTNER_EXTERNAL_LEVEL_CODE`, `PARTNER_LEADER_LEVEL_CODES`=LEVEL_1..5, `isDistributionExcludedLevel`). (LVL-01, PL-01)
- [x] 1.2 GREEN: create `src/features/shared/lib/level-codes.ts`.
- [x] 1.3 Edit `prisma/schema.prisma`: `User.activatedAt @map("activated_at")`, `AccountToken` model, enum `AccountTokenType`. (AA-01, AA-02)
- [x] 1.4 Create migration `prisma/migrations/*_partner_profile/` (additive; backfill `activated_at = created_at`; `token_hash` unique varchar 64); run `prisma generate`. (AA-01, AA-02, D9)
- [x] 1.5 Update `prisma/ERD.md`: enums block, relationship lines, entity fields, note on `activatedAt` backfill and `PARTNER_EXTERNAL` outside `NEXT_LEVEL_CHAIN`. (repo ERD rule)
- [x] 1.6 RED: seed tests for `prisma/seeds/partner.ts` (idempotent role PARTNER, level PARTNER_EXTERNAL with `oldCode`==`code`, category "Partner Externo" MIA, remediation PPC per active product, non-zero exit on missing PPC). (SEED-01, SEED-02, SEED-03)
- [x] 1.7 GREEN: edit `prisma/seeds/{roles,level,category}.ts`; create `prisma/seeds/partner.ts`, `prisma/seed-partner.ts`; add `prisma:seed:partner` to `package.json`; guard `seedNewCategories` side effect on import. (SEED-01..03, D12)
- [x] 1.8 RED+GREEN: test that `NEXT_LEVEL_CHAIN` and level pickers never contain `PARTNER_EXTERNAL`; adjust level helpers. (LVL-01)
- [x] 1.9 Add `PARTNER` to `src/features/auth/lib/roles.ts` and `permissions.ts` (`isBusinessOwnerRole`), with unit tests first. (PA-04, SEC-03)
- [x] 1.10 `[AUD]` RED+GREEN: add AuditAction values `PARTNER_CREATED`, `PARTNER_DEACTIVATED`, `PARTNER_REACTIVATED`, `PARTNER_ACTIVATION_RESENT`, `ACCOUNT_ACTIVATED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED` in `src/features/auth/lib/audit-logger.ts`. (PM-08)

## Phase 2a: Security foundation, Edge and session [U2]

- [x] 2.1 `[TM]` RED: table test `src/lib/auth/__tests__/partner-allowlist.test.ts`: allowed list, denied (`cancel`, `manage-novedad`, `fondear*`, `aportes/*`, `hierarchy-tree`, `agents`, `users/search`), unknown route, method mismatch, path tricks (`/api/negocios/1/cancel`, trailing slash, case, encoded segments, `/dashboard/negociosX`). (PA-01, SEC-02)
- [x] 2.2 GREEN: create `src/lib/auth/partner-allowlist.ts` (anchored regexes, `/api/pre-liquidacion/rezagos/autocomplete` allowed `[PO]`).
- [x] 2.3 `[TM]` RED: integration test calling `authConfigEdge.callbacks`: PARTNER 403 JSON on `/api`, redirect `/dashboard` on pages; ADMIN/AGENTE unchanged; unauthenticated `/api/health` and `/api/leads/crm-sync` unchanged; Edge session exposes `role`. (SEC-02, PA-01)
- [x] 2.4 GREEN: edit `src/lib/auth/auth.config.ts` (Edge `jwt`/`session` copy `token.role`, gate) and `src/middleware.ts` (matcher `/dashboard/:path*`, `/api/:path*`).
- [x] 2.5 `[TM]` RED: unit tests `resolveSessionRevalidation`: inactive/missing returns null; role refreshed; impersonation (target inactive restores admin; admin inactive or not ADMIN returns null); `activatedAt` ignored. (SEC-01, AA-09, PA-08)
- [x] 2.6 GREEN: create `auth/lib/session-revalidation.ts`, `auth/services/session-user.service.ts`; edit `src/lib/auth/config.ts` `jwt` callback (D1).
- [x] 2.7 RED+GREEN: create `src/app/dashboard/layout.tsx` server guard and client redirect on `unauthenticated`. (D2, SEC-01)

## Phase 2b: Business access and Server Action guards [U3]

- [x] 2.8 `[TM]` RED: matrix test for `business-access.service` (ADMIN, CONSULTOR read-only 403 on write, AGENTE own/subordinate/foreign, PARTNER own/foreign, unknown role fails closed, 404 out of scope). (SEC-03, PA-04)
- [x] 2.9 GREEN: create `src/features/negocios/services/business-access.service.ts` (`resolveBusinessScope`, `assertBusinessAccess`, `resolveBusinessOwnerId`).
- [x] 2.10 RED: one ownership integration test per route for agent and partner: `negocios/[id]` GET/PUT, `payments`, `annual-payments`, `comments`, `comprobantes`, `comprobantes/presign`, `comprobantes/[supportId]`. (NEG-01, BS-01, CC-01)
- [x] 2.11 GREEN: apply helper in each route under `src/app/api/negocios/[id]/` and `negocios/services/business-get-by-id.server.ts`.
- [x] 2.12 `[PO]` RED+GREEN: `mark-novedad` route: MARK unchanged for internal users; PARTNER MARK/UNMARK only own business; UNMARK keeps existing ownership rule. (NEG-01, PA-04)
- [x] 2.13 `[TM]` RED+GREEN: static inventory test `src/__tests__/server-actions-guard-inventory.test.ts`: every `'use server'` file calls a guard; fix any offender. (SEC-03)

## Phase 3: Authentication flows [U4]

- [x] 3.1 RED: unit tests `auth/lib/account-token.ts` (base64url 32 bytes, SHA-256 hex, TTL 72h/1h) and `account-password.schema.ts` (`abcdefgh`, `12345678`, `abc123` fail; `abcd1234` pass; 8..72). (AA-02, AA-05)
- [x] 3.2 GREEN: create `account-token.ts`, `account-password.schema.ts` under `src/features/auth/lib/`.
- [x] 3.3 RED: sliding-window limiter tests keyed by IP and email hash, not user existence. (AA-08, D7)
- [x] 3.4 GREEN: create `auth/lib/auth-rate-limiter.ts` (`createSlidingWindowLimiter`).
- [x] 3.5 `[TM]` RED: token service tests: reuse, expiry, revoked, deactivated user, `Promise.all` consume gives exactly one success, resend revokes prior. (AA-03, AA-06, SEC-04)
- [x] 3.6 GREEN: create `auth/services/account-token.service.ts` (`issueToken`, `consumeToken`, `revokeOpenTokens`).
- [x] 3.7 RED: `account-activation.service` tests (activate sets password and `activatedAt`, revokes others; request reset eligibility; reset consumes in transaction and revokes). (AA-04, AA-07)
- [x] 3.8 GREEN: create `auth/services/account-activation.service.ts`.
- [x] 3.9 `[TM]` RED: route tests for `src/app/api/account/{activate,forgot-password,reset-password}/route.ts`: identical 200 body for unknown/inactive/pending/ssoOnly/no-password, 429 independent of existence, generic 400 `Enlace inválido o vencido`. (AA-08, SEC-04)
- [x] 3.10 `[AUD]` GREEN: create the three routes; log `ACCOUNT_ACTIVATED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`.
- [x] 3.11 RED+GREEN: login gates in `auth/lib/user-validation.ts` and `user-creation.ts` (`validateUserCredentials`/`validateUserByEmail` require `activatedAt`; `validateUserById` does not; `createUserAutomatically` sets it). (AA-01, AA-09)
- [x] 3.12 RED+GREEN: email builders `src/features/email/lib/{partner-activation,password-reset}-notification.ts` (link content, no token in logs). (AA-10)
- [x] 3.13 RED+GREEN: public pages `src/app/{activate-account,forgot-password,reset-password}/page.tsx`, `auth/components/`, `auth/hooks/` using `AsyncState<T>`; add forgot link in `src/app/login/page.tsx`. (AA-10)

## Phase 4: Admin Partners module [U5]

- [x] 4.1 RED: `createPartnerSchema` and mapper tests in `src/features/admin/partners/__tests__/`. (PM-01)
- [x] 4.2 RED: `partner.service` tests: duplicate email (case-insensitive) and identity, leader must be active LEVEL_1..5, partner never a leader, transaction creates user + ACTIVATION token. (PM-01..04)
- [x] 4.3 GREEN: create `admin/partners/{types,lib,services,mappers}/` (`createPartner`).
- [x] 4.4 `[SD][AUD]` RED+GREEN: deactivate/reactivate/resend in `partner.service.ts` (set `active=false`, never `delete`, revoke tokens, resend issues new token) with audit. (PM-05, PM-06, PM-08)
- [x] 4.5 RED+GREEN: API routes `src/app/api/admin/partners/route.ts`, `[id]/{deactivate,reactivate,resend-activation}/route.ts`, `leaders/route.ts` (ADMIN only, 201/400/409, `emailSent`). (PM-01, PM-04, ADM-02)
- [x] 4.6 RED+GREEN: users-module guards: `user-role-level-rules.ts` (`validateRoleLevelPair` with `levelCode`, both directions), `users/[id]/route.ts` PUT, `activate`, `deactivate`, `set-password` refuse partners; `hooks/use-leaders.ts` excludes `PARTNER_EXTERNAL`. (PM-03, PM-07, ADM-01)
- [x] 4.7 RED+GREEN: UI `admin/partners/{hooks,components}` and `src/app/dashboard/admin/partners/page.tsx` (list, create form, leader picker, status badges, actions); Admin menu entry. (PM-05, ADM-02)
- [x] 4.8 RED+GREEN: impersonation of pending partner allowed ("Ver como"), activation not checked. (PA-08)
- [x] 4.9 `[AUD]` RED+GREEN: add AuditAction `PARTNER_UPDATED`; `updatePartnerSchema` (name, lastName, typeIdentity, identityNumber, phone, leaderId; email NOT accepted) and `updatePartner` in `partner.service.ts` (partner-only 404, leader re-validation, identity uniqueness excluding self, immutable role/level/category/email/active/activatedAt, audit with changed fields). (PM-09, PM-02, PM-03, PM-04, PM-08)
- [x] 4.10 RED+GREEN: route `PUT /api/admin/partners/[id]` (ADMIN only, 200/400/404/409) and UI: edit dialog in `admin/partners/components` (reuse create form + two-step leader picker, email read-only, category locked), hook with `AsyncState<T>`, "Editar" action in `partners-table`. (PM-09)

## Phase 5: Negocios parity [U6]

- [x] 5.1 `[PO]` RED: `create-business` tests: PARTNER forced `idUser=session`, bypass roles (admin/support) may create on behalf of partner, non-bypass outside scope denied, missing partner PPC persists nothing. (NEG-02, PA-04)
- [x] 5.2 GREEN: edit `negocios/actions/create-business.ts` (`resolveBusinessOwnerId`, `getPpcForNewBusinesses` with owner level).
- [x] 5.3 RED+GREEN: agent picker and `shared/services/agent.service.ts` include partners; `can-export-business-list.ts` allows partner own-only export; list/stats/terms scope for partner. (NEG-03)
- [x] 5.4 `[PO]` RED: origin change on partner business: only on `EMITIDO`; skips `validateProductConfigurationExists` category-line check and commission recalculation; persists origin only. (NEG-03, PL-03)
- [x] 5.5 GREEN: edit `src/app/api/negocios/[id]/route.ts` PUT branch accordingly.
- [x] 5.6 RED+GREEN: `comments.service.ts` partner author notifies like AGENTE; comprobantes notification parity. (CC-02, BS-02, PA-05)
- [x] 5.7 RED+GREEN: AGENTE UI branches extended to PARTNER (components listed in exploration). (PA-04, NEG-03)
- [x] 5.8 `[PO]` `[TM]` RED+GREEN: partner advanced filters. Product-owner decision 2026-10-11: allow PARTNER read-only access (GET only) to the catalogs the Mis negocios advanced-filters sheet needs (companies, categories, client origins) so the lists are populated; the agent filter stays hidden. Prefer existing non-admin catalog routes; if the sheet calls `/api/admin/*` catalogs, switch the partner path to a read-only non-admin route or allowlist ONLY the exact GET and verify the route handler itself does not expose write or admin-only data. Extend `partner-allowlist.test.ts` (allowed GET, denied writes). (PA-01, NEG-03)
- [x] 5.9 `[PO]` `[SD]` `[AUD]` RED+GREEN: PARTNER may delete (soft delete) comprobantes of their OWN businesses, same as an agent: update `canDeleteBusinessComprobante` and its tests; DELETE `comprobantes/[supportId]` scoped by business access (foreign business 404); audit kept. (BS-01, PA-04)

## Phase 6: Pre-liquidation exclusion [U7]

- [x] 6.1 RED: `matcher.service.ts` returns `isDistributionExcluded` from PPC `productConfiguration.level.code`. (PL-01)
- [x] 6.2 RED: `poliza`/`voluntaria` processors emit `EXCLUDED` (idBusiness set, counted in successRecord) for partner rows; mixed file and partner-only file reach PRE-SETTLED. (PL-01, PL-02)
- [x] 6.3 GREEN: edit `matcher.service.ts`, `processors/{poliza,voluntaria}.processor.ts`, `processor.interface.ts`, `process-batch.service.ts`.
- [x] 6.4 RED+GREEN: defensive paths in `pre-liquidacion.service.ts`: `procesar` and `sincronizarYCalcularRegistroRezagado` convert to `EXCLUDED` (no throw); cambio-origen returns early. (PL-03)
- [x] 6.5 RED: counters and listings ignore `EXCLUDED` status (no commission distribution rows). (PL-01)
- [x] 6.6 Verify open design question: RED+GREEN test that `liquidar-archivo` on a file with ONLY `EXCLUDED` rows sets FileImport `SETTLED` per PL-02 wording; record result and surface the finding in the apply report. (PL-02)

## Phase 7: Dashboard, navigation, calculadora [U8]

- [x] 7.1 RED+GREEN: `hierarchy-tree/route.ts` returns empty tree for PARTNER (PD-01, PA-07).
- [x] 7.2 RED: `pivotToViewModel` partner split (`partnerRows` by name, block only when agent rows exist, totals include partners). (PD-02, PD-03)
- [x] 7.3 GREEN: edit `heatmap.service.ts` (`isPartner` from level code), `production-kpi.types.ts`, `use-heatmap-table.ts`, heatmap table component with "Partners" header.
- [x] 7.4 `[PO]` RED+GREEN: `menu-items.ts`/`menu-builder.ts` PARTNER composition: ONLY Dashboard and Mis negocios (product-owner decision; no Reportes, Liquidaciones, Calculadora, Mis distribuciones or Admin). The header notifications bell stays available. (NAV-01, PA-02)
- [x] 7.5 RED+GREEN: calculadora level source excludes `PARTNER_EXTERNAL`. (PA-03, LVL-01)

## Phase 8: Verification and docs [U9]

- [x] 8.1 Playwright e2e: create partner, activate, login, create business, denied pages, deactivate ends session on next navigation. (all)
- [x] 8.2 Create `.changeset/partner-profile.md` (minor) with `### Agregado`, `### Mejorado`, `### Corregido`, `### Técnico` and a note that agents lose access to businesses outside self+subordinates.
- [x] 8.3 Check `docs/DATE_HANDLING_CONVENTIONS.md`; update only if a business date is touched.
- [x] 8.4 Write deploy checklist (migrate deploy, `prisma:seed:partner`, QA: large carga-archivos upload, SSE `/api/notifications/stream`, existing agent session, `CODE_TOO_LONG` dry run).
- [x] 8.5 Run `npm run lint`, `npm run type-check`, `npm run test:all`; run `architecture-enforcer`; fix findings.

## Phase 9: Review remediation (verify + architecture + Next.js reviews, 2026-10-11) [U10]

### 9A Architecture (CLAUDE.md rules)
- [x] 9.1 RED+GREEN: remove the Prisma calls ADDED to route handlers `negocios/[id]/comments/route.ts` (GET) and `negocios/[id]/comprobantes/route.ts` (GET); resolve the access user through a service/`toAccessUser(session)`; also apply to `comprobantes/presign` and the POST handlers when it is the same lookup. (layering)
- [x] 9.2 RED+GREEN: `business-access.service.ts` returns domain reasons (`FORBIDDEN` | `NOT_FOUND`) instead of HTTP status; one HTTP mapper used by all routes. (layering)
- [x] 9.3 RED+GREEN: `business-creation.service.ts` drops `ApiResponse` and the injected Server Action; depends on `getPpcForNewBusinesses` service; `checkBusinessCreation` validates input with Zod and stops importing Prisma; no double `auth()` per create flow. (layering, DIP)
- [x] 9.4 `[AUD]` RED+GREEN: audit `EXCLUDED` transitions and excluded-only file closures (new AuditAction values `SETTLEMENT_EXCLUDED`, `FILE_IMPORT_EXCLUDED_ONLY_CLOSED`), one event per call site with available request context. (audit rule)
- [x] 9.5 RED+GREEN: single visibility rule — `resolveVisibleUserIds` delegates to `resolveBusinessScope` semantics so unknown roles fail closed everywhere; keep existing behavior for valid roles. (SOLID)
- [x] 9.6 RED+GREEN: `negocios/[id]/route.ts` PUT resolves the final level / exclusion ONCE (helper), no recomputation. (SOLID smell)
- [x] 9.7 Replace `undefined as unknown as number` with `resetField('leaderId')` in create/edit partner dialogs. (TypeScript)
- [x] 9.8 Docs: add to `.changeset/partner-profile.md` and `deploy-checklist.md` the CONSULTOR read-any-business change and the DEFAULT/unknown-role 403 change. (verify W1)

### 9B Next.js / security
- [x] 9.9 `[TM]` RED+GREEN: client IP for rate limiting comes from a trusted source (`x-real-ip`, else LAST `x-forwarded-for` hop) via a dedicated helper; audit `getClientIp` behavior unchanged unless trivially safe. (F17)
- [x] 9.10 RED+GREEN: memoize `auth()` per request with `React.cache` and route guards through it (root layout, dashboard layout, pages, `require-role`, `require-action-permission`). (F5)
- [x] 9.11 RED+GREEN: rate limiter evicts empty keys, caps size, and is a `globalThis` singleton. (F25)
- [x] 9.12 RED+GREEN: check token validity BEFORE hashing the password in activate/reset. (F13)
- [x] 9.13 RED+GREEN: validate the link in the Server Component (`peekToken`) and pass the result as a prop; remove the GET `?token=` preview endpoints and `use-link-preview`. (F8, F9)
- [x] 9.14 `[TM]` RED+GREEN: middleware does not re-issue the session cookie on `/api/*` (decode-only gate for the PARTNER allowlist); `/dashboard` keeps the wrapper; regression tests for public/API-key/cron routes and SSE. (F1)
- [x] 9.15 RED+GREEN: leader picker race — remove the `eslint-disable`, add cancellation/sequencing. (F20)
- [x] 9.16 `[TM]` RED+GREEN: login `callbackUrl` only accepts same-origin relative paths (single leading `/`), else `/dashboard`. (F10)
- [x] 9.17 `[TM]` RED+GREEN: rate limit credentials login (`authorize`) by trusted IP and email hash, generic error. (F26)

## Apply Batches and Commit Plan

| Batch | Tasks    | Commit (conventional, no attribution)                                 |
| ----- | -------- | --------------------------------------------------------------------- |
| A     | 1.1-1.10 | `feat(partner): add schema, seeds and level constants`                |
| B     | 2.1-2.7  | `feat(auth): add partner allowlist and session revalidation`          |
| C     | 2.8-2.13 | `refactor(negocios): centralize business access and guard actions`    |
| D     | 3.1-3.8  | `feat(auth): add account tokens and activation services`              |
| E     | 3.9-3.13 | `feat(auth): add activation, reset endpoints, emails and pages`       |
| F     | 4.1-4.8  | `feat(admin): add partners module and users guards`                   |
| G     | 5.1-5.7  | `feat(negocios): partner parity for business flows`                   |
| H     | 6.1-6.6  | `feat(pre-liquidacion): exclude partner businesses from distribution` |
| I     | 7.1-7.5  | `feat(dashboard): partner tree, heatmap block and menu`               |
| J     | 8.1-8.5  | `chore(partner): e2e, docs and changeset`                             |
