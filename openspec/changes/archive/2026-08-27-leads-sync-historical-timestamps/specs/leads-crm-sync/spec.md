# Delta for Leads CRM Sync

## ADDED Requirements

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
