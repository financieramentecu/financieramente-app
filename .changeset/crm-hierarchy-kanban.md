---
'financieramente-app': minor
---

### Agregado
- CRM: la pestaña Actividades vuelve a las cuatro columnas de vencimiento (vencidas, vencen hoy, próximas a vencer y completadas). Arrastrar una actividad la mueve de columna.
- CRM: el mismo árbol de jerarquía del dashboard filtra Pipeline, Leads, Actividades y Reportes. Un super admin ve toda la compañía; el resto ve su equipo y puede marcar personas para ver solo lo de ellas y de quienes están debajo.

### Mejorado
- CRM: Pipeline, tareas y casos empiezan a cargar sin esperar el árbol de jerarquía.
- CRM: en el árbol de jerarquía se lee el nombre completo de cada persona.
- CRM: en el pipeline se puede arrastrar un lead de una etapa a otra. La tarjeta cruza de columna y el cambio queda a nombre de la persona que lo movió.
- CRM: el historial de etapa muestra al asesor o a quien hizo el movimiento, y ya no lo atribuye a GoHighLevel.

### Técnico
- `GET /api/crm/tasks?view=board&owner=` returns the four agenda windows for the viewer's hierarchy.
- `PATCH /api/crm/tasks/[id]` with `action: move` reschedules, completes, or reopens a task so it lands in the dropped column.
- `GET /api/crm/advisors` lists the hierarchy for CRM filters.
- `PATCH /api/leads/[id]/stage` moves a lead and writes `LeadStageHistory` with source `MANUAL` and the acting user.
- Pipeline, lead table and report queries accept repeated `owner` params, narrowed so they never widen the hierarchy.
- `npm run prisma:seed:crm-demo` assigns demo leads and tasks to existing hierarchy users so the CRM filter can be checked.
