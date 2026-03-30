# Delta: Pre-liquidación — `preliquidacion-beneficiario-categoria-clawback`

## ADDED Requirements

### Requirement: Category beneficiary mode

Each `Category` SHALL have `beneficiaryMode` with values `UPLINE_CHAIN` or `FIXED_BENEFICIARY`. For `FIXED_BENEFICIARY`, `idFixedBeneficiaryUser` MUST reference an existing user suitable for that category (SHALL be active unless product explicitly allows otherwise). For `UPLINE_CHAIN`, `idFixedBeneficiaryUser` SHOULD be null; if present, pre-liquidación MUST ignore it for resolution.

#### Scenario: Fixed category requires user

- GIVEN a `Category` with `beneficiaryMode === FIXED_BENEFICIARY` and a valid `idFixedBeneficiaryUser`
- WHEN pre-liquidación resolves the beneficiary for a distribution row targeting that category
- THEN the resolved user SHALL be that fixed user

#### Scenario: Upline category matches chain

- GIVEN a `Category` with `beneficiaryMode === UPLINE_CHAIN`
- AND the upline chain from `business.user` contains exactly one user whose `idCategoria` equals that category’s `idCategory` (first from agent toward root)
- WHEN pre-liquidación resolves the beneficiary for that distribution row
- THEN the resolved user SHALL be that chain member

### Requirement: Distribution row beneficiary persistence

Every `ComissionDistribution` created in pre-liquidación SHALL have non-null `idBeneficiaryUser` set to the resolved beneficiary for that row’s distribution category.

#### Scenario: Beneficiary stored with amounts

- GIVEN pre-liquidación successfully processes a registro
- WHEN `ComissionDistribution` rows are persisted
- THEN each row SHALL have `idBeneficiaryUser` set per category rules
- AND no row SHALL be written without a beneficiary

### Requirement: Block registro when beneficiary cannot be resolved

If **any** active `ProductPercentageCommissionCategory` for that settlement’s PPC yields an unresolved beneficiary (`FIXED_BENEFICIARY` without valid fixed user, or `UPLINE_CHAIN` with no matching chain user), the system SHALL NOT create any `ComissionDistribution` for that `SettlementCommission`, SHALL NOT update that registro to `PRE-SETTLED`, and SHALL NOT create `Clawback` rows for it in that attempt.

#### Scenario: Missing upline match

- GIVEN a registro and a distribution category with `UPLINE_CHAIN`
- AND no user in the upline chain has that category’s `idCategory`
- WHEN pre-liquidación runs for that registro
- THEN the registro SHALL remain `SYNCHRONIZED`
- AND no distributions or clawbacks SHALL be created for that registro in that run

#### Scenario: Fixed mode misconfigured

- GIVEN a category with `FIXED_BENEFICIARY` and null or invalid `idFixedBeneficiaryUser`
- WHEN pre-liquidación evaluates that registro’s PPC rows
- THEN the registro SHALL be blocked as above

### Requirement: Clawback user equals distribution beneficiary

Whenever pre-liquidación creates a `Clawback` row for a `ComissionDistribution`, `Clawback.idUser` SHALL equal that distribution’s `idBeneficiaryUser`. The system MUST NOT assign clawback to the file uploader.

#### Scenario: Clawback aligns with row beneficiary

- GIVEN a `Clawback` row is created for a distribution in pre-liquidación
- WHEN persisted
- THEN `Clawback.idUser` SHALL equal `ComissionDistribution.idBeneficiaryUser` for that row

### Requirement: Distribution detail exposes beneficiary

The pre-liquidación distribution detail (API consumed by the modal) SHALL include, per distribution line, enough data to show the beneficiary’s display name when available.

#### Scenario: API includes beneficiary for UI

- GIVEN `GET` distribution detail for a `SettlementCommission` with distributions
- WHEN the response is built
- THEN each line item SHALL include beneficiary display fields derived from the stored beneficiary user

## MODIFIED Requirements

### Requirement: Clawback row and balance user

(Previously: every `Clawback.idUser` was `business.user.idUser`.)

The system SHALL associate each `Clawback` row created in pre-liquidación with the **beneficiary user of that distribution row** (`ComissionDistribution.idBeneficiaryUser`), resolved from category rules. The system MUST NOT use the file uploader for `Clawback`. In pre-liquidación the system SHALL NOT create or update `ClawbackBalance`.

#### Scenario: Clawback not always the business owner

- GIVEN a Poliza registro where a distribution row’s beneficiary resolves to user `U` (not necessarily `business.user`)
- WHEN a `Clawback` row is created for that distribution
- THEN `Clawback.idUser` SHALL be `U`
- AND SHALL NOT create or update `ClawbackBalance` in pre-liquidación

### Requirement: Pre-liquidación data access for flow and user

(Previously: sufficient to load `business.user` only for Clawback.)

The system SHALL load data needed to build the upline chain from `business.user` (including `idCategoria` and leader linkage) and SHALL load each active PPC row’s `Category` (including `beneficiaryMode` and fixed-beneficiary fields) before starting the transactional write for that registro.

#### Scenario: Query supports beneficiary resolution

- GIVEN pre-liquidación fetches a registro to process
- WHEN the service prepares beneficiary resolution
- THEN it SHALL have access to `business.user` with category and leader fields needed for the chain
- AND each PPC category configuration SHALL include linked `Category` beneficiary fields

### Requirement: Configuration error report in response

When `procesarPreLiquidacion` completes with at least one configuration error, the response SHALL include `registrosConError: { idSettlementCommission, categoryCode, errorCode }[]` describing each failed registro. When there are no errors the list SHALL be empty (not absent).

#### Scenario: Response includes error list

- GIVEN `procesarPreLiquidacion` runs and one or more registros fail due to config errors
- WHEN the operation completes
- THEN the response SHALL contain `registrosConError` with one entry per failed registro
- AND each entry SHALL include `idSettlementCommission`, `categoryCode`, and `errorCode`

#### Scenario: No errors — empty list

- GIVEN all registros resolve successfully
- WHEN the operation completes
- THEN `registrosConError` SHALL be an empty array

### Requirement: Configuration error modal in UI

The pre-liquidación UI SHALL display a dismissible modal after `procesarPreLiquidacion` when `registrosConError.length > 0`. The modal SHALL list affected registros with their category and error reason so the operator knows what to fix.

#### Scenario: Modal shown after partial failure

- GIVEN `procesarPreLiquidacion` returns `registrosConError` with at least one entry
- WHEN the response is received in the UI
- THEN a modal SHALL appear listing the failed registros
- AND the operator SHALL be able to dismiss it

#### Scenario: No modal when all succeed

- GIVEN `procesarPreLiquidacion` returns `registrosConError: []`
- WHEN the response is received
- THEN no error modal SHALL appear

## MODIFIED Requirements

### Requirement: FileImport advances to PRE-SETTLED only when all records are settled

(Previously: `FileImport.status` was always set to `PRE-SETTLED` at the end of `procesarPreLiquidacion`.)

`FileImport.status` SHALL advance to `PRE-SETTLED` **only if zero `SYNCHRONIZED` registros remain** for that file after processing. If any registros remain `SYNCHRONIZED` (due to configuration errors), the file SHALL stay in its current state. Re-running pre-liquidation on the same file SHALL only process remaining `SYNCHRONIZED` records.

#### Scenario: File advances when all records succeed

- GIVEN `procesarPreLiquidacion` runs and all SYNCHRONIZED registros resolve successfully
- WHEN the transaction commits
- THEN `FileImport.status` SHALL be `PRE-SETTLED`

#### Scenario: File stays when some records fail

- GIVEN `procesarPreLiquidacion` runs and at least one registro has a configuration error
- WHEN the operation completes
- THEN `FileImport.status` SHALL remain unchanged
- AND only the successfully processed registros SHALL be `PRE-SETTLED`

#### Scenario: Re-run only processes remaining SYNCHRONIZED

- GIVEN a file with some registros already `PRE-SETTLED` and some still `SYNCHRONIZED`
- WHEN `procesarPreLiquidacion` is triggered again for the same file
- THEN only `SYNCHRONIZED` registros SHALL be processed
- AND already-`PRE-SETTLED` registros SHALL NOT be modified

## REMOVED Requirements

(None — previous scenarios for Poliza CARTERA / no-CLAW / CLAW clawback amounts and flows remain; **owner of clawback** is superseded by MODIFIED “Clawback row and balance user”.)
