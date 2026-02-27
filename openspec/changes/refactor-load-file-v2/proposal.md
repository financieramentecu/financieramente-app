# Plan: Load File Process Refactor V2

## Context

The application needs to process commission files from Skandia (Voluntaria and Poliza). The current implementation (`process-batch.service.ts`) has gaps: it loosely recovers lags but cannot detect exact duplicate commissions in the same month, does not persist the global commission percentage, and lacks some fields on settlement_commission table such as `startDate`, `endDate`, `contract`, `lagDate`, and `isClawback` explicit flag for penalty policies. This requires an architectural refactor.
Also we need to add a new table `file_import_error` to store the errors that occur during the file import process.
The process should be non-blocking, meaning that if an error occurs in a row, the process should continue with the next row without stopping.
The flow need to recalculate the metrics (sincronizadoRecord, noSincronizadoRecord, errorRecord, recoveredLagsRecord) after the process is finished.
Follow the diagram in `openspec/changes/refactor-load-file-v2/flow.md`.

## Goal

Implement a robust, strict rule-based batch processing engine ("Rule Engine") for Skandia files. The engine must evaluate each record with mutual exclusivity based on its File Type. For Voluntarias, it establishes a strict Duplicate -> Lag Recovery -> Date evaluation hierarchy. For Polizas, it forces origin derivations (CARTERA) and explicit penalty flags (CLAW).

# Scope

- Separate `process-batch.service.ts` entrypoints into distinct logic paths: **VOLUNTARIA** vs **POLIZA**.

**Excel columns**
Voluntaria: `Cto`, `Tipo de Comision`, `Base`, `Com`, `Desde`, `Hasta`
Poliza: `Contrato Largo`, `Plan de Compensación`, `BASE`, `Valor Comisión`

```
const FILE_TYPE_COLUMN_MAP = {
	[FILE_TYPES.POLIZA]: {
		contract: 'Contrato Largo',
		descripcion: 'Plan de Compensación',
		base: 'BASE',
		commission: 'Valor Comisión',
	},
	[FILE_TYPES.VOLUNTARIA]: {
		contract: 'Cto',
		descripcion: 'Tipo de Comision',
		base: 'Base',
		commission: 'Com',
		desde: 'Desde',
		hasta: 'Hasta',
	},
} as const
```

- **VOLUNTARIA Logic**:
  - Search the business on business table by contract number in the excel file, if the business is not found, it is marked as **no sincronizado** (incrementing that counter) and save the record on `SettlementCommission` like status `LAG` and is_lag = true, also save the contract = `Cto`, baseCommission = `Base`, comissionValue = `Com`, discountPercentage = 0, clawbackPercentage = 0, commissionType = `VOLUNTARIA`, start_date = `Desde`, end_date = `Hasta`, on `SettlementCommission` table.
  - if the business is found, search all commissions of that business in the `SettlementCommission` table by contract number `Cto`, don't use business id because some time could be empty.
  - if the business has commissions, we will check if the commission is not duplicate, ('Exact match duplicate prevention checks if a commission already exists matching the `contract` AND the newly extracted `startDate` and `endDate`') using the values from the Excel file `Cto`, `Desde`, `Hasta`. If matched, it's discarded and audited and save on `FileImportError` table with the reason 'Duplicate commission', and increment errorCount counter.
  - if the commission is not duplicate, we will check if there is a comission with status `LAG` and is_lag = true, if it is, we will update that record with status `SYNCHRONIZED`, search the discountPercentage from the `CommissionConfiguration` table and save it on the current record, set the `lagDate` to current date and inscrement counter **recoveredLagsRecord** counter. also we will save the current record with status `SYNCHRONIZED` and is_lag = false, also save the contract = `Cto`, baseCommission = `Base`, comissionValue = `Com`, clawbackPercentage = 0, commissionType = `VOLUNTARIA`, start_date = `Desde`, end_date = `Hasta`, on `SettlementCommission` table. the discountPercentage will be the default value from the `CommissionConfiguration` table, thats why we need to get the `CommissionConfiguration` table, also increment synchronizedRecord counter.
  - if the business doesn´t have any commission, we will check if the created date of the business is between the Excel's `Desde` and `Hasta`, if it is, we will save the record on `SettlementCommission` like status `SYNCHRONIZED` and is_lag = false, also save the contract = `Cto`, baseCommission = `Base`, comissionValue = `Com`, clawbackPercentage = 0, commissionType = `VOLUNTARIA`, start_date = `Desde`, end_date = `Hasta`, on `SettlementCommission` table. the discountPercentage will be the default value from the `CommissionConfiguration` table, thats why we need to get the `CommissionConfiguration` table, also increment synchronizedRecord counter.
  - if the business created date is not between the Excel's `Desde` and `Hasta`, it is marked as **no sincronizado** (incrementing that counter) and save the record on `SettlementCommission` like status `LAG` and is_lag = true, also save the contract = `Cto`, baseCommission = `Base`, comissionValue = `Com`, discountPercentage = 0, clawbackPercentage = 0, commissionType = `VOLUNTARIA`, start_date = `Desde`, end_date = `Hasta`, on `SettlementCommission`.
  - Each record must be processed independently, meaning that if an error occurs in a row, the process should continue with the next row without stopping, save the error on `FileImportError` table with the reason 'Error processing row'.
  - For Voluntaria, always clawbackPercentage = 0 and isClawback = false.
  - For the records that are with status `SYNCHRONIZED`, we need to get the discountPercentage from the `CommissionConfiguration` table and save it on the current record.

- **POLIZA Logic**:
  - Search the business on business table by contract number in the excel file, if the business is not found, it is marked as **no sincronizado** (incrementing that counter) and save the record like status `LAG` and is_lag = true, also save the contract = `Contrato Largo`, baseCommission = `BASE`, comissionValue = `Valor Comisión`, discountPercentage = 0, clawbackPercentage = 0, commissionType = `POLIZA`, start_date = null, end_date = null, on `SettlementCommission` table.
  - if the business is found, search all commissions of that business in the `SettlementCommission` table by contract number `Contrato Largo` and the status is `LAG` and is_lag = true, if it is, we will update that record with status `SYNCHRONIZED`, search the discountPercentage from the `CommissionConfiguration` table and save it on the current record, set the `lagDate` to current date and inscrement counter **recoveredLagsRecord** counter. also we will save the current record with status `SYNCHRONIZED` and is_lag = false and is_clawback = false, also save the contract = `Contrato Largo`, baseCommission = `BASE`, comissionValue = `Valor Comisión`, clawbackPercentage = 0, commissionType = `POLIZA`, start_date = null, end_date = null, on `SettlementCommission` table. the discountPercentage will be the default value from the `CommissionConfiguration` table, thats why we need to get the `CommissionConfiguration` table, also increment synchronizedRecord counter.
  - if the business doesn't have any commission in status `LAG` just save the record like status `SYNCHRONIZED` and is_lag = false and is_clawback = false, also save the contract = `Contrato Largo`, baseCommission = `BASE`, comissionValue = `Valor Comisión`, clawbackPercentage = 0, commissionType = `POLIZA`, start_date = null, end_date = null, on `SettlementCommission` table. the discountPercentage will be the default value from the `CommissionConfiguration` table, thats why we need to get the `CommissionConfiguration` table, also increment synchronizedRecord counter.
  - Each record commission when is `SYNCHRONIZED` MUST check the `Plan de Compensación` column, there are the follow cases
    - if the column `Plan de Compensación` contain `FRONT19` must save the record like originCommission = `CARTERA`, isClawback = false, clawbackPercentage = 0, discountPercentage = get discountPercentage from `CommissionConfiguration` table.
    - if the column `Plan de Compensación` contain `CLAW` text, must save the record like isClawback = true, clawbackPercentage = 0, discountPercentage = get discountPercentage from `CommissionConfiguration` table.
    - if the column `Plan de Compensación` doesn't have any prefix `CLAW` or `FRONT19` must save the record like isClawback = false, clawbackPercentage = 0, discountPercentage = get discountPercentage from `CommissionConfiguration` table.

- **Commission Configuration**: The `clawback_percentage` and `discount_percentage` values MUST be obtained from the active `CommissionConfiguration` table at the moment of registering a new commission row. The global `commissionPercentage` fetch is completely removed. Specific logic paths (e.g. `CLAW`) will explicitly override these fetched defaults when required.

- **Error Handling Redesign**: All processing validation errors (missing fields, duplicate matching, date overlaps) will **NOT** be saved with an `ERROR` status in `SettlementCommission`. Failed rows are discarded from the commission table and inserted into a dedicated **`FileImportError`** table.
  - **Non-Blocking Execution**: Encountering an error on a specific row will NEVER halt the file processing flow. The system will log the failure to `FileImportError`, increment the respective metric (`errorRecord` or `noSincronizadoRecord`), and gracefully continue processing the next row until the entire Excel file is finished.
  - **Error Structure & Retrieval**: A new schema model `FileImportError` is created containing: `idFileImportError`, `idFileImport` (relation), `rowNumber`, `contract`, `reason`, and `rawData` (Json). At the end of the sync, the batch processor returns only the **quantitative summary** (e.g. 5 errors). To display the details in the UI, a dedicated endpoint will query the `FileImportError` table cleanly by `idFileImport`, providing a fast, scalable list of failures.

- **Database Schema**:
  - Add `startDate DateTime?` to `SettlementCommission` (used only for Voluntaria).
  - Add `endDate DateTime?` to `SettlementCommission` (used only for Voluntaria).
  - Add `contract String @db.VarChar(50)` to `SettlementCommission`.
  - Add `lagDate DateTime?` to `SettlementCommission` (used only for Voluntaria).
  - Add `isClawback Boolean @default(false)`
  - Add **`FileImportError`** table linked to `FileImport`.
  - Remove `commissionPercentage` column.
  - Remove `error` string column.
  - Update `status` to default to `PENDING` instead of expecting an `ERROR` state.
  - Update `commissionType` to enforce only strictly `VOLUNTARIA` or `POLIZA` without optional nulls.
- **Code Standards**: Strictly follow `openspec/specs/base-standards.mdc` (TDD, Small steps, English-only for code, explicit type safety).
- **Error Handling Optimization**: Validation errors, format problems, and missing configurations will be persisted securely in a newly created **`FileImportError`** table, cleanly abstracting rejected data from valid commissions while preserving high-speed database indices.
  - **Non-Blocking Execution**: Encountering an error for a specific row NEVER halts the file load entirely. The loop traps the exception, explicitly logs the failure into `FileImportError`, increments the exact quantitative metric (`errorRecord` or `noSincronizadoRecord`), and confidently iterates onto the next valid row instantly.
- **Database Schema Updates**:
  - Add **`FileImportError`** model: `idFileImportError`, `idFileImport`, `rowNumber`, `contract`, `reason`, `rawData`.
  - Add `lagDate DateTime?` to `SettlementCommission` is optional nulls.
  - Ensure `commissionType` is strictly mapped without optional nulls.
- **Clean Code Architecture (Backend)**: Apply SOLID principles directly to the batch processing core (`process-batch.service.ts`). Split the monolithic procedural logic into discrete specific modules located in `processors/` and `validators/` directories. Utilize a Strategy/Factory pattern to cleanly execute POLIZA vs VOLUNTARIA logic.

## Non-Goals

- Altering the Pre-liquidation calculation engine (this spec focuses only on the Load File / Sync phase).
- Changing the frontend UI components (the UI should just receive the new backend responses).
