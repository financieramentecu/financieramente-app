# Tasks: Export Negocios a Excel para Niveles de Jerarquía 2-6

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~260-320 (9 files: 1 new, 8 modified, incl. tests) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (well-scoped, two orthogonal but small fixes) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Gating helper + scope helper + their tests | PR 1 (single PR) | Foundation, no behavior wired yet |
| 2 | Wire gate + scope fix into export route, GET route, client, audit | PR 1 (single PR) | Same PR — small enough combined; flag to orchestrator if diff exceeds 400 lines during apply |

## Phase 1: Foundation — Gating Helper

- [x] 1.1 RED: write `src/features/negocios/lib/__tests__/can-export-business-list.test.ts` — cases: admin role → true; LEVEL_2..LEVEL_5/GENERAL_LEVEL → true; level outside set (e.g. LEVEL_1, LEVEL_6 if not in list) → false; both roleCode/levelCode undefined → false
- [x] 1.2 GREEN: create `src/features/negocios/lib/can-export-business-list.ts` — export `EXPORT_LEVEL_CODES` const array and `canExportBusinessList({ roleCode, levelCode })` per design interfaces
- [x] 1.3 REFACTOR: confirm helper has no Prisma import (client+server safe) and matches existing `canX`/`ROLES_CAN_X` naming pattern in `roles.ts`

## Phase 2: Foundation — Visible Scope Helper

- [x] 2.1 RED: write/extend `src/features/negocios/services/__tests__/user-hierarchy.service.test.ts` — `resolveVisibleUserIds`: admin role → `undefined`; non-admin → `[self, ...getSubordinateUserIds()]` (mock `getSubordinateUserIds`)
- [x] 2.2 GREEN: add `resolveVisibleUserIds(prisma, currentUser)` to `src/features/negocios/services/user-hierarchy.service.ts`, extracting the exact logic currently inline in `src/app/api/negocios/route.ts` lines 129-134
- [x] 2.3 REFACTOR: replace the inline block in `GET /api/negocios` (`src/app/api/negocios/route.ts`) with a call to `resolveVisibleUserIds`; confirm existing GET tests still pass unchanged

## Phase 3: Data Layer — Propagate `level`

- [x] 3.1 MODIFY `src/features/negocios/services/user.service.ts` — `getCurrentUserByEmail` Prisma `include` adds `level: { select: { code: true } }` alongside existing `role: true`
- [x] 3.2 MODIFY `src/features/negocios/types/business.types.ts` — `UserWithRole` adds `level?: { code: string } | null`
- [x] 3.3 Update any mock Prisma user fixtures under `__tests__/` that construct a full `UserWithRole` object to include `level` (searched: no fixture builds a full `UserWithRole` requiring `level` — field is optional and existing partial fixtures (`{idUser, role}`) remain valid; `mock-prisma-business.ts`'s `user.level` is a different shape used only for `Business.user`, unaffected)

## Phase 4: Server Wiring — Export Route

- [x] 4.1 RED: write/extend integration test for `POST /api/negocios/export` — Nivel 2-6 user without admin role is authorized (currently rejected); user outside Nivel 2-6 and without admin role gets 403
- [x] 4.2 RED: write/extend integration test — non-admin export rows are `⊆` user's hierarchy subtree (no leakage); exported set matches `GET /api/negocios` set exactly under same filters
- [x] 4.3 GREEN: in `src/app/api/negocios/export/route.ts`, remove `EXPORT_ROLES` constant and gate; replace with `canExportBusinessList({ roleCode: currentUser.role?.code, levelCode: currentUser.level?.code })`, returning 403 when false
- [x] 4.4 GREEN: in same file, call `resolveVisibleUserIds(prisma, currentUser)` and pass result as `visibleUserIds` into `buildBusinessListWhere` (currently missing — this is the scope bug fix)
- [x] 4.5 Verify the existing "no records" 404 (`No hay registros para exportar`) and `EXPORT_MAX_ROWS` 413 paths still function with the new gate and scope applied

## Phase 5: Server Wiring — Audit Logging

- [x] 5.1 MODIFY `src/features/auth/lib/audit-logger.ts` — add `BUSINESS_EXPORTED` to `AuditAction` enum following `ENTITY_ACTION` naming
- [x] 5.2 MODIFY `src/app/api/negocios/export/route.ts` — call `logAuditEvent` after gate passes and total is resolved, with `userId`, `email`, `ipAddress`, `userAgent`, and `details` summarizing total rows + active filters

## Phase 6: Client Wiring

- [x] 6.1 MODIFY `src/app/dashboard/negocios/page.tsx` — confirm `currentUser` passed to `NegociosPageClient` carries `level.code` from `getCurrentUserByEmail` (no extra query needed once Phase 3 lands) — confirmed: page already passes full `currentUser` object unchanged, no edit needed
- [x] 6.2 MODIFY `src/app/dashboard/negocios/negocios-page-client.tsx` — replace the inline `canExportExcel` role-only check (lines 263-266) with `canExportBusinessList({ roleCode: _currentUser?.role?.code, levelCode: _currentUser?.level?.code })`
- [x] 6.3 Manual/component check: confirm `canExportExcel` import resolves correctly and existing `negocios-page-client` tests covering the export button still pass — all 13 tests across negocios-page-client.*.test.tsx pass

## Phase 7: Integration Verification

- [x] 7.1 Run `npm run test:unit` for `can-export-business-list.test.ts` and `user-hierarchy.service.test.ts` — confirm RED→GREEN (12 + 13 tests pass)
- [x] 7.2 Run `npm run test:integration` for `export/route.ts` and `negocios/route.ts` scope/auth scenarios — `negocios-export-authorization-scope.test.ts` (7 tests) + `negocios-list-hierarchy.test.ts` (5 tests) pass; full `business-list.route.test.ts` regression fixed (see Deviations) and passing (23 tests)
- [x] 7.3 Run `npm run type-check && npm run lint` across all changed files — both clean, zero errors/warnings
- [x] 7.4 Confirm no `prisma/schema.prisma` changes were needed and `prisma/ERD.md` requires no update (per design: no migration) — confirmed, `AuditLog.action` is plain `String`, `Level.code` already exists; zero schema changes
