# Specification: Navigation (Sidebar Menu)

## Purpose

Define the requirements for sidebar navigation menu structure across user roles. The navigation system controls which menu items and sub-items are visible to authenticated users based on their role.

## Key Files

- `src/lib/navigation/menu-items.tsx` — defines `ALL_MENU_ITEMS` (admin/all-roles) and `AGENTE_MENU_ITEMS` (agent role only)
- Icons: imported from `lucide-react`

---

## Requirements (from refactor-admin-discount — 2026-03-16)

### Requirement: Descuentos MUST appear as a sub-item under Administración in the sidebar

The `ALL_MENU_ITEMS` array SHALL include a `Descuentos` entry inside the `Administración` sub-items. The entry SHALL link to `/dashboard/admin/discounts` and use the `Percent` icon from `lucide-react`.

#### Scenario: Admin user sees Descuentos in sidebar

- GIVEN the user is authenticated as an administrator
- WHEN the dashboard sidebar renders using `ALL_MENU_ITEMS`
- THEN the `Administración` group SHALL contain a `Descuentos` sub-item
- AND clicking it SHALL navigate to `/dashboard/admin/discounts`

#### Scenario: Descuentos sub-item has correct icon

- GIVEN the `ALL_MENU_ITEMS` definition is loaded
- WHEN the `Administración` sub-items are inspected
- THEN the `Descuentos` entry SHALL use the `Percent` icon from `lucide-react`

#### Scenario: Non-admin roles do not see Administración

- GIVEN the user has the `AGENTE` role
- WHEN the sidebar renders using `AGENTE_MENU_ITEMS`
- THEN the `Administración` group (and therefore `Descuentos`) SHALL NOT appear
- (The `AGENTE_MENU_ITEMS` array is not modified by this change.)

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

---

## Requirements (from production-dashboard-hierarchy-tree — 2026-05-26)

### Requirement: Dashboard item routes to production shell

`ALL_MENU_ITEMS` SHALL include a **Dashboard** entry that navigates to `/dashboard`. The `/dashboard` page SHALL render the Production Dashboard shell (not a redirect-only page). The entry SHOULD use a dashboard-appropriate icon from `lucide-react`.

#### Scenario: Authenticated user navigates to Dashboard

- GIVEN an authenticated user whose sidebar uses `ALL_MENU_ITEMS`
- WHEN the user activates the **Dashboard** menu item
- THEN the browser SHALL navigate to `/dashboard`
- AND the Production Dashboard shell SHALL render (not redirect)

#### Scenario: Dashboard item appears in sidebar for admin roles

- GIVEN a user with a role that uses `ALL_MENU_ITEMS`
- WHEN the sidebar renders
- THEN a **Dashboard** item SHALL be visible at the top level of the menu

---

### Requirement: AGENTE menu includes Dashboard entry

`AGENTE_MENU_ITEMS` SHALL include a **Dashboard** entry linking to `/dashboard`, added after product sign-off. Until sign-off, the entry MAY be omitted from `AGENTE_MENU_ITEMS`.

#### Scenario: Agent user sees Dashboard in sidebar

- GIVEN the user has the `AGENTE` role
- GIVEN the Dashboard entry has been enabled for agents
- WHEN the sidebar renders using `AGENTE_MENU_ITEMS`
- THEN a **Dashboard** item SHALL be visible
- AND activating it SHALL navigate to `/dashboard`

#### Scenario: Agent Dashboard entry is absent before sign-off

- GIVEN product sign-off for agents has NOT yet occurred
- WHEN the sidebar renders for an `AGENTE` user
- THEN the **Dashboard** item MAY be absent from `AGENTE_MENU_ITEMS` without error

---

## ADDED Requirements (from leads-crm-sync)

### Requirement: Leads Top-Level Nav Entry

`ALL_MENU_ITEMS` MUST include a top-level `Leads` entry linking to the read-only Kanban board.

#### Scenario: Admin/eligible user sees Leads entry

- GIVEN a user whose sidebar uses `ALL_MENU_ITEMS`
- WHEN the sidebar renders
- THEN a top-level `Leads` item SHALL be visible
- AND activating it SHALL navigate to the Leads Kanban board

### Requirement: Column Admin Entry Under Administración

`ALL_MENU_ITEMS` MUST include a sub-item under **Administración** for managing `LeadFunnelColumn` records.

#### Scenario: Admin sees column-admin sub-entry

- GIVEN an authenticated user whose sidebar uses `ALL_MENU_ITEMS`
- WHEN the **Administración** group is expanded
- THEN a sub-item for lead funnel column administration SHALL be visible

---

## ADDED Requirements (from reportes-produccion-real-y-permisos)

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

---

## ADDED Requirements (from rol-consultor-solo-lectura)

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
