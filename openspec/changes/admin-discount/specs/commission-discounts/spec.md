# Delta for Commission Discounts

This delta specifies the requirements and scenarios introduced by the admin-discount change. The main spec is `openspec/specs/commission-discounts/spec.md`.

## ADDED Requirements

### Requirement: CommissionDiscount model and one-active-per-type constraint

The system SHALL persist commission discounts in a `CommissionDiscount` model (table `commission_discount`) with fields: name (required), type (IMPUESTO | CLAWBACK), percentage (0.01–100), description (optional), status (ACTIVE | INACTIVE, default ACTIVE), timestamps, and optional createdBy/updatedBy. The system SHALL enforce that at most one discount per type has status ACTIVE (via partial unique index or equivalent application check).

#### Scenario: Create first active discount for a type

- GIVEN no ACTIVE CommissionDiscount exists for type IMPUESTO
- WHEN an administrator creates a discount with type IMPUESTO, percentage 12, name "Impuesto vigente", status ACTIVE
- THEN the system SHALL persist the record
- AND SHALL set status to ACTIVE

#### Scenario: Reject second active discount for same type

- GIVEN an ACTIVE CommissionDiscount already exists for type CLAWBACK
- WHEN an administrator attempts to create another discount with type CLAWBACK and status ACTIVE
- THEN the system SHALL reject the request (e.g. validation or unique constraint)
- AND SHALL NOT persist a second ACTIVE discount for CLAWBACK

#### Scenario: Inactivate then create new active for same type

- GIVEN an ACTIVE CommissionDiscount exists for type IMPUESTO
- WHEN the administrator inactivates it and then creates a new discount with type IMPUESTO and status ACTIVE
- THEN the system SHALL persist the new record as ACTIVE
- AND SHALL allow at most one ACTIVE per type at any time

### Requirement: Admin API for discounts

The system SHALL expose admin-scoped API routes under `app/api/admin/discounts/`: GET list of discounts, POST create, POST [id]/inactivate. Routes SHALL be protected by existing admin auth and role checks.

#### Scenario: List discounts

- GIVEN the user is an authenticated administrator
- WHEN the user requests GET /api/admin/discounts
- THEN the system SHALL return a list of CommissionDiscount records
- AND SHALL include at least: id, name, type, percentage, status, createdAt, createdBy (or equivalent), updatedAt, updatedBy

#### Scenario: Create discount (valid)

- GIVEN the user is an authenticated administrator
- AND no ACTIVE discount exists for the given type (or the request will inactivate the existing one first)
- WHEN the user sends POST /api/admin/discounts with valid payload (name, type, percentage 0.01–100, optional description, status)
- THEN the system SHALL create the CommissionDiscount
- AND SHALL return success with the created resource

#### Scenario: Create discount — validation error (percentage out of range)

- GIVEN the user is an authenticated administrator
- WHEN the user sends POST /api/admin/discounts with percentage outside 0.01–100
- THEN the system SHALL reject the request with validation error
- AND SHALL NOT persist the record

#### Scenario: Inactivate discount

- GIVEN the user is an authenticated administrator
- AND a CommissionDiscount with status ACTIVE exists with a given id
- WHEN the user sends POST /api/admin/discounts/[id]/inactivate
- THEN the system SHALL set status to INACTIVE for that record
- AND SHALL NOT allow edit or reactivate of inactive records (read-only for history)

#### Scenario: Unauthorized access to discount API

- GIVEN the user is not an administrator (or not authenticated)
- WHEN the user requests GET /api/admin/discounts or POST create/inactivate
- THEN the system SHALL respond with unauthorized (e.g. 401 or 403)

### Requirement: Admin UI entry and Descuentos page

The system SHALL provide an entry "Descuentos" under Administración in the dashboard, linking to `app/dashboard/admin/discounts/`. The discounts page SHALL list discounts with required columns and allow create and inactivate (with confirmation for inactivate).

#### Scenario: Admin sees Descuentos entry

- GIVEN the user is an authenticated administrator
- WHEN the user navigates to the admin section of the dashboard
- THEN the system SHALL display a "Descuentos" card (or link) that navigates to the discounts page

#### Scenario: List page shows required columns

- GIVEN the user is on the admin discounts page
- WHEN the list is loaded
- THEN the system SHALL display at least: Name, Type, Percentage, Status, Created at, Created by, Last modified, Modified by, Actions
- AND SHALL show "Inactivar" only for rows with status ACTIVE

#### Scenario: Inactivate with confirmation

- GIVEN the user is on the admin discounts page and a discount is ACTIVE
- WHEN the user clicks Inactivar
- THEN the system SHALL show a confirmation modal
- AND upon confirm SHALL call the inactivate API and SHALL update the list (and SHALL record audit log)

### Requirement: Audit log for discount actions

The system SHALL record audit log entries for discount lifecycle events. New actions SHALL be DISCOUNT_CREATED and DISCOUNT_INACTIVATED. Each entry SHALL include user, timestamp, and payload (or relevant details) in details.

#### Scenario: Audit on create

- GIVEN the user is an authenticated administrator
- WHEN a new CommissionDiscount is created via the API
- THEN the system SHALL create an AuditLog entry with action DISCOUNT_CREATED
- AND SHALL include in details at least: user (or userId), timestamp, and payload (e.g. name, type, percentage, id)

#### Scenario: Audit on inactivate

- GIVEN the user is an authenticated administrator
- WHEN an active CommissionDiscount is inactivated via the API
- THEN the system SHALL create an AuditLog entry with action DISCOUNT_INACTIVATED
- AND SHALL include in details at least: user (or userId), timestamp, and payload (e.g. discount id, previous status)

### Requirement: Migration path from CommissionConfiguration

The system SHALL migrate or deprecate existing CommissionConfiguration so that CommissionDiscount becomes the single source of truth for settlement percentages. If migration is chosen, the system SHALL ensure at least one ACTIVE discount per type exists after migration (or seed); process-batch SHALL use CommissionDiscount with fallback defaults when none active.

#### Scenario: Process-batch uses CommissionDiscount (see load-file-v2 delta)

- GIVEN process-batch is saving a synchronized or LAG record
- WHEN the system resolves discount and clawback percentages
- THEN the system SHALL resolve active CommissionDiscount by type (IMPUESTO → discountPercentage, CLAWBACK → clawbackPercentage)
- AND SHALL fall back to 0.12 for IMPUESTO and 0.1 for CLAWBACK when no ACTIVE discount exists for that type
