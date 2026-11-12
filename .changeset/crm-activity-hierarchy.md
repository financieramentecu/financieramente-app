---
'financieramente-app': minor
---

### Agregado

- CRM: el árbol de jerarquía filtra Pipeline, Leads, Actividades y Reportes. Un super admin ve toda la compañía; el resto ve su equipo y puede marcar personas para ver lo de ellas y de quienes están debajo.

### Mejorado

- CRM: en el árbol de jerarquía se lee el nombre completo de cada persona.

### Técnico

- `GET /api/crm/advisors` lists the hierarchy for CRM filters.
- `GET /api/crm/tasks?view=board&owner=` narrows the activity board to advisors inside the viewer's hierarchy.
- Pipeline, lead table and report queries accept repeated `owner` params and never widen the hierarchy.
- `npm run prisma:seed:crm-demo` assigns demo leads and tasks to existing hierarchy users so the filter can be checked.
