# Delta for Leads

## ADDED Requirements

### Requirement: Lead Deletion Eligibility Predicate

The system MUST provide a pure predicate `canDeleteLead(lead)` that returns `true` only when `lead.idBusiness === null AND lead.outcomeStatus === 'OPEN'`. A lead linked to a `Business` or with `outcomeStatus` of `WON`, `LOST`, or `ABANDONED` MUST be ineligible for deletion. This predicate MUST be the single source of truth evaluated on both client and server.

#### Scenario: Open, unconverted lead is eligible

- GIVEN a lead with `idBusiness = null` and `outcomeStatus = "OPEN"`
- WHEN `canDeleteLead(lead)` is evaluated
- THEN it SHALL return `true`

#### Scenario: Converted lead is ineligible

- GIVEN a lead with `idBusiness` set to a non-null value
- WHEN `canDeleteLead(lead)` is evaluated
- THEN it SHALL return `false`, regardless of `outcomeStatus`

#### Scenario: WON lead is ineligible

- GIVEN a lead with `idBusiness = null` and `outcomeStatus = "WON"`
- WHEN `canDeleteLead(lead)` is evaluated
- THEN it SHALL return `false`

#### Scenario: LOST lead is ineligible

- GIVEN a lead with `idBusiness = null` and `outcomeStatus = "LOST"`
- WHEN `canDeleteLead(lead)` is evaluated
- THEN it SHALL return `false`

#### Scenario: ABANDONED lead is ineligible

- GIVEN a lead with `idBusiness = null` and `outcomeStatus = "ABANDONED"`
- WHEN `canDeleteLead(lead)` is evaluated
- THEN it SHALL return `false`

### Requirement: Admin-Only Lead Soft Deletion

The system MUST expose `DELETE /api/leads/[id]`, gated by `requireRole([UserRole.ADMIN])`. On a valid request, the handler MUST re-fetch the lead fresh, re-evaluate `canDeleteLead()` server-side, and MUST NOT trust any client-side eligibility check alone. On success it MUST perform `prisma.lead.update({ data: { active: false } })` (never `prisma.lead.delete()`) and MUST record an `AuditLog` entry with a new `AuditAction.LEAD_DELETED` value.

#### Scenario: Admin deletes an eligible lead

- GIVEN an authenticated ADMIN and a lead with `idBusiness = null`, `outcomeStatus = "OPEN"`
- WHEN `DELETE /api/leads/[id]` is called for that lead
- THEN `Lead.active` SHALL become `false`
- AND an `AuditLog` entry with action `LEAD_DELETED` SHALL be recorded
- AND no `prisma.lead.delete()` call SHALL occur

#### Scenario: Server rejects deletion of a converted lead

- GIVEN a lead with `idBusiness` set to a non-null value
- WHEN `DELETE /api/leads/[id]` is called for that lead by an ADMIN
- THEN the system SHALL return HTTP 409
- AND `Lead.active` SHALL remain unchanged

#### Scenario: Server rejects deletion of a WON lead

- GIVEN a lead with `outcomeStatus = "WON"`
- WHEN `DELETE /api/leads/[id]` is called for that lead by an ADMIN
- THEN the system SHALL return HTTP 409
- AND `Lead.active` SHALL remain unchanged

#### Scenario: Server rejects deletion of a LOST lead

- GIVEN a lead with `outcomeStatus = "LOST"`
- WHEN `DELETE /api/leads/[id]` is called for that lead by an ADMIN
- THEN the system SHALL return HTTP 409
- AND `Lead.active` SHALL remain unchanged

#### Scenario: Server rejects deletion of an ABANDONED lead

- GIVEN a lead with `outcomeStatus = "ABANDONED"`
- WHEN `DELETE /api/leads/[id]` is called for that lead by an ADMIN
- THEN the system SHALL return HTTP 409
- AND `Lead.active` SHALL remain unchanged

#### Scenario: Unknown lead returns not found

- GIVEN no lead exists for the given id
- WHEN `DELETE /api/leads/[id]` is called by an ADMIN
- THEN the system SHALL return HTTP 404

### Requirement: Deletion Confirmation and Action Visibility

The UI MUST render the "Eliminar lead" action only for ADMIN users AND only when `canDeleteLead(lead)` returns `true` for the currently displayed lead; the action MUST NOT be rendered otherwise. Confirming deletion MUST require an explicit confirmation dialog (the shared `AlertDialog`) before the `DELETE` request is issued.

#### Scenario: Delete action hidden for non-admin

- GIVEN a non-ADMIN user viewing a lead's detail sheet
- WHEN the sheet renders
- THEN no "Eliminar lead" action SHALL be visible

#### Scenario: Delete action hidden for an ineligible lead

- GIVEN an ADMIN viewing a lead with `outcomeStatus = "WON"`
- WHEN the detail sheet renders
- THEN no "Eliminar lead" action SHALL be visible

#### Scenario: Delete requires confirmation before request

- GIVEN an ADMIN viewing an eligible lead's detail sheet
- WHEN the ADMIN clicks "Eliminar lead"
- THEN a confirmation dialog SHALL appear
- AND the `DELETE` request SHALL NOT be issued until the ADMIN confirms

### Requirement: Deleted Leads Disappear From Board, Detail, and Conversion

A lead with `active = false` MUST NOT appear on the Kanban board, MUST NOT be retrievable via the lead detail view, and MUST NOT be retrievable for manual conversion.

#### Scenario: Deleted lead disappears from the board

- GIVEN a lead was soft-deleted (`active = false`)
- WHEN the Kanban board is requested
- THEN that lead SHALL NOT appear in the board response

### Requirement: CRM Resync Revives a Soft-Deleted Lead

A CRM resync of the same `externalCrmId` as a previously admin-deleted lead MUST restore that lead's visibility on the board, detail view, and conversion flow by setting `active` back to `true`.

#### Scenario: Delete-then-resync revives the lead on the board

- GIVEN an ADMIN soft-deleted a lead (`active = false`) for `externalCrmId = "D1"`
- WHEN a CRM webhook resyncs `externalCrmId = "D1"`
- THEN `Lead.active` SHALL become `true`
- AND the lead SHALL reappear on the Kanban board
