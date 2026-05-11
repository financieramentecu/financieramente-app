# Delta for Negocios

## MODIFIED Requirements

### Requirement: Lookup de PPC para nuevos negocios usando idLevel del agente

El servicio que resuelve `ProductConfiguration` para nuevos negocios MUST buscar por `(idProduct, idLevel)` donde `idLevel` proviene del campo `user.idLevel` del agente asignado. El campo `idCategory` / `idCategoria` MUST NOT usarse como criterio de búsqueda en ningún path de creación de negocio.

(Previously: el servicio `getPpcForNewBusinesses` buscaba por `(idProduct, idCategory)` usando el campo `user.idCategoria`. En versiones anteriores también incluía `idClientOrigin`.)

#### Scenario: Creación exitosa con configuración encontrada por idLevel

- GIVEN el agente asignado tiene `idLevel = Y`
- AND existe una ProductConfiguration activa con `idProduct = X` e `idLevel = Y`
- WHEN se crea el negocio para el producto X con ese agente
- THEN el negocio es creado con el `ProductPercentageCommission` de esa configuración
- AND el negocio persiste correctamente con HTTP 201

#### Scenario: Sin configuración para el nivel del agente retorna 422

- GIVEN el agente asignado tiene `idLevel = Y`
- AND no existe ninguna ProductConfiguration con `idProduct = X` e `idLevel = Y`
- WHEN se intenta crear el negocio
- THEN la creación MUST fallar con HTTP 422
- AND el error MUST incluir: `"No existe configuración de distribución para el producto y nivel del agente seleccionado. Configurá la distribución antes de continuar."`
- AND ningún registro de negocio MUST ser persistido

#### Scenario: idCategoria no participa en el lookup

- GIVEN el agente tiene `idCategoria = Z` (FK a la nueva entidad Category) y `idLevel = Y`
- WHEN se ejecuta el lookup de ProductConfiguration
- THEN el sistema usa ÚNICAMENTE `idLevel = Y` como criterio; `idCategoria` no es parte del where

#### Scenario: Agente sin idLevel asignado

- GIVEN el agente asignado tiene `idLevel = null`
- WHEN se intenta crear el negocio
- THEN la creación MUST fallar con una validación previa: `"El agente no tiene un nivel asignado. Asigná un nivel al agente antes de continuar."`
- AND ningún registro de negocio MUST ser persistido

### Requirement: Búsqueda de agentes filtrada por Level beneficiaryMode OVERRIDE

Cuando se busca un agente durante la creación de un negocio, el endpoint `GET /api/users/search` MUST filtrar usuarios cuyo Level asignado (`user.idLevel → Level.beneficiaryMode`) sea `OVERRIDE`. La referencia de beneficiaryMode se resuelve ahora desde `Level`, no desde la antigua `Category`.

(Previously: el filtro `beneficiaryMode = OVERRIDE` se aplicaba vía la relación `user.idCategoria → Category.beneficiaryMode`. La Category referenciada era el modelo jerárquico antiguo.)

#### Scenario: Búsqueda retorna solo agentes con Level OVERRIDE

- GIVEN existen usuarios con Level `beneficiaryMode = OVERRIDE` y otros con `beneficiaryMode = BENEFICIARIO_GENERAL`
- WHEN se llama `GET /api/users/search?query=<term>&beneficiaryMode=OVERRIDE`
- THEN se retornan únicamente los usuarios cuyo Level tiene `beneficiaryMode = OVERRIDE`

#### Scenario: Usuario sin idLevel asignado no aparece en búsqueda OVERRIDE

- GIVEN un usuario con `idLevel = null`
- WHEN se llama `GET /api/users/search?query=<term>&beneficiaryMode=OVERRIDE`
- THEN ese usuario NO aparece en los resultados
