# Design: Consultor Read-Only Role

## Technical Approach

Split the current single notion of "privileged role" into two orthogonal predicates in `src/features/auth/lib/roles.ts`: **global visibility** and **write authority**. `CONSULTOR` gets visibility without write. Every existing bypass list keeps its exact membership, so ADMIN / ASISTENTE_GERENCIA_OPERATIVA / ANALISTA_SOPORTE behavior is byte-identical. Enforcement is server-side (route/action guards); disabled UI is presentation only.

## Architecture Decisions

### D1 — Role predicates (single source of truth)

`src/features/auth/lib/roles.ts` gains:

```ts
export const WRITE_BYPASS_ROLES: readonly UserRole[] = [
  UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA, UserRole.ANALISTA_SOPORTE,
] // exact current HIERARCHY_BYPASS_ROLES / EXPORT_ADMIN_ROLES membership
export const READ_ONLY_ROLES: readonly UserRole[] = [UserRole.CONSULTOR]

export function isWriteBypassRole(roleCode: string | null | undefined): boolean
export function isReadOnlyRole(roleCode: string | null | undefined): boolean
export function isGlobalVisibilityRole(roleCode: string | null | undefined): boolean
// = isWriteBypassRole(roleCode) || isReadOnlyRole(roleCode)
```

All three follow the existing `if (!roleCode) return false; return isValidRole(roleCode) && LIST.includes(...)` shape. Rejected: `role === UserRole.CONSULTOR` at call sites (scatters policy); rejected: adding CONSULTOR to the existing arrays (conflates read with write).

### D2 — Rewriting the three bypass sites

| Site | New body | Semantics |
|---|---|---|
| `hierarchy.ts: isHierarchyBypassRole` | `isGlobalVisibilityRole(role)` | visibility |
| `hierarchy.ts: HIERARCHY_BYPASS_ROLES` | re-export of `WRITE_BYPASS_ROLES` (kept for compat) | write-list |
| `user-hierarchy.service.ts: resolveVisibleUserIds` | replace the inline 3-role `||` chain with `isGlobalVisibilityRole(currentUser.role?.code)` | visibility |
| `hierarchy-tree.service.ts: isFullTreeViewer`, `heatmap.service.ts`, `build-lead-list-where.ts` | call `isHierarchyBypassRole(...)` instead of reading the array directly | visibility |
| `report-permissions-helpers.ts: isReportViewBypassRole` | `ADMIN || isReadOnlyRole(roleCode)` | visibility (full category bypass, per fixed decision) |

Audit item: `CrearNegocioPage` calls `isHierarchyBypassRole` on a **write** screen. It must switch to `isWriteBypassRole`; CONSULTOR is additionally blocked from that route by menu + action guard.

### D3 — Export precedence over level

`can-export-business-list.ts`: read-only check runs **first**, level can never re-enable.

```ts
if (isReadOnlyRole(roleCode)) return false
if (isWriteBypassRole(roleCode)) return true      // replaces local isExportAdminRole
if (!levelCode) return false
return EXPORT_LEVEL_CODES.includes(levelCode)
```

`EXPORT_ADMIN_ROLES` / `isExportAdminRole` are deleted in favor of the shared predicate (identical membership). Both the button and `POST /api/negocios/export` already consume this function, so one edit covers UI + API.

### D4 — Level assignment guard (reject, do not auto-clear)

New pure rule `src/features/admin/users/lib/user-role-level-rules.ts`:

```ts
export function validateRoleLevelPair(input: {
  roleCode: string | null | undefined
  levelId: number | null | undefined
}): { ok: true } | { ok: false; error: string }
```

Called from `PUT /api/admin/users/[id]` **before** building `updateData`, on the *effective* post-update pair — `roleCode = payload.roleId ? resolvedRole.code : existingUser.role?.code` and `levelId = 'levelId' in body ? body.levelId : existingUser.idLevel` — so both directions are covered: assigning a level to a CONSULTOR **and** switching an already-leveled user to CONSULTOR. Error: `400 { success: false, error: 'Un usuario con rol de solo lectura no puede tener un nivel jerárquico asignado' }`.

**Choice: reject, never silently clear.** Auto-clearing `idLevel` would orphan hierarchy semantics (subordinates keep pointing at a leader that lost its level) without the admin ever seeing it. Since `PUT` accepts `roleId` and `levelId` in the same payload, the admin can do the atomic change in one request; the user-detail form clears the level field client-side when a read-only role is selected, so the normal flow never hits the error.

**Race condition**: two concurrent PUTs could interleave (A sets role, B sets level). Mitigation: move the read + validate + `user.update` into a single `prisma.$transaction`, re-reading the row inside the transaction so the effective pair is computed from committed state. Downstream defensive checks (D2/D3) remain as second line of defense.

### D5 — Shared read-only UI primitive

`src/features/shared/hooks/use-read-only-role.ts`:

```ts
export function useReadOnlyRole(): { isReadOnly: boolean; reason: string }
// reason = 'Solo lectura: tu rol no permite esta acción'
```
reads role from `useAuthSession()` and delegates to `isReadOnlyRole`.

`src/features/shared/components/read-only-action.tsx`:

```tsx
<ReadOnlyAction>
  <Button disabled={isReadOnly}>Exportar</Button>
</ReadOnlyAction>
```
Gotcha driving the design: a `disabled` Radix `TooltipTrigger` emits no pointer events, so `ReadOnlyAction` wraps children in a `<span tabIndex={0}>` trigger and renders the tooltip only when `isReadOnly` (otherwise it returns `children` untouched — zero behavior change for other roles). No `cloneElement`; consumers pass `disabled` themselves so existing disabled logic composes with `||`.

Consumers: `negocios-page-client.tsx` (Crear, Exportar), business detail action buttons, reportes export button, comprobantes upload/delete.

### D6 — Server-side 403 surface

New composable guard `src/lib/auth/require-write-access.ts` → `requireWriteAccess()` = `requireAuth()` + `isReadOnlyRole(session.user.role)` → `403 { success: false, error: 'Sin permisos' }`. Routes already using `requireRole([...])` allow-lists reject CONSULTOR implicitly (it is in no list); the list below is what must be explicitly guarded because it authenticates with bare `auth()` or a broad allow-list:

Negocios mutating: `POST /api/negocios/[id]/fondear`, `/fondear-aportes`, `/comments`, `/comprobantes`, `/comprobantes/presign`, `/aportes/[index]/cartera-pagado`, `/aportes/[index]/pago-anticipado`; `PUT /api/negocios/[id]`; `PATCH /api/negocios/[id]/cancel`, `/date-anchored`, `/mark-novedad`, `/manage-novedad`, `/aportes/[index]/cartera`, `/aportes/[index]/date-anchored`; `DELETE /api/negocios/[id]/comprobantes/[supportId]`.

Export: `POST /api/negocios/export` (via D3), `POST /api/reports/produccion-real/export` (via `requireWriteAccess`).

Server Actions (business creation does not go through an API route): `src/features/negocios/actions/create-business.ts`, `create-client.ts`, `update-client.ts` — each calls `requireWriteAccess()` and returns the standard error `ApiResponse` on failure.

Excluded by design: `POST /api/negocios/cron/fund-payments` (no user session), and all `GET` read endpoints.

### D7 — Menu composition via permissions, not a bespoke array

**Choice**: extend `RolePermissions` with `leads`, `misDistribuciones`, `calculadora` booleans (set `true` for the five existing roles to preserve today's unconditional push, `false`/`true` as needed for CONSULTOR) and gate those three branches in `buildMenuByRole`. **Rejected**: a `CONSULTOR_MENU_ITEMS` array. `AGENTE_MENU_ITEMS` exists because AGENTE has *different* labels and URLs ("Mis Negocios", nested Crear). CONSULTOR sees the same items with the same labels — a strict subset — which is exactly what the permission filter already expresses. Reportes appears through the existing `authorizedReportCodes` path, which now returns every code for CONSULTOR (D2).

`ROLE_PERMISSIONS[CONSULTOR]`: `dashboard: true`, `negocios: { list: true, create/edit/cancel: false, viewAll: true }`, `reportes: { all: true, business: false, personal: false }`, `calculadora: true`, everything else `false`.

### D8 — Persistence: no Prisma migration

Confirmed: roles are the **`Role` table** (`prisma/schema.prisma:121`, `code String @unique`), referenced by `User.idRole`; there is **no Prisma role enum**. `UserRole` in TypeScript only mirrors `Role.code`. Therefore **no migration and no `prisma/ERD.md` update are required** — this corrects the proposal's "Dependencies" note. Required data change: a `CONSULTOR` row in `prisma/seeds/roles.ts` (idempotent `upsert`), plus `ROLE_NAMES` / `ROLE_DESCRIPTIONS` entries.

## Data Flow

    Session.role ──→ isReadOnlyRole ──┬──→ isGlobalVisibilityRole ──→ hierarchy / report-category bypass (SEE ALL)
                                      │
                                      ├──→ requireWriteAccess ──→ 403 on mutating routes + actions
                                      ├──→ canExportBusinessList ──→ false (before levelCode is read)
                                      ├──→ validateRoleLevelPair ──→ 400 on PUT /admin/users/[id]
                                      └──→ useReadOnlyRole ──→ ReadOnlyAction (disabled + tooltip)

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/auth/lib/roles.ts` | Modify | `CONSULTOR` enum value, names/descriptions, `WRITE_BYPASS_ROLES`, `READ_ONLY_ROLES`, three predicates |
| `src/features/auth/lib/permissions.ts` | Modify | `leads`/`misDistribuciones`/`calculadora` flags + `ROLE_PERMISSIONS[CONSULTOR]` |
| `src/features/auth/lib/hierarchy.ts` | Modify | `isHierarchyBypassRole` → visibility predicate |
| `src/features/negocios/services/user-hierarchy.service.ts` | Modify | `resolveVisibleUserIds` uses `isGlobalVisibilityRole` |
| `src/features/production-dashboard/services/{hierarchy-tree,heatmap}.service.ts`, `src/features/leads/lib/build-lead-list-where.ts` | Modify | Use the predicate instead of the raw array |
| `src/features/negocios/lib/can-export-business-list.ts` | Modify | Read-only precedence; drop `EXPORT_ADMIN_ROLES` |
| `src/features/report-permissions/lib/report-permissions-helpers.ts` | Modify | `isReportViewBypassRole` includes read-only roles |
| `src/lib/auth/require-write-access.ts` | Create | Shared 403 guard for mutations/exports |
| `src/features/admin/users/lib/user-role-level-rules.ts` | Create | `validateRoleLevelPair` pure rule |
| `src/app/api/admin/users/[id]/route.ts` | Modify | Effective-pair validation inside a `$transaction` |
| `src/features/shared/hooks/use-read-only-role.ts` | Create | `useReadOnlyRole()` |
| `src/features/shared/components/read-only-action.tsx` | Create | Disabled-safe tooltip wrapper |
| `src/lib/navigation/menu-builder.ts` | Modify | Gate Leads / Mis distribuciones / Calculadora by permissions |
| `src/app/dashboard/negocios/crear/page.tsx` | Modify | `isHierarchyBypassRole` → `isWriteBypassRole` |
| API routes + `negocios/actions/*` (D6 list) | Modify | `requireWriteAccess()` early return |
| `prisma/seeds/roles.ts` | Modify | `CONSULTOR` seed row |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `isReadOnlyRole` / `isWriteBypassRole` / `isGlobalVisibilityRole`, `canExportBusinessList` (CONSULTOR + `LEVEL_3` ⇒ `false`), `validateRoleLevelPair`, `buildMenuByRole` per role | Vitest table-driven, one case per existing role asserting **no** behavior change |
| Integration | Every route in D6 returns 403 for a CONSULTOR session; read routes return 200 with company-wide scope; `PUT /admin/users/[id]` returns 400 for both level-then-role and role-then-level orders | Existing route test harness with a mocked session |
| E2E | CONSULTOR sees exactly Dashboard / Negocios / Reportes / Calculadora; action buttons disabled with tooltip; calculadora simulation completes | Playwright |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Authorization changes are covered by the D6 integration tests.

## Migration / Rollout

No schema migration (D8). Ship order: seed role → code → assign users. Rollback: revert code; the seeded row is inert while unassigned.

## Open Questions

- [ ] Should CONSULTOR appear in the `GET /admin/roles` picker for non-ADMIN editors? Current PUT is already ADMIN-only, so assumed yes-for-ADMIN-only with no extra filter.
