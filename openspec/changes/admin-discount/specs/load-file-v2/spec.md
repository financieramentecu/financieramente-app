# Delta for load-file-v2

This delta modifies how process-batch resolves discount and clawback percentages: source of truth becomes CommissionDiscount (one active per type) with fallback defaults. Main spec: `openspec/specs/load-file-v2/spec.md`.

## MODIFIED Requirements

### Requirement: Global Configuration Fetching

The system SHALL retrieve discount and clawback percentages from active CommissionDiscount records by type when saving any valid synchronized or LAG record. For type IMPUESTO the system SHALL use the active discount's percentage as `discount_percentage`; for type CLAWBACK the system SHALL use the active discount's percentage as `clawback_percentage`. When no ACTIVE CommissionDiscount exists for a type, the system SHALL use fallback 0.12 for IMPUESTO and 0.1 for CLAWBACK. The system SHALL store these values on the `settlement_commission` record. The system SHALL NOT store a global `commission_percentage` on the record. Specific logic paths (e.g. Poliza CLAW) MAY override the fetched values as defined in Poliza Special Derivations.

(Previously: the system retrieved the active CommissionConfiguration and stored discount_percentage and clawback_percentage from it.)

#### Scenario: Saving a new synchronized record with active discounts

- GIVEN a record is ready to be saved to SettlementCommission
- AND an ACTIVE CommissionDiscount exists for type IMPUESTO with percentage 0.12
- AND an ACTIVE CommissionDiscount exists for type CLAWBACK with percentage 0.1
- WHEN the system persists the record
- THEN the system SHALL resolve IMPUESTO percentage from the active CommissionDiscount (0.12) and store as discount_percentage
- AND SHALL resolve CLAWBACK percentage from the active CommissionDiscount (0.1) and store as clawback_percentage when applicable
- AND MUST NOT store commission_percentage on the record

#### Scenario: Saving when no active discount for a type (fallback)

- GIVEN a record is ready to be saved to SettlementCommission
- AND no ACTIVE CommissionDiscount exists for type IMPUESTO
- WHEN the system persists the record
- THEN the system SHALL use 0.12 for discount_percentage (fallback)
- AND when clawback is applicable and no ACTIVE CommissionDiscount exists for type CLAWBACK, SHALL use 0.1 for clawback_percentage (fallback)

### Requirement: Poliza clawback percentage persistence

The system SHALL persist the clawback percentage on the commission record for Poliza files according to the Plan de Compensación. Clawback percentage SHALL be 0 only when the Plan de Compensación includes "CLAW". For all other plans (e.g. FRONT19, or any other value), the system SHALL obtain the clawback percentage from the active CommissionDiscount for type CLAWBACK (or fallback 0.1 if none active) and SHALL store it on the settlement_commission record (clawback_percentage).

(Previously: clawback was obtained from the active CommissionConfiguration.)

#### Scenario: Plan does not contain CLAW — clawback from CommissionDiscount

- GIVEN a Poliza record is being saved as SYNCHRONIZED
- AND the "Plan de Compensación" does NOT contain "CLAW" (e.g. contains "FRONT19" or any other value)
- AND an ACTIVE CommissionDiscount exists for type CLAWBACK with percentage 0.1
- WHEN the system persists the record
- THEN the system SHALL set clawback_percentage on the commission to the value from the active CommissionDiscount (0.1)
- AND SHALL set isClawback to false

#### Scenario: Plan does not contain CLAW and no active CLAWBACK discount (fallback)

- GIVEN a Poliza record is being saved as SYNCHRONIZED
- AND the "Plan de Compensación" does NOT contain "CLAW"
- AND no ACTIVE CommissionDiscount exists for type CLAWBACK
- WHEN the system persists the record
- THEN the system SHALL set clawback_percentage on the commission to 0.1 (fallback)
- AND SHALL set isClawback to false

#### Scenario: Plan contains CLAW — clawback zero (unchanged)

- GIVEN a Poliza record is being saved as SYNCHRONIZED
- AND the "Plan de Compensación" contains "CLAW" (case-normalized)
- WHEN the system persists the record
- THEN the system SHALL set clawback_percentage to 0 on the commission
- AND SHALL set isClawback to true
