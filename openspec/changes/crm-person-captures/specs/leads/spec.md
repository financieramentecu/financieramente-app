## ADDED Requirements

### Requirement: Separate source, referrer and capture
The system MUST preserve existing ClientOrigin acquisition attribution and support optional referrerName and idLeadCapture per Lead. Native creation MUST remain Propio. Existing labels MUST NOT be interpreted as capture or referrer.
#### Scenario: Independent attribution
- **GIVEN** a Propio Lead with a referrer and a configured capture
- **WHEN** the user views the opportunity
- **THEN** source, referrer and capture SHALL appear as independent values.
#### Scenario: Legacy integration and retry
- **GIVEN** existing leads and old webhook/CSV inputs without new fields
- **WHEN** ingestion or retry runs
- **THEN** it SHALL keep the existing response/idempotency behavior, preserve explicit attribution, and leave unknown fields null.

### Requirement: Configurable capture catalogue
Authorized origin administrators MUST manage capture name, presentation level and active status. Active options MUST be available to authorized lead users. Invalid/inactive new assignments MUST be rejected; historical assignments MUST remain readable.
#### Scenario: Deactivation and presentation
- **GIVEN** two captures assigned to separate related Leads
- **WHEN** an admin reorders levels or deactivates one catalogue entry
- **THEN** presentation SHALL reorder or remove that entry from new choices without deactivating, superseding or cancelling either Lead/capture assignment.
#### Scenario: Input validation
- **GIVEN** an unauthorized administrator or an invalid/duplicate name, negative level or inactive new assignment
- **WHEN** a write is attempted
- **THEN** it SHALL fail without partial writes.

### Requirement: One visible person card with distinct opportunities
Pipeline rendering and counts MUST group active visible LeadLink components, retain separate Lead identities, and provide opportunity selection in card/detail. Mutations other than group assignment MUST target the selected Lead.
#### Scenario: Two active captures
- **GIVEN** two linked visible Leads with different captures/stages
- **WHEN** the pipeline loads and the second capture is selected
- **THEN** one person card SHALL appear and detail/actions SHALL use the second idLead; both Leads SHALL stay active.
#### Scenario: Scoped projection and filters
- **GIVEN** a linked component containing invisible Leads and a filter matching one visible opportunity
- **WHEN** cards/counts/history are requested
- **THEN** the visible group SHALL appear once and no hidden IDs, contacts, counts or events SHALL be exposed.

### Requirement: Complete consolidated visible history with provenance
The timeline MUST merge all visible group activity, stage, change and ingress events with stable pagination, original timestamps, source Lead and actual persisted actor. Automatic events MUST show Sistema; unknown legacy actors MUST remain unknown.
#### Scenario: Interleaved events
- **GIVEN** two visible related Leads with interleaved events exceeding a page
- **WHEN** all timeline pages are loaded
- **THEN** every eligible event SHALL appear once in deterministic order with its source opportunity and author.
#### Scenario: Actor differs from strategist
- **GIVEN** a human other than the assigned strategist changes a Lead and an integration later updates it
- **WHEN** their events appear
- **THEN** they SHALL identify the actual human and Sistema respectively.

### Requirement: Single authorized strategist per related person
All creation, ingestion, manual relation and reassignment services MUST resolve the complete affected active LeadLink component, validate full write scope before any write and atomically maintain a consistent owner with per-record provenance. Hidden members MUST never be silently rewritten or disclosed.
#### Scenario: Explicit authorized owner wins
- **GIVEN** an existing group and a native manager explicitly selecting an advisor, or trusted ingestion resolving a valid ownerEmail
- **WHEN** a new capture arrives
- **THEN** that owner SHALL propagate atomically to all authorized affected Leads with real provenance, preserving acquisition/referrer attribution.
#### Scenario: Missing owner inherits
- **GIVEN** a matching group with one known owner and omitted or unmatched incoming owner
- **WHEN** native/webhook/landing/CSV ingestion creates another Lead
- **THEN** the new Lead SHALL inherit the known owner without clearing it or rewriting attribution.
#### Scenario: Full propagation and denial
- **GIVEN** a multi-hop group
- **WHEN** an authorized user reassigns it
- **THEN** every affected Lead SHALL change owner atomically with actual actor history.
- **GIVEN** one affected Lead falls outside write scope
- **WHEN** relation/reassignment/ingress attempts a group write
- **THEN** the entire operation SHALL fail generically without partial writes or hidden member identifiers.
#### Scenario: All contact matches and owner conflicts
- **GIVEN** several active Leads matching any supplied document, email or phone across multiple components
- **WHEN** native/webhook/CSV automatic matching runs
- **THEN** it SHALL include all corresponding Leads/components and link them only after full-write authorization and atomic owner resolution.
- **GIVEN** conflicting existing owners without an explicit authorized target
- **WHEN** a group write is attempted
- **THEN** it SHALL fail with generic 409 and no partial changes or silent owner choice.
#### Scenario: Concurrent group mutation
- **GIVEN** membership or ownership changes during a mutation
- **WHEN** the transaction commits
- **THEN** it SHALL retry safely or reject atomically rather than leave split ownership.

### Requirement: Landing capture identity remains idempotent and unambiguous
Landing submissions MUST preserve submissionId idempotency and legacy ambiguity rejection. Explicit capture matching MUST reuse that capture within a single persisted group or create a separate active linked opportunity for a different capture.
#### Scenario: Capture reuse and separate opportunities
- **GIVEN** one persisted person group with a capture opportunity
- **WHEN** a new submission names the same capture
- **THEN** it SHALL append its snapshot to that Lead without replacing attribution.
- **WHEN** a different capture is submitted
- **THEN** it SHALL create another linked active Lead without cancelling either opportunity.
#### Scenario: Ambiguous landing contacts
- **GIVEN** legacy ambiguous matches, or explicit capture candidates belonging to unrelated components
- **WHEN** a landing submission arrives
- **THEN** it SHALL return a conflict without committing a Lead, snapshot, ownership or origin mutation.
