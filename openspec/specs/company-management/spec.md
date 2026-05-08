# Specification: company-management

## Purpose
Define the behavior for managing companies (agencias) within the administrative module, including creation, editing, and deactivation (soft delete).

## Requirements

### Requirement: Flexible Currency Validation
The system MUST allow `idCurrency` to be provided as either a string or a number during company creation and updates. This ensures compatibility between form-based inputs (strings) and programmatically converted values (numbers).

#### Scenario: Update currency with numeric value
- GIVEN a company edit request
- WHEN the payload contains `idCurrency` as a number (e.g., 1)
- THEN validation MUST succeed
- AND the company's default currency SHALL be updated correctly

#### Scenario: Update currency with string value
- GIVEN a company edit request
- WHEN the payload contains `idCurrency` as a string (e.g., "1")
- THEN validation MUST succeed
- AND the company's default currency SHALL be updated correctly

### Requirement: Soft Delete for Companies
The system MUST implement deactivation as a "soft delete" mechanism. When a company is deleted, it MUST NOT be removed from the database; instead, its `status` MUST be set to `false` (Inactive).

#### Scenario: Deactivate a company
- GIVEN an active company
- WHEN a delete request is sent
- THEN the company's `status` MUST be updated to `false`
- AND the company SHALL remain in the database for historical reference

### Requirement: Prevent Deactivation with Active Products
The system MUST NOT allow the deactivation (soft delete) of a company if there are active products associated with it.

#### Scenario: Deactivation attempt with active products
- GIVEN a company that has at least one associated product with `status: true`
- WHEN a deactivation request is sent
- THEN the request MUST be rejected
- AND the system SHALL return a message: "Esta empresa está siendo utilizada en configuraciones activas. No se puede desactivar."

### Requirement: Company Name Editing
The system MUST allow the company's name to be edited during the update process. The system MUST ensure that the new name is unique and not used by any other active company (excluding the company being edited).

#### Scenario: Edit company name successfully
- GIVEN an existing company
- WHEN the user updates the name to a new, unique value
- THEN the update MUST succeed
- AND the company's name SHALL be updated in the database

#### Scenario: Edit company name to an existing name
- GIVEN an existing company
- WHEN the user updates the name to a value already used by another company
- THEN the request MUST be rejected
- AND the system SHALL return an error message indicating the name is already in use.
