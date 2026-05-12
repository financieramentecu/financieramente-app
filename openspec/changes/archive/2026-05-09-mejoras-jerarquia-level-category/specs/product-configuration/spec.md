# Delta for Product Configuration

## MODIFIED Requirements

### Requirement: Unicidad de ProductConfiguration basada en (idProduct, idLevel)

La combinación `(idProduct, idLevel)` MUST be unique across all ProductConfiguration records. No two configurations may share the same product and level pair. The previous two-field unique key `(idProduct, idCategory)` is superseded by this key using `idLevel` (FK to the Level model).

(Previously: unique key was `(idProduct, idCategory)` where `idCategory` referenced the old Category/hierarchy model.)

#### Scenario: Creación exitosa con combinación única

- GIVEN no existe ninguna ProductConfiguration con el mismo `idProduct` e `idLevel`
- WHEN se envía `POST /api/product-configurations` con `{ idCompany, idProduct, idLevel }`
- THEN se crea la configuración con status 201 y se retorna el objeto creado

#### Scenario: Duplicado rechazado con 409

- GIVEN ya existe una ProductConfiguration con `idProduct = X` e `idLevel = Y`
- WHEN se envía `POST /api/product-configurations` con `{ idProduct: X, idLevel: Y }`
- THEN se retorna 409 con `error: "Ya existe una configuración con esta combinación de producto y nivel"`

#### Scenario: Migración de clave en Prisma

- GIVEN el schema de Prisma define `@@unique([idProduct, idCategory])`
- WHEN se aplica la migración del cambio
- THEN el constraint queda como `@@unique([idProduct, idLevel])` y `idCategory` es reemplazado por `idLevel` (FK a la tabla `level`)

### Requirement: Formato de código usando Level code (COMPANY-PRODUCT-LEVELCODE)

El campo `code` de ProductConfiguration MUST seguir el formato `COMPANY-PRODUCT-LEVELCODE` (tres segmentos). El segmento MUST usar el `code` del Level asignado (ej. `LEVEL_1`, `GENERAL_LEVEL`). El segmento `CATEGORY` del formato anterior MUST NOT usarse.

(Previously: el código seguía el formato `COMPANY-PRODUCT-CATEGORY` usando el nombre de la categoría jerárquica — ej. `ACME-VIDA-JUNIOR`.)

#### Scenario: Código generado con Level code

- GIVEN una compañía `"Crea Patrimonio"`, producto `"Vida"` y Level con `code = "LEVEL_1"`
- WHEN se crea la ProductConfiguration
- THEN `code` es `"CREA_PATRIMONIO-VIDA-LEVEL_1"`

#### Scenario: GENERAL_LEVEL en el código

- GIVEN un Level con `code = "GENERAL_LEVEL"`
- WHEN se crea la ProductConfiguration para ese nivel
- THEN `code` es `"<COMPANY>-<PRODUCT>-GENERAL_LEVEL"`

#### Scenario: Código no supera 50 caracteres

- GIVEN nombres de compañía y producto que en conjunto con el Level code excedan 50 caracteres
- WHEN se intenta crear la configuración
- THEN se retorna 400 con mensaje indicando que el código generado excede el límite de 50 caracteres

#### Scenario: Espacios reemplazados y mayúsculas

- GIVEN segmentos con espacios internos
- WHEN se construye el código
- THEN los espacios se reemplazan por `_` y todo queda en mayúsculas: `"CREA_PATRIMONIO-...-LEVEL_2"`

### Requirement: Lookup de configuración de producto para nuevos negocios por idLevel

El sistema SHALL resolver el `ProductConfiguration` para un nuevo negocio buscando por `(idProduct, idLevel)` donde `idLevel` es el Level asignado al agente (`user.idLevel`). El parámetro `idCategory` MUST NOT usarse como criterio de búsqueda.

(Previously: el lookup usaba `(idProduct, idCategory)` donde `idCategory` era el FK a la jerarquía antigua. Anteriormente también se usaba `idClientOrigin` en variantes más antiguas.)

#### Scenario: Lookup encuentra configuración por idLevel del agente

- GIVEN existe una ProductConfiguration con `idProduct = X` e `idLevel = Y`
- AND el agente asignado tiene `idLevel = Y`
- WHEN se crea el negocio para ese producto y agente
- THEN el sistema usa la ProductConfiguration encontrada y el negocio es creado exitosamente

#### Scenario: Sin configuración para ese nivel retorna 422

- GIVEN no existe ProductConfiguration con `idProduct = X` e `idLevel = Y`
- AND el agente asignado tiene `idLevel = Y`
- WHEN se intenta crear el negocio
- THEN el sistema retorna 422 con error: `"No existe configuración de distribución para el producto y nivel del agente seleccionado. Configurá la distribución antes de continuar."`

#### Scenario: Interface actualizada sin idCategory

- GIVEN el tipo `GetPpcForNewBusinessesParams` actualmente incluye `idCategory: number`
- WHEN se implementa el cambio
- THEN `idCategory` es reemplazado por `idLevel: number`; todos los call sites son actualizados
