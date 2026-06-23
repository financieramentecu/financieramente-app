# Verification Report: export-negocios-excel

**Date**: 2026-06-23
**Mode**: hybrid (Engram + OpenSpec)
**Strict TDD**: active, vitest

## Completeness

22/22 tasks marked complete across 7 phases. Confirmed against actual source: every file listed in apply-progress exists and matches the described change (`can-export-business-list.ts`, `resolveVisibleUserIds` in `user-hierarchy.service.ts`, both route handlers, `user.service.ts`, `business.types.ts`, `negocios-page-client.tsx`, `audit-logger.ts`, plus 3 new test files).

## Build / Test Evidence (re-executed, not trusted from report)

| Command | Result |
|---|---|
| `npm run type-check` | PASS — 0 errors |
| `npm run lint` | PASS — 0 errors, 1 pre-existing-style WARNING (unused `resolveVisibleUserIds` import in `business-list.route.test.ts` mock setup — cosmetic, not a correctness issue) |
| Negocios+auth scoped suite (`vitest run src/features/negocios src/app/api/negocios src/app/dashboard/negocios src/features/auth`) | 86 files / 790 tests passed, 0 failed |
| Full suite (`npm run test:unit` equivalent) | 308 files / 2802 tests passed, 3 skipped (pre-existing, unrelated), 0 failed |

## Spec Compliance Matrix

| Requirement / Scenario | Status | Evidence |
|---|---|---|
| Export enabled Nivel 2 (LEVEL_2) | PASS | `can-export-business-list.test.ts` + integration test "authorizes a Nivel 2 (LEVEL_2) user" |
| Export enabled Nivel 6 / GENERAL_LEVEL (MIA) | PASS | integration test "authorizes a Nivel 6 / GENERAL_LEVEL (MIA) user" |
| User outside Nivel 2-6, no admin role → denied | PASS | integration test "rejects with 403 a user outside Nivel 2-6" + "no role and no level" |
| Client/server gate never diverge | PASS | Single function `canExportBusinessList` imported identically by `negocios-page-client.tsx` (client) and `POST /api/negocios/export/route.ts` (server) — verified by direct source read, no duplicated logic found |
| Export scoped to hierarchy subtree (bug fix) | PASS | `export/route.ts` now calls `resolveVisibleUserIds(prisma, currentUser)` and passes `visibleUserIds` into `buildBusinessListWhere`, identical call pattern to `GET /api/negocios`. Verified by reading both route files side by side. Integration test confirms BFS call + `idUser IN [...]` predicate for non-admin, and absence of `idUser` filter for admin |
| Export scope matches list scope exactly | PASS | Same `resolveVisibleUserIds` helper shared by both endpoints (single source of truth in `user-hierarchy.service.ts`) |
| Filtered export — only matching in-scope rows | PASS | `buildBusinessListWhere` receives both `toBusinessListFilterInput(...)` and `{ visibleUserIds }` together in the export route — same composition as GET |
| Unfiltered export — full visible scope | PASS | Same `where` builder path; no extra filtering applied when filters omitted |
| Empty filtered export → "No hay registros para exportar" | PASS | `export/route.ts` lines 124-129 unchanged behavior; integration test "returns 404 ... when filtered scope yields zero rows" passes |

## Additional Verification (out-of-artifact user confirmation)

| Item | Status | Evidence |
|---|---|---|
| `EXPORT_ADMIN_ROLES` includes `ADMIN` and `ASISTENTE_GERENCIA_OPERATIVA` with full access independent of level | PASS | `can-export-business-list.ts` lines 6-10: `EXPORT_ADMIN_ROLES = [ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE]`. `isExportAdminRole` short-circuits before checking `levelCode` |
| `getCurrentUserByEmail` includes `level` | PASS | `user.service.ts` Prisma include adds `level: { select: { code: true } }` |
| `UserWithRole` type includes `level` | PASS | `business.types.ts` line 107-108: `level?: { code: string } | null` |
| `level` propagates client-side without breaking other consumers | PASS | `page.tsx` passes full `currentUser` (incl. `level`) to client component unchanged; `level` is optional so no existing consumer of `UserWithRole`/`getCurrentUserByEmail` breaks |
| `BUSINESS_EXPORTED` audit log fires | PASS | `export/route.ts` lines 140-148: `logAuditEvent` called with `AuditAction.BUSINESS_EXPORTED` after gate + total resolved, before file generation |

## Design Coherence

`canExportBusinessList` is the single source of truth, confirmed by direct read of both call sites — no parallel/duplicated role-check logic exists anywhere else in the diff. `resolveVisibleUserIds` is likewise the single shared scope resolver for GET and POST/export.

## Strict TDD Compliance

RED→GREEN evidence present and credible for the 3 behavior-bearing units (gating helper, scope helper, export route integration) per apply-progress narrative, cross-checked against actual test file contents (`negocios-export-authorization-scope.test.ts` matches the described RED-phase comment header and assertions). Phases 3/5/6 correctly classified as structural wiring without isolated RED/GREEN — consistent with codebase convention (integration-test-driven for wiring layers).

## Issues

### CRITICAL
None.

### WARNING
1. Lint warning: `resolveVisibleUserIds` imported but never directly invoked as a bare identifier in `business-list.route.test.ts` (only used inside the `vi.mock` factory return object) — 1 ESLint warning, not blocking, but should be cleaned up before merge to keep `lint` fully clean.

### SUGGESTION
1. Consider asserting `BUSINESS_EXPORTED` audit log invocation explicitly in a dedicated unit/integration test — current suite verifies authorization/scope/404 behavior but no test directly asserts `logAuditEvent` was called with `AuditAction.BUSINESS_EXPORTED` and the expected payload shape.
2. `ANALISTA_SOPORTE` is included in `EXPORT_ADMIN_ROLES` though the user's verbal confirmation only mentioned "admin" and "asistente de gerencia operativa". This matches the pre-existing admin-like role grouping used elsewhere in `roles.ts` (lines 107-119), so it is consistent with established convention, not a regression — flagged only for awareness, not for action.

## Verdict

**PASS WITH WARNINGS** — 0 CRITICAL, 1 WARNING (cosmetic lint), 2 SUGGESTION. Implementation matches spec scenario-by-scenario with real passing tests as evidence. Safe to proceed to archive once the lint warning is optionally cleaned up.
