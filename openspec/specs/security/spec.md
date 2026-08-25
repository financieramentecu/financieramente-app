# Spec: security

## Purpose

Define role-based access control and authorization requirements for API routes in the platform.

---

## Requirements

### Requirement: Role Guard on POST /api/pre-liquidacion/procesar

The `POST /api/pre-liquidacion/procesar` route MUST enforce an `ALLOWED_ROLES` check: only `UserRole.ADMIN` and `UserRole.ASISTENTE_GERENCIA_OPERATIVA` MAY invoke the endpoint.

Any other authenticated role MUST receive HTTP 403 with a structured error body.

Unauthenticated requests MUST continue to receive HTTP 401 (existing behavior unchanged).

#### Scenario: Authorized role processes successfully

- GIVEN a request with a valid session where `role = ADMIN` or `role = ASISTENTE_GERENCIA_OPERATIVA`
- WHEN `POST /api/pre-liquidacion/procesar` is called with valid body
- THEN the endpoint proceeds and returns HTTP 200

#### Scenario: Unauthorized role is rejected

- GIVEN a request with a valid session where the user role is NOT in `ALLOWED_ROLES`
- WHEN `POST /api/pre-liquidacion/procesar` is called
- THEN HTTP 403 is returned with `{ error: "Forbidden" }` and no processing occurs

#### Scenario: Unauthenticated request is rejected

- GIVEN a request with no valid session
- WHEN `POST /api/pre-liquidacion/procesar` is called
- THEN HTTP 401 is returned (existing behavior, no regression)

---

## ADDED Requirements (from leads-crm-sync)

### Requirement: API-Key Authentication for Service-to-Service Endpoint

`POST /api/leads/crm-sync` MUST be the first inbound endpoint authenticated by a static API-key header instead of a user session. Requests without a valid key MUST be rejected before any Prisma access occurs.

#### Scenario: Session-authenticated request rejected on this endpoint

- GIVEN a request carrying a valid user session but no API-key header
- WHEN `POST /api/leads/crm-sync` is called
- THEN the request SHALL be rejected with HTTP 401
- (Session auth does not substitute for the API key on this endpoint.)

#### Scenario: Valid API key bypasses session requirement

- GIVEN a request with a valid API-key header and no user session
- WHEN `POST /api/leads/crm-sync` is called
- THEN the request SHALL be authorized and proceed to processing

### Requirement: Rate Limit Enforcement Returns 429

The system MUST enforce the in-memory sliding-window limiter on `POST /api/leads/crm-sync` and return HTTP 429 when exceeded, without leaking internal limiter state in the response body.

#### Scenario: Exceeding the limit returns 429

- GIVEN a caller has exceeded ~120 requests/minute for its API key
- WHEN another request is sent
- THEN the response SHALL be HTTP 429 with a generic error body

---

## ADDED Requirements (from rol-consultor-solo-lectura)

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
