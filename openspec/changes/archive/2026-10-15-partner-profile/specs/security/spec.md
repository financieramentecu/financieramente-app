# Delta for Security

## ADDED Requirements

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
