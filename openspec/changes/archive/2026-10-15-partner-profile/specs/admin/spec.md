# Delta for Admin

## ADDED Requirements

### Requirement: ADM-01 Users module guards for PARTNER

The users module endpoints (including `api/admin/users/[id]`) and UI MUST NOT allow: changing role, level or leader of a PARTNER; assigning role PARTNER or level PARTNER_EXTERNAL to anyone; sending the generic activation email to a PARTNER; and listing PARTNER_EXTERNAL users as leader candidates. Other field edits on a partner MAY remain allowed to ADMIN. See PM-07.

#### Scenario: Change partner role

- GIVEN a partner in the users module
- WHEN an update changes role, level or leader
- THEN rejected (4xx)

#### Scenario: Generic activation email

- GIVEN a partner
- WHEN "send activation" is triggered from the users module
- THEN refused; activation is only resent from Partners (PM-06)

#### Scenario: Leader dropdown

- GIVEN the users module leader selector
- WHEN loaded
- THEN no PARTNER_EXTERNAL user is listed

### Requirement: ADM-02 Partners entry in Admin

Admin MUST expose a "Partners" module (list, create, deactivate/reactivate, resend), visible to ADMIN only.

#### Scenario: Visibility

- GIVEN a non-admin
- WHEN opening the Admin area
- THEN the Partners entry is absent and its routes return 403
