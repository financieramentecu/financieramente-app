# Account Activation Specification

## Purpose

Activation and password-reset tokens, the activation and forgot-password pages, the password rule, and the user-state matrix for email/password accounts.

## Requirements

### Requirement: AA-01 User state model

A user has two independent facts: `active` (admin switch) and `activatedAt` (set once when the user first sets a password via activation). The state matrix MUST be:

| State                              | active | activatedAt | Login   | Activation link | Forgot password            | Impersonation |
| ---------------------------------- | ------ | ----------- | ------- | --------------- | -------------------------- | ------------- |
| Pending                            | true   | null        | denied  | accepted        | generic response, no email | allowed       |
| Active                             | true   | set         | allowed | rejected        | email sent                 | allowed       |
| Deactivated (pending or activated) | false  | any         | denied  | rejected        | generic response, no email | blocked       |

Reactivation sets `active=true` and keeps `activatedAt`; resend (PM-06) applies only to Pending.

#### Scenario: Pending cannot log in

- GIVEN a partner with `active=true`, `activatedAt=null`
- WHEN they submit email and any password
- THEN login is denied with a generic message

#### Scenario: Deactivated cannot log in or activate

- GIVEN a deactivated partner holding a valid unexpired activation link
- WHEN they submit the link
- THEN it is rejected and `activatedAt` stays null

### Requirement: AA-02 Token generation and storage

Tokens MUST be 32 random bytes, delivered only in the email link, and persisted only as a SHA-256 hash with type (ACTIVATION or RESET), user, expiry and consumed marker. Activation tokens MUST expire in 72 hours and reset tokens in 1 hour.

#### Scenario: Raw token never stored

- GIVEN a created activation token
- WHEN the token table is read
- THEN no column contains the raw token, only its hash

#### Scenario: Expiry

- GIVEN an activation token older than 72h (or reset older than 1h)
- WHEN submitted
- THEN it is rejected as expired

### Requirement: AA-03 Single use and atomic consumption

A token MUST be consumable exactly once. Under concurrent submissions of the same token, at most one MUST succeed.

#### Scenario: Reuse

- GIVEN a consumed token
- WHEN submitted again
- THEN it is rejected with the same generic invalid-link message

#### Scenario: Concurrent submit

- GIVEN one valid token
- WHEN two requests set a password simultaneously
- THEN exactly one succeeds

### Requirement: AA-04 Activation flow

Submitting a valid activation token with a valid password MUST set the password hash, set `activatedAt`, consume the token and write an audit event. The user MUST then be able to log in.

#### Scenario: Activate

- GIVEN a Pending partner with a valid link
- WHEN they submit a compliant password
- THEN `activatedAt` is set, the token is consumed, and login succeeds

### Requirement: AA-05 Password rule

Any password set via activation or reset MUST be 8-72 characters and contain at least one lowercase letter, one uppercase letter, one digit, and one special character; validation MUST be enforced server-side with a Spanish message.

#### Scenario: Weak passwords rejected

- GIVEN passwords `abcdefgh`, `12345678` and `Abcdefgh` (missing a special character)
- WHEN each is submitted
- THEN each is rejected and the token is not consumed

#### Scenario: Compliant password

- GIVEN `Abcd1234!`
- WHEN submitted with a valid token
- THEN it is accepted

### Requirement: AA-06 Invalidation of open tokens

Resend (PM-06) MUST invalidate earlier activation tokens of that user. Deactivation MUST invalidate all open tokens. A completed reset MUST invalidate other open reset tokens of that user.

#### Scenario: Deactivate invalidates

- GIVEN a user with an open reset token
- WHEN an admin deactivates the user
- THEN the token is rejected even if unexpired

### Requirement: AA-07 Forgot password for every email/password user

The forgot-password flow MUST apply to every active, activated user who signs in with email and password (ADMIN, AGENTE with a password, PARTNER). It MUST NOT be offered to, and MUST NOT send an email or create a password for, accounts with `ssoOnly=true`, unknown emails, Pending or Deactivated users. The response MUST be identical in all cases (no account enumeration).

#### Scenario: Agent with password

- GIVEN an AGENTE with a stored password, active and activated
- WHEN they request a reset
- THEN a reset email is sent and the response is the generic message

#### Scenario: SSO-only account

- GIVEN a user with `ssoOnly=true`
- WHEN a reset is requested for their email
- THEN no token is created, no email is sent, and the response is identical to the unknown-email response

#### Scenario: Reset cannot create a password for SSO

- GIVEN an `ssoOnly=true` account and a forged reset submission
- WHEN processed
- THEN no password hash is stored

### Requirement: AA-08 Generic responses and rate limiting

Forgot-password, activation and reset endpoints MUST return indistinguishable responses for existing and non-existing accounts, and MUST be rate limited per IP and per email, returning 429 beyond the limit. Rate-limit storage MUST be shared across instances or the limitation documented.

#### Scenario: Limit exceeded

- GIVEN more forgot-password requests than the limit in the window
- WHEN another arrives
- THEN HTTP 429 is returned and no email is sent

### Requirement: AA-09 Login requires active and activated, revalidated per request

Credential login MUST succeed only if `active && activatedAt`. Every authenticated request MUST re-check `active` (and role/level) so deactivation takes effect on the very next request with an existing session.

#### Scenario: Immediate loss of access

- GIVEN a logged-in partner with a valid session
- WHEN an admin deactivates them and the partner sends the next request
- THEN the request is rejected (401/redirect to login)

#### Scenario: Reactivation

- GIVEN a deactivated, previously activated user
- WHEN reactivated
- THEN login with the old password succeeds

### Requirement: AA-10 Pages and email content

The system MUST provide public pages for activation and forgot/reset password with Spanish user-facing text; emails MUST use a link built from the configured base URL and MUST NOT include the password.

#### Scenario: Invalid link page

- GIVEN an expired or consumed link
- WHEN the page is opened
- THEN a generic Spanish "enlace inválido o vencido" message is shown without account details
