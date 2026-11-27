---
"financieramente-app": minor
---

### Agregado

- Nueva pantalla "Roles" en Administración: lista de roles con usuarios y permisos, creación y desactivación de roles.
- Editor de rol con permisos agrupados por módulo, alcance de datos (propio, equipo o toda la compañía) y nivel mínimo para exportar negocios. Avisa cuando "Fondear aportes" queda activo sin "Ver aportes".

### Técnico

- `GET /api/admin/roles/overview` (roles with active user and enabled permission counts) and level options in `GET /api/admin/roles/[id]`.
- `permission-matrix` pure helpers, `roleApi` client, `useRoles`/`useRoleDetail`/`useRoleActions` hooks, `RolesManager` and `RoleEditor`. Shared `async-state` helpers moved to `features/shared/lib`.
