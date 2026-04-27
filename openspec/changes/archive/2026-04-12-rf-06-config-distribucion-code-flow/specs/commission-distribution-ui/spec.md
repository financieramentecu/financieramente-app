# Delta: Commission distribution UI

## ADDED Requirements

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
