# Delta for Navigation

## ADDED Requirements

### Requirement: NAV-01 PARTNER menu composition

The menu for role PARTNER MUST contain exactly "Dashboard" and "Mis negocios". Calculadora, Reportes, Liquidaciones, Mis distribuciones and Administración MUST NOT appear. Other roles' menus MUST NOT change.

#### Scenario: Partner menu

- GIVEN a partner session
- WHEN the menu is built
- THEN only two entries exist

#### Scenario: Agent menu unchanged

- GIVEN an AGENTE session
- WHEN the menu is built
- THEN it equals the previous composition
