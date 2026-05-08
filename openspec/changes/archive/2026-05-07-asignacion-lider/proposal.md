# Proposal: Asignación de Líder y Optimización de Activación

## Intent

Mejorar la experiencia de usuario (UX) para los administradores al activar nuevos usuarios. Automatizar la asignación del rol correcto (`AGENTE`) desde el registro y garantizar que la selección de categoría y líder respete estrictamente las reglas de negocio, incluyendo la jerarquía (`nextCategory`) y el modo de beneficiario.

## Scope

### In Scope
- Asignación automática del rol `AGENTE` (en lugar de `DEFAULT`) al crear nuevos usuarios.
- Filtrar la lista de categorías en el panel de activación para mostrar solo las que tienen `beneficiaryMode === 'OVERRIDE'`.
- Filtrar el dropdown de Líderes para mostrar solo usuarios que pertenecen a la categoría del nivel superior (`idNextCategory`).
- Ocultar o deshabilitar la selección de líder para categorías de último nivel (`nextCategory === null`).
- Añadir las columnas "Categoría" y "Líder" a la tabla de usuarios (`UsersTable`).
- Garantizar que el bloqueo de acceso por `active: false` sea la barrera primaria de seguridad.
- Asegurar que la notificación por correo a administradores se envíe exactamente una vez por usuario nuevo (en la creación).

### Out of Scope
- Migrar usuarios existentes que tengan el rol `DEFAULT` (requerirá intervención de base de datos o script fuera de este flujo).
- Cambios en el diseño visual de la tabla fuera de agregar las nuevas columnas.

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities
- None

### Modified Capabilities
- `admin`: Se modifican las reglas de activación de usuarios, asignación de rol inicial, filtrado de categorías por modo beneficiario y jerarquía de líderes por categoría.

## Approach

1. **Rol inicial**: Modificar `src/features/auth/lib/user-creation.ts` para buscar y asignar el rol `AGENTE`. Eliminar el bloqueo en `config.ts` para que un usuario `AGENTE` inactivo sea tratado normalmente (el estado inactivo es la única barrera).
2. **Filtros en UI y Jerarquía**: En `UserActionsCard`, filtrar localmente la data de `useCategories` para retener solo los que cumplen con `beneficiaryMode === 'OVERRIDE'`. Extraer el `idNextCategory` de la categoría seleccionada para pasarlo al hook `useLeaders`.
3. **Endpoint de Usuarios**: Modificar el backend en `src/app/api/admin/users/route.ts` para incluir las relaciones de Prisma (`category` y `leader`) y aceptar el query param `categoryId` para resolver la consulta por jerarquía.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/auth/lib/user-creation.ts` | Modified | Cambia el rol por defecto de DEFAULT a AGENTE |
| `src/lib/auth/config.ts` | Modified | Remueve validación de rechazo especial para rol DEFAULT |
| `src/app/api/admin/users/route.ts` | Modified | Añade filtro `categoryId` e incluye relaciones `category`/`leader` |
| `src/features/admin/users/hooks/use-leaders.ts` | Modified | Pasa el `categoryId` como parámetro al request HTTP |
| `src/features/admin/users/components/user-actions-card.tsx` | Modified | Filtra por OVERRIDE y maneja lógica de nextCategory para el líder |
| `src/features/admin/users/components/users-table.tsx` | Modified | Agrega nuevas columnas Categoría y Líder |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Inconsistencia temporal de roles al crear usuario | Low | Los usuarios sin rol se bloquean igual. La BD se inicializará con AGENTE de forma segura, y `active: false` los bloquea. |
| Líderes no encontrados | Medium | Si el nivel superior no tiene usuarios, la lista estará vacía. La interfaz debe indicar que no hay líderes disponibles en el nivel superior. |

## Rollback Plan

Revertir los commits generados en la fase `apply` de este cambio. En particular, restablecer la constante de rol por defecto a `DEFAULT` en `user-creation.ts`.

## Dependencies

- Requiere que la base de datos tenga correctamente poblado el campo `idNextCategory` y `beneficiaryMode` en las categorías de la tabla `Category`.

## Success Criteria

- [ ] Los usuarios nuevos nacen con rol `AGENTE` en la base de datos y en estado inactivo.
- [ ] El administrador ve la Categoría y Líder directamente en la tabla general de usuarios.
- [ ] Al editar un usuario, la lista de categorías solo muestra las que tienen `beneficiaryMode === 'OVERRIDE'`.
- [ ] Al elegir una categoría, solo aparecen líderes del nivel inmediatamente superior (`idNextCategory`).
- [ ] Si la categoría no tiene nivel superior, no se requiere líder (deshabilitado o estado nulo).
