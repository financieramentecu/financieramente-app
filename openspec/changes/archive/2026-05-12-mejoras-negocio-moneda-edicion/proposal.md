# Proposal: Mejoras en Negocios (Moneda y Edición Privilegiada)

## Intent

Flexibilizar la creación y gestión de negocios para roles administrativos. Actualmente, el sistema impone restricciones rígidas (moneda bloqueada tras selección de compañía, edición limitada a 3 campos en negocios existentes) que dificultalan la corrección de errores operativos y la gestión avanzada por parte de usuarios expertos (Admin/Asistente).

## Scope

### In Scope
- **Flexibilidad de Moneda**: Permitir que el usuario cambie manualmente la moneda durante la creación, cargando por defecto la de la compañía pero sin bloquear el campo.
- **Edición Total para Administradores**: Habilitar la edición de todos los campos del negocio (Producto, Valor, Periodicidad, Plazo, etc.) para roles `ADMIN` y `ASISTENTE_GERENCIA_OPERATIVA`.
- **Actualización de API**: Extender el endpoint `PUT /api/negocios/[id]` para procesar la actualización de múltiples campos bajo validación de rol.
- **Edición de Agente**: Permitir que los roles privilegiados corrijan el agente asignado desde el modo edición del negocio.

### Out of Scope
- **Recálculo Automático de Comisiones**: No se implementará el recálculo automático para cambios en Valor o Producto en esta fase (se mantiene manual o sujeto a confirmación posterior).
- **Edición en Estados Terminales**: La edición seguirá restringida para negocios en estado `LIQUIDADO`, `CANCELADO` o `FONDEADO` (totalmente).
- **Edición de información del cliente**: Los datos del cliente (nombre, documento, etc.) no serán editables desde el formulario de negocio en esta fase.

## Capabilities

### Modified Capabilities
- `negocios`: Se actualizan los requisitos de creación (flexibilidad de moneda) y edición (permisos por rol para campos extendidos).

## Approach

1. **Frontend**: Actualizar `BusinessInfoSection` para liberar el campo moneda y usar el nuevo flag `isPrivilegedRole` (vía `useBusinessForm`) para habilitar campos en modo edición.
2. **Esquemas**: Expandir `updateBusinessSchema` en `business-api.schemas.ts` para incluir los nuevos campos opcionales.
3. **Backend**: Refactorizar el handler `PUT` en `/api/negocios/[id]` para realizar una actualización parcial o total en Prisma basada en el rol del solicitante y el estado del negocio.
4. **Validación**: Asegurar que cualquier cambio de producto valide la existencia de una configuración de comisiones activa antes de persistir.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/negocios/components/sections/business-info-section.tsx` | Modified | Habilitar moneda y campos en edición. |
| `src/features/negocios/hooks/use-business-form.ts` | Modified | Lógica de recolección de datos y permisos. |
| `src/features/negocios/lib/business-api.schemas.ts` | Modified | Extensión del esquema Zod de actualización. |
| `src/app/api/negocios/[id]/route.ts` | Modified | Lógica de persistencia extendida para Admins. |
| `src/features/negocios/types/business-api.types.ts` | Modified | Actualización de la interfaz `UpdateBusinessRequest`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Inconsistencia de comisiones por cambio de valor/producto | High | Restringir la acción a roles expertos (Admin/Asistente) y añadir advertencia visual en UI. |
| Error por falta de configuración de producto | Medium | Validar la configuración activa en el backend antes de realizar el update. |

## Rollback Plan

Revertir los cambios en los componentes de UI y volver a los esquemas de validación previos de la API en `business-api.schemas.ts`.

## Success Criteria

- [ ] El selector de moneda permanece habilitado tras seleccionar una compañía en la creación.
- [ ] Un usuario Admin puede cambiar el producto y el valor de un negocio en estado Emitido.
- [ ] Los datos editados se reflejan correctamente tras guardar y recargar el negocio.
- [ ] Un usuario Agente sigue viendo los campos bloqueados en modo edición.
