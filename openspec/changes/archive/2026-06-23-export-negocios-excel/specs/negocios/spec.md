# Delta for Negocios — Export Excel Authorization & Scope

## ADDED Requirements

### Requirement: Excel Export Authorized by Hierarchy Level 2-6

The system MUST enable the "Exportar Excel" action on the Lista de Negocios for any authenticated user whose hierarchy position is Nivel 2 (Team Leader) through Nivel 6 (MIA), in addition to any existing admin-like roles. Authorization MUST behave identically across the full Nivel 2-6 range — no sub-range may be excluded or treated differently.

The client (`canExportExcel`) and the server (`POST /api/negocios/export`) MUST evaluate authorization for export using the exact same single source of truth. A user for whom the client enables the button MUST be authorized by the server for that same request, and vice versa — there MUST be no user for whom client and server disagree.

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

### Requirement: Export Rows Scoped to Hierarchy Subtree (Bug Fix)

The export endpoint (`POST /api/negocios/export`) MUST restrict exported rows to the businesses visible within the requesting user's hierarchy subtree, computed the same way as the list endpoint (`GET /api/negocios`) via `visibleUserIds`. A non-admin user MUST NOT receive rows belonging to businesses outside their subordinate tree, regardless of filters applied.

(Previously: the export endpoint computed authorization but never passed `visibleUserIds` to `buildBusinessListWhere`, so any non-admin exporter — once authorized — would receive rows from outside their hierarchy scope. This was masked only because today's export gate is admin-only, and admins legitimately skip the scope branch.)

#### Scenario: Non-admin export contains only subtree businesses

- GIVEN a Nivel 2-6 user whose hierarchy subtree contains a known set of businesses S
- WHEN the user exports without filters
- THEN every row in the exported file SHALL belong to S
- AND no row SHALL reference a business outside S

#### Scenario: Export scope matches list scope exactly

- GIVEN a Nivel 2-6 user with no filters applied
- WHEN comparing the set of businesses returned by `GET /api/negocios` against the set exported by `POST /api/negocios/export`
- THEN both sets SHALL be identical

### Requirement: Export Respects Applied Advanced Filters

The export endpoint MUST apply the same advanced filters the user has active in Lista de Negocios, combined with the hierarchy subtree scope. The exported file's columns MUST match the columns visible in the table.

#### Scenario: Filtered export contains only matching, in-scope rows

- GIVEN a Nivel 2-6 user with advanced filters applied (e.g. status, date range)
- WHEN the user triggers "Exportar Excel"
- THEN the exported file SHALL contain only businesses that satisfy the active filters
- AND every row SHALL also belong to the user's hierarchy subtree
- AND the file's columns SHALL match the columns visible in the table

#### Scenario: Unfiltered export contains full visible scope

- GIVEN a Nivel 2-6 user with no advanced filters applied
- WHEN the user triggers "Exportar Excel"
- THEN the exported file SHALL contain the total set of businesses visible to the user under their hierarchy scope
- AND no additional filtering SHALL be applied beyond hierarchy scope

### Requirement: Empty Filtered Export Shows No-Records Message (Regression)

The system MUST continue to show a "No hay registros para exportar" message when the active filters (combined with hierarchy scope) yield zero matching businesses. This existing behavior MUST NOT be broken by the authorization gate change or the scope fix.

#### Scenario: Filters with zero matches show empty-state message

- GIVEN a Nivel 2-6 user with advanced filters applied that match zero businesses within their hierarchy scope
- WHEN the user triggers "Exportar Excel"
- THEN the system SHALL show "No hay registros para exportar"
- AND no file SHALL be generated or downloaded
