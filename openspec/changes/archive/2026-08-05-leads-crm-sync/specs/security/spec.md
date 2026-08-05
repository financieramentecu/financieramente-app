# Delta for Security

## ADDED Requirements

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
