# Delta for Navigation

## ADDED Requirements

### Requirement: Menu composition for CONSULTOR

The sidebar menu builder MUST compose exactly four top-level entries for a `CONSULTOR` user: Dashboard, Negocios, Reportes, and Calculadora. No other top-level entry or Administración group MAY appear for this role.

#### Scenario: CONSULTOR sees exactly the four allowed entries

- GIVEN an authenticated user with role `CONSULTOR`
- WHEN the sidebar renders
- THEN it SHALL show exactly Dashboard, Negocios, Reportes, and Calculadora
- AND no other top-level item or Administración group SHALL be visible

#### Scenario: CONSULTOR sees all report categories under Reportes

- GIVEN an authenticated user with role `CONSULTOR`
- WHEN the Reportes group renders
- THEN every report category/sub-item SHALL be visible, regardless of `ReportPermission` category configuration
