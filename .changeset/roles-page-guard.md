---
"financieramente-app": patch
---

### Corregido

- Quien no tiene el permiso "Ver roles" ya no puede abrir las pantallas de Roles escribiendo la dirección: se le redirige a "Acceso denegado".

### Técnico

- New `requirePagePermission(code)` (Server Component guard: `/login` without session, `/access-denied?reason=no_permissions` without the permission) used by `/dashboard/admin/roles` and `/dashboard/admin/roles/[id]`. APIs keep `requirePermission`.
