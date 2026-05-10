# Delta for Negocios

## ADDED Requirements

### Requirement: Hierarchical Subordinate Resolution

The system MUST resolve the set of subordinate user IDs for any authenticated user by traversing the `User.idUserLeader` chain via BFS at the application level. The traversal MUST be cycle-safe using a visited `Set<number>`. An empty result (no subordinates) MUST be handled as returning only the root user's own ID.

#### Scenario: Linear chain resolves all descendants

- GIVEN users A → B → C (B is leader of C, A is leader of B)
- WHEN `getSubordinateUserIds(A.idUser)` is called
- THEN the result MUST contain B.idUser and C.idUser (not A.idUser)

#### Scenario: Multi-branch tree resolves all branches

- GIVEN leader A with two direct reports B and C, and B with report D
- WHEN `getSubordinateUserIds(A.idUser)` is called
- THEN the result MUST contain B.idUser, C.idUser, and D.idUser

#### Scenario: Cycle-safe traversal

- GIVEN a malformed chain where A.idUserLeader = B and B.idUserLeader = A
- WHEN `getSubordinateUserIds(A.idUser)` is called
- THEN the traversal MUST terminate without infinite loop
- AND MUST NOT contain duplicate IDs

#### Scenario: User with no subordinates

- GIVEN a user with no other users pointing to them via idUserLeader
- WHEN `getSubordinateUserIds(that user's idUser)` is called
- THEN the result MUST be an empty array

---

### Requirement: Hierarchical visibility for leader roles on business list

The system MUST scope `GET /api/negocios` results to the set `[self.idUser, ...subordinates]` for authenticated users with roles LEVEL_1 through LEVEL_5. AGENTE (LEVEL_0) MUST remain scoped to only their own `idUser`. ADMIN and SUPER_ADMIN MUST NOT have any `idUser` scope restriction applied.

#### Scenario: LEVEL_1+ leader sees own and subordinates' businesses

- GIVEN an authenticated user with role LEVEL_2 who has three subordinates
- WHEN `GET /api/negocios` is called
- THEN the response MUST include businesses owned by the leader and all three subordinates
- AND MUST NOT include businesses owned by users outside that subtree

#### Scenario: AGENTE sees only own businesses (unchanged)

- GIVEN an authenticated user with role AGENTE
- WHEN `GET /api/negocios` is called
- THEN the response MUST include only businesses where `idUser = self.idUser`

#### Scenario: ADMIN sees all businesses (unchanged)

- GIVEN an authenticated user with role ADMIN
- WHEN `GET /api/negocios` is called
- THEN no `idUser` scope restriction MUST be applied

#### Scenario: Leader with empty subordinate tree sees only own businesses

- GIVEN a LEVEL_3 user with no users reporting to them
- WHEN `GET /api/negocios` is called
- THEN the response MUST include only that user's own businesses

---

### Requirement: Hierarchical visibility parity on stats endpoint

The `GET /api/negocios/stats` endpoint MUST apply the same hierarchical visibility scope as `GET /api/negocios` for every role. KPI totals MUST reflect the same business set as the list.

#### Scenario: Leader stats match list scope

- GIVEN a LEVEL_2 leader with subordinates
- WHEN `GET /api/negocios/stats` is called
- THEN KPI counts MUST include businesses from the leader and all subordinates
- AND MUST match the business count returned by the unpaginated list with identical filters

#### Scenario: AGENTE stats scoped to own businesses

- GIVEN an authenticated AGENTE
- WHEN `GET /api/negocios/stats` is called
- THEN all KPI aggregations MUST include only that agent's own businesses

---

## MODIFIED Requirements

### Requirement: Parámetros de lista y exportación de negocios (createdAt vs dateAnchored)

La API de listado `GET /api/negocios` SHALL aceptar `createdFrom` y `createdTo` (opcionales, YYYY-MM-DD) para filtrar por `createdAt` del negocio. SHALL aceptar `dateFrom` y `dateTo` para filtrar por `dateAnchored` (fondeo). La semántica de fechas inclusive en calendario Bogotá MUST ser coherente entre lista, estadísticas y exportación. La ruta de exportación que aplique rangos de fechas SHALL construir los límites UTC usando la misma regla inclusiva Bogotá que evita el desfase de «día anterior» al interpretar solo cadenas ISO de fecha.

El where builder `buildBusinessListWhere` SHALL aceptar un parámetro opcional `visibleUserIds: number[]` y, cuando esté presente y el usuario no sea admin, filtrar por `idUser IN visibleUserIds` en lugar de un único `idUser`.

(Previously: `buildBusinessListWhere` sólo filtraba por un único `idUser` para el rol AGENTE; no aceptaba un conjunto de IDs visibles.)

#### Scenario: Coach envía createdFrom y createdTo

- GIVEN un Coach con rango de fechas en UI
- WHEN se solicita el listado de negocios
- THEN la petición SHALL incluir `createdFrom` y `createdTo` acordes al rango
- AND el backend SHALL filtrar por `createdAt` dentro de ese rango

#### Scenario: Administrador envía dateFrom y dateTo para fondeo

- GIVEN un Administrador con ambas fechas de rango configuradas
- WHEN se solicita el listado
- THEN la petición SHALL usar `dateFrom`/`dateTo` para el filtro por `dateAnchored`

#### Scenario: visibleUserIds aplicado a roles no-admin

- GIVEN un llamador con `visibleUserIds = [10, 20, 30]` y un usuario con rol no-admin
- WHEN `buildBusinessListWhere` construye el WHERE
- THEN el predicado MUST ser `idUser IN (10, 20, 30)` en lugar de un único valor
