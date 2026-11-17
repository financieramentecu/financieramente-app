---
'financieramente-app': patch
---

### Agregado

- API para administrar roles y permisos: crear, editar y desactivar roles, y definir qué permisos, alcance de datos y nivel mínimo tiene cada uno. El rol Administrador y "Sin rol asignado" no se pueden modificar.

### Técnico

- `POST /api/admin/roles`, `GET|PUT|DELETE /api/admin/roles/[id]`, `PUT /api/admin/roles/[id]/permissions`, guarded by the new `requirePermission` (reads grants from the DB per request).
- `role-admin.service` validates grants against the catalog, locks ADMIN/SIN_ROL, blocks self-lockout on `roles.gestionar` and deactivation of roles with active users.
- New audit actions `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_PERMISSIONS_CHANGED`, `ROLE_DEACTIVATED`.
