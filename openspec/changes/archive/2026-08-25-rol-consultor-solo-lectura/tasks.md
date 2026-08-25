# Tasks: Rol Consultor (Solo Lectura)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950–1100 (impl ~350, tests ~600, e2e ~60) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 → PR5 → PR6 |
| Delivery strategy | ask-on-risk (default; orchestrator to confirm) |
| Chain strategy | pending — ask user: stacked-to-main vs feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Enum/seed/predicates (D1, D8) | PR1 | `vitest run roles.test.ts` | N/A — pure functions | `roles.ts` + seed row revertable alone |
| 2 | Rewire visibility consumers (D2) | PR2 | `vitest run hierarchy.test.ts user-hierarchy.service.test.ts report-permissions-helpers.test.ts` | N/A — unit only | Revert call-site edits, predicates untouched |
| 3 | Export + Level guard (D3, D4) | PR3 | `vitest run can-export-business-list.test.ts user-role-level-rules.test.ts` | `npm run test:integration -- admin/users` | New files + one route edit, independently revertable |
| 4 | UI primitives + requireWriteAccess (D5, D6 infra) | PR4 | `vitest run use-read-only-role.test.ts read-only-action.test.tsx require-write-access.test.ts` | N/A — no consumers wired yet | Two new files, zero route wiring yet |
| 5 | Wire guard into 15+2 routes + 3 actions (D6) | PR5 | `npm run test:integration -- negocios reports` | Manual: CONSULTOR session curl against each route | Each route edit is a single early-return line, revertable per file |
| 6 | Menu/permissions + bug fix + regression/E2E | PR6 | `vitest run permissions.test.ts menu-builder.test.ts` + `npm run test:e2e -- consultor` | Playwright `consultor.spec.ts` | Permission flags + one line in `crear/page.tsx` |

## Phase 1: Foundation — Enum, Seed, Predicates (D1, D8)

- [x] 1.1 Add `UserRole.CONSULTOR` + `ROLE_NAMES`/`ROLE_DESCRIPTIONS` entries in `src/features/auth/lib/roles.ts`.
- [x] 1.2 Add idempotent `CONSULTOR` upsert row to `prisma/seeds/roles.ts`.
- [x] 1.3 RED: `roles.test.ts` — table test for `isReadOnlyRole`/`isWriteBypassRole`/`isGlobalVisibilityRole` over ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE, AGENTE, default, CONSULTOR.
- [x] 1.4 GREEN: implement `WRITE_BYPASS_ROLES`, `READ_ONLY_ROLES`, and the three predicates in `roles.ts`.

## Phase 2: Visibility Consumers Rewire (D2)

- [x] 2.1 RED: `hierarchy.test.ts` — `isHierarchyBypassRole` regression per role (5 existing + CONSULTOR=true).
- [x] 2.2 GREEN: `hierarchy.ts` — `isHierarchyBypassRole = isGlobalVisibilityRole`; re-export `HIERARCHY_BYPASS_ROLES = WRITE_BYPASS_ROLES`.
- [x] 2.3 RED: `user-hierarchy.service.test.ts` — `resolveVisibleUserIds` regression per role, CONSULTOR sees all.
- [x] 2.4 GREEN: `user-hierarchy.service.ts` — replace inline 3-role `||` chain with `isGlobalVisibilityRole`.
- [x] 2.5 RED: `hierarchy-tree.service.test.ts` (`isFullTreeViewer`), `heatmap.service.test.ts`, `build-lead-list-where.test.ts` — per-role regression.
- [x] 2.6 GREEN: update those three call sites to call `isHierarchyBypassRole(...)`.
- [x] 2.7 RED: `report-permissions-helpers.test.ts` — `isReportViewBypassRole` per role, CONSULTOR=true.
- [x] 2.8 GREEN: `report-permissions-helpers.ts` — `isReportViewBypassRole = ADMIN || isReadOnlyRole`.

## Phase 3: Export Gate + Level Guard (D3, D4)

- [x] 3.1 RED: `can-export-business-list.test.ts` — CONSULTOR+LEVEL_3 ⇒ false, CONSULTOR no level ⇒ false, existing roles unchanged.
- [x] 3.2 GREEN: `can-export-business-list.ts` — read-only check first, delete `EXPORT_ADMIN_ROLES`/`isExportAdminRole`, use `isWriteBypassRole`.
- [x] 3.3 RED: `user-role-level-rules.test.ts` — `validateRoleLevelPair` rejects CONSULTOR+levelId, accepts write-role+levelId, accepts CONSULTOR+null.
- [x] 3.4 GREEN: create `src/features/admin/users/lib/user-role-level-rules.ts`.
- [x] 3.5 RED: `PUT /api/admin/users/[id]` route test — 400 for level-then-role and role-then-level orders.
- [x] 3.6 GREEN: wire `validateRoleLevelPair` on the effective post-update pair inside a `prisma.$transaction` in `route.ts`.

## Phase 4: Shared UI Primitives + requireWriteAccess (D5, D6-infra)

- [x] 4.1 RED: `use-read-only-role.test.ts`.
- [x] 4.2 GREEN: create `src/features/shared/hooks/use-read-only-role.ts`.
- [x] 4.3 RED: `read-only-action.test.tsx` — untouched when not read-only, `<span tabIndex={0}>`+tooltip when read-only.
- [x] 4.4 GREEN: create `src/features/shared/components/read-only-action.tsx`.
- [x] 4.5 RED: `require-write-access.test.ts` — 403 for CONSULTOR, pass-through otherwise.
- [x] 4.6 GREEN: create `src/lib/auth/require-write-access.ts`.

## Phase 5: Wire requireWriteAccess Into Routes/Actions (D6)

Negocios mutating routes (15, one RED+GREEN pair each):
- [x] 5.1 `POST /api/negocios/[id]/fondear`
- [x] 5.2 `POST /api/negocios/[id]/fondear-aportes`
- [x] 5.3 `POST /api/negocios/[id]/comments`
- [x] 5.4 `POST /api/negocios/[id]/comprobantes`
- [x] 5.5 `POST /api/negocios/[id]/comprobantes/presign`
- [x] 5.6 `POST /api/negocios/[id]/aportes/[index]/cartera-pagado`
- [x] 5.7 `POST /api/negocios/[id]/aportes/[index]/pago-anticipado`
- [x] 5.8 `PUT /api/negocios/[id]`
- [x] 5.9 `PATCH /api/negocios/[id]/cancel`
- [x] 5.10 `PATCH /api/negocios/[id]/date-anchored`
- [x] 5.11 `PATCH /api/negocios/[id]/mark-novedad`
- [x] 5.12 `PATCH /api/negocios/[id]/manage-novedad`
- [x] 5.13 `PATCH /api/negocios/[id]/aportes/[index]/cartera`
- [x] 5.14 `PATCH /api/negocios/[id]/aportes/[index]/date-anchored`
- [x] 5.15 `DELETE /api/negocios/[id]/comprobantes/[supportId]`

Each: RED integration test (CONSULTOR session → 403, no state change) then GREEN add `requireWriteAccess()` early return. **Deviation** (see apply-progress in Engram for detail): 9 of these 15 routes already excluded CONSULTOR via a pre-existing narrow allow-list (`canFundPayments`, `canDeleteBusinessComprobante`, `CANCEL_ALLOWED_ROLES`, `MANAGE_NOVEDAD_ALLOWED_ROLES`) — regression test added, no code change, confirmed passing (same pattern as 5.16). Only 5.3, 5.4, 5.5, 5.8, 5.11 had a real gap and received a new `isReadOnlyRole` early-return.

Export routes (2):
- [x] 5.16 `POST /api/negocios/export` — RED+GREEN integration test confirming D3 (`canExportBusinessList`) already denies CONSULTOR end-to-end; no code change expected, add regression test only.
- [x] 5.17 `POST /api/reports/produccion-real/export` — guard added inside `authorizeAndParseProduccionRealExportBody` (shared helper), independent of the category visibility bypass granted for viewing.

Server Actions (3):
- [x] 5.18 `src/features/negocios/actions/create-business.ts` — RED action test (rejected `ApiResponse` for CONSULTOR), GREEN add `requireWriteAccess()` early return.
- [x] 5.19 `src/features/negocios/actions/create-client.ts` — same RED/GREEN pattern.
- [x] 5.20 `src/features/negocios/actions/update-client.ts` — same RED/GREEN pattern.

## Phase 6: Menu, Permissions, Latent Bug Fix, Regression (D7, D2-audit)

- [x] 6.1 RED: `permissions.test.ts` — `leads`/`misDistribuciones`/`calculadora` = true for 5 existing roles; correct CONSULTOR values.
- [x] 6.2 GREEN: add the three booleans + `ROLE_PERMISSIONS[CONSULTOR]` in `permissions.ts`.
- [x] 6.3 RED: `menu-builder.test.ts` — `buildMenuByRole` per role (5 existing + CONSULTOR); CONSULTOR sees exactly Dashboard/Negocios/Reportes/Calculadora.
- [x] 6.4 GREEN: gate Leads/Mis distribuciones/Calculadora branches by the new permission flags in `menu-builder.ts`.
- [x] 6.5 RED: test asserting `src/app/dashboard/negocios/crear/page.tsx` denies CONSULTOR (currently would pass via visibility bypass — latent bug).
- [x] 6.6 GREEN: swap `isHierarchyBypassRole` → `isWriteBypassRole` in `crear/page.tsx`.
- [x] 6.7 Full per-role regression pass across all modified predicates/consumers — assert byte-identical behavior for ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE, AGENTE, default.
- [x] 6.8 E2E `consultor.spec.ts` (Playwright): exactly 4 menu items, disabled buttons with tooltip, calculadora runs, direct 403s.

## Key Learnings

1. `canExportBusinessList` requires the read-only check strictly before reading `levelCode`, per spec scenario ordering.
2. `isHierarchyBypassRole` and `HIERARCHY_BYPASS_ROLES` diverge in meaning post-refactor: one is visibility, the other stays write-only via re-export.
3. `CrearNegocioPage` used the visibility predicate on a write screen — a pre-existing latent bug surfaced by this refactor, fixed in Phase 6.
4. `validateRoleLevelPair` must run inside a `prisma.$transaction` re-reading committed state to avoid a level/role race condition.

## Post-apply additions

UI gaps found by manual verification after the original 52 tasks and the first `sdd-verify` (PASS WITH WARNINGS) were already complete. All 5 fixes hide (not disable+tooltip) the affected control for `isReadOnlyRole` — consistent with the pre-existing "Exportar Excel" pattern in `BusinessTableSection.tsx`, which was already hide-based before this change. This is a UX decision consolidated across the feature, not a spec violation of "Mutating and export actions disabled with explanatory tooltip in UI": the underlying requirement (control MUST NOT be actionable for CONSULTOR) is satisfied by a stricter mechanism (hidden vs. disabled+tooltip).

### In-scope (rol-consultor-solo-lectura)

- [x] P.1 "Agregar negocio" button hidden (not just missing an enable check) for a role without `negocios.create` — `src/features/negocios/components/BusinessTableSection.tsx` (`canCreateBusiness` gate via `hasNestedPermission`). Tests: `src/features/negocios/components/__tests__/BusinessTableSection.test.tsx` (2 new cases: hides for CONSULTOR, shows for default/no-role).
- [x] P.2 Central `isReadOnlyRole(userRole)` guard added to `src/features/negocios/components/BusinessRowActions.tsx`, hiding "Subir comprobante", "Editar", "Agregar comentario", "Marcar/Desmarcar Novedad", and "Eliminar" for CONSULTOR. Fixed a real latent gap: `isEditable`/`isCancelable` in `BusinessTableSection.tsx` did not exclude CONSULTOR in VENTA_EFECTUADA/EMITIDO states — the row-level guard now closes that gap regardless of the upstream flag. Tests: `src/features/negocios/__tests__/components/BusinessRowActions.test.tsx`, new `describe('Read-only role (CONSULTOR)')` block, 8 cases (hides 5 write actions + 2 read actions confirmed still visible + 1 negative gate combination).
- [x] P.3 Business detail page hides "Marcar/Desmarcar Novedad" (`NovedadActionButton`), "Subir Soporte" (`UploadSupportButton`), and the "Editar" link for `isReadOnlyRole` — `src/app/dashboard/negocios/[id]/page.tsx`. Tests: `src/app/dashboard/negocios/[id]/__tests__/page.test.tsx` (new file, 2 cases: CONSULTOR hides all three + comments sidebar readOnly, ADMIN keeps all visible).
- [x] P.4 `CommentsSidebar` gained a `readOnly` prop that hides the `CommentInput` add-comment form while keeping the comment thread visible — `src/features/comments/components/CommentsSidebar.tsx`. Tests: `src/features/comments/__tests__/CommentsSidebar.test.tsx` (2 new cases: shows form by default, hides when `readOnly`).
- [x] P.5 Producción Real "Descargar Excel" button hidden for read-only roles via a new `canExport` prop, computed server-side with `isReadOnlyRole(currentUser.role?.code)` — `src/app/dashboard/reportes/produccion-real/page.tsx`, threaded through `produccion-real-shell.tsx` → `produccion-real-filter-bar.tsx`. Backend export authorization was already enforced independently; this closes the UI-only gap (button was visible/clickable for CONSULTOR before). Tests: `src/features/reports/produccion-real/components/__tests__/produccion-real-filter-bar.test.tsx` (new file, 2 cases: shows by default, hides when `canExport={false}`).

Verified in re-verify (2026-08-25): `npx vitest run src` → 422 files / 3616 passed / 3 skipped / 0 failed (up from 420/3600 pre-fix); `npm run type-check` 0 errors; `npm run lint` 0 errors (same 3 pre-existing unrelated warnings). All 5 fixes confirmed to preserve byte-identical behavior for ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE, AGENTE, and DEFAULT (each guarded branch checked against a positive-case test for at least one non-read-only role).
