# Delta for Navigation

## ADDED Requirements

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
