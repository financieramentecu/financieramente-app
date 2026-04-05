## MODIFIED Requirements

### Requirement: Category type field uses foreign key relationship
The `Category` model SHALL reference its type through a foreign key relationship to the `CategoryType` table (`idCategoryType`) instead of a hardcoded string field (`typeCategory`). The category form SHALL dynamically fetch available category types from the database.

#### Scenario: Category form loads available types dynamically
- **WHEN** an administrator opens the category creation or edit form
- **THEN** the "Tipo de Categoría" select field SHALL be populated with active `CategoryType` records fetched from the API
- **AND** SHALL NOT use hardcoded constant values

#### Scenario: Only active category types appear in form
- **WHEN** a category type has status Inactive
- **THEN** it SHALL NOT appear in the "Tipo de Categoría" dropdown for new or edited categories

#### Scenario: Existing categories retain their type after migration
- **WHEN** the data migration runs
- **THEN** all existing categories SHALL have their `typeCategory` string value mapped to the corresponding `CategoryType` record via the new `idCategoryType` FK
- **AND** no category SHALL lose its type association

### Requirement: Category list displays type name from relationship
The category list and detail views SHALL display the category type name resolved from the `CategoryType` relationship instead of a raw string value.

#### Scenario: Category list shows type name
- **WHEN** the administrator views the categories list
- **THEN** the "Tipo de Categoría" column SHALL display the name from the related `CategoryType` record

#### Scenario: Category filter by type uses CategoryType
- **WHEN** the administrator filters categories by type
- **THEN** the filter options SHALL be populated from active `CategoryType` records
