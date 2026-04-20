# Delta for Product Configuration (RF-11)

## ADDED Requirements

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
