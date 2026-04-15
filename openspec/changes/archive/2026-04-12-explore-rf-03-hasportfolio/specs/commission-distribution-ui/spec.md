# Delta: Commission distribution UI (RF-03, RF-04, RF-05 portfolio)

## ADDED Requirements

### Requirement: hasPortfolio flag on commission rule (RF-03)

The system SHALL expose a boolean **`hasPortfolio`** for each commission rule in the distribution flow and SHALL persist it with the rule. The flag SHALL be editable only in that rule / category-lines context.

#### Scenario: Flag defaults off for existing rules

- **GIVEN** a commission rule that never set `hasPortfolio`
- **WHEN** the user opens the rule
- **THEN** the system SHALL treat `hasPortfolio` as **false** until changed and saved

#### Scenario: User enables and saves flag

- **GIVEN** a commission rule form
- **WHEN** the user sets `hasPortfolio` to true and saves successfully
- **THEN** subsequent loads SHALL show `hasPortfolio` true

### Requirement: Portfolio percentage per line when hasPortfolio is true

When **`hasPortfolio`** is true, the system SHALL show a **portfolio** percentage field for each category line and SHALL NOT accept a save unless each such field is in **[1, 100]** on the 0–100 scale (negative values SHALL NOT be accepted).

#### Scenario: Portfolio sum exceeds 100

- **GIVEN** `hasPortfolio` is true and two lines with portfolio percentages `60` and `50`
- **WHEN** the user attempts to save
- **THEN** the system SHALL reject with a clear validation message

#### Scenario: Portfolio in range and sum valid

- **GIVEN** `hasPortfolio` is true and all portfolio fields are in **[1, 100]** with sum **≤ 100**
- **WHEN** the user saves and distribution rules also pass
- **THEN** the system SHALL accept the save

### Requirement: Hide portfolio UI without clearing stored values (RF-04)

When **`hasPortfolio`** is false, the system SHALL NOT display portfolio percentage inputs for category lines. The system MUST NOT erase stored portfolio percentage values **only** because the flag is off or the inputs are hidden when the user saves.

#### Scenario: Turn flag off and save

- **GIVEN** a rule had `hasPortfolio` true with stored portfolio percentages
- **WHEN** the user sets `hasPortfolio` to false and saves successfully
- **THEN** stored portfolio percentages for those lines SHALL remain available when the flag is true again

### Requirement: RF-02 applies to visible portfolio percentage fields

For each **visible** portfolio percentage field, the rules in **No silent coercion of cleared percentage (RF-02)** and **Validation feedback on blur for category percentages (RF-02)** SHALL apply the same as for distribution percentage fields.

#### Scenario: User clears portfolio field and blurs

- **GIVEN** `hasPortfolio` is true and a line has a portfolio field
- **WHEN** the user clears the field and moves focus away
- **THEN** the system MUST NOT coerce the value to **0** solely due to clearing
- **AND** the system SHALL surface validation feedback as for distribution fields

## MODIFIED Requirements

### Requirement: Sum of category percentages per rule

The system SHALL NOT persist a commission rule whose category lines sum to **more than 100** (0–100 scale) for **distribution** percentages. When **`hasPortfolio`** is true, the system SHALL NOT persist if **portfolio** percentages on the same rule sum to **more than 100** (same scale), independent of the distribution sum check.

*(Previously: only distribution sum was stated.)*

#### Scenario: Distribution valid, portfolio sum exceeds 100

- **GIVEN** `hasPortfolio` is true, distribution sums to `100`, portfolio sums to `120`
- **WHEN** the user saves
- **THEN** the system SHALL reject with a clear validation message

### Requirement: Cross-module percentage display consistency

Screens that show **commission distribution percentages** (`porcentaje_distribucion` semantics) OR **portfolio percentages** (`porcentaje_portfolio` semantics) SHALL use the shared UI percentage formatter (locale, precision, adornment).

*(Previously: only `porcentaje_distribucion` was named.)*

#### Scenario: Read-only portfolio percent in table

- **GIVEN** a table lists category lines with portfolio percentages for a rule with `hasPortfolio` true
- **WHEN** the column renders read-only
- **THEN** formatting SHALL match the shared UI rules used for distribution percentages

## REMOVED Requirements

*(None.)*
