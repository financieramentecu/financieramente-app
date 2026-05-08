# Spec: UI System

## Purpose
Este documento define los componentes y utilidades del sistema de interfaz de usuario de Financieramente. El objetivo es garantizar consistencia visual y funcional en toda la plataforma.

## Requirements

### Requirement: Componente DataTable Reutilizable
El sistema debe proveer un componente de tabla genérico basado en Shadcn UI y TanStack Table v8.

#### Scenario: Visualización básica
- **WHEN** Se proporciona un array de datos y una definición de columnas.
- **THEN** Se renderiza una tabla con headers y celdas correspondientes.

#### Scenario: Selección de Filas
- **WHEN** Se activa el flag `selectable`.
- **THEN** Aparece una primera columna de checkboxes que permite selección individual y masiva.

#### Scenario: Búsqueda Global
- **WHEN** El prop `searchable` es true.
- **THEN** Se muestra un input de búsqueda que filtra los datos en tiempo real.
- **AND** Se aplica un debounce configurable mediante el prop `searchDebounce` (default: 300ms).

#### Scenario: Visibilidad de Búsqueda
- **WHEN** El prop `searchable` es false.
- **THEN** El input de búsqueda global no se renderiza.

#### Scenario: Exportación Avanzada (XLSX)
- **WHEN** El prop `exportable` es true.
- **THEN** Se muestra un botón de exportación que permite descargar los datos en formato Excel (.xlsx).

#### Scenario: Selección Controlada (Externa)
- **WHEN** Se proporciona el prop `rowSelection` y `onRowSelectionChange`.
- **THEN** El componente utiliza el estado externo para manejar la selección, permitiendo persistencia entre vistas.

#### Scenario: Filtros por Columna
- **WHEN** Una columna tiene configurado un filtro específico (e.g. select, date range).
- **THEN** Se muestra el componente de filtro en el header de la columna correspondiente.

#### Scenario: Persistencia en URL (Sync)
- **WHEN** El usuario cambia la página, búsqueda o filtros.
- **THEN** (Opcional por flag) Los parámetros se sincronizan con la URL para permitir compartir enlaces o volver atrás manteniendo el estado.

#### Scenario: Acciones de Fila
- **WHEN** Se proporciona el prop `actions`.
- **THEN** Se renderiza una columna final con el contenido retornado por la función de acciones para cada fila.

#### Scenario: Estado de Carga
- **WHEN** El prop `loading` es true.
- **THEN** Se muestran filas de Skeleton animadas en lugar de los datos reales.

#### Scenario: Tabla Vacía
- **WHEN** No hay datos en el array `data`.
- **THEN** Se muestra un mensaje de "No se encontraron resultados" centrado en el cuerpo de la tabla.

### Requirement: Application locale for numeric percentage display

The system SHALL format user-visible percentages using the **application-configured locale**, not per-feature hardcoding. A single documented default MAY apply until user-level locale exists.

#### Scenario: Consistent formatting across modules

- **GIVEN** two features show the same semantic percentage read-only
- **WHEN** they render
- **THEN** both SHALL use the shared formatter (separators and decimal policy)

### Requirement: Read-only percentage presentation

For values on the **0–100** scale from the server, the system SHALL NOT show the raw DB fraction as the primary label. Display SHALL preserve server precision without client round/truncate; pad integers to four fractional digits; leading zero before the decimal separator; `%` as **trailing adornment** outside editable text.

#### Scenario: Table or badge shows a stored percentage

- **GIVEN** a percentage loaded from the API on the 0–100 scale
- **WHEN** the UI renders it in a list, badge, or summary
- **THEN** the user SHALL see a formatted percent consistent with the shared formatter
- **AND** the symbol `%` SHALL NOT be embedded inside the same editable string as the digits for inputs

### Requirement: Percentage input behavior

The system SHALL provide a percentage input with at most **four** fractional digits while typing, per-keystroke validation, trailing-zero deletion, normalized paste for the active locale, and **no** empty-to-zero coercion before validation. Screen readers SHALL expose the **numeric value** without redundant “percent” when the unit is clear.

#### Scenario: User clears the field while editing

- **GIVEN** a commission rule category percentage field focused
- **WHEN** the user deletes all characters
- **THEN** the field SHALL remain empty (no automatic zero)
- **AND** validation errors SHALL apply on blur or submit per form rules

#### Scenario: User pastes a value with symbols

- **GIVEN** the clipboard contains text such as `12,5 %` or `12.5%`
- **WHEN** the user pastes into the percentage input
- **THEN** the system SHALL normalize to a valid numeric representation for the locale
- **AND** SHALL reject or strip characters that are not part of a valid number

### Requirement: Form validation error presentation (admin)

Field-level validation errors in commission configuration forms SHALL be visually distinct from helper or body text: semantic destructive color (not the default foreground alone), and an non-color cue (e.g. icon) in addition to the message text. Invalid fields SHALL expose `aria-invalid` and a visible invalid border or focus ring on the control. Error messages SHOULD use a live region or `role="alert"` where appropriate for screen readers.

#### Scenario: Invalid category or percentage on commission rule form

- **GIVEN** a row fails validation (e.g. invalid or missing category)
- **WHEN** the form displays the field error
- **THEN** the message SHALL use the destructive semantic color and SHALL NOT appear with the same styling as muted helper text
- **AND** the associated control SHALL show an invalid state (border and/or ring)

### Requirement: CoachKpiCard (Data-Dense, colorScheme)

El sistema MUST proveer el componente `CoachKpiCard` para los KPI del Coach en la vista de negocios. El component SHALL seguir el patrón visual Data-Dense (información compacta y escaneable). El component MUST aceptar una prop `colorScheme` con valores fijos `'orange' | 'emerald' | 'indigo'` alineados semánticamente con los estados de negocio asociados a cada tarjeta (p. ej. coherencia con la identidad del badge de estado); SHALL aplicar esa paleta a borde, fondo de cabecera y título de forma consistente. El component MUST NOT incluir sparklines ni gráficos temporales. El component MUST NOT incluir pestañas o selectores para alternar moneda: COP y USD SHALL mostrarse a la vez en la misma tarjeta.

#### Scenario: Estructura Data-Dense sin gráficos ni tabs de moneda

- GIVEN valores de conteo y montos en COP y USD
- WHEN se renderiza `CoachKpiCard`
- THEN SHALL mostrar título, métricas y monedas en un diseño denso sin gráficos
- AND SHALL NOT renderizar pestañas de selección de moneda
- AND SHALL NOT renderizar sparklines

#### Scenario: colorScheme fijo y semántico

- GIVEN `colorScheme` establecido a uno de orange, emerald o indigo
- WHEN la tarjeta se renderiza
- THEN los estilos de acento (p. ej. borde lateral, cabecera, título) SHALL corresponder a ese esquema
- AND SHALL NOT depender de cadenas de color arbitrarias libres en runtime

#### Scenario: Paridad de datos en una sola vista

- GIVEN la tarjeta muestra montos locales y extranjeros
- WHEN el usuario lee la tarjeta sin interacción adicional
- THEN ambas monedas SHALL ser visibles simultáneamente

### Requirement: Componente Select con Scroll y Altura Controlada

El sistema MUST proveer un componente de selección (Select) basado en Radix UI que garantice la accesibilidad de todos sus elementos mediante scroll automático y una altura máxima predecible.

#### Scenario: Scroll en listas largas

- GIVEN Un componente Select con una cantidad de elementos que excede la capacidad visual inmediata (ej. > 10 ítems).
- WHEN El usuario abre el selector.
- THEN El contenido SHALL mostrar una barra de scroll vertical.
- AND El usuario SHALL poder desplazarse mediante ratón o teclado hasta el último elemento de la lista.

#### Scenario: Altura máxima controlada

- GIVEN Un componente Select desplegado en la plataforma.
- WHEN El contenido se visualiza.
- THEN La altura del contenedor SHALL estar limitada a un máximo de 320px (`max-h-80`).
- AND El contenedor SHALL reducir su altura automáticamente si el total de elementos requiere menos espacio que el máximo definido.

#### Scenario: Adaptabilidad al espacio disponible

- GIVEN Una pantalla con espacio vertical limitado.
- WHEN Se abre el selector cerca del borde inferior de la pantalla.
- THEN El sistema SHALL priorizar el ajuste al espacio disponible (`available-height`) sobre la altura máxima fija para evitar que el componente se renderice fuera de la vista.
