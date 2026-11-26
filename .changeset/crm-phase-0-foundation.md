---
'financieramente-app': minor
---

### Agregado

- **CRM dentro de Negocios:** El menú Negocios ahora agrupa "Ver Negocios" y "CRM". La gestión de leads vive en Negocios → CRM, con la pestaña Pipeline (tablero de leads) y las pestañas Leads, Actividades y Reportes marcadas como "Próximamente". El antiguo enlace de Leads redirige al CRM.
- **Gestionado en GHL:** El detalle de cada lead sincronizado muestra que sus datos se gestionan en GoHighLevel mientras dura la migración al CRM propio.

### Técnico

- New `/dashboard/negocios/crm` page (gated by `leads_module` flag and `permissions.leads`); `/dashboard/leads` permanently redirects there. Top-level `Leads` menu entry removed; `CRM` sub-item added under `Negocios` / `Mis Negocios`.
- New `LeadStageHistory` model + `LeadStageChangeSource` enum (migration `20261105120000_add_lead_stage_history`), written by `crm-sync` webhook and CSV import on lead creation or funnel column change via `recordLeadStageChange()` (never throws; errors go to Sentry).
