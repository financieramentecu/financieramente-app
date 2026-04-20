# Delta for Commission distribution UI

## ADDED Requirements

### Requirement: No silent coercion of cleared percentage (RF-02)

The system MUST NOT replace an empty distribution percentage field with numeric **zero** while the user is editing or after focus leaves the field, when the user intentionally cleared the input. Empty and unset MUST remain distinct from **0** until the user commits a numeric value or the field is repopulated from saved data.

#### Scenario: User clears an existing percentage and blurs

- **GIVEN** a commission rule form with a category line that had a valid percentage
- **WHEN** the user deletes all characters in that percentage field and moves focus away
- **THEN** the system MUST NOT show **0** as the committed value solely due to clearing
- **AND** the system MUST allow the field to represent an empty or invalid state for validation purposes

#### Scenario: Intermediate empty while editing

- **GIVEN** the user is editing a percentage field
- **WHEN** the field text is temporarily empty before blur or save
- **THEN** the system MUST NOT auto-fill **0** in a way that blocks correcting the value

### Requirement: Validation feedback on blur for category percentages (RF-02)

For each **per-category distribution percentage** field on the commission rule form, the system SHALL surface a **clear validation message** when the user **finishes editing** that field (moves focus away) if the value is missing or outside the allowed range **[1, 100]** on the 0–100 scale, **or** fails other field-level rules for that line. The user MUST NOT be required to press submit solely to discover that error for that field.

#### Scenario: Empty percentage after blur with a committed category line

- **GIVEN** at least one category line where a category is selected and the percentage is required for a valid save
- **WHEN** the percentage is empty after the user leaves that field
- **THEN** the system SHALL display an inline validation message for that percentage

#### Scenario: Out-of-range percentage after blur

- **GIVEN** a category line with a selected category
- **WHEN** the user leaves the percentage field with a value below **1** or above **100**
- **THEN** the system SHALL display an inline validation message for that line

#### Scenario: Valid percentage after blur clears field error

- **GIVEN** a percentage field that shows a validation error after blur
- **WHEN** the user enters a value in **[1, 100]** and leaves the field
- **THEN** the system SHALL clear that field’s error if no other rule violation applies to it

#### Scenario: Save still enforces all rules

- **WHEN** the user attempts to save the commission rule
- **THEN** the system SHALL enforce the same numeric and sum rules as before this change
- **AND** invalid submissions SHALL be blocked with clear messages

## MODIFIED Requirements

### Requirement: Valid range for each category line

The system SHALL NOT accept a saved category distribution percentage outside **[1, 100]** on the 0–100 scale. Negative values SHALL NOT be accepted. Violations SHALL be communicated **on save attempt** and **when the user finishes editing** that percentage field, per **Validation feedback on blur for category percentages (RF-02)**.

(Previously: enforcement described only implicitly at submit via scenarios.)

#### Scenario: User enters zero

- **GIVEN** a commission rule form with at least one category line
- **WHEN** the user sets a line percentage to `0` and submits **or** leaves the field after committing `0`
- **THEN** the system SHALL surface a validation error for that line

#### Scenario: User enters above 100

- **WHEN** the user sets a line percentage above `100` and submits **or** leaves the field after committing that value
- **THEN** the system SHALL surface a validation error for that line

## REMOVED Requirements

(None)
