---
'financieramente-app': minor
---

### Agregado
- CRM: en Actividades, las tarjetas de tareas muestran su información y los casos aparecen en las mismas columnas.
- CRM: al hacer clic en una tarea o un caso se abre la ficha del lead con la descripción de esa actividad.
- CRM: en la ficha del lead, cada tarea y cada caso permite leer y escribir comentarios.
- CRM: en Actividades se puede ver todo, solo las tareas o solo los casos.

### Mejorado

- CRM: la ficha del lead se abre al hacer clic, con el nombre visible, y el detalle carga dentro.
- CRM: las tarjetas de Actividades no muestran los comentarios.
- CRM: al abrir una actividad se ve su descripción, el historial de comentarios, el campo para agregar otro y la acción para finalizarla.
- CRM: la ficha de una actividad ya no ofrece convertir el lead a negocio. El botón de esa sección finaliza la actividad.
- CRM: mientras cargan las actividades, las tareas, los casos y el historial se muestra un esqueleto en lugar del texto de espera.

### Técnico
- Migration `20261111170000_add_lead_task_comment` stores task comments.
- `GET /api/crm/tasks?view=board` returns `{ tasks, cases }`.
- `GET` and `POST /api/crm/activity-comments` list and add comments for a task or a case.
- Adding a task comment appends a `TASK_COMMENTED` timeline event. A case comment appends `CASE_UPDATED` with `action: COMMENTED`. The timeline shows the comment text.
