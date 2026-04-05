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
