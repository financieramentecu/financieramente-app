---
'financieramente-app': minor
---

### Agregado
- CRM: timeline de eventos por lead con notas de seguimiento.
- CRM: tareas de seguimiento por lead con responsable y reasignación.
- CRM: casos de soporte por lead con estado, prioridad y comentarios.
- CRM: tarjetas de resumen del pipeline encima del tablero.

### Técnico
- Branch `codex/negocios-basic-crm`: models `LeadActivity`, `LeadTask`, `LeadSupportCase`, `LeadSupportCaseComment` (migrations `20261105165000`–`20261105180000`).
- Endpoints `/api/leads/[id]/activities|tasks|cases`, `/api/crm/tasks/[id]`, `/api/crm/cases/[id]`, `/api/crm/reports/summary`; conversion audit events `CONVERTED` / `BUSINESS_LINKED`.
- Feature flags `crm_timeline`, `crm_tasks`, `crm_cases`, `crm_conversion_audit`, `crm_imports`, `crm_reports` (default off; `LOCAL_CRM_FEATURE_FLAGS` for local development).
