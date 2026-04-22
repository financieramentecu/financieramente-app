# Delta for negocios

## ADDED Requirements

### Requirement: Fallback global de comisión en creación de negocio

Durante la creación de negocio, el sistema SHALL resolver un `ProductPercentageCommission` válido aun cuando no exista configuración específica para la combinación producto/origen/categoría.  
El sistema MUST priorizar la comisión específica para nuevos negocios cuando exista; en su ausencia, MUST usar un fallback global elegible.

#### Scenario: Se usa comisión específica cuando existe

- GIVEN una configuración de producto para `idProduct`, `idClientOrigin`, `idCategory` con comisión de nuevos negocios asignada
- WHEN se crea un negocio con esa combinación y agente válido
- THEN el negocio SHALL persistirse con esa comisión específica
- AND el sistema SHALL NOT usar el fallback global

#### Scenario: Se usa fallback global cuando no existe configuración específica

- GIVEN que no existe configuración específica para la combinación solicitada
- AND existe al menos un `ProductPercentageCommission` activo elegible como fallback global
- WHEN se crea el negocio
- THEN el sistema SHALL persistir el negocio usando esa comisión global

#### Scenario: Se usa fallback global cuando existe configuración sin comisión de nuevos negocios

- GIVEN que existe configuración específica pero sin comisión asignada para nuevos negocios
- AND existe un `ProductPercentageCommission` activo elegible como fallback global
- WHEN se crea el negocio
- THEN el sistema MUST completar la creación usando el fallback global

#### Scenario: Error cuando no hay comisión específica ni fallback global

- GIVEN que no hay comisión específica utilizable para la combinación solicitada
- AND no existe fallback global elegible
- WHEN se intenta crear el negocio
- THEN la creación SHALL fallar con error controlado de configuración de comisión
- AND el sistema SHALL NOT persistir el negocio

### Requirement: Orden por fecha de creación en listado de negocios

El listado principal de negocios MUST priorizar los negocios más recientes por fecha de creación.  
Cuando exista empate por marca de tiempo de creación, el sistema SHALL aplicar un desempate determinístico para mantener orden estable.

#### Scenario: Listado muestra primero los últimos creados

- GIVEN negocios con diferentes fechas de creación
- WHEN se consulta y renderiza el listado principal
- THEN los negocios SHALL aparecer de más reciente a más antiguo

#### Scenario: Empate por fecha de creación

- GIVEN dos o más negocios con la misma fecha de creación
- WHEN se consulta el listado principal
- THEN el sistema SHALL mantener un orden determinístico de desempate

### Requirement: Confirmación previa para fondeo directo

Cuando el negocio no tiene anualidades, el sistema MUST solicitar confirmación explícita antes de ejecutar el fondeo para prevenir errores de usuario.

#### Scenario: Usuario confirma fondeo directo

- GIVEN un negocio elegible para fondeo directo (sin anualidades)
- WHEN el usuario hace clic en fondear y confirma la acción
- THEN el sistema SHALL ejecutar el fondeo

#### Scenario: Usuario cancela fondeo directo

- GIVEN un negocio elegible para fondeo directo
- WHEN el usuario cierra o cancela la confirmación
- THEN el sistema SHALL NOT ejecutar el fondeo

### Requirement: Fondeo con anualidades sin confirmación intermedia

Cuando el negocio tiene anualidades pendientes, el sistema SHALL abrir directamente el flujo de anualidades y MUST NOT mostrar confirmación de fondeo directo.

#### Scenario: Fondeo anual abre flujo específico

- GIVEN un negocio con anualidades
- WHEN el usuario hace clic en fondear
- THEN el sistema SHALL abrir el flujo/modal de anualidades sin confirmación previa de fondeo directo

### Requirement: Estado de procesamiento en confirmación de fondeo

Durante la confirmación de fondeo directo, el sistema MUST mostrar un estado visible de procesamiento y bloquear acciones duplicadas hasta finalizar.

#### Scenario: Confirmación en progreso

- GIVEN que el usuario confirmó el fondeo directo
- WHEN la operación está en curso
- THEN el botón de confirmación SHALL mostrar estado de procesamiento
- AND los controles de confirmación/cancelación SHALL permanecer deshabilitados hasta completar
