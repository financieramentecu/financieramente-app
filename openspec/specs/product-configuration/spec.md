# Product Configuration

## Purpose
Manages the rules and distributions for product commissions in the administration module.

## Requirements

### Requirement: No “Distribución para nuevos negocios” list column (RF-09)

In the **product configuration administration list** (shared table for configuration A), the system SHALL NOT render a column whose purpose is to show the active or linked new-business distribution description (including headers titled **«Distribución para nuevos negocios»**). Assignment for new businesses remains in **B/C** flows; this requirement only forbids that **list** column.

#### Scenario: List renders without the column

- **GIVEN** a user views the product configurations table
- **WHEN** the table headers are visible
- **THEN** the system SHALL NOT display a column titled **Distribución para nuevos negocios** (or synonymous copy used for the same purpose)

#### Scenario: Applies regardless of role

- **GIVEN** any authenticated role that can access the product configuration list
- **WHEN** the list is shown
- **THEN** the column SHALL remain absent (no role-based exception)

### Requirement: Active Distribution Uniqueness
The system SHALL prevent having more than one active commission distribution for the same product configuration.

#### Scenario: Attempt to create a new distribution when one is already active
- **GIVEN** a product configuration has an active distribution
- **WHEN** the user attempts to create a "Nueva Distribución"
- **THEN** the system SHALL show a warning modal with the message "Ya existe una distribución activa para este producto. Desactívala antes de crear una nueva."
- **AND** the system SHALL NOT open the creation form.

#### Scenario: Attempt to activate a distribution when another is already active
- **GIVEN** a product configuration has one active distribution and one inactive distribution
- **WHEN** the user attempts to activate the inactive distribution
- **THEN** the system SHALL show an alert modal with the message "Ya existe una distribución activa: [active distribution description]."
- **AND** the system SHALL block the activation until the other distribution is inactive.
- **AND** the system SHALL provide backend validation for this constraint.

### Requirement: Non-null unique product configuration code (RF-07)

Every stored product configuration SHALL have a **non-null** **code**. The system SHALL enforce **uniqueness** of **code** across all product configurations at persistence layer.

#### Scenario: Create configuration receives a code

- **GIVEN** a valid create request for a product configuration
- **WHEN** the configuration is persisted
- **THEN** the record SHALL have a non-null **code** value

#### Scenario: Duplicate code is rejected

- **GIVEN** a configuration already exists with code **X**
- **WHEN** the system attempts to persist another configuration with the same **code**
- **THEN** the operation SHALL fail with a clear error

#### Scenario: Read by exact code returns at most one configuration

- **GIVEN** a **code** value that exists in the database
- **WHEN** an authorized client requests that configuration by **exact code**
- **THEN** the response SHALL identify **exactly one** product configuration
- **AND** when the code does not exist, the response SHALL indicate not found

### Requirement: Distribution CTA from product configurations list

The product configurations table SHALL expose a single primary action to open commission distribution using the **code-first** dashboard route when the row has a **code**. It SHALL NOT use the legacy id-based distribution URL as that action.

#### Scenario: Open distribution by code

- **GIVEN** a row with non-empty **code** **C**
- **WHEN** the user activates **Distribución de Comisión**
- **THEN** navigation SHALL target the code-first rules path for **C**

#### Scenario: Missing code falls back to entry

- **GIVEN** a row with no usable **code** (edge / legacy data)
- **WHEN** the user activates **Distribución de Comisión**
- **THEN** navigation SHALL target the code-first **entry** (search) path so the user can locate a configuration

### Requirement: Two-step onboarding indicator (RF-11)

The system SHALL show a **two-step** indicator for the journey **(1) Product configuration** and **(2) Commission distribution**. The user SHALL be able to see **which step** applies to the current screen. The active step SHALL be exposed to assistive technology (e.g. `aria-current` on the current step).

#### Scenario: Create configuration shows step 1

- **GIVEN** an authenticated user on the **new product configuration** screen
- **WHEN** the page is rendered
- **THEN** the indicator SHALL show **step 1 of 2** as the active step
- **AND** **step 2** SHALL NOT be presented as completed

#### Scenario: Code-first distribution shows step 2

- **GIVEN** an authenticated user on a **code-first commission distribution** screen for a valid configuration **code**
- **WHEN** the page is rendered
- **THEN** the indicator SHALL show **step 2 of 2** as the active step
- **AND** **step 1** SHALL be presented as completed or prior in the journey

#### Scenario: Assistive technology

- **GIVEN** the two-step indicator is visible
- **WHEN** a screen reader announces the current step
- **THEN** the active step SHALL be programmatically associated with the current step in the indicator

### Requirement: Navigate to distribution after create (RF-11)

After a **successful** create of a product configuration, the system SHALL navigate the user to the **code-first** commission **rules** path for that configuration’s **code** (URL-encoded as needed). The system SHALL NOT send the user **only** back to the product configuration list as the sole outcome of success (returning to the list MAY remain available as a separate action).

#### Scenario: Success navigates to rules by code

- **GIVEN** a product configuration was just created with **code** **C**
- **WHEN** the create operation completes successfully
- **THEN** the user SHALL be taken to the code-first **rules** experience for **C**

### Requirement: Derived distribution setup completeness (RF-11)

**Distribution setup** for a product configuration SHALL be **complete** when there exists **at least one** saved commission rule under that configuration that includes **at least one** category line with persisted per-category distribution data. Otherwise distribution setup SHALL be **incomplete**. Other modules SHALL NOT be blocked solely because setup is incomplete.

#### Scenario: New configuration is incomplete

- **GIVEN** a product configuration exists with **no** commission rule that has saved category distribution lines
- **WHEN** completeness is evaluated for onboarding
- **THEN** distribution setup SHALL be **incomplete**

#### Scenario: After saving a rule with categories

- **GIVEN** a commission rule for that configuration is saved with **at least one** category line with valid persisted distribution percentages
- **WHEN** completeness is evaluated
- **THEN** distribution setup SHALL be **complete**

### Requirement: Incomplete setup visible in list (RF-11)

The product configurations **list** SHALL surface which configurations have **incomplete** distribution setup per the derived completeness rule.

#### Scenario: Incomplete row is marked

- **GIVEN** a configuration has **incomplete** distribution setup
- **WHEN** the user views the product configurations table
- **THEN** that row SHALL show a clear **incomplete** indication (e.g. badge or label)

#### Scenario: Complete row is not marked incomplete

- **GIVEN** a configuration has **complete** distribution setup
- **WHEN** the user views the product configurations table
- **THEN** that row SHALL NOT show the **incomplete** onboarding indication for this rule

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

---

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
