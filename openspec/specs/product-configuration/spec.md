# Product Configuration

## Purpose
Manages the rules and distributions for product commissions in the administration module.

## Requirements

### Requirement: No “Distribución para nuevos negocios” list column (RF-09)

In the **product configuration administration list** (shared table for configuration A), the system SHALL NOT render a column whose purpose is to show the active or linked new-business distribution description (including headers titled **«Distribución para nuevos negocios»**). Assignment for new businesses remains in **B/C** flows; this requirement only forbids that **list** column.

#### Scenario: List renders without the column

- **GIVEN** a user views the product configurations table
- **WHEN** the table headers are visible
- **THEN** the system SHALL NOT display a column titled **Distribución para nuevos negocios** (or synonymous copy used for the same purpose)

#### Scenario: Applies regardless of role

- **GIVEN** any authenticated role that can access the product configuration list
- **WHEN** the list is shown
- **THEN** the column SHALL remain absent (no role-based exception)

### Requirement: Active Distribution Uniqueness
The system SHALL prevent having more than one active commission distribution for the same product configuration.

#### Scenario: Attempt to create a new distribution when one is already active
- **GIVEN** a product configuration has an active distribution
- **WHEN** the user attempts to create a "Nueva Distribución"
- **THEN** the system SHALL show a warning modal with the message "Ya existe una distribución activa para este producto. Desactívala antes de crear una nueva."
- **AND** the system SHALL NOT open the creation form.

#### Scenario: Attempt to activate a distribution when another is already active
- **GIVEN** a product configuration has one active distribution and one inactive distribution
- **WHEN** the user attempts to activate the inactive distribution
- **THEN** the system SHALL show an alert modal with the message "Ya existe una distribución activa: [active distribution description]."
- **AND** the system SHALL block the activation until the other distribution is inactive.
- **AND** the system SHALL provide backend validation for this constraint.

### Requirement: Non-null unique product configuration code (RF-07)

Every stored product configuration SHALL have a **non-null** **code**. The system SHALL enforce **uniqueness** of **code** across all product configurations at persistence layer.

#### Scenario: Create configuration receives a code

- **GIVEN** a valid create request for a product configuration
- **WHEN** the configuration is persisted
- **THEN** the record SHALL have a non-null **code** value

#### Scenario: Duplicate code is rejected

- **GIVEN** a configuration already exists with code **X**
- **WHEN** the system attempts to persist another configuration with the same **code**
- **THEN** the operation SHALL fail with a clear error

#### Scenario: Read by exact code returns at most one configuration

- **GIVEN** a **code** value that exists in the database
- **WHEN** an authorized client requests that configuration by **exact code**
- **THEN** the response SHALL identify **exactly one** product configuration
- **AND** when the code does not exist, the response SHALL indicate not found

### Requirement: Distribution CTA from product configurations list

The product configurations table SHALL expose a single primary action to open commission distribution using the **code-first** dashboard route when the row has a **code**. It SHALL NOT use the legacy id-based distribution URL as that action.

#### Scenario: Open distribution by code

- **GIVEN** a row with non-empty **code** **C**
- **WHEN** the user activates **Distribución de Comisión**
- **THEN** navigation SHALL target the code-first rules path for **C**

#### Scenario: Missing code falls back to entry

- **GIVEN** a row with no usable **code** (edge / legacy data)
- **WHEN** the user activates **Distribución de Comisión**
- **THEN** navigation SHALL target the code-first **entry** (search) path so the user can locate a configuration

### Requirement: Two-step onboarding indicator (RF-11)

The system SHALL show a **two-step** indicator for the journey **(1) Product configuration** and **(2) Commission distribution**. The user SHALL be able to see **which step** applies to the current screen. The active step SHALL be exposed to assistive technology (e.g. `aria-current` on the current step).

#### Scenario: Create configuration shows step 1

- **GIVEN** an authenticated user on the **new product configuration** screen
- **WHEN** the page is rendered
- **THEN** the indicator SHALL show **step 1 of 2** as the active step
- **AND** **step 2** SHALL NOT be presented as completed

#### Scenario: Code-first distribution shows step 2

- **GIVEN** an authenticated user on a **code-first commission distribution** screen for a valid configuration **code**
- **WHEN** the page is rendered
- **THEN** the indicator SHALL show **step 2 of 2** as the active step
- **AND** **step 1** SHALL be presented as completed or prior in the journey

#### Scenario: Assistive technology

- **GIVEN** the two-step indicator is visible
- **WHEN** a screen reader announces the current step
- **THEN** the active step SHALL be programmatically associated with the current step in the indicator

### Requirement: Navigate to distribution after create (RF-11)

After a **successful** create of a product configuration, the system SHALL navigate the user to the **code-first** commission **rules** path for that configuration’s **code** (URL-encoded as needed). The system SHALL NOT send the user **only** back to the product configuration list as the sole outcome of success (returning to the list MAY remain available as a separate action).

#### Scenario: Success navigates to rules by code

- **GIVEN** a product configuration was just created with **code** **C**
- **WHEN** the create operation completes successfully
- **THEN** the user SHALL be taken to the code-first **rules** experience for **C**

### Requirement: Derived distribution setup completeness (RF-11)

**Distribution setup** for a product configuration SHALL be **complete** when there exists **at least one** saved commission rule under that configuration that includes **at least one** category line with persisted per-category distribution data. Otherwise distribution setup SHALL be **incomplete**. Other modules SHALL NOT be blocked solely because setup is incomplete.

#### Scenario: New configuration is incomplete

- **GIVEN** a product configuration exists with **no** commission rule that has saved category distribution lines
- **WHEN** completeness is evaluated for onboarding
- **THEN** distribution setup SHALL be **incomplete**

#### Scenario: After saving a rule with categories

- **GIVEN** a commission rule for that configuration is saved with **at least one** category line with valid persisted distribution percentages
- **WHEN** completeness is evaluated
- **THEN** distribution setup SHALL be **complete**

### Requirement: Incomplete setup visible in list (RF-11)

The product configurations **list** SHALL surface which configurations have **incomplete** distribution setup per the derived completeness rule.

#### Scenario: Incomplete row is marked

- **GIVEN** a configuration has **incomplete** distribution setup
- **WHEN** the user views the product configurations table
- **THEN** that row SHALL show a clear **incomplete** indication (e.g. badge or label)

#### Scenario: Complete row is not marked incomplete

- **GIVEN** a configuration has **complete** distribution setup
- **WHEN** the user views the product configurations table
- **THEN** that row SHALL NOT show the **incomplete** onboarding indication for this rule
