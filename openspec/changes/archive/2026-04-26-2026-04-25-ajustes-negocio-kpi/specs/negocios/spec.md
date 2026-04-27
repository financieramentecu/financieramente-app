# Delta for negocios

## ADDED Requirements

### Requirement: Dashboard KPIs específicos para Coach

El sistema MUST exponer exactamente tres métricas (Ventas Efectuadas, Emitido, Fondeados) para el rol Coach, sin el indicador de Clawback. Cada métrica MUST incluir simultáneamente la cantidad de negocios y los montos en moneda local y extranjera.

#### Scenario: Visualización de tarjetas para Coach

- GIVEN el usuario tiene el rol de Coach
- WHEN ingresa a la vista principal de negocios
- THEN el sistema SHALL renderizar tres tarjetas: «Ventas Efectuadas», «Emitido» y «Fondeados»
- AND el sistema SHALL NOT mostrar la métrica de Clawback

#### Scenario: Visualización simultánea de monedas

- GIVEN que se renderizan las tarjetas de KPIs del Coach
- WHEN el usuario observa cualquier tarjeta
- THEN SHALL visualizar el conteo total de negocios en ese estado
- AND SHALL visualizar el monto total en moneda local (COP)
- AND SHALL visualizar el monto total en moneda extranjera (USD)

### Requirement: Contrato GET /api/negocios/stats y filtro createdAt para los tres KPI

El endpoint `GET /api/negocios/stats` SHALL aceptar parámetros opcionales de consulta `dateFrom` y `dateTo` en formato fecha calendario (YYYY-MM-DD). Cuando ambos están presentes y válidos, el sistema SHALL aplicar un único filtro por `createdAt` (límite inferior y superior en UTC derivados de días inclusivos en zona horaria de Bogotá) a las tres agregaciones en paralelo: Ventas Efectuadas, Emitido y Fondeados. Cuando falta uno o ambos parámetros de rango, el sistema SHALL NOT aplicar ese filtro `createdAt` a las agregaciones (totales sin acotar por ese rango). La forma de la respuesta (tres bloques de KPI) MUST permanecer estable respecto al contrato existente del Coach.

#### Scenario: Rango completo acota los tres KPI por createdAt

- GIVEN una petición `GET /api/negocios/stats` con `dateFrom` y `dateTo` válidos y pareados
- WHEN el backend calcula las tres métricas
- THEN cada agregación SHALL usar el mismo predicado de rango sobre `createdAt`
- AND ninguna de las tres SHALL usar únicamente `dateAnchored` para ese filtro de fechas de consulta

#### Scenario: Sin rango — sin filtro createdAt en stats

- GIVEN una petición sin `dateFrom` o sin `dateTo` (o sin ambos)
- WHEN se calculan las estadísticas
- THEN el sistema SHALL NOT aplicar el filtro de rango `createdAt` descrito arriba a las agregaciones

### Requirement: Fechas por rol en la vista Negocios (Coach vs Administrador)

Para el Coach, la vista de negocios SHALL inicializar el rango de fechas de la UI al primer día del mes calendario actual hasta el día actual (Bogotá), de modo que el Coach no quede con tabla o KPI vacíos por defecto al faltar fechas. Para el Administrador, los filtros de fecha de la vista SHALL iniciar vacíos por defecto. El Coach SHALL mapear ese rango de UI a `createdFrom`/`createdTo` en la lista y a `dateFrom`/`dateTo` en la llamada a stats según el contrato de API. El Administrador SHALL usar `dateFrom`/`dateTo` en la lista para filtrar por fecha de fondeo (`dateAnchored`) cuando los establezca.

#### Scenario: Coach con mes actual por defecto

- GIVEN un usuario Coach abre negocios
- WHEN se cargan los parámetros iniciales de fecha
- THEN el rango visible SHALL abarcar desde el día 1 del mes actual hasta hoy
- AND las peticiones de lista y estadísticas SHALL usar ese rango según los contratos de query params

#### Scenario: Administrador sin fechas por defecto

- GIVEN un usuario Administrador abre negocios
- WHEN se cargan los filtros iniciales
- THEN las fechas SHALL estar vacías por defecto
- AND el uso de rango para fondeo SHALL corresponder solo a lo que el admin configure

### Requirement: Parámetros de lista y exportación de negocios (createdAt vs dateAnchored)

La API de listado `GET /api/negocios` SHALL aceptar `createdFrom` y `createdTo` (opcionales, YYYY-MM-DD) para filtrar por `createdAt` del negocio. SHALL aceptar `dateFrom` y `dateTo` para filtrar por `dateAnchored` (fondeo). La semántica de fechas inclusive en calendario Bogotá MUST ser coherente entre lista, estadísticas y exportación. La ruta de exportación que aplique rangos de fechas SHALL construir los límites UTC usando la misma regla inclusiva Bogotá que evita el desfase de «día anterior» al interpretar solo cadenas ISO de fecha.

#### Scenario: Coach envía createdFrom y createdTo

- GIVEN un Coach con rango de fechas en UI
- WHEN se solicita el listado de negocios
- THEN la petición SHALL incluir `createdFrom` y `createdTo` acordes al rango
- AND el backend SHALL filtrar por `createdAt` dentro de ese rango

#### Scenario: Administrador envía dateFrom y dateTo para fondeo

- GIVEN un Administrador con ambas fechas de rango configuradas
- WHEN se solicita el listado
- THEN la petición SHALL usar `dateFrom`/`dateTo` para el filtro por `dateAnchored`

### Requirement: Tabla de negocios — etiquetas de fecha y rango de fondeo (Administrador)

En la sección de tabla de negocios, el sistema SHALL mostrar una cabecera de columna de fecha etiquetada según el rol: equivalente a «Creación» para Coach y equivalente a «Fondeo» para Administrador. Cuando el Administrador tiene activo un rango de fechas de fondeo (ambas fechas presentes), el sistema SHALL impedir cambiar libremente el filtro de estado de forma que entre en conflicto con la semántica de `dateAnchored` (p. ej. desactivar el selector y fijar estado acorde al diseño de producto para evitar combinaciones inválidas).

#### Scenario: Etiqueta según rol

- GIVEN el usuario es Coach
- WHEN se muestra la cabecera de la columna de fecha relevante
- THEN el texto SHALL indicar creación

#### Scenario: Etiqueta fondeo para admin

- GIVEN el usuario es Administrador
- WHEN se muestra la misma columna
- THEN el texto SHALL indicar fondeo

### Requirement: Acceso Coach a Negocios sin ruta duplicada

El sistema SHALL redirigir la ruta `/dashboard/agente` a `/dashboard/negocios`. La navegación principal disponible para el rol Agent/Coach SHALL NOT incluir un ítem de menú separado que apunte a un «dashboard del agente» duplicado cuando la experiencia unificada de KPIs y listado vive en negocios.

#### Scenario: Redirect desde agente

- GIVEN un usuario navega a `/dashboard/agente`
- WHEN la página resuelve
- THEN el navegador SHALL terminar en `/dashboard/negocios` (redirect)

#### Scenario: Sin entrada de menú redundante

- GIVEN el menú del Coach
- WHEN inspecciona los enlaces principales
- THEN SHALL NOT aparecer el ítem eliminado para dashboard duplicado según este cambio

## MODIFIED Requirements

None

## REMOVED Requirements

### Requirement: Filtro dinámico de fechas exclusivo para «Fondeados» (Rol Coach)

(Reason: Superseded por `design.md`: con rango de fechas presente, `createdAt` aplica a los tres KPI en `GET /api/negocios/stats`, y la lista Coach usa `createdFrom`/`createdTo` para `createdAt`; ya no es correcto limitar el filtro de stats solo a Fondeados ni dejar Ventas/Emitido como globales fijos en ese caso.)
