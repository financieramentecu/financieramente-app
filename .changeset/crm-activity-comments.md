---
'financieramente-app': minor
---

### Agregado
- CRM: en Actividades, las tarjetas de tareas muestran su información y los casos aparecen en las mismas columnas.
- CRM: al hacer clic en una tarea o un caso se ven sus comentarios y se puede agregar uno, o completarlo, sin abrir el lead.
- CRM: en el pipeline, cada tarea y cada caso tiene Ver, que abre esa actividad en la pestaña Actividades.
- CRM: en Actividades se puede ver todo, solo las tareas o solo los casos.

### Técnico
- Migration `20261111170000_add_lead_task_comment` stores task comments.
- `GET /api/crm/tasks?view=board` returns `{ tasks, cases }`.
- `GET` and `POST /api/crm/activity-comments` list and add comments for a task or a case.
