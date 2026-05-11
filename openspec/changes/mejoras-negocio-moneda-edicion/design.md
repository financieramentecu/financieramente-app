# Design: Mejoras en Negocios (Moneda y Edición Privilegiada)

## Technical Approach

El objetivo es permitir una gestión flexible de los negocios tanto en la creación (moneda) como en la edición (campos restringidos para Admins). Implementaremos una lógica de permisos basada en roles en el frontend y extenderemos el endpoint `PUT /api/negocios/[id]` para procesar actualizaciones completas, incluyendo la resolución de nuevas configuraciones de comisiones (PPC) si el producto o agente cambian.

## Architecture Decisions

### Decision: Validación centralizada de Edición Privilegiada

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Duplicar lógica en componentes | Difícil de mantener | Usar `isPrivilegedRole` en el hook `useBusinessForm` y propagarlo a las secciones. |
| Crear un nuevo endpoint | Más limpio pero requiere migrar frontend | Extender el endpoint `PUT` existente con lógica condicional por rol y validaciones de estado/fondeo. |

**Rationale**: Extender el endpoint existente permite aprovechar la infraestructura de auditoría y validación de estado que ya posee `PUT /api/negocios/[id]`, minimizando el impacto en el cliente.

### Decision: Reglas de Edición de Plazo y Periodicidad

**Choice**: La edición de `term` y `idBuyPeriodicity` estará restringida por estado y fondeo.
**Rationale**: Evitar inconsistencias financieras al modificar la estructura de cuotas de un negocio que ya tiene flujos de caja registrados.

- **Estados Permitidos**: `VENTA_EFECTUADA`, `EMITIDO`.
- **Condición de Fondeo**: El negocio debe tener **cero (0)** pagos con estado `FONDEADO`.
- **Acción**: Si se permite el cambio, se eliminarán los pagos existentes (todos `SIN_FONDEAR`) y se recrearán según el nuevo `numAportes`.

### Decision: Resolución dinámica de PPC en Update

**Choice**: En el backend, si `idProduct` o `idUser` cambian, se ejecutará `findProductPercentageCommission` para obtener el nuevo `idProductPercentageCommission`.
**Rationale**: El negocio DEBE estar vinculado siempre a una configuración válida de comisiones. No podemos permitir cambiar el producto a uno que el agente no tiene configurado.

## Data Flow

1.  **UI**: `BusinessInfoSection` y `CoachInfoSection` habilitan campos si `isPrivilegedRole` es true.
2.  **Hook**: `useBusinessForm` recolecta todos los campos en modo edición si es privilegiado.
3.  **API**: `PUT /api/negocios/[id]` recibe el payload extendido.
4.  **Backend**:
    - Valida rol (`ADMIN` / `ASISTENTE`).
    - Si cambia producto/agente, busca nuevo `idProductPercentageCommission`.
    - Si cambian campos de cálculo (plazo, periodicidad, producto), recalcula `numAportes`.
    - Persiste cambios en Prisma.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | Expandir `updateBusinessSchema` con campos de producto, valor, moneda, etc. |
| `src/app/api/negocios/[id]/route.ts` | Modify | Implementar lógica de actualización extendida para roles privilegiados. |
| `src/features/negocios/hooks/use-business-form.ts` | Modify | Propagar `isPrivilegedRole` y recolectar campos en edición. |
| `src/features/negocios/components/sections/business-info-section.tsx` | Modify | Liberar selector de moneda y habilitar campos por rol. |
| `src/features/negocios/components/sections/coach-info-section.tsx` | Modify | Habilitar selección de agente por rol en edición. |
| `src/features/negocios/types/business-api.types.ts` | Modify | Actualizar interfaz `UpdateBusinessRequest`. |

## Interfaces / Contracts

### Updated `UpdateBusinessRequest` (API Schema)
```typescript
{
  contract?: string;
  idProduct?: number;
  term?: number;
  value?: number;
  idBuyPeriodicity?: number;
  idCurrency?: number;
  idUser?: number; // Agente
  idClientOrigin?: number;
  numAportes?: number;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `updateBusinessSchema` | Testear que acepte los nuevos campos opcionales. |
| Integration | `PUT /api/negocios/[id]` | Validar que un Admin pueda cambiar el valor y que un Agente reciba 403 al intentarlo. |
| Integration | Cambio de PPC | Verificar que al cambiar de producto se actualice correctamente la relación con la configuración de comisiones. |

## Migration / Rollout

No se requiere migración de datos. El cambio es puramente funcional sobre la lógica de edición y creación.

- **Sincronización de Pagos**: Cuando un Admin cambie `term`, `idBuyPeriodicity` o `idProduct` (que afecte `numAportes`), el backend eliminará los `Payment` actuales y creará los nuevos basados en el cálculo actualizado, siempre que se cumpla la pre-condición de cero fondeos.
