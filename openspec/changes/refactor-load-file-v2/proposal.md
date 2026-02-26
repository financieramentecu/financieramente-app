# Plan: Load File Process Refactor V2

## Context
The application needs to process commission files from Skandia (Voluntaria and Poliza). The current implementation needs an architectural refactor to handle complex business rules, such as identifying if a business has prior commissions to determine if a record is a duplicate, a recovered lag, or a new synchronized record. Additionally, Poliza files have special rules based on the "Plan de Compensación" column that dictate the `origin_commission` and `clawback_percentage`.

## Goal
Implement a robust, rule-based batch processing engine for Skandia files. The engine must evaluate each record against existing database state to determine its exact status (SYNCHRONIZED, LAG, or ERROR) and correctly map business rules like CLAWbacks and origin derivations before calculating pre-liquidation values.

## Scope
- Update the `processBatchService` (or create a V2) to support the new business logic flow.
- Support file types: `VOLUNTARIA` and `POLIZA`.
- Implement duplicate prevention for Voluntaria records.
- Implement LAG recovery logic.
- Implement Poliza-specific derivations (FRONT19_OMPEV -> CARTERA, CLAW -> Clawback percentage).
- Fetch and apply `commission_configuration` (discount and commission percentages) at the moment of saving the record.

## Non-Goals
- Altering the Pre-liquidation calculation engine (this spec focuses only on the Load File / Sync phase).
- Changing the frontend UI components (the UI should just receive the new backend responses).