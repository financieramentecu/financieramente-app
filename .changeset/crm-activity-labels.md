---
'financieramente-app': minor
---

### Agregado

- CRM: las etiquetas de las actividades (Tarea, Llamada, Reunión, Email, WhatsApp y las que agregue el equipo) se pueden crear, renombrar y desactivar desde Actividades.
- CRM: las cabeceras del tablero de actividades se pueden renombrar. Las tarjetas siguen agrupándose por vencimiento.
- CRM: el vencimiento sigue en la tarjeta de la actividad, como etiqueta con la fecha y la hora.

### Técnico

- Migration `20261112183000_add_lead_activity_label`: `lead_activity_label` catalogue and `lead_task.id_lead_activity_label`, seeded from `LeadTaskType` and backfilled onto existing tasks.
- Endpoints `GET/POST /api/crm/activity-labels` and `PATCH/DELETE /api/crm/activity-labels/[id]` (`crm_tasks`). Creating a task accepts `idLeadActivityLabel`.
- Migration `20261112190000_add_lead_activity_column`: four seeded column titles. `GET /api/crm/activity-columns` and `PATCH /api/crm/activity-columns/[code]`.
