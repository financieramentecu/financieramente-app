# Leads Specification

## Purpose

Define the `Lead` entity, its hierarchy-based visibility, the read-only Kanban board, lead detail view, and the manual conversion of a `Lead` into a `Client` + `Business`.

## Requirements

### Requirement: Lead Outcome Status

The system MUST persist a fixed, CRM-agnostic `outcomeStatus` enum field on `Lead` with exactly four values: `OPEN`, `WON`, `LOST`, `ABANDONED`, defaulting to `OPEN`. This enum MUST NOT be admin-configurable (unlike `LeadFunnelColumn`, which is dynamic). `outcomeStatus` is independent of the lead's `LeadFunnelColumn`: a lead MAY hold any `outcomeStatus` while sitting in any funnel column.

#### Scenario: Lead created without outcomeStatus defaults to OPEN

- GIVEN a webhook payload creating a new lead with no `outcomeStatus`
- WHEN the lead is persisted
- THEN `Lead.outcomeStatus` SHALL be `OPEN`

#### Scenario: outcomeStatus is independent of funnel column

- GIVEN a lead in any `LeadFunnelColumn`
- WHEN its `outcomeStatus` is set to `WON`
- THEN the lead's `idLeadFunnelColumn` SHALL remain unchanged

### Requirement: WON Outcome Status Is Terminal

Once `Lead.outcomeStatus` reaches `WON`, it MUST become terminal: no subsequent webhook payload MAY change it. The lock applies as soon as `outcomeStatus = "WON"` is persisted, regardless of whether the lead has since been manually converted to a `Business` (`idBusiness` presence or absence is irrelevant to the lock). This terminal rule applies EXCLUSIVELY to `WON`. `LOST` and `ABANDONED` MUST remain freely re-settable by later webhooks (e.g. re-opening an abandoned lead into `OPEN`), and `OPEN` is never terminal.

#### Scenario: WON lead ignores a later webhook outcome change

- GIVEN a lead with `outcomeStatus = "WON"`
- WHEN a later webhook payload for the same lead carries `outcomeStatus = "LOST"`
- THEN `Lead.outcomeStatus` SHALL remain `"WON"`

#### Scenario: WON lock applies independently of manual conversion

- GIVEN a lead with `outcomeStatus = "WON"` and no associated `Business`
- WHEN a later webhook payload carries a different `outcomeStatus`
- THEN `Lead.outcomeStatus` SHALL remain `"WON"`

#### Scenario: LOST and ABANDONED remain mutable by later webhooks

- GIVEN a lead with `outcomeStatus = "ABANDONED"`
- WHEN a later webhook payload for the same lead carries `outcomeStatus = "OPEN"`
- THEN `Lead.outcomeStatus` SHALL be updated to `"OPEN"`

### Requirement: Outcome Status Badge on Lead Card

Every Kanban board card MUST display the lead's `outcomeStatus` as a visual badge, independent of and without altering the lead's column placement.

#### Scenario: Card shows outcome badge regardless of column

- GIVEN a lead with `outcomeStatus = "LOST"` in the "En negociación" column
- WHEN the Kanban board renders that lead's card
- THEN the card SHALL display a badge indicating `LOST`
- AND the lead SHALL remain rendered inside its current funnel column

### Requirement: Kanban Outcome Status Filter

The board MUST offer a multi-select, additive chip filter over `outcomeStatus` (`OPEN`, `WON`, `LOST`, `ABANDONED`). Multiple selected values MUST be combined with OR semantics. On initial board load, only `OPEN` MUST be selected by default. This filter MUST be combined (AND) with the existing hierarchy-based visibility rules.

#### Scenario: Default board load shows only OPEN leads

- GIVEN a user opens the Kanban board for the first time in a session
- WHEN the board loads
- THEN only leads with `outcomeStatus = "OPEN"` SHALL be shown, subject to hierarchy visibility

#### Scenario: Selecting multiple outcome chips is additive

- GIVEN the user selects both `WON` and `LOST` chips
- WHEN the board re-renders
- THEN leads with `outcomeStatus` in `{WON, LOST}` SHALL be shown
- AND leads with `outcomeStatus` in `{OPEN, ABANDONED}` SHALL NOT be shown

#### Scenario: Outcome filter combines with hierarchy visibility

- GIVEN a non-bypass-role user with a restricted accessible-user set
- WHEN the `WON` chip is selected
- THEN only `WON` leads owned by accessible user IDs SHALL be shown

### Requirement: Kanban Date Range Filter

The board MUST offer a date range filter over `Lead.createdAt` (lead creation date, not last funnel/status change). On initial board load, the range MUST default to the first and last day of the current calendar month. This filter MUST be combined (AND) with `outcomeStatus` filtering and hierarchy-based visibility.

#### Scenario: Default board load uses current month range

- GIVEN a user opens the Kanban board without prior filter selection
- WHEN the board loads
- THEN only leads with `createdAt` between the first and last day of the current month SHALL be shown

#### Scenario: Custom date range filters by createdAt only

- GIVEN a user selects a custom date range
- WHEN the board re-renders
- THEN only leads whose `createdAt` falls within that range SHALL be shown
- AND leads whose funnel column changed within the range but whose `createdAt` falls outside it SHALL NOT be shown

### Requirement: Lead Entity Model

The system MUST persist leads in a `Lead` model with a nullable, unique `externalCrmId`, a nullable owner FK to `User`, a required FK to `LeadFunnelColumn`, and soft delete (`status` boolean, never physical delete).

#### Scenario: Lead created without owner

- GIVEN a webhook payload with no `ownerEmail`
- WHEN the lead is created
- THEN `Lead.ownerId` SHALL be null
- AND the lead SHALL remain queryable via soft-delete-aware queries

### Requirement: Hierarchy-Based Visibility

The system MUST scope lead visibility using `getAccessibleUserIds()` and `HIERARCHY_BYPASS_ROLES` from `src/features/auth/lib/hierarchy.ts` (the CTE implementation), never a second hierarchy implementation. A lead with `ownerId` null MUST be visible only to roles in `HIERARCHY_BYPASS_ROLES`.

#### Scenario: Regular user cannot see owner-less lead

- GIVEN a lead with `ownerId = null`
- WHEN a user with role `AGENTE` requests the Kanban board
- THEN the owner-less lead SHALL NOT appear in the response

#### Scenario: Admin sees all leads including owner-less

- GIVEN leads with and without an assigned owner
- WHEN a user with a `HIERARCHY_BYPASS_ROLES` role requests the board
- THEN both owned and owner-less leads SHALL appear

#### Scenario: Regular user sees only accessible-hierarchy leads

- GIVEN leads owned by users inside and outside the requester's hierarchy (per `getAccessibleUserIds()`)
- WHEN a non-bypass-role user requests the board
- THEN only leads owned by accessible user IDs SHALL appear

### Requirement: Read-Only Kanban Board

The board MUST render leads grouped by `LeadFunnelColumn`. The UI MUST NOT support drag-and-drop, manual lead creation, or manual editing of any lead field.

#### Scenario: User attempts no drag interaction

- GIVEN the Kanban board is rendered
- WHEN a user views the board
- THEN no UI control SHALL allow moving a lead between columns or creating a lead

### Requirement: Lead Detail View

The lead detail view MUST display stored lead fields and MUST show a "Ver en CRM" action only when `externalUrl` is present and non-empty.

#### Scenario: External URL present

- GIVEN a lead with `externalUrl = "https://crm.example/lead/1"`
- WHEN the detail view renders
- THEN the "Ver en CRM" button SHALL be visible and SHALL link to that URL

#### Scenario: External URL absent

- GIVEN a lead with `externalUrl = null`
- WHEN the detail view renders
- THEN the "Ver en CRM" button SHALL NOT be rendered

### Requirement: Manual Conversion to Client + Business

The system MUST allow an authorized user to manually convert a lead into a `Client` and a `Business`. Conversion MUST require `identityNumber` to be supplied at conversion time (not sourced from the webhook payload alone). The system MUST match an existing `Client` by `[typeIdentity, identityNumber]` or create a new one, then create a `Business`.

#### Scenario: Conversion blocked without identityNumber

- GIVEN a lead lacking a stored `identityNumber`
- WHEN a user submits "Convertir a negocio" without providing an `identityNumber`
- THEN the conversion SHALL be rejected with a validation error
- AND no `Client` or `Business` SHALL be created

#### Scenario: Conversion matches existing client

- GIVEN a `Client` already exists with the same `[typeIdentity, identityNumber]`
- WHEN a user converts a lead supplying that identity
- THEN the existing `Client` SHALL be reused
- AND a new `Business` SHALL be created linked to it

#### Scenario: Conversion creates new client

- GIVEN no `Client` exists with the supplied `[typeIdentity, identityNumber]`
- WHEN a user converts a lead
- THEN a new `Client` SHALL be created
- AND a new `Business` SHALL be created linked to it

### Requirement: Audit Logging of Lead Actions

Every lead creation, status/owner change via webhook, and manual conversion MUST produce an `AuditLog` entry via `logAuditEvent()`, using `AuditAction` values `LEAD_CREATED`, `LEAD_STATUS_CHANGED`, `LEAD_OWNER_ASSIGNED`, `LEAD_OWNER_UNRESOLVED`, `LEAD_CONVERTED_TO_BUSINESS`.

#### Scenario: Conversion is audited

- GIVEN a successful manual conversion
- WHEN the `Client`/`Business` are created
- THEN an `AuditLog` entry with action `LEAD_CONVERTED_TO_BUSINESS` SHALL be recorded

---

### Requirement: idBusiness exposed on Kanban lead card projection

The Kanban board projection (`LeadCard`) MUST include `idBusiness: number | null`. The board-building query MUST select `idBusiness` for every lead returned, so the board can indicate conversion state without an additional query per card.

#### Scenario: Board query includes idBusiness

- GIVEN the Kanban board is requested
- WHEN the board service builds the response
- THEN each returned lead card SHALL include its `idBusiness` value (a number or `null`)

#### Scenario: Non-converted lead has null idBusiness

- GIVEN a lead that has never been converted to a `Business`
- WHEN it is included in the Kanban board response
- THEN its `idBusiness` SHALL be `null`

### Requirement: Conversion blocked for leads without an owner

The system MUST prevent converting a lead to a business when the lead has no assigned owner (`idUser == null`), enforced in depth at three layers: (1) the UI disables the "Convertir a negocio" action with an explanatory caption when `lead.idUser == null`; (2) `getLeadForConversion` MUST exclude ownerless leads from its query, reusing the existing "not found → redirect to a blank creation form" behavior for that case; (3) `linkLeadToBusinessTx` MUST throw (rolling back the enclosing transaction) if the lead it is linking has no owner, as a backstop against a direct API/service call that bypasses the page-level gate.

#### Scenario: UI disables conversion for an ownerless lead

- GIVEN a lead with `idUser == null`
- WHEN its detail sheet is rendered
- THEN the "Convertir a negocio" button SHALL be disabled
- AND an explanatory caption SHALL indicate an owner must be assigned before conversion

#### Scenario: Conversion query excludes ownerless leads

- GIVEN a lead with `idUser == null` and no linked `Business`
- WHEN `getLeadForConversion` is called with that lead's id
- THEN it SHALL return `null`
- AND the caller SHALL fall back to a blank creation form, the same as for a not-found lead

#### Scenario: Transaction-level backstop rejects linking an ownerless lead

- GIVEN a direct call to `linkLeadToBusinessTx` for a lead with `idUser == null`
- WHEN the call executes inside the enclosing transaction
- THEN it SHALL throw
- AND the enclosing transaction SHALL roll back, creating no `Business`/link side effects

### Requirement: Converted-lead visual indicator on Kanban card

When a Kanban lead card's `idBusiness` is not `null`, the card MUST display both a converted-state icon indicator with an accessible label/tooltip ("Negocio creado") AND a visually distinct border/background compared to non-converted cards. This indicator MUST apply for any non-null `idBusiness`, regardless of the current status of the linked `Business` (including a cancelled business).
(Previously: the converted state was indicated with a text badge reading "Negocio creado" placed alongside the outcome-status badge; it is now an emerald star icon with a tooltip, shown inline next to the lead's name, with the outcome-status badge moved to its own row. The activation criterion — `idBusiness` non-null — is unchanged.)

#### Scenario: Converted lead shows icon indicator and distinct styling

- GIVEN a lead card with a non-null `idBusiness`
- WHEN the Kanban board renders that card
- THEN the card SHALL display an emerald star icon inline next to the lead's name
- AND the icon SHALL expose an accessible label and a tooltip reading "Negocio creado" on hover/focus
- AND the card SHALL render with a distinct border/background compared to non-converted cards

#### Scenario: Non-converted lead shows neither indicator

- GIVEN a lead card with `idBusiness = null`
- WHEN the Kanban board renders that card
- THEN neither the icon indicator nor the distinct border/background SHALL appear

#### Scenario: Indicator persists regardless of linked business status

- GIVEN a lead card whose linked `Business` has since been cancelled
- WHEN the Kanban board renders that card
- THEN the icon indicator and distinct styling SHALL still appear, because `idBusiness` remains non-null
