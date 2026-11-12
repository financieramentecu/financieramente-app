---
'financieramente-app': minor
---

### Agregado

- **Exportar reportes del CRM:** Los reportes del pipeline se descargan en Excel y en PDF.
- **Detalle por lead:** El reporte agrupa cada lead en su último estado. Al desacoplar, las etapas se ven en cascada dentro de ese lead. La tabla se puede ver de 10, 20, 50 o 100 filas.

### Mejorado

- **Línea de tiempo del lead:** La pestaña Historial agrupa por día las actividades, las tareas y los cambios de etapa.

### Técnico

- `GET /api/crm/reports/stage-detail` and `GET /api/crm/reports/export?format=xlsx|pdf`.
- Timeline entries are grouped by the Bogotá calendar day.
