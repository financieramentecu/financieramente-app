# Partner Access Specification

## Purpose

What a PARTNER may see and do: deny-by-default allowlist, own-business scope, menu, dashboard, impersonation, notifications, and the accepted client-search risk.

## Requirements

### Requirement: PA-01 Deny-by-default allowlist

For role PARTNER, every dashboard page and every `/api` route MUST be denied unless explicitly allowlisted: Dashboard, Mis negocios (page and its negocios APIs scoped by ownership), session/auth endpoints, notification endpoints, and the catalogs required by the business form. Pages MUST redirect; API routes MUST return 403. The check MUST run in the Edge middleware for `/api` as well as pages.

#### Scenario: Denied pages

- GIVEN a logged-in partner
- WHEN they open Calculadora, Reportes, Liquidaciones, Mis distribuciones, or any Admin page
- THEN they are redirected and no page data is returned

#### Scenario: Denied API

- GIVEN a logged-in partner
- WHEN they call any admin, liquidaciones, reportes, pre-liquidacion, or non-allowlisted route
- THEN the response is 403

#### Scenario: New routes denied by default

- GIVEN a route not in the allowlist
- WHEN a partner requests it
- THEN it is denied

### Requirement: PA-02 Menu

The partner menu MUST contain only "Dashboard" and "Mis negocios".

#### Scenario: Menu content

- GIVEN a partner session
- WHEN the sidebar renders
- THEN exactly two entries are shown

### Requirement: PA-03 Calculadora excludes partner level

The calculadora level dropdown MUST NOT list `PARTNER_EXTERNAL` for any role.

#### Scenario: Dropdown

- GIVEN an ADMIN opens the calculadora
- WHEN the level dropdown loads
- THEN `PARTNER_EXTERNAL` is absent

### Requirement: PA-04 Own-business scope

A partner MUST create, list, export, edit, comment on, attach comprobantes to and mark novedad only on businesses whose owner (`idUser`) is the partner. Creation MUST force `idUser` to the session user, ignoring client input. Edit follows agent rules: only VENTA_EFECTUADA, EMITIDO or FONDEADO; key fields and contract locked after EMITIDO. The partner MUST NOT cancel a business. Detail of foreign businesses MUST respond as not found/403.

#### Scenario: Create for self

- GIVEN a partner submitting a business with another user's `idUser`
- WHEN the server processes it
- THEN the business is stored with the partner's id

#### Scenario: List and export

- GIVEN businesses of partner A, partner B and agents
- WHEN A lists or exports
- THEN only A's businesses appear in both

#### Scenario: Foreign access

- GIVEN a business of B
- WHEN A reads, edits, comments on, attaches comprobantes to, or marks novedad on it
- THEN each is rejected (403/404) with no mutation or audit entry

#### Scenario: Cancel

- GIVEN A's own business
- WHEN A attempts to cancel
- THEN the action is hidden in UI and rejected (403) server-side

#### Scenario: Locked fields

- GIVEN A's business in EMITIDO
- WHEN A edits key fields or contract
- THEN the change is rejected

### Requirement: PA-05 Notifications parity

Partners MUST receive the same notifications as agents for their own businesses (status, comments, novedad).

#### Scenario: Comment notification

- GIVEN a support user comments on a partner's business
- WHEN the comment is saved
- THEN the partner is notified as an agent owner would be

### Requirement: PA-06 Client search parity (accepted risk)

Client search for a partner MUST behave exactly as for an agent (not narrowed to own clients). This is a product-owner-accepted PII risk and MUST NOT be silently narrowed or widened.

#### Scenario: Search

- GIVEN a partner searching a client identity
- WHEN the search runs
- THEN results equal those an agent would get

### Requirement: PA-07 Partner dashboard

The partner dashboard MUST show metrics of their own businesses only and MUST NOT render the hierarchy sidebar or call the hierarchy tree for other users.

#### Scenario: No sidebar

- GIVEN a partner opens Dashboard
- WHEN it renders
- THEN no hierarchy sidebar appears and data covers only their businesses

### Requirement: PA-08 Impersonation ("Ver como")

Admins MAY impersonate a partner whose `active=true`, including partners pending activation. Impersonation MUST be blocked for deactivated partners. While impersonating, the PA-01 allowlist applies.

#### Scenario: Pending partner

- GIVEN a partner with `active=true`, `activatedAt=null`
- WHEN an ADMIN uses "Ver como"
- THEN the session starts as that partner

#### Scenario: Deactivated partner

- GIVEN a partner with `active=false`
- WHEN an ADMIN uses "Ver como"
- THEN it is refused
