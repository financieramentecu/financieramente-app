---
'financieramente-app': minor
---

### Agregado

- CRM: las etiquetas de las actividades (Tarea, Llamada, Reunión, Email, WhatsApp y las que agregue el equipo) se pueden crear, renombrar y desactivar desde Actividades.
- CRM: las columnas del tablero de actividades se pueden renombrar, agregar y eliminar. Las de vencimiento siguen agrupando por fecha. Una columna nueva recibe las tarjetas que se suelten en ella. Eliminar una columna no borra las actividades.
- CRM: el vencimiento sigue en la tarjeta de la actividad, como etiqueta con la fecha y la hora.

### Técnico

- Migration `20261112183000_add_lead_activity_label`: `lead_activity_label` catalogue and `lead_task.id_lead_activity_label`, seeded from `LeadTaskType` and backfilled onto existing tasks.
- Endpoints `GET/POST /api/crm/activity-labels` and `PATCH/DELETE /api/crm/activity-labels/[id]` (`crm_tasks`). Creating a task accepts `idLeadActivityLabel`.
- Migration `20261112190000_add_lead_activity_column`: four seeded column titles. `GET/POST /api/crm/activity-columns` and `PATCH/DELETE /api/crm/activity-columns/[code]`.
- Migration `20261112200000_activity_column_catalogue`: `lead_activity_column.active`, plus `lead_task.column_code` and `lead_support_case.column_code` for cards dropped on a custom column.
