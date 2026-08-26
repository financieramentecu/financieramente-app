# Spec: Report Permissions

## Purpose

Enables Administrators to configure which user categories can see each report, persisting assignments by stable report code so navigation and report APIs enforce visibility consistently.

## Requirements

### Requirement: Admin section for report permissions

The system SHALL expose an Administración section titled **Permisos de Reportes** (synonym **Permisos por Reporte** MAY appear in card copy) that only authenticated users with administración access can open.

#### Scenario: Administrator opens Permisos de Reportes

- **GIVEN** an authenticated administrator with administración permission
- **WHEN** they open Administración
- **THEN** they SHALL see a module entry for **Permisos de Reportes**
- **AND** activating it SHALL navigate to the report-permissions admin page

#### Scenario: Non-admin cannot access the page

- **GIVEN** an authenticated user without administración permission
- **WHEN** they request the report-permissions admin page or its APIs
- **THEN** the system SHALL deny access (HTTP 403 or equivalent)

---

### Requirement: Select report and list categories with checkboxes

The admin page SHALL list every known report from the report catalog. Selecting a report SHALL display every active user category with an individual checkbox indicating whether that category may see the report.

#### Scenario: Selecting a report loads category checkboxes

- **GIVEN** at least one report exists in the catalog
- **WHEN** the administrator selects that report
- **THEN** the UI SHALL show all active categories each with a checkbox reflecting current enablement

#### Scenario: Unconfigured report defaults to no categories

- **GIVEN** a catalog report with no prior permission rows (or all inactive)
- **WHEN** the administrator selects that report
- **THEN** the UI SHALL list the report
- **AND** all category checkboxes SHALL be unchecked
- **AND** the UI SHALL indicate **Sin categorías habilitadas** (or equivalent default empty state)

---

### Requirement: Todas selects all categories

The page SHALL provide a **Todas** checkbox that selects or clears every individual category checkbox for the selected report.

#### Scenario: Checking Todas selects all

- **GIVEN** a report is selected and at least one category checkbox is unchecked
- **WHEN** the administrator checks **Todas**
- **THEN** every individual category checkbox SHALL become checked

#### Scenario: Unchecking Todas clears all

- **GIVEN** **Todas** is checked (all categories selected)
- **WHEN** the administrator unchecks **Todas**
- **THEN** every individual category checkbox SHALL become unchecked

#### Scenario: Clearing one category unchecks Todas

- **GIVEN** **Todas** is checked
- **WHEN** the administrator unchecks any individual category
- **THEN** **Todas** SHALL become unchecked while other categories remain as selected

---

### Requirement: Save requires at least one category

Saving permissions with zero categories selected MUST be blocked with a Spanish warning.

#### Scenario: Save blocked when none selected

- **GIVEN** a report is selected and no category checkboxes are checked
- **WHEN** the administrator activates **Guardar**
- **THEN** the system SHALL NOT persist changes
- **AND** the user SHALL see a warning **Debe seleccionar al menos una categoría**

---

### Requirement: Successful save confirms and persists

When at least one category is selected, **Guardar** MUST persist the configuration and show confirmation.

#### Scenario: Save succeeds

- **GIVEN** a report is selected and one or more categories are checked
- **WHEN** the administrator activates **Guardar**
- **THEN** the system SHALL persist enablement for those categories for that report
- **AND** categories not checked SHALL NOT remain enabled for that report
- **AND** the user SHALL see a confirmation toast **Permisos actualizados correctamente**

#### Scenario: Mutation is audited

- **GIVEN** a successful permission save
- **WHEN** the operation completes
- **THEN** an audit log entry SHALL be recorded with actor identity, IP, user agent, and a human-readable details string

---

### Requirement: Stable report codes and catalog

Each report SHALL have a stable machine code (e.g. `PRODUCCION_REAL`) independent of UI title. The catalog MUST include **Producción Real** with code `PRODUCCION_REAL`.

#### Scenario: Catalog lists Producción Real

- **GIVEN** the system is seeded for this change
- **WHEN** the administrator opens Permisos de Reportes
- **THEN** a report whose display name is **Producción Real** and code is `PRODUCCION_REAL` SHALL appear in the list

---

### Requirement: Default seed for Performance Leader

After seed/migration for this change, the **Performance Leader** category MUST be enabled for report code `PRODUCCION_REAL` so COM-81 menu visibility works out of the box for that category.

#### Scenario: Performance Leader has Producción Real enabled by default

- **GIVEN** a fresh environment with seeds applied
- **WHEN** permissions for `PRODUCCION_REAL` are loaded
- **THEN** the **Performance Leader** category SHALL be enabled
- **AND** other categories MAY remain disabled until an administrator enables them

---

### Requirement: Server-side authorization by category

Access to a report page and its data APIs MUST be allowed only if the authenticated user’s active category is enabled for that report’s code, OR the user satisfies a visibility bypass: `isReadOnlyRole(role) || isWriteBypassRole(role)`. Soft-deleted (`status = false`) permission rows MUST NOT grant access. A read-only-role bypass MUST grant visibility for every report category without exception; it MUST NOT grant export authorization (see report export guard requirement below).

(Previously: bypass was a single `isReportViewBypassRole` list mixing visibility and write-capable roles, with no distinct read-only concept.)

#### Scenario: Authorized category can access report APIs

- **GIVEN** the user’s `idCategory` is enabled for `PRODUCCION_REAL`
- **WHEN** they call a Producción Real report API
- **THEN** the request SHALL proceed past the report-permission check

#### Scenario: Unauthorized category is denied

- **GIVEN** the user’s category is not enabled for `PRODUCCION_REAL`
- **AND** the user is neither a read-only-role bypass nor a write-bypass role
- **WHEN** they call a Producción Real report API or open the report page
- **THEN** the system SHALL deny access

#### Scenario: Soft-deleted permission does not grant access

- **GIVEN** a permission row for the user’s category and `PRODUCCION_REAL` exists with `status = false`
- **WHEN** access is evaluated
- **THEN** access SHALL be denied

#### Scenario: CONSULTOR bypasses the category filter entirely (new)

- **GIVEN** an authenticated user with role `CONSULTOR`, regardless of their category’s `ReportPermission` rows
- **WHEN** they call any report API or open any report page
- **THEN** the report-category check MUST be bypassed and access SHALL be granted for every report category
- **AND** the data returned SHALL be scoped to the whole company

---

## ADDED Requirements (from rol-consultor-solo-lectura)

### Requirement: Report export blocked for read-only roles

The Excel export action for reports MUST be rejected for a user whose `isReadOnlyRole()` is `true`, using the same read-only export guard applied to Negocios, independent of the report-category visibility bypass granted to that user.

#### Scenario: CONSULTOR sees all categories but cannot export

- **GIVEN** a `CONSULTOR` user viewing any report with full category visibility
- **WHEN** they attempt to export that report to Excel via UI or direct API call
- **THEN** the export control SHALL be disabled in the UI with an explanatory tooltip
- **AND** a direct API call to the report export endpoint MUST return HTTP 403
