# Categories Specification

## Purpose

Manages Categories for agent grouping and presentation. A Category organizes agents under a CategoryType (e.g. commercial segment, product line). This is a NEW domain — the old `Category` hierarchy model is renamed to `Level`; this `Category` model is a new entity.

## Requirements

### Requirement: List active categories with pagination

The system SHALL expose a paginated endpoint to list Category records. By default only active categories (`status = true`) SHALL be returned. The system MUST support filter by `idCategoryType`.

#### Scenario: List returns active categories

- GIVEN active and inactive Category records exist
- WHEN `GET /api/categories` is called without filters
- THEN only categories with `status = true` SHALL be returned
- AND results SHALL be paginated

#### Scenario: Filter by idCategoryType

- GIVEN categories associated with multiple CategoryType records
- WHEN `GET /api/categories?idCategoryType=3` is called
- THEN only categories with `idCategoryType = 3` SHALL be returned

### Requirement: Create Category

The system MUST accept a create request for a Category. The `idCategoryType` FK MUST be provided and MUST reference an existing CategoryType. `name` is required.

#### Scenario: Create with valid payload

- GIVEN a valid `idCategoryType` and a unique `name` within that type
- WHEN `POST /api/categories` with `{ name, description?, status?, idCategoryType }`
- THEN the category is persisted and returned with HTTP 201

#### Scenario: Invalid idCategoryType rejected

- GIVEN no CategoryType exists with the given id
- WHEN `POST /api/categories` with a non-existent `idCategoryType`
- THEN the system SHALL return 422 with a descriptive error

#### Scenario: Missing required fields rejected

- GIVEN a payload missing `name` or `idCategoryType`
- WHEN `POST /api/categories` is called
- THEN the system SHALL return 400

### Requirement: Update Category

The system SHALL accept updates to `name`, `description`, `status`, and `idCategoryType`.

#### Scenario: Update name and description

- GIVEN a Category with id X
- WHEN `PUT /api/categories/X` with `{ name: "Updated", description: "New desc" }`
- THEN the category is updated and returned with HTTP 200

#### Scenario: Change idCategoryType

- GIVEN a Category with id X and `idCategoryType = 1`
- WHEN `PUT /api/categories/X` with `{ idCategoryType: 2 }`
- THEN the category is updated with the new type reference

### Requirement: Deactivate Category (soft delete)

The system MUST implement soft delete: set `status = false`. The system MUST NOT execute `prisma.category.delete()` in any code path.

#### Scenario: Deactivation sets status=false

- GIVEN an active Category with id X
- WHEN `PATCH /api/categories/X` with `{ status: false }`
- THEN the record is updated with `status = false` and returned with HTTP 200

#### Scenario: No physical delete

- GIVEN any deactivation request on a Category
- WHEN the request is processed
- THEN the record MUST remain in the database; `prisma.category.delete()` MUST NOT be called

### Requirement: Category has idCategoryType FK

Every Category MUST be associated with a CategoryType via `idCategoryType`. The system MUST enforce referential integrity; orphaned categories (without a valid CategoryType) MUST NOT be created.

#### Scenario: FK enforced on create

- GIVEN a CategoryType with id 5
- WHEN a Category is created with `idCategoryType = 5`
- THEN the category is persisted with the FK correctly set

#### Scenario: Cascade behavior on CategoryType deactivation

- GIVEN a CategoryType is deactivated (soft delete)
- WHEN categories associated with it are listed
- THEN the categories SHALL still be returned (their `status` is independent); no cascade delete occurs

### Requirement: Audit log on Category mutations

Every create, update, and deactivation of a Category MUST emit an audit event via `logAuditEvent()`. The following `AuditAction` values MUST be added: `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED`.

#### Scenario: Audit on create

- GIVEN an authenticated session
- WHEN a Category is created successfully
- THEN `logAuditEvent` is called with `action: CATEGORY_CREATED` and `details` including `name` and `id`

#### Scenario: Audit failure does not block operation

- GIVEN an internal error when writing to AuditLog
- WHEN a Category mutation occurs
- THEN the main operation SHALL still return 2xx; the audit error SHALL only be logged
