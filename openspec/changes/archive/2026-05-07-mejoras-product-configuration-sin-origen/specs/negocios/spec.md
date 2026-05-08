# Delta for negocios

> Base spec: `openspec/specs/negocios/spec.md`
> Change: `mejoras-product-configuration-sin-origen`

## MODIFIED Requirements

### Requirement: Lookup de PPC para nuevos negocios sin filtrar por origen

El servicio `getPpcForNewBusinesses` en `src/features/negocios/services/product-configuration.service.ts` MUST buscar `ProductConfiguration` por `(idProduct, idCategory)` únicamente. El parámetro `idClientOrigin` MUST NOT usarse como criterio de búsqueda en el `findUnique` de `ProductConfiguration`.

Del mismo modo, `validateProductConfigurationExists` MUST operar sin `idClientOrigin` en el where del lookup de `ProductConfiguration`.

(Previously: ambas funciones buscaban `ProductConfiguration` por `idProduct_idClientOrigin_idCategory` — la clave única incluía el origen.)

#### Scenario: Lookup encuentra configuración sin filtrar por origen

- GIVEN existe una ProductConfiguration con `idProduct = X` e `idCategory = Y`
- WHEN se invoca `getPpcForNewBusinesses({ idProduct: X, idCategory: Y })` (sin `idClientOrigin`)
- THEN retorna `{ configExists: true, ppc: <PPC asignado> }`

#### Scenario: Lookup bloquea creación si no existe configuración

- GIVEN no existe ninguna ProductConfiguration con `idProduct = X` e `idCategory = Y`
- WHEN se invoca `getPpcForNewBusinesses({ idProduct: X, idCategory: Y })`
- THEN lanza error `"No existe configuración de distribución para el producto y categoría seleccionados. Configurá la distribución antes de continuar."` y la creación del negocio es bloqueada (HTTP 422)

#### Scenario: Validación de configuración existente sin origen

- GIVEN existe una ProductConfiguration con `idProduct = X`, `idCategory = Y` con PPC activo y categorías activas configuradas
- WHEN se invoca `validateProductConfigurationExists(idCategory: Y, idProduct: X)`
- THEN retorna `{ valid: true }`

#### Scenario: Validación falla si no existe configuración para el par producto+categoría

- GIVEN no existe ninguna ProductConfiguration con `idProduct = X` e `idCategory = Y`
- WHEN se invoca `validateProductConfigurationExists(idCategory: Y, idProduct: X)`
- THEN retorna `{ valid: false, reason: "No existe configuración de distribución para el producto y categoría del negocio. Configurá la distribución antes de continuar." }`

#### Scenario: Interface de parámetros actualizada

- GIVEN `GetPpcForNewBusinessesParams` actualmente incluye `idClientOrigin: number`
- WHEN se implementa el cambio
- THEN `idClientOrigin` es removido de la interface; todos los call sites son actualizados para no pasar este campo

---

## ADDED Requirements

### Requirement: Soft delete en Business

El endpoint `DELETE /api/negocios/[id]` (o cualquier operación de baja de negocio) MUST implementar soft delete: fijar `status = false` via `prisma.business.update`. MUST NOT ejecutar `prisma.business.delete()` en ningún path del código de negocios.

Si no existe actualmente un endpoint DELETE para negocios, este requisito aplica de forma preventiva: cualquier futura implementación MUST seguir el patrón de soft delete.

#### Scenario: Soft delete establece status=false

- GIVEN un Business con `status: true`
- WHEN se ejecuta la operación de baja de negocio
- THEN el registro en base de datos queda con `status = false` y el response retorna `{ success: true }`

#### Scenario: Sin delete físico en Business

- GIVEN cualquier operación de baja sobre un Business
- WHEN se procesa la solicitud
- THEN el registro PERMANECE en la base de datos; no existe ningún `prisma.business.delete()` en el código de la feature `negocios`

---

### Requirement: Búsqueda de agentes filtrada por categoría OVERRIDE y habilitada desde el inicio para admin/asistente

Cuando el usuario con rol `ADMIN` o `ASISTENTE_GERENCIA_OPERATIVA` crea un negocio, el campo de búsqueda de agente (Money Strategist) MUST estar habilitado desde que carga el formulario, sin requerir que se complete el documento primero.

La búsqueda de agentes (`GET /api/users/search`) MUST filtrar usuarios cuya categoría tenga `beneficiaryMode = OVERRIDE`. Solo se deben retornar usuarios que cumplan este criterio.

#### Scenario: Campo habilitado desde el inicio para admin/asistente

- GIVEN el usuario autenticado tiene rol `ADMIN` o `ASISTENTE_GERENCIA_OPERATIVA`
- WHEN abre el formulario de creación de negocio
- THEN el campo de búsqueda de agente está habilitado sin necesidad de que el campo de documento tenga valor

#### Scenario: Campo sigue bloqueado para otros roles o hasta completar documento

- GIVEN el usuario autenticado tiene rol distinto de `ADMIN` y `ASISTENTE_GERENCIA_OPERATIVA`
- WHEN abre el formulario de creación de negocio
- THEN el campo de búsqueda de agente permanece bloqueado hasta que el documento tenga 5+ caracteres

#### Scenario: Búsqueda filtra solo agentes con categoría OVERRIDE

- GIVEN existen usuarios con rol AGENTE — algunos con categoría `beneficiaryMode = OVERRIDE`, otros con `BENEFICIARIO_GENERAL`
- WHEN se llama `GET /api/users/search?query=<term>&beneficiaryMode=OVERRIDE`
- THEN se retornan únicamente los usuarios cuya categoría tiene `beneficiaryMode = OVERRIDE`

#### Scenario: Usuario sin categoría asignada no aparece en búsqueda OVERRIDE

- GIVEN un usuario con rol AGENTE sin categoría asignada (`idCategoria = null`)
- WHEN se llama `GET /api/users/search?query=<term>&beneficiaryMode=OVERRIDE`
- THEN ese usuario NO aparece en los resultados
