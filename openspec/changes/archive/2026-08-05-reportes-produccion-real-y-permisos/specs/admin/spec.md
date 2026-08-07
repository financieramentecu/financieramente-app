## ADDED Requirements

### Requirement: Permisos de Reportes module in Administración

The Administración hub SHALL include a card/module for configuring report visibility by user category, navigating to `/dashboard/admin/report-permissions`.

#### Scenario: Admin hub shows Permisos de Reportes card

- **GIVEN** an authenticated administrator opens `/dashboard/admin`
- **WHEN** the module grid renders
- **THEN** a card for **Permisos de Reportes** (or **Permisos por Reporte**) SHALL be present
- **AND** activating it SHALL navigate to the report-permissions admin page

#### Scenario: Module is admin-only

- **GIVEN** a user without administración permission
- **WHEN** they attempt to open `/dashboard/admin/report-permissions`
- **THEN** access SHALL be denied
