# Contract Comments Specification

## Purpose

Provide a per-contract comment thread so `AGENTE` (Money Strategist) and `ANALISTA_SOPORTE` (Support Analyst) can discuss a business record in-app, with locked audit fields, character-limited input, chronological threaded display, and audit logging. This is a new capability.

## Data Model

| Field | Type | Constraint |
|-------|------|------------|
| `id` | UUID | PK |
| `businessId` | FK → `Business` | required |
| `authorId` | FK → `User` | required |
| `authorRole` | enum (`AGENTE`, `ANALISTA_SOPORTE`) | snapshot at creation |
| `title` | `VarChar(40)` | required, max 40 chars |
| `detail` | `VarChar(200)` | required, max 200 chars |
| `createdAt` | timestamp | system-generated |
| `status` | boolean | soft-delete flag, default `true` |

## Requirements

### Requirement: Create-comment modal with locked and editable fields

The system MUST open a create-comment modal from the business actions list showing locked fields (author full name, author email, current timestamp, contract number) and two required editable fields ("Comment name", max 40 chars; "Detail", max 200 chars) with live character counters.

#### Scenario: Modal opens with prefilled locked fields

- GIVEN a user opens the actions menu on a business
- WHEN they select "Agregar comentario"
- THEN the modal shows Name, Email, Date/Time, and Contract number as locked/read-only
- AND "Comment name" and "Detail" are empty and editable

#### Scenario: Character counters enforce max length

- GIVEN the modal is open
- WHEN the user types in "Comment name" or "Detail"
- THEN the system shows a live counter (e.g. "40/40", "200/200")
- AND the system MUST NOT accept input beyond 40 characters for "Comment name" or 200 characters for "Detail"

### Requirement: Comment creation validation

The system MUST require both "Comment name" and "Detail" before persisting a comment, and MUST reject the submission otherwise without creating a record.

#### Scenario: Empty required fields blocked

- GIVEN the modal is open with "Comment name" and "Detail" empty
- WHEN the user clicks "Guardar"
- THEN the system shows "El nombre del comentario es obligatorio" (and the equivalent error for "Detail" if also empty)
- AND no comment record is created

#### Scenario: Cancel discards the draft

- GIVEN the modal is open with partially filled fields
- WHEN the user clicks "Cancelar"
- THEN the modal closes
- AND no comment record is created
- AND the contract record is unmodified

### Requirement: Comment persistence and audit logging

The system MUST persist a valid comment as a new `Comment` row scoped to the contract and MUST write a `COMMENT_CREATED` audit log entry for every successful creation.

#### Scenario: Successful save persists and audits

- GIVEN the modal has valid "Comment name" and "Detail"
- WHEN the user clicks "Guardar"
- THEN the system creates a `Comment` record linked to the contract and author
- AND the system writes a `COMMENT_CREATED` audit log entry
- AND the modal closes

### Requirement: Threaded comment display in contract detail

The system MUST render all comments for a contract in a collapsible sidebar to the right of the business detail view, ordered chronologically (oldest to newest), with role-based alignment, and MUST provide an inline input to add a new comment from the sidebar.

#### Scenario: Sidebar renders ordered, role-aligned thread

- GIVEN a contract has multiple comments from both roles
- WHEN the user opens the comments sidebar on the business detail page
- THEN all comments render ordered from oldest to newest
- AND each comment shows author name, role, timestamp, and detail text
- AND Money Strategist comments align left and Analyst comments align right
- AND the sidebar can be opened and closed independently of the rest of the page

#### Scenario: Add comment directly from sidebar

- GIVEN the sidebar is open
- WHEN the user submits the inline comment input with valid required fields
- THEN the system creates the comment and appends it to the thread
- AND the same validation and notification-fan-out rules apply as the modal flow
### Requirement: R4 — Opening the indicator shows a read-only history of the business comments

When the user activates the comments indicator of a business row, the system MUST open a modal dialog that lists ALL active comments of that business in chronological order (oldest first). The modal MUST be read-only: it MUST NOT contain a comment input, a submit control, or any edit/delete control.

The modal title MUST be "Comentarios — {contract}" where `{contract}` is the business contract number. When the business has no contract (null, empty, or the table placeholder "-") the title MUST be just "Comentarios", with no dash and no business id (decision (c), amended by OQ1).

Each comment MUST display: the author's name, the author's role label, the comment title, the comment detail (long text wraps and preserves line breaks; URLs remain rendered as links as in `CommentItem`), and the creation date AND time expressed in the `America/Bogota` timezone regardless of the viewer's browser timezone (decision (d), final; the shared rendering is specified in R11).

The modal MUST handle exactly four data states:
- loading: a loading indicator (for example "Cargando comentarios…") and no comment list;
- error: an error message and no comment list; the modal SHOULD offer a retry control ("Reintentar") that refetches;
- empty: the empty message "Todavía no hay comentarios en este contrato." (a defensive state: there is currently no code path that deactivates comments, so it is reached only if the endpoint returns an empty list for a business whose list badge showed a positive count, for example after a future deactivation path or a manual data change);
- success: the list of comments.

The history data MUST be requested only after the user opens the modal (never at list render time), and exactly once per opening.

#### Scenario: Modal lists all comments, oldest first

- GIVEN a business with three active comments created at T1 < T2 < T3
- WHEN the user clicks the indicator
- THEN a dialog opens listing the comments in the order T1, T2, T3 (oldest at the top)

#### Scenario: Comment fields are displayed

- GIVEN a business with a comment authored by "Ana Pérez" with role ANALISTA_SOPORTE, title "Falta soporte", detail "Se solicita comprobante del pago"
- WHEN the modal shows the success state
- THEN the entry shows "Ana Pérez", the role label for ANALISTA_SOPORTE, "Falta soporte", and "Se solicita comprobante del pago"
- AND it shows the creation date and time

#### Scenario: Date and time are shown in Bogotá time

- GIVEN a comment with `createdAt = 2026-09-30T02:30:00Z` (21:30 on 29 September in Bogotá) and a browser configured in the UTC timezone
- WHEN the modal shows the comment
- THEN the displayed date is 29 September 2026 and the displayed time is 21:30 (9:30 p. m.)

#### Scenario: Title uses the contract number

- GIVEN a business with contract "CT-2026-0042"
- WHEN the modal opens
- THEN the dialog title is "Comentarios — CT-2026-0042"

#### Scenario: Title without contract

- GIVEN a business with a null contract
- WHEN the modal opens
- THEN the dialog title is "Comentarios"
- AND the title contains no dash and no business id

#### Scenario: Loading state

- GIVEN the comments request has not resolved yet
- WHEN the modal is open
- THEN a loading indicator is visible
- AND no comment entries and no empty message are rendered

#### Scenario: Error state

- GIVEN the comments request fails with the message "Error al cargar comentarios"
- WHEN the modal is open
- THEN that error message is visible
- AND no comment entries are rendered
- AND a "Reintentar" control is available

#### Scenario: Retry after error

- GIVEN the modal is in the error state
- WHEN the user activates "Reintentar" and the second request succeeds with two comments
- THEN the modal shows the loading state and then the two comments

#### Scenario: Empty state

- GIVEN the comments request succeeds with an empty list
- WHEN the modal is open
- THEN the message "Todavía no hay comentarios en este contrato." is visible
- AND no comment entries are rendered

#### Scenario: Modal is read-only

- GIVEN the modal is open in the success state
- WHEN the modal content is inspected
- THEN there is no text input, no submit button, and no edit or delete control for comments

#### Scenario: Data is requested only on open

- GIVEN a Business List page with several rows that have indicators
- WHEN the page renders and no indicator has been clicked
- THEN no comments request has been made for any row
- WHEN the user clicks one indicator
- THEN exactly one comments request is made, for that business id

#### Scenario: Long content does not break the layout

- GIVEN a comment whose detail is 200 characters without spaces
- WHEN the modal shows it
- THEN the text wraps within the dialog and does not cause horizontal scrolling of the dialog

### Requirement: R5 — Modal lifecycle, focus, and responsive layout

The history modal MUST be mounted only while open (conditional render): closed rows MUST NOT instantiate `useComments` nor open an SSE connection. The modal MUST close via an explicit close control ("Cerrar"), the Esc key, and outside-click on the overlay. On open, keyboard focus MUST move into the dialog; on close, focus MUST return to the indicator that opened it. The dialog MUST have role `dialog` and an accessible name equal to its title.

Closing the modal MUST release its resources (SSE `EventSource` closed, no pending state updates). The modal body MUST scroll internally when the comments exceed the viewport height, and the dialog MUST fit mobile viewports (360 px wide) without horizontal overflow.

#### Scenario: Not mounted while closed

- GIVEN a row with an indicator and the modal closed
- WHEN the row renders
- THEN no dialog is in the document
- AND no `EventSource` for `/api/notifications/stream` has been created by this row

#### Scenario: Opens on click

- GIVEN a row with `commentCount = 3`
- WHEN the user clicks the indicator
- THEN a dialog with role `dialog` is in the document and its accessible name equals the title

#### Scenario: Closes with the close control

- GIVEN the modal is open
- WHEN the user activates "Cerrar"
- THEN the dialog is removed from the document

#### Scenario: Closes with Esc

- GIVEN the modal is open
- WHEN the user presses Escape
- THEN the dialog is removed from the document

#### Scenario: Closes with outside click

- GIVEN the modal is open
- WHEN the user clicks the overlay outside the dialog
- THEN the dialog is removed from the document

#### Scenario: Focus management

- GIVEN the indicator has keyboard focus
- WHEN the user opens the modal
- THEN focus moves to an element inside the dialog
- WHEN the user closes the modal
- THEN focus returns to the indicator

#### Scenario: Resources released on close

- GIVEN the modal is open and has created an `EventSource`
- WHEN the modal closes
- THEN that `EventSource` has been closed

#### Scenario: Reopening fetches fresh data

- GIVEN the modal was opened, closed, and a new comment was created meanwhile
- WHEN the user opens the modal again
- THEN a new comments request is made and the list includes the new comment

#### Scenario: Scrolls when the list is long

- GIVEN a business with 100 comments
- WHEN the modal shows them on a 360 x 640 px viewport
- THEN the dialog height does not exceed the viewport and the comment list scrolls inside the dialog
- AND the dialog has no horizontal overflow

#### Scenario: Independent rows

- GIVEN two rows with indicators
- WHEN the user opens the modal for row A
- THEN only row A's modal is mounted and row B has no dialog or SSE connection

### Requirement: R6 — New comments appear live while the modal is open

While the history modal is open and loaded, a `comment-added` SSE event whose `businessId` equals the modal's business MUST append that comment at the end of the list without closing or reopening the modal. Events for other businesses MUST be ignored. A comment whose id is already listed MUST NOT be duplicated. A malformed event payload MUST NOT break the modal.

Note: the modal itself DOES update live while it is open, through the existing `useComments` SSE subscription. The row's count badge in the list does NOT: it is not updated by these events and reflects the count at the last list load or refetch (the list has no real-time channel; see decision (a) and R10 in `specs/negocios/spec.md`). A temporary mismatch between the badge and the modal content is accepted (decision (e)); the realistic cause is a newer comment from another user.

#### Scenario: New comment for the same business is appended

- GIVEN the modal is open for business 10 showing two comments
- WHEN a `comment-added` event arrives with `businessId = 10` and a new comment id
- THEN the list shows three comments with the new one last

#### Scenario: Event for another business is ignored

- GIVEN the modal is open for business 10
- WHEN a `comment-added` event arrives with `businessId = 11`
- THEN the list is unchanged

#### Scenario: Duplicate event is ignored

- GIVEN the modal is open and already lists comment id "c1"
- WHEN a `comment-added` event arrives with id "c1"
- THEN the list still contains "c1" exactly once

#### Scenario: Malformed event does not break the modal

- GIVEN the modal is open in the success state
- WHEN a `comment-added` event arrives with invalid JSON
- THEN the list is unchanged and the modal stays functional

#### Scenario: Row badge is not live-updated

- GIVEN the modal is open for a row whose badge shows "2"
- WHEN a `comment-added` event for that business appends a third comment to the modal
- THEN the modal shows three comments
- AND the row badge still shows "2" until the list is refreshed

#### Scenario: No live updates after closing

- GIVEN the modal was opened and closed
- WHEN a `comment-added` event arrives afterward
- THEN no state update occurs and no error is logged

### Requirement: R11 — `CommentItem` renders the comment date and time in Bogotá time everywhere

The shared `CommentItem` component MUST render the creation date AND time of a comment in the `America/Bogota` timezone, regardless of the viewer's browser timezone, through a shared Bogotá date-time formatter (decision (d); the formatter's name and location are decided in design). Because `CommentItem` is shared, this behavior applies uniformly to every place it is rendered: the new history modal, and the detail-page `CommentsSidebar`. No other behavior of `CommentItem` (author, role label, title, detail, links, line breaks) MUST change. The existing `CommentItem` tests MUST be updated to the new output, and the Bogotá date-only helper `formatDateBogota()` MUST keep its current behavior.

#### Scenario: `CommentItem` shows Bogotá date and time regardless of browser timezone

- GIVEN a comment with `createdAt = 2026-09-30T02:30:00Z` and a runtime configured in the UTC timezone (and, in a second run, in `Asia/Tokyo`)
- WHEN `CommentItem` renders the comment
- THEN it shows 29 September 2026 and 21:30 (9:30 p. m.) in both runs

#### Scenario: Detail-page sidebar shows Bogotá time

- GIVEN the detail-page `CommentsSidebar` listing a comment with `createdAt = 2026-09-30T02:30:00Z` in a UTC runtime
- WHEN the sidebar renders
- THEN the comment's date and time read 29 September 2026, 21:30 (Bogotá), and the sidebar's loading, error, empty, and success behavior is unchanged

#### Scenario: Other `CommentItem` content is unchanged

- GIVEN a comment with author, role label, title, detail text containing a URL and line breaks
- WHEN `CommentItem` renders it
- THEN the author, role label, title, detail, link, and line breaks render exactly as before this change

## Out of scope

- Creating, editing, or deleting comments from this modal.
- Pagination, filtering, or searching comments.
- Hardening `GET /api/negocios/[id]/comments` with hierarchical visibility (pre-existing; see `specs/negocios/spec.md`).
- Live updates of the list count badge for comments created by other users.
