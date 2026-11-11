---
'financieramente-app': patch
---

### Corregido

- Eliminar un producto o un origen de cliente ya no borra el registro de la base de datos: ahora se desactiva (borrado lógico) y se conserva el historial.

### Técnico

- `DELETE /api/products/[id]` and `DELETE /api/origins/[id]` now call `deactivateProduct` / `deactivateClientOrigin` (services) which `update({ status: false })` instead of `prisma.*.delete()`. In-use validation and audit logging are unchanged.
