---
"financieramente-app": patch
---

### Corregido
- Las acciones de una fila del listado de negocios (subir soporte, comentar, gestionar novedad) ya no se aplican a otro negocio cuando la lista se recarga o se reordena con un modal abierto.
- El modal de cancelar negocio ya no puede quedar apuntando a un negocio abierto antes, evitando cancelar el negocio equivocado.

### Técnico
- `BusinessTableSection` passes `getRowId` (business id) to `DataTable`; rows were keyed by index.
- `NegociosPageClient.handleCancelBusiness` ignores stale `getById` responses via a target-id ref.
