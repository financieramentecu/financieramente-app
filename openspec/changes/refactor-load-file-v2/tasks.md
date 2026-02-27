# Tasks: Load File Process Refactor V2

## 1. Clean Code Database & Architecture Setup

- [ ] 1.1 Update `prisma/schema.prisma` mapping for `SettlementCommission`:
  - Add `startDate DateTime?` and `endDate DateTime?`.
  - Add `contract String? @db.VarChar(50)`.
  - Add `lagDate DateTime?`.
  - Add `isClawback Boolean @default(false)`.
  - Remove `commissionPercentage` column.
  - Remove `error` string column.
  - Update `status` to default to `PENDING` instead of expecting an `ERROR` state.
  - Ensure `commissionType` is strictly mapped without optional nulls.
- [ ] 1.2 Create new `FileImportError` model: `idFileImportError Int @id @default(autoincrement())`, `idFileImport Int` (relation to `FileImport`), `rowNumber Int`, `contract String?`, `reason String`, `rawData Json`. Run `npx prisma migrate dev`.
- [ ] 1.3 Review and update `src/features/load-file/lib/file-types.ts` to ensure exact column mapping for "Plan de Compensación".
- [ ] 1.4 Create `src/features/load-file/services/validators/row.validator.service.ts`. Extract fundamental format checks, empty value checks, String->Decimal transformations, and date range validations into this reusable unit.
- [ ] 1.5 Create `src/features/load-file/services/processors/processor.interface.ts`. Defines `ICommissionProcessor` ensuring unified returning of processing status and metrics increment values.

## 2. Refactor Processor Modules (Strategy Pattern)

- [ ] 2.1 Refactor Matcher logic: Update logic to verify past commissions exactly matching `startDate` and `endDate` scopes within the exact same `contract` string to detect duplicates. If matched, it's discarded, saved on `FileImportError` table with reason 'Duplicate commission' and increments `errorRecord` counter.
- [ ] 2.2 Create `src/features/load-file/services/processors/voluntaria.processor.ts`. Implements `ICommissionProcessor`. Contains logic isolated for VOLUNTARIA: business not found, date existence validation, anti-duplicate mapping, and LAG recovery.
- [ ] 2.3 Create `src/features/load-file/services/processors/poliza.processor.ts`. Implements `ICommissionProcessor`. Deals uniquely with business not found, LAG recovery, identifying FRONT19 -> CARTERA and CLAW overrides (`clawbackPercentage = 0`, `discountPercentage = 0`, `isClawback = true`).
- [ ] 2.4 Create `src/features/load-file/services/processors/processor.factory.ts`. Dynamically yields either the Voluntaria or Poliza processor singleton based strictly on `fileType`.

## 3. High-Level Batch Orchestrator Refactor

- [ ] 3.1 Refactor `process-batch.service.ts` to serve strictly as Coordinator. Purge massive native row extraction functions here. Initialize the Factory dynamically per request.
- [ ] 3.2 Live Default Sourcing: The orchestrator handles querying `CommissionConfiguration` ONCE per batch context to broadcast `discountPercentage` and `clawbackPercentage` parameters to processors.
- [ ] 3.3 Non-Blocking Error Safety Handler. Loop over rows feeding them to `row.validator.service.ts` and then the processor in a `try-catch`. Any business or format error seamlessly creates a new row in `FileImportError` with reason 'Error processing row' and increments `errorRecord`. The process loop continues gracefully.
- [ ] 3.4 Strict Metric Processing: Increment UI counts according to strictly formulated returned tuples:
  - Recovering a LAG increments `recoveredLagsRecord` and `synchronizedRecord`.
  - Format errors and Valid duplicate rejections log to `FileImportError` and increment `errorRecord`.
  - Valid business rule rejections (e.g., date out of range, business not found) save to `SettlementCommission` as `LAG` and increment `noSincronizadoRecord`.
- [ ] 3.5 Database Transactions: Use Prisma transactions strictly for multi-row creation scenarios (like old LAG recovery + new SYNC creation).
- [ ] 3.6 Create Error Retrieval Endpoint: Implement a new controller/service endpoint (e.g., `GET /api/carga-archivos/:id/errors`) to efficiently fetch and return the `FileImportError` records for a specific file import to supply the UI.

## 4. Testing

- [ ] 4.1 Update `process-batch.service.test.ts` to confirm Voluntaria scenario: "Duplicate commission in the same month triggers an error log entry in `FileImportError`, increments `errorRecord`, and prevents saving to the `SettlementCommission` DB".
- [ ] 4.2 Update tests to verify Voluntaria LAG logic correctly cascades through the `> 0 previous commissions` rules, increments `recoveredLagsRecord` and `synchronizedRecord` properly including recovered LAGs, and sets `lagDate`.
- [ ] 4.3 Update tests to cover Poliza scenario: "Poliza with FRONT19 correctly assigns CARTERA origin" and "Business not found saves as LAG and increments noSincronizadoRecord".
- [ ] 4.4 Update tests to firmly assert that Poliza records marked `CLAW` accurately force `discountPercentage = 0` and `clawbackPercentage = 0` and `isClawback = true` regardless of global settings.
- [ ] 4.5 Run full suite tests ensuring existing validations for empty fields remain intact during the refactor, correctly populating `FileImportError` and incrementing `errorRecord` without halting the batch process.
- [ ] 4.6 Verify that the `ERROR` status is no longer used or expected for `SettlementCommission`.
