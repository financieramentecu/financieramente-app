# Delta for Contract Comments

## ADDED Requirements

### Requirement: CC-01 Comment ownership guard

Creating and reading comments on a business MUST pass the central business-access helper (SEC-03). A PARTNER MAY comment only on own businesses; an AGENTE only on businesses in self+subordinates scope (behavior change for agents). Denied requests MUST return 403/404 without writing a comment or audit event.

#### Scenario: Partner comments on own business

- GIVEN a partner and their business
- WHEN they post a valid comment
- THEN it is stored and audited

#### Scenario: Foreign business

- GIVEN a business of another owner outside the user's scope
- WHEN the user posts or reads comments
- THEN 403/404 and nothing is written

### Requirement: CC-02 Notification parity

Comment notifications involving a partner's business MUST be identical to those for an agent owner.

#### Scenario: Notify partner

- GIVEN a comment by a support user on a partner's business
- WHEN saved
- THEN the partner receives the same notification type as an agent
