# Proposal: Comments indicator in the Business List Actions column

**Change**: `comments-indicator-in-actions`
**Branch**: `feat/comments-indicator-in-business-list`
**Status**: spec validated by the user; design drafted and all design questions (OQ1-OQ4) answered (see "Decisions"); awaiting the user's go-ahead for tasks
**Supersedes**: the earlier proposal, which targeted a dead component and a non-existent endpoint (see `explore.md`, "Post-exploration corrections").

## Problem

Users of the Business List (Lista de Negocios) cannot tell which businesses have comments, nor read them, without opening the business detail page and its comments sidebar. When scanning many businesses this is slow, and a user who only wants to confirm "does this contract have notes?" has no signal in the table.

## Solution

In the Actions column of each row, render a message-style icon with the exact number of comments, and open a read-only history modal on click.

Acceptance criteria (from the user story, source of truth):
1. Business with more than 0 comments: icon shown with the exact count (1, 12, 145).
2. Business with 0 comments: no icon and no counter.
3. Clicking the icon opens a modal with the full comment history of that business.

### Approach (verified against the codebase)

- Target component: `src/features/negocios/components/BusinessRowActions.tsx` (used by `BusinessTableSection.tsx`). `BusinessTable/ActionCell.tsx` is dead code and MUST NOT be modified.
- Count: the list endpoint `GET /api/negocios` already loads businesses with `businessWithRelations`, which already has a `_count` selection (payments, active supports). Add `comments: { where: { status: true } }` to it, map it to `commentCount` on `BusinessEntity`, then propagate to the table-row model and to `BusinessRowActions`. No new endpoint, no per-row fetch, no migration, no Prisma schema change.
- Modal: a new read-only modal that reuses `useComments(businessId)` and `CommentThread` (loading / error / empty / success), mounted only while open so no SSE connection is created per row. The existing `CommentModal` ("Agregar comentario", create dialog) is not repurposed.
- Roles: visible for every role that can see the Business List, including read-only roles (CONSULTOR); viewing is not a mutation.

## Scope

In:
- `commentCount` derived in the list query (active comments only) and carried to the Actions column.
- Indicator (icon + exact count, tooltip, accessible name) in `BusinessRowActions`, hidden at zero.
- Read-only history modal (oldest first, author name and role, title, detail, date and time in Bogotá), with loading / error / empty / success states, and live append of new comments through the existing SSE event while open.
- Business List refetch after the user creates a comment through "Agregar comentario", so the row count refreshes.
- `CommentItem` renders date and time in `America/Bogota` through a shared Bogotá date-time formatter (also affects `CommentsSidebar`).
- Mobile-friendly layout; unit and component tests (Vitest + Testing Library, strict TDD).

Out:
- Creating, editing, or deleting comments from the modal (creation stays in "Agregar comentario").
- Filters, search, or export of comments.
- Live updates of the list counter across users (the count refreshes on list refetch).
- Prisma schema changes or migrations; new API endpoints; changes to `ActionCell.tsx`.
- Hardening `GET /api/negocios/[id]/comments` with hierarchical visibility (pre-existing observation, noted only).

## Capabilities

- Modified: `negocios` (Business List Actions column and `commentCount` on the list entity) -> `specs/negocios/spec.md`
- Modified: `contract-comments` (read-only history modal) -> `specs/contract-comments/spec.md`

## Affected areas

Modify: `business-prisma.types.ts`, `business-entity.types.ts`, `business-entity.mapper.ts`, `business.types.ts`, `map-business-to-table-row.ts`, `BusinessTableSection.tsx` (including the list refetch after comment creation), `BusinessRowActions.tsx` (all under `src/features/negocios/`); `src/features/comments/components/CommentItem.tsx` (definite: Bogotá date and time).
Create: one read-only modal component reusing `useComments` and `CommentThread`; a shared Bogotá date-time formatter (name and location decided in design).
Tests: extend mapper, table-row mapper, `BusinessRowActions`, `BusinessTableSection`; new modal test; update `CommentItem` tests and add a formatter test; non-regression for `CommentsSidebar`; add `comments` to the `_count` of the Prisma business test fixtures.

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | N+1 requests for counts | Low | Low | Eliminated by design: the count is part of the existing list query; no per-row request. |
| 2 | List count is not live across users (another user adds a comment, the badge is stale until the list refetches) | Medium | Low | Accepted by the user (no real time for the list); the modal itself is live through SSE; the list refetches after the user's own comment (decision (a), R10). Temporary badge/modal mismatch accepted (decision (e)). |
| 3 | Filtered `_count` adds a correlated count for each row of the page | Low | Low | Page size is at most 100 and `Comment` is indexed by `[businessId, createdAt]`; acceptable. Also applies to other routes that reuse `businessWithRelations` (cancel, fondear, mark-novedad). |
| 4 | Date/time shown in browser-local time: `formatDateBogota()` formats the date only and `CommentItem` formats without a timezone | Medium | Medium | Decided (d): fix `CommentItem` through a shared Bogotá date-time formatter and update its tests. Side effect: `CommentsSidebar` also switches to Bogotá time (covered by an R11 scenario; the create dialog has no thread). |
| 5 | Test fixtures that build a full Prisma business break when `_count.comments` is required | High | Low | Update `mock-prisma-business.ts` and the tests that build `_count`. |
| 6 | Modal overflow on mobile | Low | Low | Internal scroll and viewport-bounded dialog, covered by a scenario. |

## Decisions (validated by the user)

Full text in `specs/negocios/spec.md`, section "Decisions".

- (a) YES: the Business List refetches after a comment is created through "Agregar comentario" (R10). Counts changed by other users are not live in the list.
- (b) YES: exact count, no cap (no "99+") (R2).
- (c) YES, AMENDED (OQ1): modal title "Comentarios — {contract}", and just "Comentarios" when there is no contract (R4). "Agregar comentario" stays as today.
- (d) YES: `CommentItem` renders date and time in `America/Bogota` via a shared Bogotá date-time formatter; also affects `CommentsSidebar` (R11).
- (e) ACCEPTED: temporary list-count/modal mismatch. Verified: no code path currently deactivates or deletes comments, so the realistic cause is a newer comment from another user; the `status: true` filter is still required.
- Delivery (OQ3): one PR with the `size:exception` label and three work-unit commits (forecast about 738 changed lines against the 400 budget). The PR description must call out the `CommentsSidebar` time-format change.
- OQ2: the R11 create-dialog scenario is dropped. OQ4: the R7 role list names AGENTE (no COACH role exists).

## Estimate (realistic, to be confirmed in tasks)

| Activity | Hours |
|----------|-------|
| Spec validation and design | 2-3 |
| Count plumbing (query, entity, mapper, table row, fixtures) with tests | 2-3 |
| Indicator in `BusinessRowActions` with tests | 2 |
| Read-only modal with tests (states, SSE, lifecycle) | 3-4 |
| Timezone fix in `CommentItem` with shared formatter, plus test updates (definite) | 1-2 |
| List refetch after comment creation (R10) with tests | 0.5-1 |
| Review and QA | 1-2 |
| **Total** | **11.5-17** |

Expected size is around 300-450 changed lines including tests (the now-definite `CommentItem` timezone fix and the R10 list refetch push it toward the upper end); the single-PR delivery strategy has a 400 changed-lines review budget, so the tasks phase must forecast it and propose a split or a `size:exception` if it is exceeded.

## Rollback

Revert the PR. No schema, migration, or data change is involved.

## Next

Spec and design are drafted and every question is answered. Next: tasks (after the user's go-ahead), forecasting the 400-line budget and the single PR with `size:exception` and three work-unit commits.
