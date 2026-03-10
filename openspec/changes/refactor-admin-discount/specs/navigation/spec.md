# Delta for Navigation

This delta adds to the sidebar navigation definition in `src/lib/navigation/menu-items.tsx`.

---

## ADDED Requirements

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
