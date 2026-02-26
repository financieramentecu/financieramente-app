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
- **THEN** set `isClawback = true` on the record to maintain the historical penalty flag.
- **AND** DO NOT calculate or fetch any clawback percentage (it is not needed for Poliza).
- **AND** apply ONLY the global `discount_percentage` (no `commission_percentage` needed).

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

## Current vs Target Flow Comparison

The following table and diagram highlight the exact functional gaps between the current logic inside `process-batch.service.ts` and the new surgical rules defined in this V2 specification.

| Feature / Logic | Current Implementation (`process-batch.service.ts`) | Target Specification (V2) | Action Required |
| --- | --- | --- | --- |
| **Exact Duplicate Check** | ❌ **Missing.** If `isLag: false`, it simply evaluates dates and saves. Does not prevent multiple commissions for the exact same contract in the same month. | ✅ **Required.** Must query if a commission for the same contract and processing month/year already exists. If yes -> `ERROR UI`. | Add explicit query to `matcher.service.ts` and abort save if duplicate exists. |
| **Date Range Validation** | ⚠️ **Partial.** Validates that the business `createdAt` is exactly between the record's `desde` and `hasta`. | ✅ **Refined.** Must check if the *record date* is INSIDE the *processing month* context. | Update date logic to correctly map "processing month" validation. |
| **Clawback Flag** | ❌ **Missing.** Assigns `clawbackPercentage` but lacks an implicit or explicit `isClawback` boolean state toggle. | ✅ **Required.** Explicitly set `isClawback = true` on the `settlement_commission` when applicable. | Update Prisma `create` and `update` payloads for POLIZA to include this flag. |
| **Commission Percentage** | ❌ **Missing.** Hardcodes `commissionPercentage: null` in every single db `create` operation. | ✅ **Required.** Must inject `commissionPercentage` from active global config alongside discount. | Pass `commissionPercentage` through the snapshot object to all DB writes. |
| **Exclusivity Flow** | ⚠️ **Loose.** Recovers LAG, but evaluates conditions without strict hierarchy (duplicate check does not even exist). | ✅ **Strict.** Mutually exclusive IF/ELSE tree. Duplicate Check -> LAG Recovery -> Date Check. | Reorder the IF blocks to match the exact V2 flowchart (Rule Engine). |

### Comparative Diagram

```mermaid
flowchart TD
    subgraph Current Logic (process-batch.service.ts)
        direction TB
        C_Start([Record]) --> C_Type{File Type?}
        
        %% POLIZA Current
        C_Type -- POLIZA --> C_Poliza[Set origin_commission\nAssign clawback %]
        C_Poliza --> C_PCheckBiz{Biz Exists?}
        C_PCheckBiz -- No --> C_PLag[Save LAG]
        C_PCheckBiz -- Yes --> C_PSync[Save SYNC\n(Or LAG if dates fail)]
        
        %% VOLUNTARIA Current
        C_Type -- VOLUNTARIA --> C_Biz{Biz Exists?}
        C_Biz -- No --> C_Lag[Save LAG]
        C_Biz -- Yes --> C_CheckLag{Has prev LAG?}
        
        C_CheckLag -- Yes --> C_RecLag[Update prev SYNC\nSave new SYNC]
        C_CheckLag -- No --> C_Dates{Dates Match?}
        
        C_Dates -- Yes --> C_Sync[Save SYNC]
        C_Dates -- No --> C_Lag2[Save LAG]
        
        C_Lag & C_RecLag & C_Sync & C_Lag2 & C_PLag & C_PSync --> C_End((End))
        
        style C_CheckLag fill:#ffcccc,stroke:#cc0000
    end

    subgraph Target Spec V2 (Strict Rule Engine)
        direction TB
        T_Start([Record]) --> T_Type{File Type?}
        
        %% POLIZA Target
        T_Type -- POLIZA --> T_PPlan{Plan Text?}
        T_PPlan -- FRONT19 --> T_PCartera[origin = CARTERA]
        T_PPlan -- CLAW --> T_PClaw[isClawback = true\nNo % Clawback needed]
        T_PPlan -- Other --> T_PDefault[isClawback = false]
        
        T_PCartera & T_PClaw & T_PDefault --> T_PSave[Inject Discount Only\nSave with Contract ID]
        
        %% VOLUNTARIA Target
        T_Type -- VOLUNTARIA --> T_Biz{Biz Exists?}
        T_Biz -- No --> T_Lag[Save LAG]
        T_Biz -- Yes --> T_Comms{Prior Comms > 0?}
        
        T_Comms -- Yes --> T_Dup{Duplicate in\nSame Month?}
        T_Dup -- Yes --> T_Err[🛑 ERROR UI\nAbort Save]
        
        T_Dup -- No --> T_CheckLag{Has prev LAG?}
        T_CheckLag -- Yes --> T_RecLag[Update prev SYNC\nSave new SYNC]
        
        T_Comms -- No --> T_Dates{Inside Processing\nMonth?}
        T_Dates -- Yes --> T_Sync[Save SYNC]
        T_Dates -- No --> T_Lag2[Save LAG]
        
        T_CheckLag -- No --> T_Sync2[Save SYNC]
        
        T_Lag & T_Err & T_RecLag & T_Sync & T_Lag2 & T_Sync2 --> T_VSave[Inject Global Config\n(% Desc and % Com)\nSave with Contract ID]
        
        T_VSave & T_PSave --> T_End((End))
        
        style T_Dup fill:#cce5ff,stroke:#0066cc,stroke-width:2px
        style T_Comms fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    end
```