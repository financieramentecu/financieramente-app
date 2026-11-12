# Lead Activities Specification (delta over `codex/negocios-basic-crm`)

## MODIFIED Requirements

### Requirement: Client-Submittable Events

The client MAY submit `NOTE_ADDED`, `CALL_LOGGED`, `MEETING_LOGGED`, `EMAIL_LOGGED`, `WHATSAPP_LOGGED`. Any other type MUST be rejected with 400. Logged types MUST carry `summary` (plain text, 1-2000 chars, no HTML) and MAY carry `outcome`, `durationMinutes` (1-600) and `occurredAt` (not in the future; default now).

#### Scenario: Logged call
- GIVEN an AGENTE with a lead in scope
- WHEN they POST `{ type: CALL_LOGGED, payload: { summary: "Interesado", outcome: "CONNECTED" } }`
- THEN a `lead_activity` row SHALL exist with that type and `occurredAt` = now

#### Scenario: Lifecycle type from client
- WHEN a client POSTs `{ type: TASK_COMPLETED, ... }`
- THEN the API SHALL respond 400

#### Scenario: Read-only role
- GIVEN a CONSULTOR
- WHEN they POST any activity
- THEN the API SHALL respond 403

### Requirement: Timeline Includes Stage Changes

`GET /api/leads/[id]/activities` MUST return `LeadActivity` events and `LeadStageHistory` rows (kind `STAGE_CHANGED`, with from/to column names and source) merged by `occurredAt` desc, deterministic on ties, with cursor pagination. Legacy `iso|id` cursors MUST still be accepted.

#### Scenario: Mixed timeline
- GIVEN a stage change at 10:00 and a call logged at 11:00
- WHEN the timeline is requested
- THEN the call SHALL be first and the stage change second

## ADDED Requirements

### Requirement: Last Activity Timestamp

`Lead.lastActivityAt` MUST be set, in the same transaction, to the event's `occurredAt` when the event type counts as contact (`NOTE_ADDED`, `*_LOGGED`, `TASK_COMPLETED`, `CONVERTED`) and the value is newer than the current one. The webhook and CSV import SHALL NOT write it, and no synced lead field SHALL change.
