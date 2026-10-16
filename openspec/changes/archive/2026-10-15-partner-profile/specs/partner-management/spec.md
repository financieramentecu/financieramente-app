# Partner Management Specification

## Purpose

Admin lifecycle of external partners (role `PARTNER`, level `PARTNER_EXTERNAL`) in the Admin > Partners module: create, list, deactivate, reactivate, resend activation. Partners are managed ONLY here.

## Requirements

### Requirement: PM-01 Partner creation by admin

The system MUST let an ADMIN create a partner with: name, email (any domain), identity document, leader (required) and optional contact fields. On success the system MUST set role `PARTNER`, level `PARTNER_EXTERNAL`, category "Partner Externo", `active=true`, `activatedAt=null`, create an activation token (see AA-02) and send the activation email. The role, level and category MUST NOT be user-selectable; the category field MUST be shown locked.

#### Scenario: Successful creation

- GIVEN an ADMIN and an active LEVEL_3 user
- WHEN the admin submits valid partner data with that user as leader
- THEN a user with role PARTNER, level PARTNER_EXTERNAL, category "Partner Externo", `activatedAt=null` exists
- AND an activation email is sent and an audit event is written

#### Scenario: Non-admin cannot create

- GIVEN a user with role AGENTE or PARTNER
- WHEN they call the partner-create endpoint or action
- THEN the response is 403 and nothing is persisted

### Requirement: PM-02 Leader rules

The leader MUST be required. The leader candidates MUST be limited to active users whose level is LEVEL_1..LEVEL_5 (excluding LEVEL_0, GENERAL_LEVEL and PARTNER_EXTERNAL). The server MUST re-validate the leader regardless of the UI.

#### Scenario: Missing leader

- GIVEN the create form without leader
- WHEN submitted
- THEN validation fails with a Spanish error and no user is created

#### Scenario: Invalid leader level

- GIVEN a leader at LEVEL_0, GENERAL_LEVEL or an inactive user
- WHEN the create request is sent directly to the API
- THEN it is rejected (4xx) and nothing is persisted

### Requirement: PM-03 Partner can never be a leader

A user with level `PARTNER_EXTERNAL` MUST NOT be selectable or accepted as leader of any user, in any module.

#### Scenario: Partner as leader rejected

- GIVEN a partner P
- WHEN any create or update request names P as leader
- THEN the server rejects it and P does not appear in leader dropdowns

### Requirement: PM-04 Duplicate email or identity

The system MUST reject a partner whose email or identity number matches an existing user (case-insensitive email), without revealing sensitive data of that user beyond a field-level "already registered" message.

#### Scenario: Duplicate email

- GIVEN a user with email a@x.com
- WHEN the admin creates a partner with `A@x.com`
- THEN creation fails with an email-duplicate error and no token or email is produced

#### Scenario: Duplicate identity

- GIVEN a user with the same identity number
- WHEN the admin creates a partner with it
- THEN creation fails with an identity-duplicate error

### Requirement: PM-05 Partners list and deactivate/reactivate

The module MUST list partners with state: "Pendiente de activación" (`active` and no `activatedAt`), "Activo", "Desactivado". Deactivation and reactivation MUST be soft (`active` flag only), allowed to ADMIN only, and audited. Deactivation MUST invalidate all open tokens of the partner (AA-06).

#### Scenario: Deactivate

- GIVEN an active, activated partner
- WHEN the admin deactivates them
- THEN `active=false`, open tokens are invalidated, an audit event is written, and no row is deleted

#### Scenario: Reactivate activated partner

- GIVEN a deactivated partner with `activatedAt` set
- WHEN the admin reactivates them
- THEN `active=true` and they can log in with their existing password

### Requirement: PM-06 Resend activation

For a partner with `activatedAt=null` and `active=true`, an ADMIN MUST be able to resend activation: a new token is issued, previously open activation tokens are invalidated, and a new email is sent. Resend MUST be refused for already-activated or deactivated partners.

#### Scenario: Resend invalidates previous link

- GIVEN a pending partner with an open activation link L1
- WHEN the admin resends activation producing L2
- THEN L1 is rejected as invalid and L2 is accepted

#### Scenario: Resend on activated partner

- GIVEN a partner with `activatedAt` set
- WHEN the admin requests resend
- THEN the request is refused and no email is sent

### Requirement: PM-07 Partners managed only in the Partners module

The users module MUST NOT allow changing a partner's role, level or leader, and MUST NOT send its generic activation email to partners. It MUST NOT allow assigning role PARTNER or level PARTNER_EXTERNAL to any user. These rules MUST be enforced server-side.

#### Scenario: Users module edit blocked

- GIVEN a partner and an ADMIN in the users module
- WHEN the admin sends an update changing role, level or leader of that partner
- THEN the server rejects the change (4xx)

#### Scenario: Promote to partner blocked

- GIVEN an AGENTE user
- WHEN an update sets role PARTNER or level PARTNER_EXTERNAL via the users module
- THEN it is rejected

### Requirement: PM-08 Audit and soft delete

Every partner mutation (create, deactivate, reactivate, resend, activation, password set/reset) MUST write an audit event with user, IP, user agent and a human-readable detail. Physical deletion MUST NOT exist.

#### Scenario: Audit on create

- GIVEN a successful creation
- WHEN the operation completes
- THEN exactly one audit event of a partner-created action exists with the admin as actor

### Requirement: PM-09 Partner edit by admin

The system MUST let an ADMIN edit an existing partner in the Admin > Partners module: name, last name, identity document (type and number), phone and leader. The email MUST NOT be editable (it is the sign-in identifier). Role, level, category, `active` and `activatedAt` MUST NOT be changed by this operation. The leader rules of PM-02 and PM-03 MUST be re-validated server-side on every edit. Identity uniqueness (PM-04) MUST be enforced excluding the partner being edited. Editing MUST be allowed in any partner state (pending, active, deactivated). Every edit MUST write a `PARTNER_UPDATED` audit event listing the changed fields.

Added by product-owner decision on 2026-10-11.

#### Scenario: Edit contact data

- GIVEN an ADMIN and an existing partner
- WHEN the admin changes the phone and last name and saves
- THEN the partner has the new values
- AND role, level, category, email, `active` and `activatedAt` are unchanged
- AND one `PARTNER_UPDATED` audit event names the changed fields

#### Scenario: Change leader

- GIVEN a partner whose leader is an active LEVEL_2 user
- WHEN the admin selects an active LEVEL_4 user as the new leader
- THEN the partner's leader is the LEVEL_4 user

#### Scenario: Invalid leader rejected

- GIVEN a partner
- WHEN an edit names as leader an inactive user, a LEVEL_0 user, a GENERAL_LEVEL user, another partner, or the partner itself
- THEN the server responds 400 and nothing is persisted

#### Scenario: Email not editable

- GIVEN a partner
- WHEN an edit request includes a different email
- THEN the email is not changed

#### Scenario: Duplicate identity rejected

- GIVEN two partners A and B
- WHEN the admin edits A with B's identity document
- THEN the server responds 409 and nothing is persisted

#### Scenario: Non-admin cannot edit

- GIVEN a user with role AGENTE or PARTNER
- WHEN they call the partner-edit endpoint
- THEN the response is 403 and nothing is persisted

#### Scenario: Edit of a non-partner refused

- GIVEN a user whose role is not PARTNER
- WHEN the partner-edit endpoint is called with that user's id
- THEN the response is 404 and nothing is persisted
