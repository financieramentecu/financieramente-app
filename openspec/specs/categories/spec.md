# Categories

## Purpose

Define how commission categories are created and edited, including beneficiary mode (`UPLINE_CHAIN` vs `FIXED_BENEFICIARY`) and fixed-beneficiary user linkage for pre-liquidación resolution.

## Requirements

### Requirement: Category beneficiary mode fields on create and edit

When creating or editing a `Category`, the system SHALL allow the operator to set `beneficiaryMode` (`UPLINE_CHAIN` | `FIXED_BENEFICIARY`) and, when applicable, `idFixedBeneficiaryUser`.

The system SHALL enforce: if `beneficiaryMode === FIXED_BENEFICIARY`, then `idFixedBeneficiaryUser` MUST reference an existing, active user before the category is persisted. If `idFixedBeneficiaryUser` is null or missing and `beneficiaryMode === FIXED_BENEFICIARY`, the operation SHALL be rejected with a validation error.

#### Scenario: Create category with FIXED_BENEFICIARY and valid user

- GIVEN an operator submits a new category form with `beneficiaryMode = FIXED_BENEFICIARY` and a valid active `idFixedBeneficiaryUser`
- WHEN the form is submitted
- THEN the category SHALL be persisted with both fields
- AND the fixed beneficiary user SHALL be associated to the category

#### Scenario: Create category with FIXED_BENEFICIARY and no user

- GIVEN an operator submits a new category with `beneficiaryMode = FIXED_BENEFICIARY` and no `idFixedBeneficiaryUser`
- WHEN the form is submitted
- THEN the system SHALL reject the request with a clear validation error
- AND no category SHALL be persisted

#### Scenario: Create category with UPLINE_CHAIN

- GIVEN an operator submits a new category with `beneficiaryMode = UPLINE_CHAIN`
- WHEN the form is submitted
- THEN the category SHALL be persisted; `idFixedBeneficiaryUser` SHALL be ignored even if provided
- AND the system SHALL NOT require a fixed user

#### Scenario: Edit category changes mode from UPLINE_CHAIN to FIXED_BENEFICIARY

- GIVEN an existing category with `beneficiaryMode = UPLINE_CHAIN`
- WHEN an operator updates it to `FIXED_BENEFICIARY` and provides a valid user
- THEN the update SHALL be persisted with both new values

### Requirement: Category form defaults

When `beneficiaryMode` is not explicitly provided on creation, the system SHALL default to `UPLINE_CHAIN`.

#### Scenario: Default mode on creation

- GIVEN an operator creates a category without specifying `beneficiaryMode`
- WHEN the category is persisted
- THEN `beneficiaryMode` SHALL be `UPLINE_CHAIN`

### Requirement: System category type shows linked user

When the UI displays category information and the category's `CategoryType` is the designated system type (identified by the product-defined convention), the UI SHALL show the linked fixed-beneficiary user (name and email) as a read-only display field when `beneficiaryMode === FIXED_BENEFICIARY` and a user is configured.

For non-system category types, showing the linked user is optional and at product discretion.

#### Scenario: System type category with fixed user

- GIVEN a category whose `CategoryType` is the system type AND `beneficiaryMode === FIXED_BENEFICIARY` with a configured user
- WHEN an operator views that category in the admin UI (crear / editar)
- THEN the linked user's name and email SHALL be displayed as read-only fields

#### Scenario: System type category without fixed user

- GIVEN a category whose `CategoryType` is the system type AND no fixed user is configured
- WHEN an operator views that category
- THEN the UI SHALL indicate that no system user is linked (empty or placeholder state)

#### Scenario: Non-system type category

- GIVEN a category whose `CategoryType` is not the system type
- WHEN an operator views that category
- THEN showing the linked user is not required by the system
