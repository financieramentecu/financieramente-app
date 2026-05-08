# Design: Asignación de Líder y Optimización de Activación

## Technical Approach

El enfoque es modificar el flujo de aprovisionamiento inicial y la interfaz de gestión administrativa de usuarios:
1. **Auth Level**: Se modifica la lógica por defecto de NextAuth (`user-creation.ts`) para asignar el rol `AGENTE`. Eliminaremos las validaciones duras en `config.ts` que bloqueaban expresamente el rol `DEFAULT`, dejando que el control de acceso estándar (`active: false`) maneje la seguridad de las cuentas no activadas.
2. **Admin UI Level**: En `UserActionsCard`, se aplicarán filtros en memoria para las categorías recuperadas mediante `useAdminCategories`, reduciendo la lista solo a aquellas con `beneficiaryMode === 'OVERRIDE'`.
3. **Hierarchy Logic**: Al seleccionar una categoría, se leerá su propiedad `idNextCategory`. Este valor se pasará al hook `useLeaders(categoryId)`, el cual se actualizará para soportar este query param. Si `idNextCategory` es `null`, la interfaz interpretará esto como un "último nivel" y deshabilitará el selector de líder, limpiando cualquier valor previo.
4. **Data Level**: El endpoint `GET /api/admin/users` se actualizará con Prisma para hacer `include` o un `select` ampliado de las relaciones `category` y `leader`. Además soportará un bloque `where` condicionado por `categoryId` para el hook de líderes.
5. **Security & Notifications**:
    - **Single Notification**: La llamada a `sendNewUserNotificationToAdmins` se centraliza en `user-creation.ts`. Se elimina cualquier llamada redundante en `config.ts` para evitar envíos duplicados.
    - **Active Guard**: Se confirma que el `signIn` callback de NextAuth prioriza la verificación de `user.active`. Si es `false`, se rechaza el acceso con `InvalidAccount` o `AccountDisabled` sin importar los permisos del rol.
6. **UI/UX & Accesibilidad (Pro Max)**: En el formulario (`UserActionsCard`), se aplicarán buenas prácticas de UX:
   - **Feedback Visual**: El Select de Líder mostrará explícitamente un estado "Deshabilitado - No requiere líder" cuando se trate del último nivel.
   - **Accesibilidad**: Se mantendrá un `focus-visible:ring-2` para navegación por teclado y el uso de `cursor-pointer` en elementos interactivos.
   - **Transiciones**: Las interacciones tendrán `transition-colors duration-200` y soportarán `motion-reduce:transition-none` para respetar las preferencias de movimiento del usuario.

## Architecture Decisions

### Decision: Rol por defecto al registro

**Choice**: Asignar rol `AGENTE` automáticamente y remover la constante de verificación de `DEFAULT`.
**Alternatives considered**: Mantener `DEFAULT` y hacer que el admin lo cambie manualmente en la UI cada vez (estado actual).
**Rationale**: Reduce la fricción administrativa (1 paso menos por usuario). La seguridad se mantiene inalterada porque todos los usuarios nuevos nacen con estado `active: false`, el cual sigue siendo bloqueado por el Middleware / Provider.

### Decision: Filtrado de Categorías en Cliente vs Servidor

**Choice**: Filtrar las categorías con `beneficiaryMode === 'OVERRIDE'` en el cliente (dentro de `UserActionsCard`).
**Alternatives considered**: Crear un endpoint específico o modificar `useAdminCategories` para pedir solo las de tipo `OVERRIDE` desde la BD.
**Rationale**: `useAdminCategories` ya recupera la lista completa y la cachea. Un filtro en memoria (`.filter(c => c.beneficiaryMode === 'OVERRIDE')`) es inmediato (O(N) con N pequeño) y no requiere crear nuevos endpoints ni ensuciar los existentes.

### Decision: Inyección de relaciones en la Tabla de Usuarios

**Choice**: Modificar `GET /api/admin/users` para incluir los datos relacionales (`category.name`, `leader.name`) en la consulta primaria.
**Alternatives considered**: Hacer requests individuales desde el cliente por cada usuario, o no mostrar la información hasta abrir el modal.
**Rationale**: Evita el problema clásico de N+1 queries. Traer la información directamente desde Prisma con un Join (`select`/`include`) es óptimo y permite mostrar la información del estado del usuario directamente en la tabla principal.

## Data Flow

    [OAuth / Login] ──→ (user-creation.ts) ──→ Prisma (Creates User: AGENTE, active: false)
                              │
    [Admin UI: UsersTable] ←──┘ (GET /api/admin/users) [Returns Users + Category + Leader]
            │
            └──→ [Admin UI: UserActionsCard]
                     │
                     ├─→ Filters categories (OVERRIDE only)
                     │
                     └─→ Selects Category ──→ Gets `idNextCategory`
                                                  │
                                                  ├─ If null ──→ Disable Leader Select, set leader=null
                                                  │
                                                  └─ If ID   ──→ (GET /api/admin/users?categoryId=...) ──→ Returns Leaders

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/auth/lib/user-creation.ts` | Modify | Cambia asignación `DEFAULT` por `AGENTE`. |
| `src/lib/auth/config.ts` | Modify | Remueve el bloque condicional que rechaza inicio de sesión con rol `DEFAULT`. |
| `src/app/api/admin/users/route.ts` | Modify | Amplía Prisma `select` para adjuntar `category` y `leader`. Nuevo query param `categoryId` para el filtrado de líderes. |
| `src/features/admin/users/hooks/use-leaders.ts` | Modify | Recibe `categoryId` como argumento y lo añade al request API. |
| `src/features/admin/users/components/user-actions-card.tsx` | Modify | Aplica lógica de jerarquía (`idNextCategory`) y filtrado (`OVERRIDE`). Controla el estado disabled del líder. |
| `src/features/admin/users/types/user.types.ts` | Modify | Añade campos opcionales `category` y `leader` a la interfaz `User`. |
| `src/features/admin/users/components/users-table.tsx` | Modify | Añade las columnas visuales correspondientes en la tabla. |

## Interfaces / Contracts

```typescript
// en src/features/admin/users/types/user.types.ts
export interface User {
  // ... existing fields
  idCategoria?: number | null;
  idUserLeader?: string | null;
  category?: {
    idCategory: number;
    name: string;
  } | null;
  leader?: {
    idUser: string;
    name: string | null;
    lastName: string | null;
  } | null;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Zod Form validation | Simular en `UserActionsCard` la selección de categoría de último nivel y verificar que `idUserLeader` no causa errores de validación si es vacío. |
| Unit | Lógica de creación de usuarios | Ajustar tests en `src/features/auth/__tests__` que verificaban explícitamente el rechazo por `DEFAULT`. |
| API | API de usuarios | Llamar a `GET /api/admin/users?categoryId=X` y validar que retorna el array filtrado. |

## Migration / Rollout

No migration required. Los usuarios existentes que tengan rol `DEFAULT` seguirán existiendo sin afectar el sistema porque la validación estricta de bloqueo en `config.ts` ha sido removida y el acceso lo controla su estado de activación. Se sugiere como mantenimiento futuro una query SQL manual para actualizarlos a `AGENTE`.

## Open Questions

- None
