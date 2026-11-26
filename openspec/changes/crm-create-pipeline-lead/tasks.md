# Tasks: Create a pipeline lead

## 1. Foundation and contracts

- [x] 1.1 Add focused failing schema and authorization tests for valid contact data, empty/invalid input, self-assignment, authorized delegation and denied cross-branch/read-granted assignment.
- [x] 1.2 Define the minimal manual-create Zod schema and result shape, respecting existing database field limits and shared API conventions.

## 2. Implementation

- [x] 2.1 Add lead creation service using native `Lead` fields, active `NUEVO_LEAD`, active owner, distinct creation for repeated contacts, atomic `Propio` origin linkage and automatic relations to every active contact match; record the real creator.
- [x] 2.2 Add session-authenticated `POST /api/leads` with existing CRM management guard and server-enforced owner selection; update the API reference.
- [x] 2.3 Add **Nuevo lead** dialog and mutation hook using shared components and async state. Show advisor choice only for administrators/leaders, preserve input on failure, disable pending submissions, and refresh the board after success.

## 3. Verification

- [x] 3.1 Cover service failures: inactive/missing assignee, inactive origin, missing initial stage, all active contact matches, literal email matching, no-match creation and linkage rollback without changes to existing leads.
- [x] 3.2 Cover route responses and UI behavior for success, denied assignment, read-only users, validation and request failures.
- [x] 3.3 Run focused tests, type checking, touched-file lint and architecture review; record verification results and any runtime limitations. See `verify-report.md`.
- [x] 3.4 Keep all commits on `feature/crm-create-pipeline-lead`; do not commit, merge or push to `develop`.

- [x] 3.5 Show automatic relations from both timeline endpoints, preserve each advisor, and use a neutral automatic relation label.

## 4. Scoped opportunity groups and associated filter

- [x] 4.1 Add focused graph tests for singletons, pairs, chains, triangles, reversed/duplicate/self links, empty scope, inactive links/endpoints and invisible/excluded intermediaries; distinguish hierarchy/owner scope from date/origin/outcome filtering.
- [x] 4.2 Build connected components from active hierarchy-visible leads after selected owners and expanded branch exclusions, then intersect with ordinary pipeline filters. Count represented roots and associated filtered lead records without exposing hidden graph endpoints; preserve existing response callers and task/case metrics.
- [x] 4.3 Add **Oportunidades asociadas** as an accessible pressed-state toggle. Display contextual grouped counts in **Oportunidades activas**, filter board cards to associated records and keep base counts stable while toggling.
- [x] 4.4 Test date/origin/outcome changes, hierarchy exclusions, refresh, successful creation, empty context and toggle behavior. A visible out-of-date intermediary still groups members; an invisible or branch-excluded intermediary does not.
- [x] 4.5 Run focused tests, TypeScript, touched-file lint and architecture review; append current validation and limits to `verify-report.md`. No schema changes, new dependencies or commits to `develop`.
