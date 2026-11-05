# Delta for Leads

## ADDED Requirements

### Requirement: CRM Page With Tabs

`/dashboard/negocios/crm` MUST render the CRM page, gated by the `leads_module` feature flag (redirect to `/dashboard` when disabled). It MUST show tabs `Pipeline`, `Leads`, `Actividades`, `Reportes`. Only `Pipeline` is enabled in Phase 0 and renders the existing read-only Kanban board; the other tabs MUST be disabled and labelled "Próximamente".

#### Scenario: Pipeline tab shows the Kanban
- GIVEN `leads_module` is enabled
- WHEN a user opens `/dashboard/negocios/crm`
- THEN the `Pipeline` tab SHALL be selected and show the leads Kanban board
- AND the `Leads`, `Actividades` and `Reportes` tabs SHALL be disabled

### Requirement: Legacy Leads Route Redirect

`/dashboard/leads` MUST redirect to `/dashboard/negocios/crm`.

#### Scenario: Old bookmark
- WHEN a user opens `/dashboard/leads`
- THEN they SHALL be redirected to `/dashboard/negocios/crm`

### Requirement: GHL-Managed Indicator

While GoHighLevel is the source of truth, the lead detail view MUST show a "Gestionado en GHL" badge for every lead with a non-empty `externalCrmId`, signalling that its synced fields cannot be edited in Financieramente.

#### Scenario: Synced lead
- GIVEN a lead with `externalCrmId = 'crm-1'`
- WHEN its detail sheet opens
- THEN a "Gestionado en GHL" badge SHALL be visible

#### Scenario: Lead without external id
- GIVEN a lead with `externalCrmId = null`
- WHEN its detail sheet opens
- THEN no "Gestionado en GHL" badge SHALL be rendered
