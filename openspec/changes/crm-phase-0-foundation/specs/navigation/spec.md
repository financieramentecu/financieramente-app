# Delta for Navigation

## REMOVED Requirements

### Requirement: Leads Top-Level Nav Entry
Replaced by "CRM Sub-Item Under Negocios". `/dashboard/leads` redirects to the CRM page.

## ADDED Requirements

### Requirement: CRM Sub-Item Under Negocios

`ALL_MENU_ITEMS` MUST define `Negocios` as a group with sub-items `Ver Negocios` (`/dashboard/negocios`) and `CRM` (`/dashboard/negocios/crm`). No top-level `Leads` entry SHALL exist in any menu.

The `CRM` sub-item MUST be visible only when `permissions.leads` is true. When a role has `negocios.list` but not `leads`, `Negocios` MUST render as a flat item linking to `/dashboard/negocios`, with no sub-items.

#### Scenario: ADMIN sees the Negocios group with CRM
- GIVEN a user with role `ADMIN`
- WHEN the menu is built
- THEN `Negocios` SHALL have sub-items `Ver Negocios` and `CRM`
- AND no top-level `Leads` item SHALL be present

#### Scenario: CONSULTOR keeps a flat Negocios entry
- GIVEN a user with role `CONSULTOR` (`leads = false`)
- WHEN the menu is built
- THEN `Negocios` SHALL have no sub-items
- AND `CRM` SHALL NOT appear anywhere in the menu

### Requirement: AGENTE CRM Sub-Item Under Mis Negocios

`AGENTE_MENU_ITEMS` MUST include `CRM` (`/dashboard/negocios/crm`) as a sub-item of `Mis Negocios`, after `Crear Negocio`, and MUST NOT include a top-level `Leads` entry.

#### Scenario: AGENTE menu composition
- GIVEN a user with role `AGENTE` and the calculator enabled
- WHEN the menu is built
- THEN the top-level titles SHALL be `Dashboard`, `Mis Negocios`, `Calculadora`
- AND `Mis Negocios` SHALL contain `Ver Mis Negocios`, `Crear Negocio`, `CRM`
