# Proposal: Consultor Read-Only Role

## Intent

The platform has no way to grant company-wide visibility without also granting write and export power. Today RBAC is fragmented across three independent bypass lists (`HIERARCHY_BYPASS_ROLES`, `EXPORT_ADMIN_ROLES`, `isReportViewBypassRole`), all of which group roles that can also mutate data. Stakeholders who only need to observe consolidated results must either be over-privileged or excluded. Introduce a `CONSULTOR` role with global read access to Dashboard, Negocios, Reportes and Calculadora, with writes and file exports blocked in UI **and** API.

## Scope

### In Scope
- `UserRole.CONSULTOR` enum value, `prisma/seeds/roles.ts` row, `ROLE_NAMES` / `ROLE_DESCRIPTIONS`.
- Central `isReadOnlyRole()` in `src/features/auth/lib/roles.ts` as single source of truth.
- `ROLE_PERMISSIONS[CONSULTOR]`: dashboard, `negocios.list`, reportes, calculadora = true; every other module and every write = false.
- Menu filtered to exactly the 4 allowed destinations.
- Server-side rejection (403) of mutations and export/download for read-only roles in negocios, reportes and export routes/services.
- Global visibility for CONSULTOR via a read-only visibility criterion, not the write bypass lists, including full bypass of the report-category filter (CONSULTOR sees every report category; only the Excel export action stays blocked).
- Hierarchy `Level` assignment structurally rejected for CONSULTOR — validated at assignment time (user-edit action/service), not only neutralized defensively at each permission check.
- UI: create/edit/delete/export buttons rendered disabled, with an explanatory tooltip (e.g. "Solo lectura"), in the 4 allowed views.
- Calculadora access only; no logic change (pure in-memory simulation).

### Out of Scope
- Dedicated audit logging for blocked attempts (generic `logAuditEvent` suffices).
- Behavior changes to existing roles beyond separating read visibility from write bypass.
- Any module or screen not named in the HU.

## Capabilities

### New Capabilities
- `read-only-role`: definition, assignment, permission matrix and enforcement guarantees of the CONSULTOR read-only role.

### Modified Capabilities
- `security`: role-based authorization must reject mutations for read-only roles server-side.
- `navigation`: menu composition for CONSULTOR.
- `negocios`: export eligibility gains role precedence over level.
- `report-permissions`: report visibility bypass must distinguish read-only from write roles.

## Approach

1. **Single source of truth**: `isReadOnlyRole(role)` in `auth/lib/roles.ts`; no `role === CONSULTOR` checks scattered in features.
2. **Fixed decision — export precedence**: `canExportBusinessList` evaluates role first; if `isReadOnlyRole` is true it returns `false` regardless of `levelCode`. Level never re-enables export. Enforced in the shared function, not by assuming CONSULTOR has no level.
3. **Fixed decision — visibility vs. write bypass**: the three bypass sites become explicit: `isReadOnlyRole(role) || isWriteBypassRole(role)` for *visibility*, and `isWriteBypassRole(role)` alone for anything that authorizes writing. CONSULTOR is never added to the existing write-bypass arrays.
4. **Server-side first**: guards live in services/actions/API routes; disabled UI is presentation, never the enforcement boundary.
5. **Declarative UI**: a shared read-only hook/wrapper in `shared/` disables action buttons — each carrying a tooltip explaining why — instead of ad-hoc per-feature checks.
6. **Fixed decision — level assignment**: the user create/edit action and service reject assigning a hierarchy `Level` to a user whose role is read-only (validation error, not silent no-op). This is a structural guard in addition to, not instead of, the defensive `isReadOnlyRole` checks elsewhere.
7. **Fixed decision — report category scope**: CONSULTOR bypasses the `ReportPermission` category filter entirely (sees every report category, full company data), but the Excel export action for reports stays blocked by the same read-only export guard as Negocios.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma`, `prisma/seeds/roles.ts` | Modified | New role value + seed |
| `src/features/auth/lib/roles.ts` | Modified | `isReadOnlyRole`, `isWriteBypassRole` |
| `src/features/auth/lib/permissions.ts` | Modified | `ROLE_PERMISSIONS[CONSULTOR]` |
| `src/features/auth/lib/hierarchy.ts` | Modified | Visibility bypass split |
| `src/features/negocios/lib/can-export-business-list.ts` | Modified | Role precedence over level |
| `src/features/report-permissions/lib/report-permissions-helpers.ts` | Modified | Read-only visibility |
| `src/lib/navigation/menu-builder.ts` | Modified | Menu for CONSULTOR |
| `src/features/shared/` | New | Read-only UI hook/wrapper with tooltip |
| API routes (negocios, reportes, export) | Modified | 403 for read-only roles |
| User create/edit action + service (`admin/users`) | Modified | Reject `Level` assignment for read-only roles |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A mutating route is missed and stays reachable | Med | Enumerate mutating routes/services during design; enforce at a shared guard |
| Future code reads a bypass list as "may write" | Med | Rename/segregate into visibility vs. write helpers |
| Existing roles regress when bypass lists are split | Med | Preserve current membership exactly; tests per role |
| Export unlocked through `levelCode` | Med | Role check precedes level check in the shared function |

## Rollback Plan

Revert the code change; the `CONSULTOR` enum value and seed row remain harmless while no user holds the role. If users were already assigned, reassign them to their prior role before reverting.

## Dependencies

- Prisma migration for the new enum value must ship before or with the code.

## Success Criteria

- [ ] Admin can assign/revoke CONSULTOR; non-Admins cannot see or execute it.
- [ ] CONSULTOR sees only Dashboard, Negocios, Reportes, Calculadora, with company-wide data, including every report category.
- [ ] Every create/edit/delete action is disabled in UI (with an explanatory tooltip) and returns 403 via direct API call.
- [ ] Export/download is blocked for CONSULTOR in Negocios and Reportes, UI and API, with no dependency on assigned level.
- [ ] Assigning a hierarchy `Level` to a CONSULTOR user is rejected at the assignment action/service, not just neutralized downstream.
- [ ] Calculadora simulation works fully for CONSULTOR with no persistence.
