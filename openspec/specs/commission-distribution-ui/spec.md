# Spec: Commission distribution UI

## Purpose

Validation and UX rules for **per-category distribution percentages** and optional **portfolio percentages** on commission rules (distribución de comisiones), aligned with PRD RF-01, **RF-02**, RF-03, RF-04, and RF-05.

## Requirements

### Requirement: Valid range for each category line

The system SHALL NOT accept a saved category distribution percentage outside **[1, 100]** on the 0–100 scale. Negative values SHALL NOT be accepted. Violations SHALL be communicated **on save attempt** and **when the user finishes editing** that percentage field, per **Validation feedback on blur for category percentages (RF-02)**.

#### Scenario: User enters zero

- **GIVEN** a commission rule form with at least one category line
- **WHEN** the user sets a line percentage to `0` and submits **or** leaves the field after committing `0`
- **THEN** the system SHALL surface a validation error for that line

#### Scenario: User enters above 100

- **WHEN** the user sets a line percentage above `100` and submits **or** leaves the field after committing that value
- **THEN** the system SHALL surface a validation error for that line

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

### Requirement: Sum of category percentages per rule

The system SHALL NOT persist a commission rule whose category lines sum to **more than 100** (0–100 scale) for **distribution** percentages. When **`hasPortfolio`** is true, the system SHALL NOT persist if **portfolio** percentages on the same rule sum to **more than 100** (same scale), independent of the distribution sum check.

#### Scenario: Sum exceeds 100

- **GIVEN** two lines with percentages `60` and `50`
- **WHEN** the user attempts to save
- **THEN** the system SHALL reject the operation with a clear validation message

#### Scenario: Sum exactly 100

- **GIVEN** lines that sum to `100`
- **WHEN** the user saves
- **THEN** the system SHALL accept the operation if all other validations pass

#### Scenario: Distribution valid, portfolio sum exceeds 100

- **GIVEN** `hasPortfolio` is true, distribution sums to `100`, portfolio sums to `120`
- **WHEN** the user saves
- **THEN** the system SHALL reject with a clear validation message

### Requirement: Cross-module percentage display consistency

Screens that show **commission distribution percentages** (`porcentaje_distribucion` semantics) OR **portfolio percentages** (`porcentaje_portfolio` semantics) SHALL use the shared UI percentage formatter (locale, precision, adornment).

#### Scenario: Another module shows that percent read-only

- **GIVEN** a modal or table shows that semantic percent
- **WHEN** it renders read-only
- **THEN** formatting SHALL match the shared UI rules

#### Scenario: Read-only portfolio percent in table

- **GIVEN** a table lists category lines with portfolio percentages for a rule with `hasPortfolio` true
- **WHEN** the column renders read-only
- **THEN** formatting SHALL match the shared UI rules used for distribution percentages

### Requirement: Code-first distribution administration entry (RF-06)

The system SHALL provide an administration path where the user MUST identify a product configuration **by code** before showing its commission **rules list**. Until identification succeeds, the system SHALL NOT show that full list.

#### Scenario: No configuration identified

- **GIVEN** the code-first entry is open
- **WHEN** no valid configuration is selected or URL-resolved
- **THEN** the system SHALL show an empty or orienting state (not the rules table)

#### Scenario: Valid code

- **GIVEN** configuration code **C** exists
- **WHEN** **C** is selected or resolved
- **THEN** rules shown SHALL be only for that configuration

#### Scenario: Invalid code

- **GIVEN** **C** does not exist
- **WHEN** the user navigates with **C**
- **THEN** the system SHALL show not-found clearly and SHALL NOT show another configuration’s rules as **C**

### Requirement: Deep link by configuration code

The system SHALL support URLs that include a product configuration **code** so the rules context loads without extra selection when **C** is valid.

#### Scenario: Valid deep link

- **GIVEN** **C** exists
- **WHEN** the user opens the documented deep link for **C**
- **THEN** the rules list for that configuration SHALL load

### Requirement: Legacy id-based routes (compatibility)

The system MAY keep **`/dashboard/distribucion-comisiones/[id]/...`** routes so existing bookmarks or direct URLs keep working. The **Configuración Producto** list SHALL NOT use the id-based path as its primary CTA; it SHALL use the code-first path defined for **Distribución de Comisión**.

#### Scenario: Legacy URL

- **GIVEN** a valid legacy distribution URL by id
- **WHEN** the user opens it
- **THEN** the rules experience SHALL behave as before this change

#### Scenario: Product list opens code-first distribution

- **GIVEN** the product configurations table with a row that has **code** **C**
- **WHEN** the user activates **Distribución de Comisión**
- **THEN** the system SHALL navigate to the code-first rules URL for **C** (e.g. `/dashboard/config-distribucion-comisiones/<encoded C>/reglas`)

### Requirement: Return to configuration search from rules (code flow)

On the commission rules view reached via the code-first flow, the system SHALL offer a control to return to the configuration search entry so the user can pick another configuration.

#### Scenario: Search again

- **GIVEN** the user is on rules for a resolved code
- **WHEN** the user activates **Buscar nueva distribución**
- **THEN** the system SHALL navigate to the code-first entry (search) path

### Requirement: Visible primary row actions (RF-10)

**Edit** and **assign to new businesses** (product label) SHALL be **visible per row** without requiring a **⋮** overflow as the only access.

#### Scenario: Edit visible

- **GIVEN** the rules table renders
- **WHEN** the user inspects a row
- **THEN** edit SHALL be reachable without opening row overflow first

#### Scenario: Assign visible

- **GIVEN** assignment is allowed for a row
- **WHEN** the user inspects that row
- **THEN** assign SHALL be reachable without opening row overflow first
