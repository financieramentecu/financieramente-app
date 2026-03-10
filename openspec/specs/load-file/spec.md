# Specification: load-file

## Purpose

TBD

## Requirements

### Requirement: Architectural Separation

The system MUST isolate Excel parsing, validation, and business logic into a dedicated Application Service within `src/features/load-file/`. Next.js Route handlers MUST NOT contain business rules.

#### Scenario: Business logic execution

- **WHEN** an Excel batch is submitted for processing
- **THEN** the API route MUST instantiate the Application Service and delegate the execution
- **THEN** the API route MUST translate the service result into the standardized HTTP response

### Requirement: Standardized API Responses

The API endpoints for `load-file` (`/api/carga-archivos/...`) MUST exclusively return responses adhering to the `ApiResponse<T>` contract.

#### Scenario: Successful batch processing

- **WHEN** the Application Service returns a successful `ProcessBatchResponse`
- **THEN** the API MUST return a 200 HTTP status with a JSON payload matching `{ data: ProcessBatchResponse, error: undefined }`

#### Scenario: Failed batch processing

- **WHEN** the Application Service throws a Domain Error or validation fails
- **THEN** the API MUST return the appropriate HTTP error status (400 or 500) with a JSON payload matching `{ data: null, error: "error message" }`

### Requirement: English State Management

The system MUST use English status terms for file imports and settlement commissions to standardize data flow and tracking.

#### Scenario: File import sync process

- **WHEN** an Excel file is synchronized, even if some rows contain errors
- **THEN** the `FileImport` status MUST remain/become `LOAD`
- **AND** the `FileImport` status MUST ONLY transition to `COMPLETED` when the related commissions are fully liquidated

#### Scenario: Commission status tracking

- **WHEN** tracking individual commission lines within an import
- **THEN** their statuses MUST strictly be one of `LAG`, `SYNCHRONIZED`, `PRE-SETTLED`, or `SETTLED`

#### Scenario: Pre-liquidation file selection

- **WHEN** an admin navigates to the pre-liquidation screen
- **THEN** the screen MUST only list `FileImport` entries that are in `LOAD` status AND have associated `SYNCHRONIZED` commissions
