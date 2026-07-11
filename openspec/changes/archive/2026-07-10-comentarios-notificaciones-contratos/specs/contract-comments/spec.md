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
