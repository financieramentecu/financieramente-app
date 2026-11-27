---
"financieramente-app": patch
---

### Mejorado

- El rol "Default" ahora se llama "Sin rol asignado" (código `SIN_ROL`). Sus usuarios siguen igual: sin permisos y pendientes de activación.

### Técnico

- Added `permission` and `role_permission` tables, the `DataScope` enum and `role.is_system` (migration `20261112174104_access_control_permissions`); the migration renames the `DEFAULT` role to `SIN_ROL`.
- New `src/features/access-control/` module with the permission catalog (44 permissions), default grants per role and the catalog sync service. `npm run prisma:seed:permissions` is idempotent and never overwrites roles that already have permissions.
- `UserRole.DEFAULT` renamed to `UserRole.SIN_ROL`. Runtime role checks still use the existing hardcoded permissions; they migrate in later changes.
