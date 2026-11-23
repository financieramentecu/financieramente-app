---
'financieramente-app': minor
---

### Agregado

- CRM: el árbol de jerarquía filtra Pipeline, Leads, Actividades y Reportes. Un super admin ve toda la compañía; el resto ve su equipo y puede marcar personas para ver lo de ellas y de quienes están debajo.

### Corregido

- CRM: al desmarcar una persona del árbol se ocultan sus leads y los de quienes están debajo, y siguen viéndose los de las demás personas aunque no aparezcan en el árbol.
- CRM: los roles con acceso global conservan los leads sin asignar al desmarcar personas, tanto en Pipeline como en la tabla; los roles limitados a su jerarquía siguen sin ver leads sin dueño.

### Mejorado

- CRM: en el árbol de jerarquía se lee el nombre completo de cada persona.

### Técnico

- `GET /api/crm/tasks?view=board&owner=` narrows the activity board to advisors inside the viewer's hierarchy.
- Pipeline, lead table, activity board and report queries accept repeated `exclude` params. The server drops those branches and their descendants, and never widens the hierarchy.
- `npm run prisma:seed:crm-demo` assigns demo leads and tasks to existing hierarchy users so the filter can be checked.
