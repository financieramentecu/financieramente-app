# Product Configuration

## Purpose
Manages the rules and distributions for product commissions in the administration module.

## Requirements

### Requirement: Active Distribution Display
The system SHALL display the description of the currently active commission distribution for a product configuration in the administration list.

#### Scenario: One active distribution exists
- **WHEN** a product configuration has multiple distributions, but only one is marked as active
- **THEN** the "Distribución para nuevos negocios" column SHALL show the description of that active distribution

#### Scenario: No active distribution exists
- **WHEN** a product configuration has no distributions marked as active
- **THEN** the "Distribución para nuevos negocios" column SHALL show "Sin descripción"

#### Scenario: Active distribution is different from the linked New Business distribution
- **WHEN** the distribution linked in `idProductPercentageCommissionNewBusinesses` is inactive, but there is another active distribution for the same product configuration
- **THEN** the system SHALL prioritize the active distribution's description for display

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
