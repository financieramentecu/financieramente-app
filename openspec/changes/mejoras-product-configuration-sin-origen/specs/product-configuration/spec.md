# Delta for product-configuration

> Base spec: `openspec/specs/product-configuration/spec.md`
> Change: `mejoras-product-configuration-sin-origen`

## MODIFIED Requirements

### Requirement: Unicidad de ProductConfiguration sin segmento de origen

La combinación `(idProduct, idCategory)` MUST be unique across all ProductConfiguration records. No two configurations may share the same product and category pair, regardless of origin. The previous three-field unique key `(idProduct, idClientOrigin, idCategory)` is superseded by this two-field key.

(Previously: unicidad basada en `(idProduct, idClientOrigin, idCategory)` — la combinación de producto, origen y categoría era la clave única.)

#### Scenario: Creación exitosa con combinación única

- GIVEN no existe ninguna ProductConfiguration con el mismo `idProduct` e `idCategory`
- WHEN se envía `POST /api/product-configurations` con `{ idCompany, idProduct, idCategory }`
- THEN se crea la configuración con status 201 y se retorna el objeto creado

#### Scenario: Duplicado rechazado con 409

- GIVEN ya existe una ProductConfiguration con `idProduct = X` e `idCategory = Y`
- WHEN se envía `POST /api/product-configurations` con `{ idProduct: X, idCategory: Y }`
- THEN se retorna 409 con `error: "Ya existe una configuración con esta combinación de producto y categoría"`

#### Scenario: Migración de clave en Prisma

- GIVEN el schema de Prisma define `@@unique([idProduct, idClientOrigin, idCategory])`
- WHEN se aplica la migración del cambio
- THEN el constraint queda como `@@unique([idProduct, idCategory])` y `idClientOrigin` deja de ser parte de la clave única (puede o no mantenerse como campo opcional en el modelo)

---

### Requirement: Formato de código sin segmento ORIGIN

El campo `code` de ProductConfiguration MUST seguir el formato `COMPANY-PRODUCT-CATEGORY` (tres segmentos). El segmento `ORIGIN` MUST NOT incluirse en el código generado.

(Previously: el código se generaba como `COMPANY-PRODUCT-ORIGIN-CATEGORY` — cuatro segmentos, via `buildProductConfigurationCode(companyName, productName, originName, categoryName)`.)

#### Scenario: Código generado correctamente sin origen

- GIVEN un producto con compañía `"Crea Patrimonio"`, nombre `"Vida"` y categoría `"Junior"`
- WHEN se crea la ProductConfiguration
- THEN `code` es `"CREA_PATRIMONIO-VIDA-JUNIOR"` (sin segmento de origen)

#### Scenario: Código no supera 50 caracteres

- GIVEN nombres de compañía, producto y categoría que en conjunto generen más de 50 caracteres
- WHEN se intenta crear la configuración
- THEN se retorna 400 con mensaje que indica que el código generado excede el límite de 50 caracteres

#### Scenario: Espacios reemplazados y mayúsculas

- GIVEN segmentos con espacios internos (e.g., `"Crea Patrimonio"`, `"Cat A"`)
- WHEN se construye el código
- THEN los espacios se reemplazan por `_` y todo queda en mayúsculas: `"CREA_PATRIMONIO-...-CAT_A"`

---

## ADDED Requirements

### Requirement: Audit log obligatorio en mutaciones de ProductConfiguration

Toda operación de creación, actualización de PPC referenciado, o desactivación de una ProductConfiguration MUST registrar un evento en `AuditLog` via `logAuditEvent()` de `src/features/auth/lib/audit-logger.ts`. El registro MUST incluir `userId`, `email`, `ipAddress`, `userAgent` y un string `details` legible. `logAuditEvent` nunca debe bloquear el flujo principal (ya gestiona errores internamente).

Se MUST agregar los siguientes valores al enum `AuditAction`:
- `PRODUCT_CONFIGURATION_CREATED`
- `PRODUCT_CONFIGURATION_UPDATED`
- `PRODUCT_CONFIGURATION_DEACTIVATED`

#### Scenario: Audit log en creación

- GIVEN una sesión autenticada con `userId` y `email` válidos
- WHEN se crea exitosamente una ProductConfiguration via `POST /api/product-configurations`
- THEN `logAuditEvent` es invocado con `action: PRODUCT_CONFIGURATION_CREATED` y `details` que incluye el `code` y el `id` de la configuración creada

#### Scenario: Audit log en actualización de PPC referenciado

- GIVEN una configuración existente
- WHEN se actualiza `idProductPercentageCommissionNewBusinesses` via `PUT /api/product-configurations/[id]`
- THEN `logAuditEvent` es invocado con `action: PRODUCT_CONFIGURATION_UPDATED` y `details` que incluye el `id` de la configuración y el nuevo `idProductPercentageCommissionNewBusinesses`

#### Scenario: Audit log en desactivación

- GIVEN una configuración activa
- WHEN se envía `PATCH /api/product-configurations/[id]` con `{ active: false }`
- THEN `logAuditEvent` es invocado con `action: PRODUCT_CONFIGURATION_DEACTIVATED` y `details` que incluye el `id` de la configuración

#### Scenario: Fallo de audit log no interrumpe la operación

- GIVEN un error interno al escribir en `AuditLog`
- WHEN se crea o actualiza una ProductConfiguration
- THEN la operación principal retorna 2xx igualmente; el error de auditoría sólo se loguea en consola

---

### Requirement: Soft delete en desactivación de ProductConfiguration

El endpoint `PATCH /api/product-configurations/[id]` MUST implementar soft delete: fijar `active = false` via `prisma.productConfiguration.update`. MUST NOT ejecutar `prisma.productConfiguration.delete()` en ningún path.

#### Scenario: Desactivación establece active=false

- GIVEN una ProductConfiguration con `active: true`
- WHEN se envía `PATCH /api/product-configurations/[id]` con `{ active: false }`
- THEN el registro en base de datos queda con `active = false` y el response retorna la configuración con `active: false`

#### Scenario: Sin delete físico

- GIVEN cualquier operación de "eliminación" sobre ProductConfiguration
- WHEN se procesa la solicitud
- THEN el registro PERMANECE en la base de datos; no existe ningún `prisma.productConfiguration.delete()` en el código
