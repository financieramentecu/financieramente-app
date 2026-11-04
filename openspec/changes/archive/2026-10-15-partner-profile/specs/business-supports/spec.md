# Delta for Business Supports

## ADDED Requirements

### Requirement: BS-01 Comprobantes ownership guard

Uploading, listing, and deleting-by-status (soft) of supports/comprobantes MUST pass the central business-access helper (SEC-03). PARTNER: own businesses only. AGENTE: self+subordinates (behavior change). Denied requests return 403/404 with no write.

#### Scenario: Partner uploads to own business

- GIVEN a partner and their business
- WHEN they upload a comprobante
- THEN it is stored and audited

#### Scenario: Foreign business

- GIVEN a business outside the user's scope
- WHEN the user uploads or lists supports
- THEN 403/404 and no storage write

### Requirement: BS-02 Notification parity

Support-related notifications for partner businesses MUST match those for agents.

#### Scenario: Support notification

- GIVEN a support user acts on a partner's comprobante
- WHEN saved
- THEN the partner is notified as an agent would be
