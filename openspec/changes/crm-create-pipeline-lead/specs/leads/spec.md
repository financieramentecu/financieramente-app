## ADDED Requirements

### Requirement: Create a native pipeline lead
The CRM SHALL let a user with CRM management rights create a lead from Pipelines with validated basic contact data. It SHALL create an active `OPEN` lead in the active `NUEVO_LEAD` column, with no fabricated external CRM identifier.

#### Scenario: Successful creation
- **GIVEN** an authorized user and valid contact data
- **WHEN** the user saves **Nuevo lead**
- **THEN** the API returns the created lead, the dialog closes, and the board refreshes with the new lead when current filters include it.

#### Scenario: Invalid or empty contact
- **GIVEN** an empty contact or invalid email/field length
- **WHEN** creation is requested
- **THEN** the API SHALL reject it without writing a lead, and the form SHALL show an error.

### Requirement: Assign by write authority
A leaf Money Strategist's lead MUST be assigned to that creator. An administrator or team leader MAY select an active advisor within their existing write scope. Server authorization MUST use `manageableUserIds`; company-wide read grants MUST NOT grant assignment rights.

#### Scenario: Advisor creates their own lead
- **GIVEN** a leaf Money Strategist
- **WHEN** they create a lead without an assignee
- **THEN** the creator becomes its owner and the form does not offer another owner.

#### Scenario: Administrator or leader chooses an advisor
- **GIVEN** an administrator or a leader and an active advisor in their write scope
- **WHEN** they select that advisor and create the lead
- **THEN** the selected advisor owns the lead.

#### Scenario: Forged or out-of-scope assignment
- **GIVEN** a leaf submitting another owner, or a leader submitting an advisor outside their write scope
- **WHEN** creation is requested
- **THEN** the API SHALL return 403 without writes, including when the creator can read other branches.

#### Scenario: Inactive assignee
- **GIVEN** an assignee who does not exist or is inactive
- **WHEN** creation is requested
- **THEN** creation SHALL fail without a lead or origin pivot.

#### Scenario: No CRM mutation rights
- **GIVEN** an unauthenticated user, disabled CRM, or read-only role
- **WHEN** creation is requested
- **THEN** the existing CRM guard SHALL deny the request without writes and the UI SHALL not offer creation to read-only users.

### Requirement: Persist Propio origin atomically
Every manually created lead MUST use origin `Propio`, including its `LeadClientOrigin` association. The origin SHALL follow the existing catalog resolver semantics; inactive origins MUST NOT be silently reactivated. Creation SHALL be attributed to the authenticated actor.

#### Scenario: Persist origin and attribution
- **GIVEN** valid creation input and an available active `Propio` origin
- **WHEN** the lead is created
- **THEN** the lead and origin pivot SHALL be committed together and the audit SHALL identify the real creator.

#### Scenario: Unavailable configuration or failed persistence
- **GIVEN** an inactive `Propio` origin, missing active `NUEVO_LEAD` column, or persistence failure
- **WHEN** creation is attempted
- **THEN** no partial lead SHALL remain and the user SHALL receive a useful error.

### Requirement: Create and automatically relate repeated contacts
Manual creation MUST always create a distinct lead, including when an active lead already matches a nonempty submitted document, email or phone. The new lead MUST be related to every active match through an `AUTO` `LeadLink`, with the `Propio` origin, creator and timestamp, in the same transaction. Existing contacts and owners MUST remain unchanged; the new lead MUST retain its explicitly authorized advisor.

#### Scenario: Multiple existing contact matches
- **GIVEN** active leads matching any submitted document, email or phone
- **WHEN** manual creation is requested
- **THEN** the API SHALL return 201 for a distinct new lead and atomically link it to every matched lead without merging, overwriting or reassigning them.

#### Scenario: No contact match
- **GIVEN** no active lead matches the submitted contact fields
- **WHEN** manual creation is requested
- **THEN** creation SHALL succeed without creating relation rows.

#### Scenario: Exact nonempty matching
- **GIVEN** blank optional fields or an email containing SQL wildcard characters
- **WHEN** contact matches are queried
- **THEN** blank fields SHALL NOT match and case-insensitive email equality SHALL treat wildcard characters literally.

#### Scenario: Relation timeline from both endpoints
- **GIVEN** automatic links from the new lead to matching existing leads
- **WHEN** an authorized viewer opens any linked lead's timeline
- **THEN** its timeline SHALL display the corresponding relationship with creator and origin, without claiming that advisors are identical or copying other leads' activities.

#### Scenario: Relation persistence failure
- **GIVEN** failure while saving an automatic link
- **WHEN** creation is attempted
- **THEN** the transaction SHALL leave no partial new lead, origin association or links, and no success audit SHALL be recorded.

### Requirement: Recover from submission failure
The form SHALL prevent repeated submissions while saving and preserve input when the server rejects creation or the connection fails.

#### Scenario: Failed request
- **GIVEN** a completed form and a failed API request
- **WHEN** saving finishes
- **THEN** the dialog remains open, input is preserved, and an accessible error is shown.
