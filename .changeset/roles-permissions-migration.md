---
"financieramente-app": minor
---

### Mejorado

- Los permisos de cada rol ahora se definen en un solo lugar y se pueden ajustar desde la pantalla de Roles (cuando está activada). El menú, los botones y las rutas siguen la misma regla.
- Por defecto, la Asistente de Gerencia Operativa ya no ve "Carga de archivos" ni los catálogos de configuración, y el Analista de Soporte ya no puede liquidar; ambos se pueden volver a activar desde Roles.

### Corregido

- Los botones de las tablas dejan de mostrarse a roles que no tienen el permiso (por ejemplo, el CONSULTOR ya no ve "Cancelar" en un negocio).

### Técnico

- All role checks moved to `src/features/access-control/` (`requirePermission`, `requireRolePermission`, `roleCan`, `roleScope`, `usePermissions().can`); `UserRole.X` is forbidden by ESLint outside an allowlist of structural identity rules.
- Removed `features/auth/lib/permissions.ts` (`ROLE_PERMISSIONS`), the role helper predicates in `roles.ts` and `token.permissions`; the session now carries `grants` and `levelOrder`.
- New env var `ACCESS_CONTROL_SOURCE` (`defaults` | `db`); run `npm run prisma:seed:permissions` before switching to `db`. The seed now grants brand-new catalog permissions to roles that already have grants.
- New catalog permissions: `negocios.editar_desde_lista`, `negocios.editar_fecha_emision`, `leads.eliminar`, `liquidacion.ver`, `configuracion.correo`, `reportes.ver_todos`, `novedades.desmarcar_ajenas`, `carga.ver_todos`.
