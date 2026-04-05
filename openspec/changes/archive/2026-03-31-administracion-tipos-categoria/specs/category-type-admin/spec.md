## ADDED Requirements

### Requirement: List category types with pagination and search
The system SHALL display a paginated list of all category types showing name, description, status, and creation date. The administrator SHALL be able to search category types by name and filter by status.

#### Scenario: View category types list
- **WHEN** an authenticated administrator navigates to the "Tipo de Categoría" section in the Administration module
- **THEN** the system SHALL display a paginated table with all category types ordered by creation date descending

#### Scenario: Search category types by name
- **WHEN** the administrator enters a search term in the search field
- **THEN** the system SHALL filter the list to show only category types whose name contains the search term

#### Scenario: Filter by status
- **WHEN** the administrator selects a status filter (Active/Inactive)
- **THEN** the system SHALL display only category types matching the selected status

### Requirement: Create a category type successfully
The system SHALL allow administrators to create a new category type with the following fields: Name (required, text), Description (optional, text), Status (required, default Active). Upon successful creation, the system SHALL display a confirmation toast.

#### Scenario: Create category type with valid data
- **WHEN** the administrator clicks "Nuevo Tipo de Categoría"
- **AND** fills the form with Name (required), Description (optional), and Status (default Active)
- **AND** clicks "Guardar"
- **THEN** the system SHALL save the new category type
- **AND** SHALL display the message "Tipo de categoría creado exitosamente"
- **AND** SHALL redirect to the list view showing the new record

#### Scenario: Create category type with only required fields
- **WHEN** the administrator fills only the Name field and leaves Description blank
- **AND** clicks "Guardar"
- **THEN** the system SHALL save the category type with a null description

### Requirement: Prevent duplicate category type names
The system SHALL NOT allow creating or updating a category type with a name that already exists in the system (case-insensitive).

#### Scenario: Attempt to create category type with duplicate name
- **WHEN** a category type with name "MMS" already exists
- **AND** the administrator attempts to create a new category type with name "MMS"
- **AND** clicks "Guardar"
- **THEN** the system SHALL NOT save the record
- **AND** SHALL display the error message "Ya existe un tipo de categoría con ese nombre"
- **AND** SHALL keep the form open with the entered data

#### Scenario: Attempt to update category type to an existing name
- **WHEN** category types "MMS" and "Aliado" exist
- **AND** the administrator edits "Aliado" and changes its name to "MMS"
- **THEN** the system SHALL NOT save the update
- **AND** SHALL display the error message "Ya existe un tipo de categoría con ese nombre"

### Requirement: Edit an existing category type
The system SHALL allow administrators to edit the name, description, and status of an existing category type.

#### Scenario: Update category type details
- **WHEN** the administrator navigates to edit a category type
- **AND** modifies the name or description
- **AND** clicks "Guardar"
- **THEN** the system SHALL save the changes
- **AND** SHALL display a confirmation message "Tipo de categoría actualizado exitosamente"

### Requirement: Deactivate category type with usage warning
The system SHALL allow deactivating a category type that is referenced by existing categories, but SHALL display an informational warning. Deactivated category types SHALL NOT appear in dropdowns for new category assignments.

#### Scenario: Deactivate category type with active references
- **WHEN** the administrator edits a category type with status "Active"
- **AND** that category type is referenced by existing categories in the system
- **AND** changes the status to "Inactive"
- **AND** clicks "Guardar"
- **THEN** the system SHALL save the status change
- **AND** SHALL display an informational alert: "Esta categoría está siendo utilizada. Los registros existentes no se verán afectados"
- **AND** the category type SHALL NOT be available for new assignments

#### Scenario: Deactivate category type without references
- **WHEN** the administrator deactivates a category type that has no associated categories
- **THEN** the system SHALL save the status change
- **AND** SHALL NOT display any usage warning

#### Scenario: Reactivate a deactivated category type
- **WHEN** the administrator changes an inactive category type back to Active
- **THEN** the system SHALL save the status change
- **AND** the category type SHALL appear again in dropdowns for new assignments

### Requirement: Category type API endpoints
The system SHALL expose RESTful API endpoints for managing category types, following the `ApiResponse<T>` standard and requiring authentication.

#### Scenario: GET list endpoint
- **WHEN** a GET request is made to `/api/category-types` with optional query params (page, pageSize, search, status)
- **THEN** the system SHALL return a paginated list of category types with `ApiResponse<CategoryTypeListResponse>`

#### Scenario: POST create endpoint
- **WHEN** a POST request is made to `/api/category-types` with valid body (name, description, status)
- **THEN** the system SHALL create the category type and return `ApiResponse<CategoryType>` with status 201

#### Scenario: GET single endpoint
- **WHEN** a GET request is made to `/api/category-types/[id]`
- **THEN** the system SHALL return the category type details with `ApiResponse<CategoryType>`

#### Scenario: PUT update endpoint
- **WHEN** a PUT request is made to `/api/category-types/[id]` with updated fields
- **THEN** the system SHALL update the record and return `ApiResponse<CategoryType>`
- **AND** SHALL include `hasReferences: true` flag if the type is being deactivated and has associated categories

#### Scenario: Unauthorized access
- **WHEN** an unauthenticated request is made to any category-type endpoint
- **THEN** the system SHALL return status 401 with error "Unauthorized"
