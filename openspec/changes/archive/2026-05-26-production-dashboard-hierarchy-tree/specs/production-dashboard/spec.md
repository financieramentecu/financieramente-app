# Production Dashboard Specification

## Purpose

Hierarchy filter tree for the Production Dashboard left column. Scopes downstream business/KPI filters via a checkbox tree of active org users. Viewer-role determines tree depth; selection output is `selectedUserIds[]`.

---

## Requirements

### Requirement: Hierarchy Tree API

The system SHALL expose `GET /api/production-dashboard/hierarchy-tree` returning `ApiResponse<{ nodes: HierarchyNode[] }>`. The server MUST resolve viewer identity from the session email; client-supplied identity MUST NOT be trusted. Only users where `User.active === true` SHALL appear. Tree depth MUST be computed by walking `Level.idNextLevel`; depth constants MUST NOT be hardcoded.

`HierarchyNode = { userId: number, fullName: string, levelCode: string, levelName: string, levelColor: string, included: boolean, children: HierarchyNode[] }`

#### Scenario: Authenticated request returns nested tree

- GIVEN a viewer with a valid session
- WHEN `GET /api/production-dashboard/hierarchy-tree` is called
- THEN response SHALL have `success: true` and `data.nodes` as a nested `HierarchyNode[]`

#### Scenario: Inactive users excluded from tree

- GIVEN some users have `User.active === false`
- WHEN the tree is built
- THEN those users SHALL NOT appear in any node

#### Scenario: Unauthenticated request rejected

- GIVEN no valid session exists
- WHEN the endpoint is called
- THEN the response SHALL return HTTP 401

---

### Requirement: Role-Based Tree Scope

Viewers with role `GENERAL_LEVEL` (MIA) OR any role in `HIERARCHY_BYPASS_ROLES` SHALL receive the full org tree from the highest active `Level` downward. All other viewers SHALL receive only their own down-branch (active subordinates reachable via `idUserLeader`). MS Senior viewers SHALL receive only their direct MS Junior subordinates.

#### Scenario: MIA viewer gets full org tree

- GIVEN the viewer's role is GENERAL_LEVEL
- WHEN the hierarchy tree is fetched
- THEN `data.nodes` SHALL contain the complete active org tree from the root level

#### Scenario: Backoffice bypass role gets full tree

- GIVEN the viewer's role is in `HIERARCHY_BYPASS_ROLES`
- WHEN the hierarchy tree is fetched
- THEN `data.nodes` SHALL be scoped the same as the MIA full tree

#### Scenario: Team Leader gets own subtree only

- GIVEN the viewer is a Team Leader (not MIA, not bypass)
- WHEN the hierarchy tree is fetched
- THEN `data.nodes` SHALL contain only the viewer and active users reachable via `idUserLeader` downward
- AND peers or superiors SHALL NOT appear

#### Scenario: MS Senior gets only own MS Junior subordinates

- GIVEN the viewer is an MS Senior
- WHEN the hierarchy tree is fetched
- THEN `data.nodes` SHALL include only the viewer's direct MS Junior subordinates

#### Scenario: Dynamic depth expands for new levels

- GIVEN a new `Level` is inserted and linked via `idNextLevel`
- WHEN the tree is fetched for a qualifying viewer
- THEN the new level's users SHALL appear in the tree without any code change

---

### Requirement: MS Junior Visibility

The API MUST return `{ nodes: [] }` with HTTP 200 for an MS Junior viewer. The UI MUST NOT render the hierarchy filter panel when `nodes` is empty.

#### Scenario: MS Junior receives empty tree

- GIVEN the viewer's role is MS Junior
- WHEN `GET /api/production-dashboard/hierarchy-tree` is called
- THEN response SHALL have `success: true` and `data.nodes === []`

#### Scenario: Empty tree hides the panel

- GIVEN `data.nodes` is an empty array
- WHEN the Production Dashboard renders
- THEN the hierarchy filter panel SHALL NOT be visible

---

### Requirement: Selection Contract

All nodes SHALL default to `included: true` (full scope active on load). The UI MUST render a checkbox per node. Unchecking a node MUST set `included: false` and remove its `userId` from `selectedUserIds[]`. Unchecking a parent MUST cascade to all descendants. `selectedUserIds: number[]` is the output contract for downstream filter calls.

#### Scenario: Default — all nodes included

- GIVEN the tree loads with no prior interaction
- WHEN the UI renders
- THEN every checkbox SHALL be checked and `selectedUserIds` SHALL equal all visible `userId` values

#### Scenario: Uncheck a leaf node

- GIVEN a user unchecks a leaf node
- WHEN selection state updates
- THEN that `userId` SHALL be removed from `selectedUserIds[]`

#### Scenario: Uncheck parent cascades to children

- GIVEN a user unchecks a parent node
- WHEN selection state updates
- THEN all descendant nodes SHALL also be set to `included: false`
- AND all their `userId` values SHALL be removed from `selectedUserIds[]`
