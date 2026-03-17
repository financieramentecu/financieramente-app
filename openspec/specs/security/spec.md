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
