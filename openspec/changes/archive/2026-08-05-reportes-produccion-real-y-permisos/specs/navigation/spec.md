## ADDED Requirements

### Requirement: Administración includes Permisos de Reportes

`ALL_MENU_ITEMS` SHALL include a sub-item under **Administración** titled **Permisos de Reportes** linking to `/dashboard/admin/report-permissions`.

#### Scenario: Administrator sees Permisos de Reportes in sidebar

- **GIVEN** an authenticated user whose sidebar includes the Administración group
- **WHEN** Administración sub-items are shown
- **THEN** **Permisos de Reportes** SHALL be visible
- **AND** activating it SHALL navigate to `/dashboard/admin/report-permissions`

---

### Requirement: Reportes menu gated by category report permissions

The **Reportes** menu group and its sub-items SHALL be visible based on the authenticated user’s category report permissions (stable report codes), not solely on static role flags. Sub-item **Producción Real** SHALL link to `/dashboard/reportes/produccion-real` and SHALL appear only when report code `PRODUCCION_REAL` is enabled for the user’s category (or administrator bypass).

#### Scenario: Authorized category sees Reportes → Producción Real

- **GIVEN** the user’s category is enabled for `PRODUCCION_REAL`
- **WHEN** the sidebar renders
- **THEN** **Reportes** SHALL be visible
- **AND** **Producción Real** SHALL appear as a sub-item

#### Scenario: Unauthorized category hides Producción Real

- **GIVEN** the user’s category is not enabled for `PRODUCCION_REAL`
- **WHEN** the sidebar renders
- **THEN** **Producción Real** SHALL NOT appear under Reportes

#### Scenario: Reportes group hidden when no report authorized

- **GIVEN** the user has no enabled report permissions and is not an administrator bypass
- **WHEN** the sidebar renders
- **THEN** the **Reportes** group SHALL NOT appear
