# Tasks: Load File Process Refactor V2

## 1. Domain Modeling and Validation
- [ ] 1.1 Review and update `src/features/load-file/lib/file-types.ts` to ensure exact column mapping for "Plan de Compensación".
- [ ] 1.2 Implement a robust utility for date parsing and range checking (processing month vs creation date).

## 2. Refactor Matcher Service
- [ ] 2.1 Update `matcher.service.ts` to expose methods for checking if a business has prior commissions.
- [ ] 2.2 Add method in `matcher.service.ts` to check for exact duplicate commissions within a date range for a specific contract.
- [ ] 2.3 Add method in `matcher.service.ts` to find existing LAG records for a contract.

## 3. Refactor Process Batch Service (The Core Logic)
- [ ] 3.1 Modify the `processAndSaveRecord` loop in `process-batch.service.ts` to implement the Voluntaria decision tree (Duplicate check -> LAG recovery -> Month range check -> Save).
- [ ] 3.2 Implement the exact rules for Poliza: `includes("FRONT19")` equals `CARTERA`, and `includes("CLAW")` fetching `clawback_percentage`.
- [ ] 3.3 Ensure the active `commission_configuration` is fetched at the batch level and `discountPercentage` / `commissionPercentage` are injected into every `prisma.settlementCommission.create` call.

## 4. Testing
- [ ] 4.1 Update `process-batch.service.test.ts` to cover the scenario: "Voluntaria duplicate commission returns ERROR".
- [ ] 4.2 Update `process-batch.service.test.ts` to cover the scenario: "Poliza with FRONT19 sets origin CARTERA".
- [ ] 4.3 Update `process-batch.service.test.ts` to cover the scenario: "Poliza with CLAW sets clawback_percentage".
- [ ] 4.4 Run full feature tests and verify 100% pass rate.