# Plan: Load File Process Refactor V2

## Context
The application needs to process commission files from Skandia (Voluntaria and Poliza). The current implementation (`process-batch.service.ts`) has gaps: it loosely recovers lags but cannot detect exact duplicate commissions in the same month, does not persist the global commission percentage, and lacks the `isClawback` explicit flag for penalty policies. This requires an architectural refactor.

## Goal
Implement a robust, strict rule-based batch processing engine ("Rule Engine") for Skandia files. The engine must evaluate each record with mutual exclusivity based on its File Type. For Voluntarias, it establishes a strict Duplicate -> Lag Recovery -> Date evaluation hierarchy. For Polizas, it forces origin derivations (CARTERA) and explicit penalty flags (CLAW).

## Scope
- Update `process-batch.service.ts` (or create a V2) separating paths primarily by VOLUNTARIA vs POLIZA.
- Implement exact match duplicate prevention `ERROR UI` for Voluntaria records within the same processing month/year.
- Implement LAG recovery logic inside strict hierarchy.
- Implement Poliza-specific derivations: `FRONT19_OMPEV` -> CARTERA, `CLAW` -> Clawback percentage + `isClawback = true`.
- Fetch and apply universally the `commission_configuration` (`discountPercentage` and `commissionPercentage`) alongside the Contract ID in every database write.

## Non-Goals
- Altering the Pre-liquidation calculation engine (this spec focuses only on the Load File / Sync phase).
- Changing the frontend UI components (the UI should just receive the new backend responses).