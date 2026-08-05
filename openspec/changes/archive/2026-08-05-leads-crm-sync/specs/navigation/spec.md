# Delta for Navigation

## ADDED Requirements

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
