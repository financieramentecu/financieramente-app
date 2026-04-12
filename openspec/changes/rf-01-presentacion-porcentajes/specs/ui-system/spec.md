# Delta for UI System

## ADDED Requirements

### Requirement: Application locale for numeric percentage display

The system SHALL format user-visible percentages using the **application-configured locale**, not per-feature hardcoding. A single documented default MAY apply until user-level locale exists.

#### Scenario: Consistent formatting across modules

- **GIVEN** two features show the same semantic percentage read-only
- **WHEN** they render
- **THEN** both SHALL use the shared formatter (separators and decimal policy)

### Requirement: Read-only percentage presentation

For values on the **0–100** scale from the server, the system SHALL NOT show the raw DB fraction as the primary label. Display SHALL preserve server precision without client round/truncate; pad integers to four fractional digits; leading zero before the decimal separator; `%` as **trailing adornment** outside editable text.

#### Scenario: Table or badge shows a stored percentage

- **GIVEN** a percentage loaded from the API on the 0–100 scale
- **WHEN** the UI renders it in a list, badge, or summary
- **THEN** the user SHALL see a formatted percent consistent with the shared formatter
- **AND** the symbol `%` SHALL NOT be embedded inside the same editable string as the digits for inputs

### Requirement: Percentage input behavior

The system SHALL provide a percentage input with at most **four** fractional digits while typing, per-keystroke validation, trailing-zero deletion, normalized paste for the active locale, and **no** empty-to-zero coercion before validation. Screen readers SHALL expose the **numeric value** without redundant “percent” when the unit is clear.

#### Scenario: User clears the field while editing

- **GIVEN** a commission rule category percentage field focused
- **WHEN** the user deletes all characters
- **THEN** the field SHALL remain empty (no automatic zero)
- **AND** validation errors SHALL apply on blur or submit per form rules

#### Scenario: User pastes a value with symbols

- **GIVEN** the clipboard contains text such as `12,5 %` or `12.5%`
- **WHEN** the user pastes into the percentage input
- **THEN** the system SHALL normalize to a valid numeric representation for the locale
- **AND** SHALL reject or strip characters that are not part of a valid number

### Requirement: Form validation error presentation (admin)

Field-level validation errors in commission configuration forms SHALL be visually distinct from helper or body text: semantic destructive color (not the default foreground alone), and an non-color cue (e.g. icon) in addition to the message text. Invalid fields SHALL expose `aria-invalid` and a visible invalid border or focus ring on the control. Error messages SHOULD use a live region or `role="alert"` where appropriate for screen readers.

#### Scenario: Invalid category or percentage on commission rule form

- **GIVEN** a row fails validation (e.g. invalid or missing category)
- **WHEN** the form displays the field error
- **THEN** the message SHALL use the destructive semantic color and SHALL NOT appear with the same styling as muted helper text
- **AND** the associated control SHALL show an invalid state (border and/or ring)
