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

---

## ADDED Requirements (from partner-profile)

### Requirement: SEC-01 Per-request session revalidation

Every authenticated request MUST re-verify that the user is still `active` and that role/level still match; an inactive or missing user MUST be treated as unauthenticated on that request.

#### Scenario: Deactivated user with live session

- GIVEN a valid session of a user later set `active=false`
- WHEN the next page or API request arrives
- THEN it is rejected (401 for API, redirect to login for pages)

### Requirement: SEC-02 Middleware covers /api

The middleware matcher MUST include `/api`. The PARTNER deny-by-default allowlist (PA-01) MUST apply only to role PARTNER; behavior for other roles MUST NOT change, and existing public/service endpoints (API-key, auth, webhooks) MUST remain reachable.

#### Scenario: Partner on non-allowlisted API

- GIVEN a PARTNER session
- WHEN calling a non-allowlisted `/api` route
- THEN 403

#### Scenario: Non-partner regression

- GIVEN an ADMIN or AGENTE session
- WHEN calling routes they could call before
- THEN behavior is unchanged

### Requirement: SEC-03 Central business-access helper

A single helper MUST decide whether the session user may access a business: ADMIN and privileged roles keep their current access; AGENTE and COACH-type roles may access only businesses in their visible scope (self plus subordinates); PARTNER only own. Every negocios sub-route (PUT, payments, annual-payments, edit page, mark-novedad, comments, supports/comprobantes) and `createBusiness` MUST use it, and MUST return 403/not-found on denial before any mutation.

#### Scenario: Agent outside scope (behavior change)

- GIVEN an AGENTE and a business owned by a user who is not self or subordinate
- WHEN the agent calls any of those sub-routes on it
- THEN the response is 403/404 (previously some routes allowed it)

#### Scenario: Agent inside scope

- GIVEN a business owned by a subordinate
- WHEN the leader agent edits it per agent rules
- THEN the request is allowed

#### Scenario: Create as partner

- GIVEN a PARTNER calling `createBusiness` with another `idUser`
- WHEN processed
- THEN `idUser` is forced to the session user

### Requirement: SEC-04 Secure token handling

Activation and reset tokens MUST NOT be logged and responses MUST NOT reveal account existence (see AA-02, AA-07, AA-08).

#### Scenario: Log hygiene

- GIVEN an activation request is processed
- WHEN logs and audit details are inspected
- THEN no raw token appears
