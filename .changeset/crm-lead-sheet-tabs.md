---
'financieramente-app': patch
---

### Mejorado

- **Detalle del lead:** Dentro de Detalle, después de los datos de CRM, Tareas y Casos quedan en una pestaña. Al completar una tarea o cerrar un caso se puede dejar un comentario y adjuntar archivos. Las listas muestran primero lo más reciente. El historial muestra esas altas, cierres, comentarios y archivos.

### Técnico

- Completing a task and closing a case accept an optional comment and multipart files. The comment and attachment metadata are stored on the `TASK_COMPLETED` or `CASE_UPDATED` activity. Task and case lists order by `createdAt` descending.
