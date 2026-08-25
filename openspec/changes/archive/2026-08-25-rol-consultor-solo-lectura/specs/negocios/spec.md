# Delta for Negocios

## MODIFIED Requirements

### Requirement: Excel Export Authorized by Hierarchy Level 2-6

The system MUST enable the "Exportar Excel" action on the Lista de Negocios for any authenticated user whose hierarchy position is Nivel 2 (Team Leader) through Nivel 6 (MIA), in addition to any existing admin-like roles. Authorization MUST behave identically across the full Nivel 2-6 range — no sub-range may be excluded or treated differently.

`canExportBusinessList` MUST evaluate role before level: if `isReadOnlyRole(roleCode)` is `true`, the function MUST return `false` regardless of `levelCode`, and no assigned hierarchy level MAY re-enable export for a read-only role.

The client (`canExportExcel`) and the server (`POST /api/negocios/export`) MUST evaluate authorization for export using the exact same single source of truth. A user for whom the client enables the button MUST be authorized by the server for that same request, and vice versa — there MUST be no user for whom client and server disagree.

(Previously: role and level were both admitting conditions for export with no explicit role-precedence rule; read-only roles were not part of the domain.)

#### Scenario: Nivel 2 (Team Leader) sees export enabled

- GIVEN an authenticated user at Nivel 2 (Team Leader)
- WHEN the user opens Lista de Negocios
- THEN the "Exportar Excel" button SHALL be enabled
- AND a POST to `/api/negocios/export` from this user SHALL be authorized

#### Scenario: Nivel 6 (MIA) sees export enabled

- GIVEN an authenticated user at Nivel 6 (MIA)
- WHEN the user opens Lista de Negocios
- THEN the "Exportar Excel" button SHALL be enabled
- AND a POST to `/api/negocios/export` from this user SHALL be authorized

#### Scenario: User outside Nivel 2-6 and without admin-like role is denied

- GIVEN an authenticated user whose hierarchy level falls outside Nivel 2-6 and who holds no admin-like role
- WHEN the user opens Lista de Negocios
- THEN the "Exportar Excel" button SHALL be disabled or absent
- AND a POST to `/api/negocios/export` from this user SHALL be rejected with an authorization error

#### Scenario: Client and server authorization never diverge

- GIVEN any authenticated user
- WHEN evaluating whether export is allowed
- THEN the client-side gate and the server-side gate SHALL produce the same allow/deny result for that user

#### Scenario: CONSULTOR with an assigned level still cannot export (new)

- GIVEN a `CONSULTOR` user who, hypothetically, has a `levelCode` within Nivel 2-6
- WHEN `canExportBusinessList` evaluates the export gate
- THEN the result MUST be `false`
- AND the "Exportar Excel" button SHALL be disabled/absent
- AND `POST /api/negocios/export` SHALL return an authorization error for this user

#### Scenario: CONSULTOR without any level cannot export (new)

- GIVEN a `CONSULTOR` user with no assigned `levelCode`
- WHEN `canExportBusinessList` evaluates the export gate
- THEN the result MUST be `false`
