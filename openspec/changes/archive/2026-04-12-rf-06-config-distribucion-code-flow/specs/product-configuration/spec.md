# Delta: Product configuration

## ADDED Requirements

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
