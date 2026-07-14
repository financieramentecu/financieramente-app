# Tasks: Editar fecha de fondeo con validación de soportes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750-950 (incl. tests + dead-code removal) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 (see Work Units) |
| Delivery strategy | single-pr |
| Chain strategy | size:exception (approved by user) |

Decision needed before apply: Yes — **RESOLVED**: single-pr with `size:exception` approved.
Chained PRs recommended: Yes (not taken — user approved size exception instead)
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + audit enum + service tx (`updateBusinessDateAnchored`, `assertHasSupports`) + unit tests | PR 1 | Base: main. Independent, no UI/route wiring yet |
| 2 | `date-anchored` route + funding guards on `/fondear`, `/fondear-aportes` + integration tests | PR 2 | Base: PR 1 branch (needs service fns) |
| 3 | UI wiring: editable cell, block modal, page-client handler + component tests | PR 3 | Base: PR 2 branch (needs route) |
| 4 | Remediation script + dead `fondear-anualidades` removal | PR 4 | Base: main or PR 3 branch; independently mergeable |

Delivered as a single PR with `size:exception` (user-approved).

## Phase 1: Foundation (Schema + Audit)

- [x] 1.1 RED: unit test `date-anchored.schema.ts` — valid `YYYY-MM-DD`, rejects malformed strings
- [x] 1.2 GREEN: create `src/features/negocios/lib/date-anchored.schema.ts`
- [x] 1.3 Add `BUSINESS_DATE_ANCHORED_UPDATED`, `BUSINESS_REMEDIATION_REVERTED` to `AuditAction` in `src/features/auth/lib/audit-logger.ts`

## Phase 2: Service Layer

- [x] 2.1 RED: test `updateBusinessDateAnchored()` — tx syncs Business + Payment[installmentIndex=1], no-op when no payments, rollback on partial failure
- [x] 2.2 GREEN: implement `updateBusinessDateAnchored()` (single `prisma.$transaction`) + `logAuditEvent`
- [x] 2.3 RED: test `assertHasSupports()` — 0 active supports → `NO_SUPPORTS`, deactivated supports ignored, `>=1` → ok
- [x] 2.4 GREEN: implement `assertHasSupports()`
- [x] 2.5 Add client `updateDateAnchored()` fetch wrapper in `business.service.ts`

**Deviation**: `updateBusinessDateAnchored()` and `assertHasSupports()` were implemented in a NEW file `src/features/negocios/services/business-date-anchored.service.ts` instead of inside `business.service.ts`. `business.service.ts` is a client-safe `fetch`-only wrapper imported by client components (`negocios-page-client.tsx`, hooks); importing Prisma into it would break the client bundle. This mirrors the existing `payment-state.service.ts` pattern (server-only Prisma service, `Actor` type, `logAuditEvent`). Only the `updateDateAnchored()` client fetch wrapper was added to `business.service.ts`, per design.

## Phase 3: API Routes

- [x] 3.1 RED: integration test `PATCH /api/negocios/[id]/date-anchored` — 200 sync, 400 future date, 400 malformed, 403 unauthorized, 404, 401
- [x] 3.2 GREEN: create `src/app/api/negocios/[id]/date-anchored/route.ts` (auth → `canFundPayments` → Zod → `dateOnlyToBogotaNoonUtc` → service)
- [x] 3.3 RED: extend `/fondear` tests — 409 `NO_SUPPORTS` when `supportCount=0`, happy path unaffected
- [x] 3.4 GREEN: add `assertHasSupports` guard to `/api/negocios/[id]/fondear/route.ts`
- [x] 3.5 RED: extend `/fondear-aportes` tests — same guard
- [x] 3.6 GREEN: add `assertHasSupports` guard to `/api/negocios/[id]/fondear-aportes/route.ts`

## Phase 4: UI Wiring

- [x] 4.1 RED: `BusinessTableSection` test — `dateAnchored` cell editable only for `canFundPayments` users
- [x] 4.2 GREEN: make `dateAnchored` cell editable (mirrors `dateIssued` pattern)
- [x] 4.3 Wire `handleSaveDateAnchored` in `negocios-page-client.tsx` (mirrors `handleSaveDateIssued`) + refetch, propagated through `MisNegociosPage`

**Deviation**: No new dedicated "block modal" component was built. Per spec, "Editing dateAnchored on already-funded business is not blocked by support guard" — the support guard applies ONLY to the funding action (`/fondear`, `/fondear-aportes`), not to the dateAnchored edit cell, so the editable cell itself has no supportCount gating. The funding-blocked message ("No se puede fondear sin soportes adjuntos") surfaces through the EXISTING error-toast infrastructure in `useBusinessMutation` (`toast.error` on any `{error}` response) and the existing `error` prop already wired into `FundDirectFundingModal` — both funding paths already had this plumbing for every other error case, so no new UI code was needed to surface the 409.

## Phase 5: Remediation Script

- [x] 5.1 Create remediation script — `--dry-run` (default) / `--apply`, queries `FONDEADO` + 0 active supports
- [x] 5.2 RED/GREEN: dry-run reports without mutation; `--apply` reverts business+payments and logs `BUSINESS_REMEDIATION_REVERTED` per business (mocked-Prisma fixture)

**Deviation**: Core logic lives in `src/features/negocios/lib/remediate-unsupported-funded-businesses.ts` (pure functions taking an injected Prisma client), unit-tested normally under `src/**/*.test.ts`. `prisma/seeds/remediate-unsupported-funded-businesses.ts` is a thin CLI wrapper (argv parsing, console output, own `PrismaClient` instance) that imports and calls the lib functions — follows the same pattern as other seed scripts in this codebase. Run via `npx tsx prisma/seeds/remediate-unsupported-funded-businesses.ts [--apply] [--operator=email]`.

## Phase 6: Cleanup

- [x] 6.1 Delete `fondear-anualidades` route and its tests (confirmed no other callers first)

**Deviation**: The Zod schema `src/features/negocios/lib/fondear-anualidades.schema.ts` (and its test) was **NOT deleted**. Code inspection confirmed `/api/negocios/[id]/fondear-aportes/route.ts` (the ACTIVE route) imports `fondearAnualidadesBodySchema` from that same file — the schema is shared/misnamed, not dead code exclusive to the dead route. Deleting it would have broken the active `/fondear-aportes` endpoint. Only the dead route directory (`src/app/api/negocios/[id]/fondear-anualidades/` — `route.ts` + `__tests__/route.test.ts`) was removed; confirmed via `rg` that no other file referenced that route path before deletion.

## Phase 7: Verification

- [x] 7.1 Run `npm run type-check && npm run lint && npm run test:unit` on touched paths; confirm scenarios in spec (#1099) all pass

**Result**: `npm run type-check` — clean (0 errors). `npm run lint` — clean (0 errors/warnings). `npx vitest run` (full suite) — 319 test files passed, 2885 tests passed, 3 skipped, 0 failed.
