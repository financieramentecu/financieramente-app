# Tasks: Manual novedad status management

## Reconciliation Notes (spec vs design vs proposal)

- Spec and design agree on all normative points (5 states, `manage-novedad` endpoint,
  role gate `ANALISTA_SOPORTE`+`ADMIN`, no terminal state, UNMARK gate
  `novedadStatus==='NUEVA'`+ownership, timestamps preserved on UNMARK). No divergence
  between spec and design was found.
- The original `proposal.md` is stale on two points, corrected by spec+design+user rules:
  1. Backfill path: proposal says `prisma/scripts/`; design + user rule say
     `prisma/seeds/backfill-novedad-status.ts` (follows `backfillXxx` convention in
     `prisma/seeds/reset-future-payments-to-sin-fondear.ts`). **Resolved: `prisma/seeds/`.**
  2. Backfill scope: proposal's "Scope" section says only `RESUELTA → NUEVA`; spec/design
     explicitly correct this to cover **both** legacy `PENDIENTE` AND `RESUELTA` → `NUEVA`.
     **Resolved: both legacy values migrate.**
- `cancel/route.ts` is verified (D10) to have zero `novedadStatus` references — no task
  needed there beyond a regression test proving it stays untouched.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550-650 (7 modified files + 5 new files + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (types+service+manage-novedad API+audit) → PR 2 (route.ts auto-resolve removal + mark-novedad UNMARK tightening + backfill script) → PR 3 (UI: badge, action button, modal, hook, page wiring) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | 5-state types + `manage-novedad` service/route/schema/audit | PR 1 | `npx vitest run src/app/api/negocios/__tests__/manage-novedad.route.test.ts src/features/negocios/services/__tests__/business-novedad.service.test.ts` | `curl -X PATCH localhost:3000/api/negocios/1/manage-novedad` as ANALISTA_SOPORTE | Delete new route/service/schema files + revert type widening; no existing route touched |
| 2 | Remove auto-resolution from PUT; tighten UNMARK in mark-novedad | PR 2 | `npx vitest run src/app/api/negocios/__tests__/business-id.route.test.ts src/app/api/negocios/__tests__/mark-novedad.route.test.ts` | Manually transition a VENTA_EFECTUADA→EMITIDO business with a NUEVA novedad, confirm untouched | Revert `route.ts`/`mark-novedad/route.ts` diff only; independent of PR 1 |
| 3 | Backfill script | PR 2 or standalone | `npx tsx prisma/seeds/backfill-novedad-status.ts --dry-run` | Same command against staging DB | Delete script file; no code depends on it |
| 4 | UI: badge, action button, modal, hook, page wiring | PR 3 | `npx vitest run src/features/negocios/__tests__/components/ui/BusinessNovedadBadge.test.tsx src/features/negocios/hooks/__tests__/use-manage-novedad.test.ts` | Manual click-through: analista opens "Gestionar novedad", changes status | Revert UI files only; API from PR 1 stays functional headless |

## Phase 1: Types & Vocabulary (Foundation)

- [x] 1.1 RED: extend `src/app/api/negocios/__tests__/business-id.route.test.ts` (or a new types test) asserting `BUSINESS_NOVEDAD_STATUS` has exactly 5 keys `NUEVA|SOMETIDA_DEVOLUCION|DECLINADA|PENDIENTE|CANCELADA` and a `MANUAL_NOVEDAD_STATUSES` array excluding `NUEVA`.
- [x] 1.2 GREEN: in `src/features/negocios/types/business-entity.types.ts`, widen `BUSINESS_NOVEDAD_STATUS` to the 5 keys and add `export const MANUAL_NOVEDAD_STATUSES = [...]` (4 keys).
- [x] 1.3 Add `manageNovedadSchema = z.object({ novedadStatus: z.enum([SOMETIDA_DEVOLUCION, DECLINADA, PENDIENTE, CANCELADA]) })` to `src/features/negocios/lib/business-api.schemas.ts`; RED test first in a schema test file asserting it accepts the 4 manual values and rejects `NUEVA`/unknown, then GREEN the schema.
- [x] 1.4 Add `BUSINESS_NOVEDAD_STATUS_CHANGED` to the `AuditAction` enum in `src/features/auth/lib/audit-logger.ts`; keep existing `BUSINESS_NOVEDAD_RESOLVED` member (D5, stop emitting only, no removal).

## Phase 2: `business-novedad.service.ts` (Prisma layer for new endpoint)

- [x] 2.1 RED: `src/features/negocios/services/__tests__/business-novedad.service.test.ts` with mocked `prisma` — `getNovedadContext(businessId)` returns `{ business, novedadStatus }` or `null` when missing; `updateNovedadStatus(businessId, target)` calls `prisma.business.update` with `{ novedadStatus: target }` and returns the mapped `BusinessEntity`.
- [x] 2.2 GREEN: create `src/features/negocios/services/business-novedad.service.ts` implementing `getNovedadContext` and `updateNovedadStatus`, using `businessWithRelations` include + `prismaBusinessToEntity` mapper (mirrors `cancel/route.ts` shape). No `ApiResponse` returned from the service — domain data only.

## Phase 3: `PATCH /api/negocios/[id]/manage-novedad` (privileged endpoint)

- [x] 3.1 RED: create `src/app/api/negocios/__tests__/manage-novedad.route.test.ts` covering the matrix — 401 unauthenticated; 403 role outside `[ADMIN, ANALISTA_SOPORTE]`; 400 invalid id; 400 body `novedadStatus: 'NUEVA'`; 404 business not found; 404 `novedadStatus === null`; 200 `NUEVA→SOMETIDA_DEVOLUCION`; 200 `CANCELADA→PENDIENTE` (reopen, no terminal-state block); single `logAuditEvent` call with action `BUSINESS_NOVEDAD_STATUS_CHANGED` and `details` containing `from`/`to`.
- [x] 3.2 GREEN: create `src/app/api/negocios/[id]/manage-novedad/route.ts` — HTTP-only: `auth()` → role allowlist `[UserRole.ADMIN, UserRole.ANALISTA_SOPORTE]` → parse `id` → `manageNovedadSchema.safeParse` → `business-novedad.service.getNovedadContext` (404 if null status) → `updateNovedadStatus` → `logAuditEvent(BUSINESS_NOVEDAD_STATUS_CHANGED, {businessId, from, to})` → return `ApiResponse<BusinessEntity>`. No Prisma import in this file.

## Phase 4: Remove auto-resolution (`PUT /api/negocios/[id]`)

- [x] 4.1 RED: extend `src/app/api/negocios/__tests__/business-id.route.test.ts` — a VENTA_EFECTUADA business with `novedadStatus='NUEVA'` transitioning to EMITIDO via `contract` MUST keep `novedadStatus`/`novedadResolvedAt` byte-identical, MUST NOT call `logAuditEvent` with `BUSINESS_NOVEDAD_RESOLVED`, and `dateIssued`/payment-sync logic MUST still run (existing becomesEmitido assertions stay green).
- [x] 4.2 GREEN: in `src/app/api/negocios/[id]/route.ts`, delete the novedad branch inside the transaction (`becomesEmitido && existingBusiness.novedadStatus === BUSINESS_NOVEDAD_STATUS.PENDIENTE` block, ~lines 443-446) and the post-transaction `BUSINESS_NOVEDAD_RESOLVED` audit emission (~lines 524-538). Keep `becomesEmitido` variable and every other branch (payments/dates) unchanged. Remove now-unused `BUSINESS_NOVEDAD_STATUS` import if no longer referenced in this file.

## Phase 5: Tighten `mark-novedad` (MARK→NUEVA, UNMARK gate+ownership, preserve timestamps)

- [x] 5.1 RED: extend `src/app/api/negocios/__tests__/mark-novedad.route.test.ts` — MARK on `VENTA_EFECTUADA`+`novedadStatus===null` sets `novedadStatus='NUEVA'` (was `PENDIENTE`); UNMARK by the owning user with `novedadStatus==='NUEVA'` succeeds and nulls only `novedadStatus`, leaving `novedadMarkedAt` unchanged; UNMARK returns 409 when `novedadStatus !== 'NUEVA'`; UNMARK returns 403 when `business.idUser !== currentUser.idUser`.
- [x] 5.2 GREEN: in `src/app/api/negocios/[id]/mark-novedad/route.ts` — MARK branch sets `novedadStatus: BUSINESS_NOVEDAD_STATUS.NUEVA`; UNMARK precondition becomes `existingBusiness.novedadStatus !== BUSINESS_NOVEDAD_STATUS.NUEVA` (409) OR `existingBusiness.idUser !== currentUser.idUser` (403, new check); UNMARK `updateData` becomes `{ novedadStatus: null }` only (drop `novedadMarkedAt: null`).
- [x] 5.3 RED+GREEN: `src/app/api/negocios/__tests__/cancel.route.test.ts` — add/confirm a regression scenario asserting cancel does not read/write `novedadStatus` for a business with any non-null `novedadStatus` (D10 verification, no production code change expected).

## Phase 6: Legacy data backfill script

- [x] 6.1 RED: `prisma/seeds/__tests__/backfill-novedad-status.test.ts` (or colocated unit test) with mocked `PrismaClient` — asserts `backfillNovedadStatus()` updates rows where `novedadStatus IN ('PENDIENTE','RESUELTA')` to `'NUEVA'`, chunked update pattern, one audit entry per batch (SYSTEM_ACTOR pattern), `--dry-run` performs zero writes, and a second run is a no-op (matches count 0).
- [x] 6.2 GREEN: create `prisma/seeds/backfill-novedad-status.ts` following `reset-future-payments-to-sin-fondear.ts` conventions (`backfillNovedadStatus` function, `UPDATE_CHUNK_SIZE`, `--dry-run` flag, `SYSTEM_ACTOR`, idempotent self-excluding where-clause `novedadStatus IN ('PENDIENTE','RESUELTA')`).

## Phase 7: UI — Badge (5 states + fallback)

- [x] 7.1 RED: extend `src/features/negocios/__tests__/components/ui/BusinessNovedadBadge.test.tsx` — 5 distinct label/colour/icon assertions (`NUEVA`=blue/AlertCircle, `SOMETIDA_DEVOLUCION`=amber/Undo2, `PENDIENTE`=orange/Clock, `DECLINADA`=red/XCircle, `CANCELADA`=slate/Ban) + a neutral fallback chip test for an unrecognized status string (D9).
- [x] 7.2 GREEN: rewrite `STATUS_CONFIG` in `src/features/negocios/components/ui/BusinessNovedadBadge.tsx` to the 5-entry palette with `lucide-react` icons `AlertCircle, Undo2, Clock, XCircle, Ban`; add a fallback branch (neutral slate chip, generic label) when `STATUS_CONFIG[novedadStatus]` is undefined instead of throwing.

## Phase 8: UI — Fix `NovedadActionButton` PENDIENTE→NUEVA gate (known risk)

- [x] 8.1 RED: add/extend a test for `NovedadActionButton` (create `src/features/negocios/__tests__/components/ui/NovedadActionButton.test.tsx` — currently uncovered per blast-radius) asserting `canMark` is true when `novedadStatus !== null` is false (i.e. gate uses `=== null`) and `canUnmark` is true only when `novedadStatus === 'NUEVA'`, not `'PENDIENTE'`.
- [x] 8.2 GREEN: in `src/features/negocios/components/ui/NovedadActionButton.tsx`, replace both `BUSINESS_NOVEDAD_STATUS.PENDIENTE` comparisons (`canMark`'s `novedadStatus !== BUSINESS_NOVEDAD_STATUS.PENDIENTE` and `canUnmark`'s `novedadStatus === BUSINESS_NOVEDAD_STATUS.PENDIENTE`) with `BUSINESS_NOVEDAD_STATUS.NUEVA` semantics (`canMark` uses `novedadStatus === null`; `canUnmark` uses `novedadStatus === BUSINESS_NOVEDAD_STATUS.NUEVA`).

## Phase 9: UI — `use-manage-novedad` hook

- [x] 9.1 RED: `src/features/negocios/hooks/__tests__/use-manage-novedad.test.ts` — mocked `fetch`, asserts `idle→loading→success` on 200 and `idle→loading→error` on non-2xx, `AsyncState<BusinessEntity>` shape (mirrors `use-mark-novedad.test.ts`).
- [x] 9.2 GREEN: create `src/features/negocios/hooks/use-manage-novedad.ts` exporting `useManageNovedad(businessId)` → `{ state, updateStatus }` calling `PATCH /api/negocios/${businessId}/manage-novedad` with `{ novedadStatus }`.

## Phase 10: UI — `BusinessNovedadManageModal`

- [x] 10.1 RED: `src/features/negocios/__tests__/components/modals/BusinessNovedadManageModal.test.tsx` — selector renders only the 4 manual options (never `NUEVA`), `onConfirm` requires a selection, closes with reset state, shows the current status.
- [x] 10.2 GREEN: create `src/features/negocios/components/modals/BusinessNovedadManageModal.tsx` (shape per `BusinessCancelModal`), using `MANUAL_NOVEDAD_STATUSES` for selector options and `useManageNovedad`.

## Phase 11: UI — Trigger wiring (role-gated visibility)

- [x] 11.1 RED: extend detail-page/`BusinessViewModal` component tests asserting "Gestionar novedad" renders only for `ANALISTA_SOPORTE`/`ADMIN` with non-null `novedadStatus`, and is absent for `AGENTE`/`ASISTENTE_GERENCIA_OPERATIVA`/`COACH`.
- [x] 11.2 GREEN: wire the trigger + `BusinessNovedadManageModal` into `src/app/dashboard/negocios/[id]/page.tsx` and `src/features/negocios/components/modals/BusinessViewModal.tsx`, gated on `currentUser.role.code`.

## Phase 12: Docs & Regression

- [x] 12.1 Update `prisma/ERD.md` novedad field notes: 5-state vocabulary, VARCHAR(20) unchanged, no auto-resolution.
- [x] 12.2 Run `npm run test:unit && npm run type-check && npm run lint` and confirm all existing PUT/mark-novedad/cancel route tests remain green after Phases 4-5.

## Key Learnings

1. `becomesEmitido` in `route.ts` also drives `dateIssued`/payment sync, so only the novedad branch (~443-446) and its audit block (~524-538) may be deleted.
2. `NovedadActionButton.tsx` still gates on `BUSINESS_NOVEDAD_STATUS.PENDIENTE` and has zero test coverage today — a real regression risk if left unpatched.
3. `mark-novedad/route.ts` keeps Prisma inline by design (D3); only the new `manage-novedad` route gets a dedicated service.
4. Proposal's backfill scope (RESUELTA-only, `prisma/scripts/`) is superseded by spec+design (`PENDIENTE`+`RESUELTA`, `prisma/seeds/`).

## Post-apply additions

Bugfixes discovered and fixed (RED → GREEN, real test runs) during manual verification of `novedad-gestion-manual`, after the original 27 tasks were already complete.

### In-scope (novedad-gestion-manual)

- [x] P.1 UNMARK now also allowed for `ADMIN`/`ASISTENTE_GERENCIA_OPERATIVA` (previously only the owning Money Strategist) — `src/app/api/negocios/[id]/mark-novedad/route.ts`, with 2 new `it.each` role-parametrized tests in `mark-novedad.route.test.ts`.
- [x] P.2 Fixed MARK error message still referencing the pre-rename term "novedad pendiente" — `src/app/api/negocios/[id]/mark-novedad/route.ts`, message text updated to match the 5-state vocabulary.
- [x] P.3 Added "Gestionar Novedad" to the row-level secondary (⋮) menu, not only the detail/view modal — `src/features/negocios/components/ui/BusinessRowActions.tsx` (new menu item + inline `BusinessNovedadManageModal`), `src/features/negocios/components/ui/NovedadManageTrigger.tsx` (exports `MANAGE_NOVEDAD_ALLOWED_ROLES` to avoid duplicating the role rule, reuses `useManageNovedad`), `src/features/negocios/components/tables/BusinessTableSection.tsx` and `src/app/dashboard/negocios/negocios-page-client.tsx` wired through with refetch.
- [x] P.4 FIXED (post-verify-report): `src/features/negocios/components/modals/BusinessViewModal.tsx` now forwards `onNovedadChange` callback to `NovedadActionButton`/`NovedadManageTrigger` for list/modal refresh after novedad changes. `ModalVerNegocio` connected with `onNovedadChange={() => { void refetch() }}`. New test: `src/features/negocios/__tests__/components/modals/BusinessViewModal.novedad-refresh.test.tsx`. Test suite: 393 files, 3423 tests, 0 failures, `tsc --noEmit` clean.

### Out-of-scope (shared infrastructure, fixed incidentally in the same session)

- [x] P.5 Race condition in `useBusinesses` — out-of-order HTTP responses could overwrite newer results with stale data; fixed with a `latestRequestId` guard via `useRef` — `src/features/negocios/hooks/use-businesses.ts`.
- [x] P.6 Sidebar rendered blank during initial session load — `AppSidebar` now shows `SidebarMenuSkeleton` while `useAuthSession().isLoading` — `src/features/shared/components/layout/AppSidebar.tsx`.
- [x] P.7 Sidebar menu accordion collapsed on navigation to another section — `nav-main.tsx` now merges (`setOpenItems(prev => ...)`) instead of overwriting the open-items set — `src/features/shared/components/layout/nav-main.tsx`.
- [x] P.8 Production Dashboard hierarchy panel reserved a blank space when the user has no tree — `HierarchyTreePanel` gained an `onEmptyChange` prop; `DashboardShell.tsx` collapses the `<aside>` to 0px with no border when empty.
- [x] P.9 `buildHierarchyTree` excluded the user from their own root node when their level's `beneficiaryMode` is not `OVERRIDE` — fixed so `userMap` resolves against the full user list (not only "eligible" ones), while eligibility filtering is preserved for descendants/children — `src/features/dashboard/services/hierarchy-tree.service.ts`.
- [x] P.10 `useProductionKpis` and `useHeatmapTable` did not implement the existing "MS Junior path" fallback pattern from `useOriginDonut`/`useCompanyDonut` (fallback to `session.user.id` when `nodes.length === 0`) — replicated in both hooks, correctly distinguishing "no hierarchy → use self" from "hierarchy exists but nothing selected → real zero, no fetch".
