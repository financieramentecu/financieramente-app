# Spec: Commission distribution UI

## Purpose

Validation and UX rules for **per-category distribution percentages** on commission rules (distribución de comisiones), aligned with PRD RF-01 / RF-05.

## Requirements

### Requirement: Valid range for each category line

The system SHALL NOT accept a saved category distribution percentage outside **[1, 100]** on the 0–100 scale. Negative values SHALL NOT be accepted.

#### Scenario: User enters zero

- **GIVEN** a commission rule form with at least one category line
- **WHEN** the user sets a line percentage to `0` and submits
- **THEN** the system SHALL block save and SHALL surface a validation error for that line

#### Scenario: User enters above 100

- **WHEN** the user sets a line percentage above `100` and submits
- **THEN** the system SHALL block save and SHALL surface a validation error

### Requirement: Sum of category percentages per rule

The system SHALL NOT persist a commission rule whose category lines sum to **more than 100** (on the 0–100 scale) for distribution percentages on the same rule.

#### Scenario: Sum exceeds 100

- **GIVEN** two lines with percentages `60` and `50`
- **WHEN** the user attempts to save
- **THEN** the system SHALL reject the operation with a clear validation message

#### Scenario: Sum exactly 100

- **GIVEN** lines that sum to `100`
- **WHEN** the user saves
- **THEN** the system SHALL accept the operation if all other validations pass

### Requirement: Cross-module percentage display consistency

Screens that show **commission distribution percentages** (same meaning as `porcentaje_distribucion`) SHALL use the shared UI percentage formatter (locale, precision, adornment).

#### Scenario: Another module shows that percent read-only

- **GIVEN** a modal or table shows that semantic percent
- **WHEN** it renders read-only
- **THEN** formatting SHALL match the shared UI rules
