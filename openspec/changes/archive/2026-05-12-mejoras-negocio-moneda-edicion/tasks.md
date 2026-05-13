# Tasks: Mejoras en Negocios (Moneda y Edición Privilegiada)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200 - 300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend & Validation | PR 1 | Base changes in schemas and API route |
| 2 | Frontend Implementation | PR 1 | UI and Hook logic |

## Phase 1: Backend y Validaciones

- [ ] 1.1 Modificar `src/features/negocios/lib/business-api.schemas.ts` para expandir `updateBusinessSchema` con campos: `idProduct`, `term`, `value`, `idBuyPeriodicity`, `idCurrency`, `idUser`.
- [ ] 1.2 Actualizar interfaz `UpdateBusinessRequest` en `src/features/negocios/types/business-api.types.ts`.
- [ ] 1.3 Refactorizar `PUT` handler en `src/app/api/negocios/[id]/route.ts` para validar roles `ADMIN`/`ASISTENTE`.
- [ ] 1.4 Implementar validación estricta para `term` y `idBuyPeriodicity`: Solo si estado es `VENTA_EFECTUADA`/`EMITIDO` y cero pagos `FONDEADO`.
- [ ] 1.5 Implementar resolución de `idProductPercentageCommission` mediante `findProductPercentageCommission` si cambia producto o agente.
- [ ] 1.6 Implementar actualización de `numAportes` y sincronización de tabla `Payment` (delete/recreate) si los campos base cambian.

## Phase 2: Core Implementation (Frontend)

- [ ] 2.1 Actualizar `useBusinessForm` en `src/features/negocios/hooks/use-business-form.ts` para exponer `isPrivilegedRole` y recolectar payload completo en edición.
- [ ] 2.2 Modificar `BusinessInfoSection` en `src/features/negocios/components/sections/business-info-section.tsx` para liberar selector de moneda en creación.
- [ ] 2.3 Habilitar campos restringidos en `BusinessInfoSection` basados en `isPrivilegedRole && isEditMode`.
- [ ] 2.4 Modificar `CoachInfoSection` en `src/features/negocios/components/sections/coach-info-section.tsx` para habilitar cambio de agente bajo condiciones privilegiadas.

## Phase 3: Testing y Verificación

- [ ] 3.1 Verificar creación de negocio con moneda manual distinta a la de la compañía.
- [ ] 3.2 Verificar edición total de campos con usuario Admin.
- [ ] 3.3 Verificar que usuario Agente sigue viendo campos bloqueados en edición.
- [ ] 3.4 Validar que cambio de producto/agente actualiza correctamente las relaciones en la base de datos.
