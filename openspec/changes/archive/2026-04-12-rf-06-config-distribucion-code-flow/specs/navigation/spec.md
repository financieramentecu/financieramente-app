# Delta: Navigation

## ADDED Requirements

### Requirement: Config distribución de comisiones under Administración

The `ALL_MENU_ITEMS` definition SHALL include a sub-item under **Administración** whose title is **Config. distribución de comisiones** and whose target is the dashboard route for the **code-first** commission distribution entry (per product PRD MAPA M17).

#### Scenario: Administrator sees the new sub-item

- **GIVEN** an authenticated user whose sidebar uses `ALL_MENU_ITEMS`
- **WHEN** the **Administración** group is expanded
- **THEN** a sub-item **Config. distribución de comisiones** SHALL be visible
- **AND** activating it SHALL navigate to the code-first distribution entry route

#### Scenario: Agent role does not see Administración

- **GIVEN** a user with the **AGENTE** role and sidebar using `AGENTE_MENU_ITEMS`
- **WHEN** the sidebar renders
- **THEN** the **Config. distribución de comisiones** entry SHALL NOT appear
