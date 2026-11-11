---
'financieramente-app': patch
---

### Corregido

- **Endpoints administrativos sin control de acceso:** varios endpoints internos (envío de correos, niveles de comisión, reglas de distribución de comisión, periodicidades y monedas) no verificaban que el usuario estuviera autenticado y autorizado antes de ejecutar la operación. Ahora exigen sesión y, cuando corresponde, rol de Administrador.
- **Acceso a negocios de otros usuarios por URL:** al consultar o editar el detalle de un negocio, el filtro de propiedad solo se aplicaba al rol Agente; cualquier otro rol no privilegiado podía ver o modificar negocios ajenos cambiando el identificador en la URL. Ahora el filtro de propiedad aplica a cualquier rol que no tenga autoridad de escritura global.

### Técnico

- `src/app/api/email/send/route.ts`: added `requireRole([UserRole.ADMIN])` guard (POST).
- `src/app/api/levels/route.ts` and `[id]/route.ts`: added `requireRole([UserRole.ADMIN])` guard (POST/PUT/DELETE), reusing the guard's session for audit logging.
- `src/app/api/product-configurations/[id]/distribution-commission/route.ts`, `[ruleId]/route.ts`, `[ruleId]/assign-new-businesses/route.ts`: added `requireRole([UserRole.ADMIN])` guard (POST/PUT/PATCH).
- `src/app/api/admin/periodicities/route.ts` and `[id]/route.ts`, `src/app/api/admin/currencies/route.ts` and `[id]/route.ts`: added `requireAuth()` (GET) and `requireRole([UserRole.ADMIN])` (POST/PUT/DELETE) guards — these routes had no authentication check at all.
- `src/features/negocios/services/business-get-by-id.server.ts`: ownership scoping now uses `isWriteBypassRole()` instead of comparing only against `UserRole.AGENTE`.
- `src/app/api/negocios/[id]/route.ts` (PUT): ownership `whereClause` now derives from the existing `isPrivileged` flag (`ADMIN`/`ASISTENTE_GERENCIA_OPERATIVA`/`ANALISTA_SOPORTE`) instead of `isAgent`, closing the same gap for any non-privileged role.
