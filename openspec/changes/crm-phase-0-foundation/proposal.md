# Proposal: CRM Phase 0 — Foundation (navigation, CRM page, stage history)

## Intent

Financieramente will replace GoHighLevel (GHL) with its own CRM (plan: `PRDs/crm/PLAN-DE-TRABAJO-CRM.md`). While the migration lasts, **GHL remains the source of truth**: synced lead fields (contact, funnel stage, owner, outcome) only enter through the `crm-sync` webhook / CSV import and stay read-only in Financieramente.

Phase 0 lays the foundation without changing that contract:

1. Move lead management under **Negocios → CRM** in the sidebar.
2. Create the CRM page (`/dashboard/negocios/crm`) with tabs; the existing Kanban becomes the "Pipeline" tab.
3. Start recording **funnel stage history** now, from GHL data, so that time-in-stage reports (Phase 3) have history from day one.
4. Make the GHL ownership visible in the lead detail ("Gestionado en GHL").

## Scope

### In Scope
- `ALL_MENU_ITEMS`: `Negocios` becomes a group with sub-items `Ver Negocios` (`/dashboard/negocios`) and `CRM` (`/dashboard/negocios/crm`). The top-level `Leads` entry is removed.
- `AGENTE_MENU_ITEMS`: `Mis Negocios` gains a `CRM` sub-item; the top-level `Leads` entry is removed.
- Menu gating: the `CRM` sub-item requires `permissions.leads`; a role with `negocios.list` but without `leads` keeps `Negocios` as a flat item (CONSULTOR unchanged).
- New page `/dashboard/negocios/crm`, gated by the existing `leads_module` feature flag, with tabs `Pipeline` (existing `LeadsBoard`) and disabled `Leads`, `Actividades`, `Reportes` ("Próximamente").
- `/dashboard/leads` permanently redirects to `/dashboard/negocios/crm`.
- Breadcrumb label `crm: 'CRM'`.
- New model `LeadStageHistory` + enum `LeadStageChangeSource` (`CRM_SYNC`, `CSV_IMPORT`, `MANUAL`). Written by the webhook and the CSV import when a lead is created or its funnel column changes.
- Lead detail sheet: "Gestionado en GHL" badge when the lead has an `externalCrmId`.

### Out of Scope
- Editing leads, drag & drop, manual creation (Phase 4, behind the source-of-truth switch).
- Granular `crm.*` permissions: `permissions` are serialized inside the JWT, so renaming `leads` would break active sessions. Deferred to Phase 4, when there are actions to gate.
- `crm_source_of_truth` switch: nothing is editable yet, so it would be dead code. Introduced in Phase 4.
- A new `crm_module` flag: the existing `leads_module` flag already gates this module and is reused.
- Backfilling history for existing leads (no reliable past data; history starts at deploy).

## Capabilities
- `navigation` (modified): Negocios group, CRM sub-item, Leads entry removed.
- `leads` (modified): CRM page and tabs, redirect, GHL badge.
- `lead-stage-history` (new): recording rules.

## Rollback
Revert the branch. The migration is additive (new table + enum); dropping `lead_stage_history` loses only history.
