# Delta for Pre-Liquidación

## ADDED Requirements

### Requirement: PL-01 Partner businesses excluded from distribution

Businesses whose PPC belongs to a PARTNER_EXTERNAL configuration MUST be excluded from pre-liquidation and commission distribution; no distribution rows or commissions are generated for them.

#### Scenario: Excluded

- GIVEN a load file containing a partner business and an agent business
- WHEN pre-liquidation processes the file
- THEN distribution exists only for the agent business

### Requirement: PL-02 File status still completes

A file containing partner businesses MUST still reach PRE-SETTLED and SETTLED; it MUST NOT remain stuck in SYNCHRONIZED. A file containing only partner businesses MUST also complete.

#### Scenario: Mixed file

- GIVEN a synchronized file with partner and agent businesses
- WHEN pre-liquidation completes
- THEN the file status is PRE-SETTLED

#### Scenario: Partner-only file

- GIVEN a file whose businesses are all partner businesses
- WHEN processed
- THEN the file reaches PRE-SETTLED without error

### Requirement: PL-03 Rezagado and cambio-origen do not throw

The rezagado and cambio-origen flows MUST handle partner businesses without throwing and without creating distribution.

#### Scenario: Rezagado

- GIVEN a partner business appearing as rezagado
- WHEN the flow runs
- THEN no exception and no distribution

#### Scenario: Cambio de origen

- GIVEN a partner business with a change of origin
- WHEN the flow runs
- THEN no exception and no distribution
