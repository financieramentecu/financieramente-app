# Delta for negocios (Business List — comments indicator)

> Change: `comments-indicator-in-actions`
> Status: spec VALIDATED by the user, then amended with the answers to design questions OQ1-OQ4 (recorded in "Decisions" below). All open questions are answered.
> Companion delta: `specs/contract-comments/spec.md` (read-only history modal, lifecycle, real-time, shared date-time rendering).
> This file owns: R1 (count derivation), R2 (indicator visible), R3 (indicator hidden), R7 (roles), R8 (non-regression), R10 (list refresh after creating a comment), the decisions record, traceability and affected files.
> Requirement ids: R1-R3, R7, R8, R10 live here; R4-R6 and R11 live in `specs/contract-comments/spec.md` (R9 was the open-questions section and no longer exists).

## Context (verified against the codebase)

- The Actions column is rendered by `BusinessRowActions` (`src/features/negocios/components/BusinessRowActions.tsx`), mounted from `BusinessTableSection.tsx`. It already renders ghost icon buttons with tooltips ("Subir comprobante", "Ver comprobantes"), a "Más acciones" dropdown (including "Agregar comentario", hidden for read-only roles), and mounts its modals conditionally.
- `BusinessTable/ActionCell.tsx` is dead code (referenced only by its own test). It is NOT part of this change and MUST NOT be modified.
- `GET /api/negocios` already loads each page of businesses with `businessWithRelations`, which already carries `_count` (payments, active supports). The mapper `prismaBusinessToEntity` derives `hasPayments` and `supportCount` from it. The list-scoping rule (`buildBusinessListWhere`) already restricts which businesses a user sees.
- A `Comment` has `status Boolean @default(true)` (soft delete). Only `status = true` comments are "active".
- There are two client-side shapes: `BusinessEntity` (mapped from Prisma) and the table-row `Business` (built by `mapBusinessToTableRow`). The count travels Prisma -> `BusinessEntity` -> table row -> `BusinessRowActions`.

## ADDED Requirements

### Requirement: R1 — Comment count is derived from the list query

The `commentCount` of each business in the Business List MUST be the exact number of that business's comments whose `status` is `true`, obtained as part of the existing list query (the same Prisma `_count` selection that already provides `payments` and `supports`). The system MUST expose it as a non-negative integer `commentCount` on `BusinessEntity`, and it MUST be propagated to the table-row model consumed by the Actions column.

The system MUST NOT issue any additional HTTP request, per row or per page, to obtain the count. The system MUST NOT introduce a new endpoint, a Prisma schema change, or a migration for this purpose. Soft-deleted comments (`status = false`) MUST NOT be counted. The set of businesses (and therefore counts) visible to a user MUST remain exactly the set already allowed by the existing list-scoping rules.

#### Scenario: Mapper exposes the active comment count

- GIVEN a Prisma business object whose `_count.comments` is `12`
- WHEN it is converted with `prismaBusinessToEntity`
- THEN the resulting `BusinessEntity.commentCount` is exactly `12`

#### Scenario: Business without comments maps to zero

- GIVEN a Prisma business object whose `_count.comments` is `0`
- WHEN it is converted with `prismaBusinessToEntity`
- THEN `BusinessEntity.commentCount` is `0` (a number, never `undefined` or `null`)

#### Scenario: Only active comments are counted

- GIVEN a business with 5 comments of which 2 have `status = false`
- WHEN the list query selects the comment count
- THEN the count selection filters on `status: true`
- AND the resulting `commentCount` is `3`

#### Scenario: The count is part of the list query, with no extra requests

- GIVEN the Business List page requests `GET /api/negocios` and receives a page of N businesses
- WHEN the Actions column renders for all N rows
- THEN no request is made to any comments endpoint (for example `/api/negocios/{id}/comments`) as a consequence of rendering
- AND the number of API requests made by the list page is identical to the number made before this change

#### Scenario: Count reaches the Actions column

- GIVEN a `BusinessEntity` with `commentCount = 145`
- WHEN it is converted with `mapBusinessToTableRow` and rendered through `BusinessTableSection`
- THEN `BusinessRowActions` receives `commentCount = 145`

#### Scenario: Count respects existing list visibility

- GIVEN a user whose role/hierarchy does not allow them to see business B
- WHEN the user loads the Business List
- THEN business B (and therefore its comment count) is not returned to that user

### Requirement: R2 — Comments indicator is shown when the business has comments

When a business has `commentCount > 0`, the Actions column of its row MUST render a message-style icon together with the exact comment count as visible text (for example "1", "12", "145"). The count MUST NOT be abbreviated, capped, or rounded at any magnitude (no "99+", no "1k"; decision (b) is final), and a three-digit count MUST render without clipping, wrapping, or overlapping adjacent actions.

The indicator MUST be rendered by `BusinessRowActions`, as an interactive control consistent with the existing icon actions (ghost icon button with a tooltip) and placed within the same inline actions group, before the "Más acciones" trigger. It MUST be an accessible control: its accessible name MUST include the exact count (for example `aria-label="Ver comentarios (12)"`), and its tooltip text MUST be "Ver comentarios". The indicator MUST be rendered regardless of the business status (it is not gated by status like "Subir comprobante").

#### Scenario: Single comment

- GIVEN a business row with `commentCount = 1`
- WHEN the Actions column renders
- THEN a button with accessible name "Ver comentarios (1)" is present
- AND the text "1" is visible next to a message-style icon

#### Scenario: Two-digit count

- GIVEN a business row with `commentCount = 12`
- WHEN the Actions column renders
- THEN a button with accessible name "Ver comentarios (12)" is present
- AND the visible counter text is exactly "12"

#### Scenario: Three-digit count is shown exactly

- GIVEN a business row with `commentCount = 145`
- WHEN the Actions column renders
- THEN the visible counter text is exactly "145" (no "99+" or other cap)
- AND the counter is not truncated, and the neighboring action buttons remain visible and clickable

#### Scenario: Very large count is still exact

- GIVEN a business row with `commentCount = 1000`
- WHEN the Actions column renders
- THEN the visible counter text is exactly "1000" (no cap, no abbreviation)
- AND the accessible name is "Ver comentarios (1000)"

#### Scenario: Tooltip

- GIVEN a business row with `commentCount = 3`
- WHEN the user hovers or keyboard-focuses the indicator
- THEN a tooltip with the text "Ver comentarios" is shown

#### Scenario: Indicator is independent of business status

- GIVEN businesses in each status (VENTA_EFECTUADA, EMITIDO, FONDEADO, LIQUIDADO, CANCELADO) each with `commentCount = 2`
- WHEN each row's Actions column renders
- THEN every row shows the indicator with the count "2"

#### Scenario: Keyboard operability

- GIVEN a business row with `commentCount = 4`
- WHEN the user tabs to the indicator and presses Enter or Space
- THEN the comments modal opens (see `contract-comments` R4)

### Requirement: R3 — Comments indicator is hidden when there are no comments

When a business has `commentCount = 0` (or the value is missing/not a positive integer), the Actions column MUST NOT render the message icon, the counter, a "0" badge, a tooltip trigger, or any placeholder element that reserves empty space for the indicator. The remaining actions MUST render exactly as they do today.

#### Scenario: Zero comments renders nothing

- GIVEN a business row with `commentCount = 0`
- WHEN the Actions column renders
- THEN no control with an accessible name matching "Ver comentarios" is present
- AND no text "0" is rendered as a counter in the Actions column

#### Scenario: Missing count is treated as zero

- GIVEN `BusinessRowActions` rendered without a `commentCount` prop
- WHEN the Actions column renders
- THEN no comments indicator is rendered and no error is thrown

#### Scenario: No layout gap

- GIVEN a row with `commentCount = 0` and the same props as an existing `BusinessRowActions` test case
- WHEN it renders
- THEN the Actions group contains exactly the same child elements as it did before this change (no extra wrapper, spacer, or empty tooltip trigger)

### Requirement: R7 — Indicator is available to every role with Business List access

Opening the comments history is a read operation. The indicator and the modal MUST be available to every role that can see the Business List, including company-wide read-only roles (for example CONSULTOR). The indicator MUST NOT depend on `isReadOnlyRole`, on the "Agregar comentario" permission, or on any mutating-action gate.

#### Scenario: Read-only role sees the indicator

- GIVEN a user with a read-only role (CONSULTOR) and a business row with `commentCount = 7`
- WHEN the Actions column renders
- THEN the indicator "Ver comentarios (7)" is present
- AND the "Agregar comentario" dropdown item is still not present for that role

#### Scenario: Read-only role can open the history

- GIVEN a user with a read-only role and a business row with `commentCount = 7`
- WHEN the user activates the indicator
- THEN the comments modal opens and lists the comments (see `contract-comments` R4)

#### Scenario: Privileged role

- GIVEN a user with role ADMIN, ANALISTA_SOPORTE, or AGENTE and a row with `commentCount = 1`
- WHEN the Actions column renders
- THEN the indicator is present for each of these roles

#### Scenario: Role is not provided

- GIVEN `BusinessRowActions` rendered with `userRole` undefined and `commentCount = 2`
- WHEN it renders
- THEN the indicator is present

### Requirement: R8 — Existing Actions column behavior is preserved

Adding the indicator MUST NOT change the behavior, visibility rules, accessible names, or callbacks of the existing actions: "Subir comprobante", "Ver comprobantes", the "Más acciones" dropdown and all its items ("Editar", "Ver detalle", "Ver motivo cancelación", "Agregar comentario", novedad actions, "Eliminar"). `BusinessTable/ActionCell.tsx` and `__tests__/components/action-cell.test.tsx` MUST remain unmodified. The existing "Agregar comentario" dialog (`CommentModal`) MUST keep its current create-comment behavior and title.

#### Scenario: Existing actions unchanged with indicator present

- GIVEN a business row with `commentCount = 5` and a role/status combination that today shows "Subir comprobante", "Ver comprobantes", and the dropdown
- WHEN the Actions column renders
- THEN all those controls are present with unchanged accessible names and handlers
- AND the indicator is additional to them

#### Scenario: Existing actions unchanged with indicator absent

- GIVEN a business row with `commentCount = 0`
- WHEN the Actions column renders
- THEN the rendered controls are identical to the pre-change output

#### Scenario: Add-comment flow still works

- GIVEN a user who sees "Agregar comentario" in the dropdown
- WHEN the user selects it
- THEN the create-comment dialog titled "Agregar comentario" opens exactly as before
- AND it is not replaced by or merged with the read-only history modal

#### Scenario: Only one dialog at a time per row

- GIVEN the comments history modal is open for a row
- WHEN the user closes it and then opens "Ver comprobantes"
- THEN only the comprobantes sheet is mounted (the history modal is unmounted)

#### Scenario: Dead component untouched

- GIVEN the change is implemented
- WHEN the repository diff is inspected
- THEN `src/features/negocios/components/BusinessTable/ActionCell.tsx` and `src/features/negocios/__tests__/components/action-cell.test.tsx` have no modifications

### Requirement: R10 — The list count refreshes after the user creates a comment

After a comment is created successfully through the existing "Agregar comentario" dialog (`CommentModal`, via its optional `onCreated` callback), the Business List MUST be refetched so that the row's count reflects the new comment. The refresh MUST follow the same mechanism family that already refreshes the list after a payment-proof upload (`onUploadSuccess`), and MUST NOT be triggered when the creation fails or the dialog is dismissed without creating a comment.

Counts changed by OTHER users MUST NOT be live-updated in the list: the badge reflects the count at the last list load or refetch (the list has no real-time channel; the user confirmed this is expected).

#### Scenario: Count refreshes after creating a comment

- GIVEN a row with `commentCount = 2` and a user creating a comment through "Agregar comentario"
- WHEN the comment is created successfully
- THEN the list is refetched
- AND the row's indicator shows "3"

#### Scenario: First comment makes the indicator appear

- GIVEN a row with `commentCount = 0` (no indicator)
- WHEN the user creates the first comment through "Agregar comentario"
- THEN after the list refetch the row shows the indicator with "1"

#### Scenario: Failed or dismissed creation does not refetch

- GIVEN the "Agregar comentario" dialog is open for a row
- WHEN the comment creation fails, or the user closes the dialog without creating a comment
- THEN the list is not refetched as a consequence
- AND the row's count is unchanged

#### Scenario: Comments from other users do not update the badge

- GIVEN a row whose badge shows "2" and another user creates a comment on that business
- WHEN no list refetch occurs
- THEN the badge still shows "2"

## Decisions

All questions raised during the spec phase were answered by the user. These decisions are final.

- (a) YES — refresh the list after creating a comment. After a comment is created through "Agregar comentario", the Business List refetches so the row count refreshes. Binding requirement: R10. Counts changed by other users are not live-updated in the list until it refetches (explicitly confirmed: "we have no real time for the list").
- (b) YES — the count is exact, with no cap (no "99+"). R2 states this as final, including magnitudes above 999.
- (c) YES, AMENDED (OQ1) — the modal title is "Comentarios — {contract}" with a contract and just "Comentarios" without one (null, empty, or the table placeholder "-"), with no dash and no "Negocio #{id}" fallback. The "Agregar comentario" dialog is out of scope and stays as today. Final in `contract-comments` R4.
- (d) YES — fix `CommentItem` to render date AND time in `America/Bogota` through a shared Bogotá date-time formatter (its final name and location are decided in design). `formatDateBogota()` is date-only and the current `CommentItem` formats without a timezone, so a new or extended formatter is required. This change also affects every consumer of `CommentItem`: the detail-page `CommentsSidebar` will also show Bogotá date and time (the create-comment dialog renders no thread, so it is unaffected; the R11 scenario for it was dropped, OQ2). The existing `CommentItem` tests are updated accordingly. Binding requirement: `contract-comments` R11 (and the Bogotá scenario in R4).
- (e) ACCEPTED — a temporary mismatch between the list count and the modal content is acceptable (a stale list, for example another user added a comment after the list loaded). Verified fact: there is currently NO code path in the application that deactivates or deletes a comment (no DELETE or PATCH on `/api/negocios/[id]/comments`, no audit action other than `COMMENT_CREATED`, nothing sets `Comment.status = false`); `status` exists only as the soft-delete convention. The realistic cause of a mismatch is therefore a newer comment from another user, not a deletion. The `status: true` filter on the count is still required (R1), so the count stays correct if a deactivation path is ever added.

### Out-of-scope observation (pre-existing, not changed by this spec)

- `GET /api/negocios/[id]/comments` checks only the session, not the hierarchical visibility of the business. Because the count is scoped by `buildBusinessListWhere`, the modal is only reachable from rows the user can already see. Hardening the endpoint is not part of this change.

## Out of scope

- Creating, editing, or deleting comments from the history modal (creation stays in "Agregar comentario").
- Filtering, searching, or exporting comments.
- Live (SSE) updates of the counter on the list for comments created by other users (see decision (a)); the list refetches only on load and after the user's own comment creation (R10).
- Any new API endpoint, Prisma schema change, or migration.
- Any change to `ActionCell.tsx`.

## Traceability

| Requirement | Scenarios | Primary test target |
|---|---|---|
| R1 count derivation | Mapper exposes active count; zero maps to zero; only active counted; no extra requests; count reaches Actions column; list visibility | `business-entity.mapper.test.ts`, `map-business-to-table-row.test.ts`, list query/route test, `BusinessTableSection` test |
| R2 indicator visible | Single; two-digit; three-digit exact; very large exact; tooltip; status independent; keyboard | `BusinessRowActions.test.tsx` |
| R3 indicator hidden | Zero renders nothing; missing treated as zero; no layout gap | `BusinessRowActions.test.tsx` |
| R4 modal content and states | See `contract-comments/spec.md` | `CommentsHistoryModal.test.tsx` |
| R5 modal lifecycle | See `contract-comments/spec.md` | `CommentsHistoryModal.test.tsx`, `BusinessRowActions.test.tsx` |
| R6 real-time (modal live, badge not live) | See `contract-comments/spec.md` | `CommentsHistoryModal.test.tsx` (EventSource mock), `BusinessRowActions.test.tsx` (badge unchanged) |
| R7 roles | Read-only sees indicator; read-only opens; privileged roles; role undefined | `BusinessRowActions.test.tsx` |
| R8 non-regression | Existing actions with/without indicator; add-comment flow; one dialog at a time; dead component untouched | `BusinessRowActions.test.tsx` (existing + new), `action-cell.test.tsx` unchanged |
| R10 list refresh after creating a comment | Count refreshes; first comment makes indicator appear; failed/dismissed creation does not refetch; other users' comments do not update the badge | `BusinessRowActions.test.tsx` (`CommentModal` `onCreated` wiring), `BusinessTableSection` tests (list refetch) |
| R11 shared `CommentItem` Bogotá date-time | See `contract-comments/spec.md` | `CommentItem` tests (updated), `CommentsSidebar` non-regression tests, shared formatter unit test |
| Decisions (a)-(e) | (a) -> R10; (b) -> R2; (c) -> R4 (amended, OQ1); (d) -> R4 and R11; (e) -> R1 `status: true` filter and R4 empty state | n/a (recorded decisions) |

## Affected files (grounded in verified facts)

Modify:
- `src/features/negocios/types/business-prisma.types.ts` — add the active-comments count to the existing `_count` selection of `businessWithRelations`.
- `src/features/negocios/types/business-entity.types.ts` — add `commentCount: number` to `BusinessEntity`.
- `src/features/negocios/mappers/business-entity.mapper.ts` — map `_count.comments` to `commentCount`.
- `src/features/negocios/types/business.types.ts` — add `commentCount: number` to the table-row `Business`.
- `src/features/negocios/lib/map-business-to-table-row.ts` — propagate `commentCount`.
- `src/features/negocios/components/BusinessTableSection.tsx` — pass `commentCount` to `BusinessRowActions` and wire the list refetch after a comment is created (R10).
- `src/features/negocios/components/BusinessRowActions.tsx` — render the indicator, mount the history modal only while open, and forward `CommentModal`'s `onCreated` so the list refreshes (R10).
- `src/features/comments/components/CommentItem.tsx` — DEFINITE (decision (d)): render date and time in `America/Bogota`; this also changes the `CommentsSidebar` on the detail page, which shares it.
- A shared Bogotá date-time formatter (name and location decided in design; for example next to `formatDateBogota()`) — DEFINITE (decision (d)); consumed by `CommentItem`.
- `prisma/ERD.md` and `prisma/schema.prisma` — NOT modified (no schema change); listed to make that explicit.

Create:
- `src/features/comments/components/CommentsHistoryModal.tsx` (final name and location per design) — read-only modal composed from `useComments` and `CommentThread`.

Test fixtures impacted:
- `src/features/negocios/__tests__/fixtures/mock-prisma-business.ts` and every test that builds a full Prisma business with `_count` must add `comments`, for example `src/features/negocios/__tests__/mappers/business-entity.mapper.test.ts`, `src/app/api/negocios/[id]/fondear/__tests__/route.test.ts`, `src/app/api/negocios/[id]/fondear-aportes/__tests__/route.test.ts`, `src/features/negocios/__tests__/api/fondear-aportes.route.test.ts`.

Tests expected (colocated in `__tests__`, Vitest + Testing Library):
- `src/features/negocios/__tests__/mappers/business-entity.mapper.test.ts` (extend)
- `src/features/negocios/__tests__/lib/map-business-to-table-row.test.ts` (extend)
- `src/features/negocios/__tests__/components/BusinessRowActions.test.tsx` (extend, including the R10 `onCreated` wiring)
- `BusinessTableSection` tests (extend or add: count propagation and list refetch after comment creation)
- `src/features/comments/__tests__/CommentsHistoryModal.test.tsx` (new)
- Existing `CommentItem` tests (update to the Bogotá date-time output), a unit test for the shared formatter, and non-regression coverage for `CommentsSidebar`.
- A list-query/route test asserting the `status: true` filter on the comments count selection and the absence of extra requests (location decided in design).
