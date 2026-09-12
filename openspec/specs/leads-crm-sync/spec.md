# Leads CRM Sync Specification

## Purpose

Define the CRM-agnostic webhook ingestion contract at `POST /api/leads/crm-sync`, its authentication, rate limiting, and upsert/partial-merge/owner-resolution semantics.

## Requirements

### Requirement: API-Key Authentication

`POST /api/leads/crm-sync` MUST authenticate the caller via a static API-key header. The system MUST NOT use HMAC signatures or IP allowlisting for this endpoint.

#### Scenario: Valid API key accepted

- GIVEN a request with the correct API-key header
- WHEN the request is otherwise well-formed
- THEN the request SHALL proceed to payload validation

#### Scenario: Missing or invalid API key rejected

- GIVEN a request with a missing or incorrect API-key header
- WHEN `POST /api/leads/crm-sync` is called
- THEN the system SHALL return HTTP 401 and MUST NOT process the payload

### Requirement: Rate Limiting

The system MUST apply an in-memory sliding-window rate limit of approximately 120 requests per minute per API key.

#### Scenario: Requests within limit succeed

- GIVEN fewer than ~120 requests from the same key in the current window
- WHEN a new request arrives
- THEN it SHALL be processed normally

#### Scenario: Requests over limit are throttled

- GIVEN the key has exceeded ~120 requests in the current window
- WHEN another request arrives
- THEN the system SHALL return HTTP 429 without processing the payload

### Requirement: Payload Contract Validation

The system MUST require `externalCrmId` and `statusKey` in every payload. Optional fields (`name`, `lastName`, `email`, `phone`, `identityNumber`, `originTag`, `externalUrl`, `ownerEmail`, `outcomeStatus`) MAY be omitted or empty.

#### Scenario: Missing required field rejected

- GIVEN a payload missing `externalCrmId` or `statusKey`
- WHEN the request is validated
- THEN the system SHALL return a validation error and MUST NOT upsert any lead

### Requirement: Outcome Status Field in Webhook Contract

The webhook payload MUST accept an optional `outcomeStatus` field, agnostic of any CRM's raw vocabulary. The system MUST map accepted incoming values 1:1 onto the fixed internal enum `OPEN`, `WON`, `LOST`, `ABANDONED`, matched case-insensitively (e.g. `"won"`, `"WON"`, `"Won"` all resolve to `WON`). A value that does not map to any of the four accepted tokens MUST NOT be rejected by payload validation — consistent with the `statusKey` fallback philosophy, the system MUST still return success, MUST fall back the lead's `outcomeStatus` to `OPEN`, and MUST record the unrecognized value via `AuditLog` (`LEAD_OUTCOME_STATUS_UNRESOLVED`) so an admin can correct the mapping in n8n/CRM.

If the lead's currently stored `outcomeStatus` is already `WON`, the system MUST treat that value as terminal: a payload carrying any different `outcomeStatus` MUST NOT be rejected (the webhook MUST still return HTTP 200), but the `outcomeStatus` change MUST be silently discarded — `Lead.outcomeStatus` MUST remain `WON` — and the attempt MUST be recorded via `AuditLog` (`LEAD_OUTCOME_STATUS_LOCKED`). This lock is scoped to the `outcomeStatus` field only; all other payload fields (`statusKey`/funnel column, `ownerEmail`, contact data, etc.) MUST continue to be processed and persisted per their own requirements in the same request.

#### Scenario: Recognized outcomeStatus value maps to internal enum

- GIVEN a payload with `outcomeStatus = "won"`
- WHEN the payload is validated
- THEN it SHALL map to the internal enum value `WON`

#### Scenario: Unrecognized outcomeStatus value falls back to OPEN and is audited

- GIVEN a payload with `outcomeStatus = "in_review"`
- WHEN the webhook is processed
- THEN the response SHALL indicate success
- AND `Lead.outcomeStatus` SHALL be set to `OPEN`
- AND an `AuditLog` entry `LEAD_OUTCOME_STATUS_UNRESOLVED` SHALL be recorded

#### Scenario: Absent outcomeStatus does not fail validation

- GIVEN a payload with no `outcomeStatus` field
- WHEN the payload is validated
- THEN validation SHALL succeed and proceed to upsert

#### Scenario: Webhook for already-WON lead ignores new outcomeStatus but updates other fields

- GIVEN an existing lead with `outcomeStatus = "WON"`
- WHEN a new payload for the same `externalCrmId` carries `outcomeStatus = "LOST"` and a new `statusKey`
- THEN the response SHALL indicate success (HTTP 200)
- AND `Lead.outcomeStatus` SHALL remain `"WON"`
- AND the lead's funnel column SHALL be updated per the new `statusKey`
- AND an `AuditLog` entry `LEAD_OUTCOME_STATUS_LOCKED` SHALL be recorded

### Requirement: Upsert With Partial Merge by externalCrmId

The system MUST upsert the `Lead` by `externalCrmId`. Absent or empty optional fields in a payload MUST NOT overwrite previously stored non-empty values for those fields. No separate idempotency/event table is used; upsert is the sole idempotency mechanism.

#### Scenario: Repeated identical payload is idempotent

- GIVEN a lead already exists for `externalCrmId = "X"`
- WHEN the identical payload is POSTed again
- THEN the resulting lead state SHALL be unchanged

#### Scenario: Absent optional field preserves stored value

- GIVEN a lead with `phone = "3001234567"` already stored
- WHEN a new payload for the same `externalCrmId` omits `phone`
- THEN `Lead.phone` SHALL remain `"3001234567"` after the upsert

#### Scenario: Absent outcomeStatus preserves stored value on update

- GIVEN an existing lead with `outcomeStatus = "WON"`
- WHEN a new payload for the same `externalCrmId` omits `outcomeStatus`
- THEN `Lead.outcomeStatus` SHALL remain `"WON"` after the upsert

#### Scenario: New lead without outcomeStatus defaults to OPEN

- GIVEN no lead exists yet for `externalCrmId = "Y"`
- WHEN a payload without `outcomeStatus` creates that lead
- THEN `Lead.outcomeStatus` SHALL be `"OPEN"`

#### Scenario: Present outcomeStatus overwrites stored value

- GIVEN an existing lead with `outcomeStatus = "OPEN"`
- WHEN a new payload for the same `externalCrmId` carries `outcomeStatus = "lost"`
- THEN `Lead.outcomeStatus` SHALL become `"LOST"` after the upsert

### Requirement: Owner Resolution Without Sticky Owner

When `ownerEmail` is present and non-empty in a payload, the system MUST resolve it against `User.email` and write the result to `Lead.ownerId`, overwriting any previously assigned owner, regardless of whether it differs from the current owner. The system MUST NOT protect an existing owner from reassignment ("no sticky owner"). When `ownerEmail` is absent or empty, the existing `Lead.ownerId` MUST be preserved. When `ownerEmail` is present but matches no `User`, the webhook MUST still succeed, `Lead.ownerId` MUST be set to null, and the unmatched email MUST be recorded via `AuditLog` (`LEAD_OWNER_UNRESOLVED`).

#### Scenario: Present ownerEmail reassigns a different existing owner

- GIVEN a lead currently owned by user A
- WHEN a payload with `ownerEmail` resolving to user B is processed
- THEN `Lead.ownerId` SHALL be updated to user B
- AND an `AuditLog` entry `LEAD_OWNER_ASSIGNED` SHALL be recorded

#### Scenario: Absent ownerEmail preserves current owner

- GIVEN a lead currently owned by user A
- WHEN a payload without `ownerEmail` is processed
- THEN `Lead.ownerId` SHALL remain user A

#### Scenario: Unmatched ownerEmail does not block ingestion

- GIVEN a payload with `ownerEmail = "typo@example.com"` matching no `User`
- WHEN the webhook is processed
- THEN the response SHALL indicate success
- AND `Lead.ownerId` SHALL be null
- AND an `AuditLog` entry `LEAD_OWNER_UNRESOLVED` SHALL be recorded

### Requirement: Unmapped Status Fallback

When `statusKey` does not match any `LeadFunnelColumn.externalStatusKey`, the system MUST assign the lead to the fixed "Sin mapear" column and MUST still return success.

#### Scenario: Unknown statusKey routes to fallback column

- GIVEN a payload with `statusKey = "unknown_stage"` that matches no column mapping
- WHEN the webhook is processed
- THEN the lead SHALL be assigned to the "Sin mapear" column
- AND the response SHALL indicate success

### Requirement: Historical Timestamp Ingestion

`crmSyncPayloadSchema` MUST accept optional `createdAt` and `updatedAt` fields as offset-aware ISO 8601 strings only. A naive (offset-less) string MUST be rejected by payload validation. When either field is absent, the system MUST fall back to a single `receivedAt = new Date()` value computed once per request and shared by both fields' fallback resolution.

#### Scenario: Offset-aware createdAt accepted

- GIVEN a payload with `createdAt = "2023-01-15T10:00:00-05:00"`
- WHEN the payload is validated
- THEN validation SHALL succeed and the value SHALL be used to resolve the lead's `createdAt`

#### Scenario: Naive timestamp rejected

- GIVEN a payload with `createdAt = "2023-01-15T10:00:00"` (no offset)
- WHEN the payload is validated
- THEN the system SHALL return a validation error
- AND MUST NOT upsert any lead

#### Scenario: Absent timestamps fall back to receipt time

- GIVEN a payload with no `createdAt` and no `updatedAt`
- WHEN a new lead is created from that payload
- THEN `Lead.createdAt` and `Lead.updatedAt` SHALL both equal the request's `receivedAt`

### Requirement: createdAt Set Once on Create, Never Touched on Update

`upsertLeadFromCrm()` MUST resolve `createdAt` as `payload.createdAt ?? receivedAt` ONLY on the `create` branch of the upsert. The `update` branch MUST NOT include `createdAt` in its update data under any circumstance — even when the incoming payload carries a `createdAt` value, that value MUST be ignored for updates, with no comparison, no latch, and no provenance tracking of any kind. `Lead.createdAt` is therefore fully immutable from the moment a lead is first created. This relies on the historical-migration path guaranteeing a correct `createdAt` on each lead's very first sync; it deliberately closes the drift risk of a stale or incorrect resync silently overwriting a previously confirmed date with no audit trace.

#### Scenario: Create without createdAt falls back to receipt time

- GIVEN no lead exists yet for `externalCrmId = "H1"`
- WHEN a payload without `createdAt` creates that lead
- THEN `Lead.createdAt` SHALL equal the request's `receivedAt`

#### Scenario: Create with createdAt uses the payload value

- GIVEN no lead exists yet for `externalCrmId = "H2"`
- WHEN a payload with `createdAt = "2020-06-01T08:00:00-05:00"` creates that lead
- THEN `Lead.createdAt` SHALL equal `2020-06-01T08:00:00-05:00`

#### Scenario: Update ignores a createdAt value in the payload

- GIVEN a lead already exists for `externalCrmId = "H2"` with `createdAt = "2020-06-01T08:00:00-05:00"`
- WHEN a new payload for `externalCrmId = "H2"` carries a different `createdAt` value
- THEN `Lead.createdAt` SHALL remain `2020-06-01T08:00:00-05:00`, unchanged by the update

#### Scenario: Update without createdAt leaves the stored value unaffected

- GIVEN a lead already exists for `externalCrmId = "H3"` with a stored `createdAt`
- WHEN a new payload for `externalCrmId = "H3"` omits `createdAt`
- THEN `Lead.createdAt` SHALL remain unchanged

### Requirement: updatedAt Resolution on Every Sync

`upsertLeadFromCrm()` MUST resolve `updatedAt` as `payload.updatedAt ?? receivedAt` and MUST include it in BOTH the `create` and `update` branches of the upsert.

#### Scenario: updatedAt applied on create

- GIVEN no lead exists yet for `externalCrmId = "H2"`
- WHEN a payload with `updatedAt = "2020-06-02T08:00:00-05:00"` creates that lead
- THEN `Lead.updatedAt` SHALL equal `2020-06-02T08:00:00-05:00`

#### Scenario: updatedAt applied on update

- GIVEN a lead already exists for `externalCrmId = "H2"`
- WHEN a new payload with `updatedAt = "2020-06-03T08:00:00-05:00"` is POSTed for the same `externalCrmId`
- THEN `Lead.updatedAt` SHALL equal `2020-06-03T08:00:00-05:00`

### Requirement: Sync Forces Revival of Soft-Deleted Leads

`upsertLeadFromCrm()` MUST set `active: true` unconditionally in BOTH the `create` and `update` branches of the upsert, regardless of the lead's prior `active` value. `buildLeadUpsertData()` MUST NOT be modified to compute `active`; this resolution MUST live in the service.

#### Scenario: Resync revives a soft-deleted lead

- GIVEN an existing lead for `externalCrmId = "R1"` with `active = false`
- WHEN a new payload for `externalCrmId = "R1"` is processed
- THEN `Lead.active` SHALL become `true`

#### Scenario: Resync of an already-active lead is a no-op on active

- GIVEN an existing lead for `externalCrmId = "R2"` with `active = true`
- WHEN a new payload for `externalCrmId = "R2"` is processed
- THEN `Lead.active` SHALL remain `true`

### Requirement: Reactivation Audit on Revive Transition

When a sync's forced `active: true` causes an actual transition from `active = false` to `active = true`, the system MUST record an `AuditLog` entry with a new `AuditAction.LEAD_REACTIVATED` value. This entry MUST NOT be recorded when the lead was already `active = true` before the sync, and MUST NOT be recorded for the initial `create` branch (a newly created lead was never previously deleted).

#### Scenario: Revive transition is audited

- GIVEN an existing lead with `active = false`
- WHEN a CRM resync for the same `externalCrmId` sets `active` to `true`
- THEN an `AuditLog` entry with action `LEAD_REACTIVATED` SHALL be recorded

#### Scenario: Resync of an already-active lead does not emit a reactivation audit entry

- GIVEN an existing lead with `active = true`
- WHEN a CRM resync for the same `externalCrmId` is processed
- THEN no `AuditLog` entry with action `LEAD_REACTIVATED` SHALL be recorded

#### Scenario: New lead creation does not emit a reactivation audit entry

- GIVEN no lead exists yet for `externalCrmId = "R3"`
- WHEN a payload creates that lead
- THEN no `AuditLog` entry with action `LEAD_REACTIVATED` SHALL be recorded
