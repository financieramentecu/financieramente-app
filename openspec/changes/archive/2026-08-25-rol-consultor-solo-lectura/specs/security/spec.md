# Delta for Security

## ADDED Requirements

### Requirement: Role-based authorization rejects mutations for read-only roles

Every mutating API route or service (create, update, delete, cancel, fund, export/download) MUST reject requests from a user whose role satisfies `isReadOnlyRole()` with HTTP 403, independent of any other role-based `ALLOWED_ROLES` list already governing that route. This check MUST be enforced server-side and MUST NOT rely on the client having disabled the corresponding UI control.

#### Scenario: Read-only role attempts a mutation via direct API call

- GIVEN an authenticated user whose role is read-only (`isReadOnlyRole(role) === true`)
- WHEN they call any mutating endpoint (create/update/delete/cancel/fund) or an export/download endpoint
- THEN the API MUST return HTTP 403 with a structured error body
- AND no state change or file MUST be produced

#### Scenario: Write-capable role is unaffected

- GIVEN an authenticated user whose role is not read-only and is otherwise authorized for the route
- WHEN they call the same mutating or export endpoint
- THEN the request SHALL proceed as before this change

### Requirement: Visibility bypass and write bypass are distinct helpers

The system MUST expose `isWriteBypassRole(role)` for authorizing writes (unchanged membership: existing admin-like roles only) and `isReadOnlyRole(role) || isWriteBypassRole(role)` for authorizing company-wide *visibility*. No code path MAY use a write-bypass check to authorize a write action for a role that is only visibility-bypassed, and no visibility bypass check MAY be reused to authorize a write.

#### Scenario: Read-only role gains visibility but not write authorization

- GIVEN a read-only role evaluated for company-wide visibility
- WHEN a visibility check runs (`isReadOnlyRole(role) || isWriteBypassRole(role)`)
- THEN the result SHALL be `true`
- AND a separate write-authorization check for the same role and action SHALL be `false`
