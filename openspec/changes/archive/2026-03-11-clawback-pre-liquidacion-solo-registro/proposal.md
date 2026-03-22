# Proposal: Clawback en pre-liquidación — solo registro en tabla Clawback

## Intent

**Problema**: En el flujo actual de pre-liquidación (propuesta/spec de `pre-liquidacion-flow`) se persisten filas en la tabla `Clawback` y además se actualiza el saldo general del usuario (`ClawbackBalance`): se suma el clawback para Poliza no-CLAW/CARTERA y se resta para Poliza CLAW. El negocio requiere que en pre-liquidación **solo** se registre el movimiento en la tabla `Clawback`; la modificación del clawback general del usuario (balance) debe ocurrir únicamente en el **proceso de liquidación**.

**Por qué**: Separar responsabilidades: pre-liquidación deja constancia del descuento por clawback (porcentaje y monto) en `Clawback` para trazabilidad y cálculo; el impacto en el saldo del usuario se aplica cuando se ejecuta la liquidación, no antes.

## Scope

### In Scope

- **Pre-liquidación**: Al aplicar descuento por clawback (por porcentaje), el sistema SHALL crear las filas en la tabla `Clawback` (una por categoría/distribución cuando aplique), vinculadas a `ComissionDistribution` y al usuario dueño del negocio (`business.user.idUser`). El sistema SHALL NOT crear ni actualizar `ClawbackBalance` en el proceso de pre-liquidación.
- **Flujos afectados**: Voluntarias (sin clawback) se mantienen sin cambios; Poliza CARTERA, Poliza no-CLAW y Poliza CLAW: en todos los casos donde hoy se crea `Clawback` y se actualiza `ClawbackBalance`, se mantiene la creación de `Clawback` y se **elimina** toda actualización de `ClawbackBalance`.
- **Liquidación (responsabilidad futura)**: El proceso de liquidación será el único que actualice `ClawbackBalance` (sumar o restar según el flujo). Este cambio no implementa la liquidación; solo documenta que la actualización del balance queda fuera de pre-liquidación.

### Out of Scope

- Implementación del proceso de liquidación ni de la lógica que actualice `ClawbackBalance`.
- Cambios en load-file, process-batch o en el esquema Prisma (`Clawback`, `ClawbackBalance`).
- Backfill de datos ya pre-liquidados.
- Cambios en APIs de resultados/exportar o listado de archivos (historial); solo se ajusta la lógica de persistencia de clawback en pre-liquidación.

## Approach

1. **Servicio de pre-liquidación**: En `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`, dentro de la transacción que crea `ComissionDistribution` y actualiza `SettlementCommission` a `PRE-SETTLED`:
   - Mantener la creación de filas `Clawback` cuando corresponda (Poliza CARTERA, no-CLAW, CLAW con `valorClawback` > 0 o monto a debitar según spec).
   - **Eliminar** todas las operaciones de creación/actualización de `ClawbackBalance` (upsert, add, subtract).
2. **Spec y diseño**: Actualizar la delta spec de pre-liquidación (o el change `pre-liquidacion-flow`) para que los escenarios que hoy exigen "add to balance" o "subtract from balance" pasen a exigir solo "create Clawback row(s)" y explícitamente "SHALL NOT update ClawbackBalance". Documentar que la actualización de `ClawbackBalance` es responsabilidad del proceso de liquidación.
3. **Tests**: Ajustar tests que verifiquen actualización de `ClawbackBalance` en pre-liquidación: deben esperar que no haya cambios en `ClawbackBalance`; los tests que validan creación de `Clawback` se mantienen.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | High | Eliminar lógica de upsert/update de `ClawbackBalance`; mantener solo creación de `Clawback`. |
| `openspec/changes/pre-liquidacion-flow/specs/pre-liquidacion/spec.md` | Modified | Cambiar requisitos: no actualizar `ClawbackBalance` en pre-liquidación; documentar que liquidación actualizará el balance. |
| `openspec/changes/pre-liquidacion-flow/design.md` | Low | Reflejar que pre-liquidación no toca `ClawbackBalance`. |
| Tests de pre-liquidación (unit/integration) | Medium | Quitar aserciones de cambio en `ClawbackBalance`; opcionalmente añadir aserción de que el balance no cambia. |
| Proceso de liquidación (futuro) | Dependency | Será el único que actualice `ClawbackBalance`; no se implementa en este change. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Confusión sobre cuándo se actualiza el balance | Low | Documentar claramente en spec y diseño que solo liquidación actualiza `ClawbackBalance`. |
| Reportes o UI que asuman balance actualizado tras pre-liquidación | Low | Revisar pantallas que muestren "clawback del usuario"; si dependían del balance tras pre-liquidar, deberán basarse en suma de `Clawback` o esperar a liquidación. |
| Doble implementación (pre-liq y liq) si no se coordina | Low | Este change deja un solo lugar (liquidación) para balance; especificación futura de liquidación debe incluir actualización de `ClawbackBalance`. |

## Rollback Plan

- **Código**: Revertir el branch del change; el comportamiento volvería a crear `Clawback` y actualizar `ClawbackBalance` en pre-liquidación (según implementación actual de pre-liquidacion-flow).
- **Datos**: No se migran datos; los `Clawback` ya creados siguen válidos. Si se había implementado ya la actualización de balance en pre-liquidación, un rollback no revierte automáticamente esos saldos; sería script manual si se requiriera.
- **Compatibilidad**: Sin cambios de API ni de esquema; rollback no rompe clientes.

## Dependencies

- **Interno**: Implementación actual de pre-liquidación que crea `Clawback` (y hoy actualiza `ClawbackBalance`); modelos Prisma `Clawback` y `ClawbackBalance`.
- **Downstream**: El proceso de liquidación deberá implementar la actualización de `ClawbackBalance` (sumar/restar según flujo) cuando se ejecute; este change no lo implementa.

## Success Criteria

- [ ] En pre-liquidación, para todos los flujos con clawback (Poliza CARTERA, no-CLAW, CLAW), el sistema crea las filas `Clawback` correspondientes y **no** crea ni actualiza `ClawbackBalance`.
- [ ] Voluntarias siguen sin crear `Clawback` ni tocar `ClawbackBalance`.
- [ ] La transacción por registro sigue agrupando creación de distribuciones, creación de `Clawback` (cuando aplique) y actualización de estado a `PRE-SETTLED`; sin operaciones sobre `ClawbackBalance`.
- [ ] Spec y diseño de pre-liquidación indican explícitamente que la actualización del clawback general del usuario se realiza en el proceso de liquidación.
- [ ] Tests confirman que tras pre-liquidar, `ClawbackBalance` no cambia para ningún usuario.
