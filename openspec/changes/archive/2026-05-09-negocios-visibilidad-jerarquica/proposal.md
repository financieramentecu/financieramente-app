# Proposal: negocios-visibilidad-jerarquica

## Intent
Allow each leader to see, in `GET /api/negocios`, the businesses owned by every user that hangs from them in the leadership chain (recursive descendants), in addition to their own businesses.

## Problem
Today, agents (role `AGENTE`) only see businesses where `business.idUser = currentUser.idUser` (see `src/features/negocios/lib/build-business-list-where.ts`, line 28-30). The visibility filter is flat and ignores the leader/subordinate hierarchy expressed by `User.idUserLeader` (`prisma/schema.prisma:223`). As a result, a LEVEL_4 leader cannot see the businesses produced by their LEVEL_3 / LEVEL_2 / LEVEL_1 / LEVEL_0 sub-team, which blocks supervision, follow-up, and commission verification along the chain.

## Proposed Approach
Implement an application-level traversal (Approach B — BFS) over the `User` table to compute the set of subordinate `idUser` values for the authenticated user, then expand the existing `WHERE` builder to filter `business.idUser IN [self, ...subordinates]` for non-admin roles.

Concrete shape:
1. New service `getSubordinateUserIds(rootIdUser: number): Promise<number[]>` in `src/features/negocios/services/user-hierarchy.service.ts`.
   - Loads the minimal projection `{ idUser, idUserLeader }` for every active user in a single query (`prisma.user.findMany({ select: { idUser: true, idUserLeader: true }, where: { status: true } })`).
   - Builds an in-memory adjacency map `leaderId -> idUser[]` and runs BFS from `rootIdUser`, returning all descendants (excluding the root). Cycle-safe via a visited Set.
2. Extend `buildBusinessListWhere` to accept an optional `visibleUserIds: number[]` and, when present and the user is not an admin, push `{ idUser: { in: visibleUserIds } }` instead of the current single-id filter.
3. In `src/app/api/negocios/route.ts`, after resolving `currentUser`, call `getSubordinateUserIds(currentUser.idUser)` and pass `[currentUser.idUser, ...subordinates]` to the where builder.
4. Apply the same change to `src/app/api/negocios/stats` (and any export path that reuses `buildBusinessListWhere`) so totals and KPIs stay consistent with the list.
5. Admin / GENERAL_LEVEL roles keep their current full-visibility behavior — no `idUser` filter is added for them.

Why BFS in app code (not a SQL recursive CTE):
- User population is small (hundreds to low thousands). The whole `{idUser, idUserLeader}` projection fits comfortably in memory.
- Keeps Prisma idiomatic — no `$queryRaw` recursive CTE to maintain.
- Easy to unit-test in isolation with deterministic fixtures.

## Capabilities

### New Capabilities
- Recursive subordinate resolution for the authenticated user (`getSubordinateUserIds`).
- Hierarchical visibility on `GET /api/negocios` for all leader levels (LEVEL_1..LEVEL_5).
- Hierarchical visibility on `GET /api/negocios/stats` so KPIs match the list.

### Modified Capabilities
- `buildBusinessListWhere` now scopes by a set of visible `idUser` values instead of a single id when the caller is not admin.
- `GET /api/negocios` request handler now resolves the visibility set before building the where clause.

## Affected Areas
- `src/app/api/negocios/route.ts` — wires the hierarchy resolver into the GET handler.
- `src/app/api/negocios/stats/route.ts` — same wiring so stats match the list (verify path exists; if not, scope to the list endpoint only).
- `src/features/negocios/lib/build-business-list-where.ts` — accept `visibleUserIds` and replace the single-id push.
- `src/features/negocios/services/user-hierarchy.service.ts` — NEW service with BFS resolver.
- `src/features/negocios/services/user.service.ts` — unchanged, but consumer of the new service lives next to it.
- `src/features/negocios/__tests__/` — new unit tests for `getSubordinateUserIds` (linear chain, multi-branch tree, cycle safety, root with no subordinates) and updated tests for `buildBusinessListWhere`.
- `prisma/schema.prisma` — no schema changes; relies on existing `User.idUserLeader` (line 223) and its index (line 250).

## Risks
- **Performance on growth**: loading every active user per request is fine today but will degrade if the user table grows past ~10k. Mitigation: add a short request-scoped memo or, later, a Redis cache keyed by `idUser`.
- **Stale hierarchy under concurrent leader reassignment**: a user moved between leaders mid-request could appear in two BFS expansions across parallel requests. Acceptable — eventually consistent on the next request.
- **Cycle in `idUserLeader`**: a malformed chain (A → B → A) would loop forever without a visited Set. Mitigation: BFS uses a `Set<number>` of visited ids and skips duplicates.
- **Role coverage drift**: only `AGENTE` is filtered today. We must confirm that GENERAL_LEVEL / admin roles keep full visibility and that intermediate leader roles get the hierarchical scope, not the flat one.
- **Stats divergence**: if `/api/negocios/stats` is not updated in lockstep, dashboards will show numbers that don't match the list.

## Out of Scope
- Changing the database schema or adding new indexes.
- SQL recursive CTE / `$queryRaw` implementation.
- Caching layer (Redis, in-memory TTL) — deferred until measured pressure exists.
- Visibility changes for endpoints other than `/api/negocios` (and `/api/negocios/stats` only for consistency). Pre-liquidation, file-import, and admin endpoints are untouched.
- UI changes in the negocios list page (the API contract stays the same; only the result set widens).
- Permissions/role redesign — we keep the current `UserRole.AGENTE` check semantics and only generalize the id filter.
