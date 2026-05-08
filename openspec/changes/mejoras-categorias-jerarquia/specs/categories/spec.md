# Delta for categories

> Base spec: `openspec/specs/categories/spec.md`
> Change: `mejoras-categorias-jerarquia`

---

## MODIFIED Requirements

### Requirement: Category beneficiary mode fields on create and edit

When creating or editing a `Category`, the system SHALL allow the operator to set `beneficiaryMode` (`OVERRIDE` | `BENEFICIARIO_GENERAL`) and, when applicable, `idFixedBeneficiaryUser`.

The system SHALL enforce: if `beneficiaryMode === BENEFICIARIO_GENERAL`, then `idFixedBeneficiaryUser` MUST reference an existing, active user before the category is persisted. If `idFixedBeneficiaryUser` is null or missing and `beneficiaryMode === BENEFICIARIO_GENERAL`, the operation SHALL be rejected with a validation error.

When `beneficiaryMode === OVERRIDE`, the system SHALL NOT require `idFixedBeneficiaryUser`. Any provided value SHALL be ignored and MUST NOT be persisted.

The UI form SHALL show the fixed-beneficiary user selector ONLY when `beneficiaryMode === BENEFICIARIO_GENERAL` is selected. When the mode is switched to `OVERRIDE`, the selector SHALL be hidden and its value SHALL be cleared.

#### Scenario: Create category with BENEFICIARIO_GENERAL and valid user
- GIVEN an operator submits a new category form with `beneficiaryMode = BENEFICIARIO_GENERAL` and a valid active `idFixedBeneficiaryUser`
- WHEN the form is submitted
- THEN the category SHALL be persisted with both fields
- AND the fixed beneficiary user SHALL be associated to the category

#### Scenario: Create category with BENEFICIARIO_GENERAL and no user
- GIVEN an operator submits a new category with `beneficiaryMode = BENEFICIARIO_GENERAL` and no `idFixedBeneficiaryUser`
- WHEN the form is submitted
- THEN the system SHALL reject the request with a clear validation error
- AND no category SHALL be persisted

#### Scenario: Create category with OVERRIDE
- GIVEN an operator submits a new category with `beneficiaryMode = OVERRIDE`
- WHEN the form is submitted
- THEN the category SHALL be persisted; `idFixedBeneficiaryUser` SHALL be ignored even if provided
- AND the system SHALL NOT require a fixed user

#### Scenario: Edit category changes mode from OVERRIDE to BENEFICIARIO_GENERAL
- GIVEN an existing category with `beneficiaryMode = OVERRIDE`
- WHEN an operator updates it to `BENEFICIARIO_GENERAL` and provides a valid user
- THEN the update SHALL be persisted with both new values

#### Scenario: Form hides user selector when OVERRIDE is selected
- GIVEN the category form is open with `beneficiaryMode = BENEFICIARIO_GENERAL` and a user selected
- WHEN the operator switches `beneficiaryMode` to `OVERRIDE`
- THEN the user selector SHALL become hidden
- AND the previously selected user value SHALL be cleared from the form state

#### Scenario: Form shows user selector when BENEFICIARIO_GENERAL is selected
- GIVEN the category form is open with `beneficiaryMode = OVERRIDE`
- WHEN the operator switches `beneficiaryMode` to `BENEFICIARIO_GENERAL`
- THEN the user selector SHALL become visible and focusable
- AND no user SHALL be pre-selected unless one was previously saved

---

### Requirement: Category form defaults

When `beneficiaryMode` is not explicitly provided on creation, the system SHALL default to `OVERRIDE`.

#### Scenario: Default mode on creation
- GIVEN an operator creates a category without specifying `beneficiaryMode`
- WHEN the category is persisted
- THEN `beneficiaryMode` SHALL be `OVERRIDE`

---

### Requirement: System category type shows linked user

When the UI displays category information and the category's `CategoryType` is the designated system type, the UI SHALL show the linked fixed-beneficiary user (name and email) as a read-only display field when `beneficiaryMode === BENEFICIARIO_GENERAL` and a user is configured.

#### Scenario: System type category with fixed user
- GIVEN a category whose `CategoryType` is the system type AND `beneficiaryMode === BENEFICIARIO_GENERAL` with a configured user
- WHEN an operator views that category in the admin UI
- THEN the linked user's name and email SHALL be displayed as read-only fields

#### Scenario: System type category without fixed user
- GIVEN a category whose `CategoryType` is the system type AND no fixed user is configured
- WHEN an operator views that category
- THEN the UI SHALL indicate that no system user is linked

#### Scenario: Non-system type category
- GIVEN a category whose `CategoryType` is not the system type
- WHEN an operator views that category
- THEN showing the linked user is not required by the system

---

## ADDED Requirements

### Requirement: Category color field

Each `Category` MUST have a `color` field stored as a 7-character hex string (`#RRGGBB`). The field is REQUIRED on create and edit — the form SHALL NOT allow submission without a valid color value. The API SHALL validate the format and reject any value that does not match `^#[0-9A-Fa-f]{6}$`.

The categories table SHALL display a color chip (a small filled square or circle) in a dedicated column using the category's color.

#### Scenario: Create category with valid hex color
- GIVEN an operator fills the color input with `#3B82F6` and submits the form
- WHEN the API processes the request
- THEN the category SHALL be persisted with `color = "#3B82F6"`
- AND the table row SHALL render a color chip matching that hex value

#### Scenario: Create category without a color
- GIVEN an operator submits the form leaving the color field empty
- WHEN the form validates
- THEN the system SHALL block submission with a validation error indicating color is required
- AND no request SHALL reach the API

#### Scenario: Submit invalid hex color
- GIVEN an operator submits a category with `color = "red"` (not a valid hex string)
- WHEN the API processes the request
- THEN the system SHALL reject the request with a validation error indicating invalid color format
- AND no category SHALL be persisted or modified

#### Scenario: Edit category changes color
- GIVEN an existing category with `color = "#10B981"`
- WHEN an operator changes the color to `#EF4444` and submits the edit form
- THEN the category SHALL be updated with `color = "#EF4444"`
- AND the table chip column SHALL render the new color

---

### Requirement: Category hierarchy sequence

Each `Category` MAY reference exactly one other `Category` as its successor via the `idNextCategory` field (self-referential FK). This defines a linear promotion chain. The terminal category in the chain (MIA) SHALL have `idNextCategory = null`.

The create and edit form SHALL include a select control listing all categories except the category being edited (to prevent self-reference). Selecting no next category stores `null`.

The GET categories API response SHALL include a `nextCategory` object with at least `{ id, name }` when `idNextCategory` is set, or `null` otherwise.

#### Scenario: Set next category on create
- GIVEN an operator selects a next category from the select control and submits the form
- WHEN the API processes the request
- THEN the category SHALL be persisted with `idNextCategory` pointing to the selected category
- AND the GET response for that category SHALL include `nextCategory.name`

#### Scenario: Next category select excludes the category being edited
- GIVEN an operator opens the edit form for category `TEAM_LEADER`
- WHEN the next-category select control renders its options
- THEN `TEAM_LEADER` SHALL NOT appear in the list
- AND all other active categories SHALL be listed

#### Scenario: Terminal category has no next category
- GIVEN the `MIA` category exists with `idNextCategory = null`
- WHEN an operator views the categories table
- THEN the next-category column for MIA SHALL display an empty or "–" value
- AND no broken reference SHALL be shown

#### Scenario: GET response includes nextCategory object
- GIVEN a category with `idNextCategory` referencing another category
- WHEN a client calls GET /api/categories
- THEN each category in the response that has a next category SHALL include `nextCategory: { id, name }`
- AND categories with no next category SHALL include `nextCategory: null`

#### Scenario: Clear next category on edit
- GIVEN an existing category with `idNextCategory` set
- WHEN an operator clears the next-category select and submits the edit form
- THEN the category SHALL be updated with `idNextCategory = null`
- AND the GET response SHALL include `nextCategory: null` for that category
