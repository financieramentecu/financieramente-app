# Delta for distribution-commission

> Base spec: `openspec/specs/distribution-commission/spec.md`
> Change: `mejoras-product-configuration-sin-origen`

## ADDED Requirements

### Requirement: Soft delete en ComissionDistribution y ProductPercentageCommission

Toda baja explícita de `ComissionDistribution` o `ProductPercentageCommission` MUST implementarse como soft delete:
- `ComissionDistribution`: `updateMany({ data: { isActive: false } })` — aplica también en `pre-liquidacion.service.ts` y `delete-file-import.service.ts` donde hoy existe `deleteMany()`.
- `ProductPercentageCommission` (regla de distribución): `update({ data: { active: false } })`.

MUST NOT ejecutar `.delete()` ni `.deleteMany()` en ningún path de baja explícita de estos modelos.

> Excepción interna: el `deleteMany` + `createMany` de categorías dentro de `PUT .../distribution-commission/[ruleId]` es un reemplazo atómico dentro de una actualización, no una baja explícita. Puede mantenerse como está.

#### Scenario: Desactivación de regla de comisión establece active=false

- GIVEN un `ProductPercentageCommission` con `active: true` y sin negocios asociados
- WHEN se envía `PATCH /api/product-configurations/[id]/distribution-commission/[ruleId]` con `{ active: false }`
- THEN el registro queda con `active = false` en base de datos; el response retorna la regla con `active: false`

#### Scenario: Soft delete es bloqueado si existen negocios asociados

- GIVEN un `ProductPercentageCommission` con negocios activos referenciando `idProductPercentageCommission`
- WHEN se intenta desactivar la regla
- THEN se retorna 409 con `error: "No se puede desactivar: existen negocios asociados a esta regla"`

#### Scenario: Sin delete físico en ComissionDistribution

- GIVEN cualquier operación de baja sobre un `ProductPercentageCommission`
- WHEN se procesa la solicitud
- THEN el registro PERMANECE en la base de datos; no existe ningún `prisma.productPercentageCommission.delete()` en el código del path de baja

---

### Requirement: Audit log obligatorio en mutaciones de DistributionCommission

Toda operación de creación, actualización (descripción, categorías, portfolio) o cambio de estado (activación/desactivación) de un `ProductPercentageCommission` MUST registrar un evento en `AuditLog` via `logAuditEvent()` de `src/features/auth/lib/audit-logger.ts`. El registro MUST incluir `userId`, `email`, `ipAddress`, `userAgent` y un string `details` legible que identifique el `idProductConfiguration`, el `idProductPercentageCommission` y la acción realizada.

Se MUST agregar los siguientes valores al enum `AuditAction` en `src/features/auth/lib/audit-logger.ts`:
- `DISTRIBUTION_COMMISSION_CREATED`
- `DISTRIBUTION_COMMISSION_UPDATED`
- `DISTRIBUTION_COMMISSION_DEACTIVATED`
- `DISTRIBUTION_COMMISSION_ACTIVATED`

#### Scenario: Audit log en creación de regla de comisión

- GIVEN una sesión autenticada con `userId` y `email` válidos
- WHEN se crea exitosamente un `ProductPercentageCommission` via `POST /api/product-configurations/[id]/distribution-commission`
- THEN `logAuditEvent` es invocado con `action: DISTRIBUTION_COMMISSION_CREATED` y `details` que incluye el `idProductConfiguration` y el `idProductPercentageCommission` creado

#### Scenario: Audit log en actualización de regla de comisión

- GIVEN una regla existente
- WHEN se actualiza via `PUT /api/product-configurations/[id]/distribution-commission/[ruleId]`
- THEN `logAuditEvent` es invocado con `action: DISTRIBUTION_COMMISSION_UPDATED` y `details` que identifica la regla y los campos modificados (descripción, categorías o portfolio)

#### Scenario: Audit log en desactivación de regla

- GIVEN una regla activa sin negocios asociados
- WHEN se envía `PATCH /api/product-configurations/[id]/distribution-commission/[ruleId]` con `{ active: false }`
- THEN `logAuditEvent` es invocado con `action: DISTRIBUTION_COMMISSION_DEACTIVATED` y `details` que incluye `idProductConfiguration` y `idProductPercentageCommission`

#### Scenario: Audit log en activación de regla

- GIVEN una regla inactiva y ninguna otra regla activa para esa configuración
- WHEN se envía `PATCH /api/product-configurations/[id]/distribution-commission/[ruleId]` con `{ active: true }`
- THEN `logAuditEvent` es invocado con `action: DISTRIBUTION_COMMISSION_ACTIVATED` y `details` que incluye `idProductConfiguration` y `idProductPercentageCommission`

#### Scenario: Fallo de audit log no interrumpe la operación

- GIVEN un error interno al escribir en `AuditLog`
- WHEN se crea, actualiza o cambia el estado de una regla de comisión
- THEN la operación principal retorna 2xx igualmente; el error de auditoría sólo se loguea en consola
