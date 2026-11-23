---
'financieramente-app': minor
---

### Agregado
- CRM: en Leads y en Reportes, cada fila abre o cierra el detalle del lead (etapas, tareas y casos) como un acordeón.
- CRM: al cerrar un caso se puede indicar la fecha de cierre. Si se deja vacía, el caso se cierra hoy.

### Mejorado
- CRM: en registrar actividad, tareas y casos, adjuntar un archivo usa un botón.

### Corregido
- CRM: en el historial, la línea de tiempo muestra lo más reciente arriba y lo más viejo abajo.
- CRM: al volver a una pestaña ya abierta, Pipeline, Leads, Actividades y Reportes conservan lo que ya cargaron. Tareas, casos y el historial tampoco se vacían al cambiar de sección.

### Técnico
- Lead timeline pages walk newest-first. The next cursor loads older events.
- CRM subresource checks use `isLeadVisible`, which selects only the lead id.
