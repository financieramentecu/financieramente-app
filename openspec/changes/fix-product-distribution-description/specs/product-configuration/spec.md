## ADDED Requirements

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
