# Tasks: Asignación de Líder y Optimización de Activación

## Phase 1: Foundation (Auth & API)

- [x] 1.1 Modificar `src/features/auth/lib/user-creation.ts` para asignar `UserRole.AGENTE` por defecto en la creación de usuario.
- [x] 1.2 Modificar `src/lib/auth/config.ts` eliminando el bloque de código que rechaza el inicio de sesión explícitamente para el rol `DEFAULT`.
- [x] 1.3 Modificar `src/app/api/admin/users/route.ts` para procesar el query param `categoryId` e inyectarlo en el filtro `where`.
- [x] 1.4 Modificar `src/app/api/admin/users/route.ts` para incluir las relaciones relacionales `category` y `leader` en el Prisma `select`.
- [x] 1.5 Eliminar la llamada redundante a `sendNewUserNotificationToAdmins` en `src/lib/auth/config.ts` para garantizar un único envío.

## Phase 2: Core Implementation (Types & Hooks)

- [x] 2.1 Actualizar `src/features/admin/users/types/user.types.ts` para añadir `category` y `leader` en la interfaz `User`.
- [x] 2.2 Actualizar `src/features/admin/users/hooks/use-leaders.ts` para aceptar `categoryId` y agregarlo al endpoint fetch (`/admin/users?role=AGENTE&status=active&categoryId=...`).

## Phase 3: Integration (Admin UI Components)

- [x] 3.1 Modificar `src/features/admin/users/components/user-actions-card.tsx` filtrando las categorías traídas por `useAdminCategories` para mostrar solo las de modo `OVERRIDE`.
- [x] 3.2 Modificar `src/features/admin/users/components/user-actions-card.tsx` para obtener `idNextCategory` de la categoría seleccionada y pasarlo al hook `useLeaders`.
- [x] 3.3 Modificar `src/features/admin/users/components/user-actions-card.tsx` aplicando UX Pro Max: deshabilitar select de líder si no hay `idNextCategory` y mostrar estado claro. Mantener accesibilidad y transiciones suaves.
- [x] 3.4 Modificar `src/features/admin/users/components/users-table.tsx` para incorporar y mostrar las columnas "Categoría" y "Líder".

## Phase 4: Testing & Verification

- [x] 4.1 Correr `npm run type-check` y resolver cualquier discrepancia tipográfica en la tabla de usuarios.
- [x] 4.2 Ejecutar suite de pruebas (`npm run test:unit`) para asegurar que la eliminación de la verificación `DEFAULT` no rompa pruebas de autorización de sesión.
- [x] 4.3 Verificación visual de UI/UX (tablas, hover, disables) en el panel de administrador.
