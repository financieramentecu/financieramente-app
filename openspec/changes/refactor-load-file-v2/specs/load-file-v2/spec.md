## ADDED Requirements

### Requirement: Voluntaria Business Logic, Exclusivity, and Contract Persistence
The system SHALL evaluate each Voluntaria record. Control flow MUST be mutually exclusive (IF/ELSE IF/ELSE) to guarantee a record's status is evaluated exactly once and never overwritten by subsequent conditions. **Every saved record MUST persist the contract ID**, regardless of its final status (`SYNCHRONIZED` or `LAG`).

#### Scenario: Business exists and has duplicate commission (Same Month)
- **WHEN** processing a Voluntaria record
- **AND** the business exists and has > 0 prior commissions
- **AND** a commission with the same contract ID already exists in the **same processing month/year** (e.g., matching the month of the "Desde" column)
- **THEN** mark the record as ERROR, do not save it to DB, and immediately return to process the next record.

#### Scenario: Business exists with prior LAG record
- **WHEN** processing a Voluntaria record
- **AND** the business exists and has > 0 prior commissions
- **AND** there is a prior commission marked as `is_lag = true`
- **THEN** update the prior record to `SYNCHRONIZED` (`is_lag = false`) adding the business relation
- **AND** create the NEW record as `SYNCHRONIZED` (`is_lag = false`) associated with the business
- **AND** save the contract ID in the new record.
- **AND** immediately terminate evaluation for this record (return).

#### Scenario: Business exists but no prior commissions (Inside processing month)
- **WHEN** processing a Voluntaria record
- **AND** the business exists with 0 prior commissions
- **AND** the record date is INSIDE the processing month
- **THEN** create the new record as `SYNCHRONIZED` (`is_lag = false`) associated with the business
- **AND** save the contract ID.
- **AND** immediately terminate evaluation.

#### Scenario: Business exists but no prior commissions (Outside processing month)
- **WHEN** processing a Voluntaria record
- **AND** the business exists with 0 prior commissions
- **AND** the record date is OUTSIDE the processing month
- **THEN** create the new record as `LAG` (`is_lag = true`) associated with the business
- **AND** save the contract ID.
- **AND** immediately terminate evaluation.

#### Scenario: Business does NOT exist
- **WHEN** processing a Voluntaria record
- **AND** the business does NOT exist
- **THEN** create the new record as `LAG` (`is_lag = true`)
- **AND** save the contract ID.
- **AND** immediately terminate evaluation.

### Requirement: Poliza Special Derivations
The system SHALL apply specific rules based on the "Plan de Compensación" column for Poliza files.

#### Scenario: Plan contains FRONT19
- **WHEN** processing a Poliza record
- **AND** the "Plan de Compensación" contains "FRONT19" (normalized)
- **THEN** save the record with `origin_commission = "CARTERA"`.

#### Scenario: Plan contains CLAW
- **WHEN** processing a Poliza record
- **AND** the "Plan de Compensación" contains "CLAW"
- **THEN** fetch `clawback_percentage` from `commission_configuration` 
- **AND** save it to the record in the `clawback_percentage` field.
- **AND** set `isClawback = true` on the record to maintain the historical penalty flag.
- **AND** DO NOT calculate or deduct the clawback amount here (it will be calculated during pre-liquidation).

#### Scenario: Plan does NOT contain CLAW
- **WHEN** processing a Poliza record
- **AND** the "Plan de Compensación" does not contain "CLAW"
- **THEN** set `clawback_percentage = null`
- **AND** set `isClawback = false`.

### Requirement: Global Configuration Fetching
The system SHALL retrieve global commission settings before saving any valid record.

#### Scenario: Saving a new synchronized record
- **WHEN** a record is ready to be saved
- **THEN** the system MUST fetch the active `commission_configuration`
- **AND** store the `commission_percentage` and `discount_percentage` in the `settlement_commission` record.