# Read-Only Role (CONSULTOR) Specification

## Purpose

Define the `CONSULTOR` role: a company-wide, read-only role that observes Dashboard, Negocios, Reportes, and Calculadora without any write, export, or hierarchy-level capability. Central helpers (`isReadOnlyRole`, `isWriteBypassRole`) are the single source of truth consumed by permissions, hierarchy visibility, export gating, navigation, and UI disabling.

## Requirements

### Requirement: CONSULTOR permission matrix and scope

The system MUST define `UserRole.CONSULTOR` with `ROLE_PERMISSIONS[CONSULTOR]` granting `dashboard = true`, `negocios.list = true`, `reportes.all/business/personal` effectively true via read-only bypass, and every write flag (`negocios.create/edit/cancel`, `cargas.*`, `liquidaciones.*`, `configuracion`, `administracion`) `false`. `isReadOnlyRole(role)` MUST return `true` only for `CONSULTOR` and MUST be the single lookup used across features — no scattered `role === 'CONSULTOR'` checks.

#### Scenario: CONSULTOR sees only the four allowed modules with company-wide data

- GIVEN an authenticated user with role `CONSULTOR`
- WHEN they access Dashboard, Negocios, Reportes, or Calculadora
- THEN each view SHALL render successfully with data scoped to the whole company (not a hierarchy subtree)
- AND no other module (Cargas, Liquidaciones, Configuración, Administración) SHALL be reachable

### Requirement: Hierarchy Level assignment rejected for read-only roles

The user create/edit action and its underlying service MUST reject, with a validation error, any attempt to assign a hierarchy `Level` (`levelId`) to a user whose role `isReadOnlyRole()` is `true`. This MUST be enforced structurally at the assignment boundary, in addition to (not instead of) defensive `isReadOnlyRole` checks in downstream permission logic.

#### Scenario: Assigning a Level to CONSULTOR is rejected

- GIVEN an Admin submits a user update with `roleId` resolving to `CONSULTOR` and a non-null `levelId`
- WHEN the update action/service validates the input
- THEN the request MUST fail with a validation error
- AND no `Level` MUST be persisted on that user

#### Scenario: Assigning a Level to a write-capable role still succeeds

- GIVEN an Admin submits a user update with `roleId` resolving to a non-read-only role and a valid `levelId`
- WHEN the update action/service validates the input
- THEN the `Level` assignment SHALL succeed as before

### Requirement: Mutating and export actions disabled with explanatory tooltip in UI

In the four allowed views, every create/edit/delete/export control MUST render in a disabled state for `CONSULTOR`, each carrying an explanatory tooltip (e.g. "Solo lectura") communicating why the action is unavailable.

#### Scenario: Disabled button shows read-only tooltip

- GIVEN a `CONSULTOR` user viewing Negocios or Reportes
- WHEN they hover or focus a create/edit/delete/export control
- THEN the control SHALL be disabled
- AND a tooltip explaining the read-only restriction SHALL be visible

### Requirement: Server-side rejection independent of UI state

Every mutating and export/download API route or service reachable from Negocios, Reportes, or export endpoints MUST reject requests from a user whose `isReadOnlyRole()` is `true`, returning HTTP 403, regardless of the calling client's UI state.

#### Scenario: Direct API call bypassing disabled UI is still rejected

- GIVEN a `CONSULTOR` user with a valid session
- WHEN they call a create, edit, delete, or export/download endpoint directly (bypassing the UI)
- THEN the API MUST return HTTP 403
- AND no state change MUST occur

#### Scenario: Calculadora remains fully usable (no persistence involved)

- GIVEN a `CONSULTOR` user on the Calculadora
- WHEN they run an in-memory simulation
- THEN the simulation MUST complete normally
- (No write or export guard applies — Calculadora persists nothing.)

### Requirement: CONSULTOR assignment restricted to Admin (regression)

Assigning or revoking the `CONSULTOR` role via `PUT /api/admin/users/[id]` MUST remain reachable only by `UserRole.ADMIN`, per the existing `requireRole([UserRole.ADMIN])` guard. This is a verification requirement: no new guard code is introduced by this change unless the existing guard is found not to cover this route.

#### Scenario: Non-Admin cannot see or execute CONSULTOR assignment

- GIVEN an authenticated user who is not `ADMIN`
- WHEN they attempt to open the user-role assignment UI or call `PUT /api/admin/users/[id]` with a `roleId` resolving to `CONSULTOR`
- THEN the UI entry point MUST NOT be reachable/visible
- AND the API call MUST return HTTP 403 via the existing Admin-only guard
