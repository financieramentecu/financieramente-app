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

### Requirement: Preserve existing contacts
Manual creation MUST NOT merge, reassign or overwrite another existing lead when its contact data matches. A contact conflict SHALL be rejected without disclosing another branch's contact data.

#### Scenario: Existing matching contact
- **GIVEN** an existing lead matching the submitted document, email or phone
- **WHEN** manual creation is requested
- **THEN** the API SHALL return a generic conflict and leave existing leads unchanged.

### Requirement: Recover from submission failure
The form SHALL prevent repeated submissions while saving and preserve input when the server rejects creation or the connection fails.

#### Scenario: Failed request
- **GIVEN** a completed form and a failed API request
- **WHEN** saving finishes
- **THEN** the dialog remains open, input is preserved, and an accessible error is shown.
