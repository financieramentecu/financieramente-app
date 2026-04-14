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
