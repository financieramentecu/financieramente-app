# Lead Funnel Columns Specification

## Purpose

Define admin CRUD for `LeadFunnelColumn`, its mapping to CRM `externalStatusKey` values, ordering, deletion guards, and the fixed "Sin mapear" fallback column.

## Requirements

### Requirement: Column CRUD by Admin

Administrators MUST be able to create, rename, reorder (`position`), and soft-delete `LeadFunnelColumn` records from the Administración/Configuración section. Each column MUST have a unique `externalStatusKey`.

#### Scenario: Admin creates a column

- GIVEN an admin submits a new column with `name` and a unique `externalStatusKey`
- WHEN the column is created
- THEN it SHALL appear in the funnel with the given `position`
- AND an `AuditLog` entry `LEAD_FUNNEL_COLUMN_CREATED` SHALL be recorded

#### Scenario: Duplicate externalStatusKey rejected

- GIVEN a column already exists with `externalStatusKey = "won"`
- WHEN an admin attempts to create or update another column with `externalStatusKey = "won"`
- THEN the operation SHALL be rejected with a validation error

#### Scenario: Admin renames or reorders a column

- GIVEN an existing column
- WHEN an admin updates its `name` or `position`
- THEN the change SHALL persist
- AND an `AuditLog` entry `LEAD_FUNNEL_COLUMN_UPDATED` SHALL be recorded

### Requirement: Fixed "Sin mapear" Column

The system MUST maintain a non-deletable "Sin mapear" column that receives leads whose `statusKey` matches no mapping. It MUST NOT be removable via the admin CRUD UI.

#### Scenario: Sin mapear deletion blocked

- GIVEN the "Sin mapear" column
- WHEN an admin attempts to delete it
- THEN the system SHALL reject the deletion

### Requirement: Deletion Guard for Active Leads

A `LeadFunnelColumn` with active (non-soft-deleted) leads assigned MUST NOT be deletable.

#### Scenario: Deletion blocked when column has active leads

- GIVEN a column with at least one active lead assigned
- WHEN an admin attempts to delete that column
- THEN the deletion SHALL be rejected with an explanatory error

#### Scenario: Deletion allowed when column is empty

- GIVEN a column with zero active leads assigned
- WHEN an admin deletes it
- THEN the column SHALL be soft-deleted
