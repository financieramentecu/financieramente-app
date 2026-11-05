---
'financieramente-app': patch
---

### Corregido

- Solo los administradores pueden crear o inactivar descuentos de comisión (Impuesto y Clawback). Antes cualquier usuario con sesión podía hacerlo llamando directamente al servicio.

### Técnico

- `POST /api/admin/discounts` and `POST /api/admin/discounts/[id]/inactivate` now use `requireRole([UserRole.ADMIN])` (401 unauthenticated, 403 other roles). `GET /api/admin/discounts` is unchanged.
