# Tasks: Load File Process Refactor V2

## 1. Domain Modeling and Validation
- [ ] 1.1 Review and update `src/features/load-file/lib/file-types.ts` to ensure exact column mapping for "Plan de Compensación".
- [ ] 1.2 Implement a robust utility for date parsing and range checking (processing month vs creation date) to validate if a record is INSIDE the current processing month context.

## 2. Refactor Matcher Service
- [ ] 2.1 Update `matcher.service.ts` to expose methods for checking if a business has prior commissions.
- [ ] 2.2 Add method in `matcher.service.ts` to check for exact duplicate commissions within the SAME processing month/year for a specific contract.
- [ ] 2.3 Add method in `matcher.service.ts` to find existing LAG records for a contract to recover them.

## 3. Refactor Process Batch Service (The Core Logic)
- [ ] 3.1 Modify the `processAndSaveRecord` loop in `process-batch.service.ts` to branch immediately into VOLUNTARIA vs POLIZA paths.
- [ ] 3.2 For VOLUNTARIA: Implement the strict, mutually exclusive decision tree: Exact Duplicate check (Abort with ERROR) -> LAG recovery -> Processing Month check -> Save as LAG or SYNC.
- [ ] 3.3 For POLIZA: Implement the exact derivations: `includes("FRONT19")` equals `CARTERA`, and `includes("CLAW")` equals fetching `clawback_percentage` AND explicitly setting `isClawback = true`.
- [ ] 3.4 Ensure the active `commission_configuration` (`discountPercentage` and `commissionPercentage`) is fetched at the batch level and injected into ALL `prisma.settlementCommission.create` and `update` calls, alongside the persistent Contract ID.

## 4. Testing
- [ ] 4.1 Update `process-batch.service.test.ts` to cover the Voluntaria scenario: "Duplicate commission in the same month returns ERROR UI and aborts save".
- [ ] 4.2 Update `process-batch.service.test.ts` to cover the Poliza scenario: "Poliza with FRONT19 sets origin CARTERA".
- [ ] 4.3 Update `process-batch.service.test.ts` to cover the Poliza scenario: "Poliza with CLAW sets both clawback_percentage and isClawback flag".
- [ ] 4.4 Update tests to verify that `commissionPercentage` is universally saved in the DB for all records.
- [ ] 4.5 Run full feature tests and verify 100% pass rate.