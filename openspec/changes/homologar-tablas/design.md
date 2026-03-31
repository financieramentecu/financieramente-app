# Design: Sistema de Tablas Unificado (TanStack Table v8)

## Context

El sistema actual tiene una alta fragmentación en la visualización de datos tabulares. Existe una mezcla de:
1. `DataTable.tsx` manual que no escala bien.
2. `CrudTable.tsx` que duplica lógica de acciones.
3. Tablas basadas en `div` e inline `<table>` que rompen la consistencia.

## Goals / Non-Goals

**Goals:**
- Centralizar toda la lógica de tablas en un único componente `DataTable` basado en TanStack Table v8.
- Eliminar `CrudTable.tsx` y homogeneizar las acciones en un solo prop.
- Soportar selección masiva de filas de forma nativa.
- Soportar búsqueda global con debounce.
- Proveer una experiencia de carga elegante con Skeletons.

**Non-Goals:**
- No se busca cambiar la lógica de negocio ni las APIs que proveen los datos.
- No se eliminarán los Acordeones, solo se migrarán las tablas dentro de ellos.

## Decisions

1. **Motor de Tabla**: Usar `@tanstack/react-table` v8 para desacoplar el estado de la tabla de la UI.
2. **Ubicación**: El nuevo componente residirá en `src/features/shared/ui/DataTable/`.
3. **Componentización**: Dividir el componente en sub-componentes (Pagination, ColumnHeader, Toolbar) para mayor mantenibilidad.
4. **Columna de Selección**: Inyectar automáticamente la columna de selección si el prop `selectable` es true.
5. **Acciones**: Usar un prop `actions: (row: TData) => React.ReactNode` para inyectar componentes de acción sin acoplar el DataTable al negocio.
6. **Estado Controlado**: Permitir props `rowSelection` y `onRowSelectionChange` para que componentes padres (como el contexto de liquidación) controlen la selección.
7. **Filtros por Columna**: Implementar soporte para `columnFilters` de TanStack, permitiendo filtros específicos por columna además de la búsqueda global.
8. **Persistencia en URL**: Crear un hook `useDataTableState` (opcional) que sincronice el estado de la tabla (page, search, filters) con los `queryParams` de Next.js.
9. **Exportación Avanzada**: Integrar soporte para exportar a Excel (`.xlsx`) desde la primera fase, permitiendo ocultar el botón mediante props.
10. **Debounce Dinámico**: Implementar un prop `searchDebounceMs` para controlar el tiempo del debounce (default 300ms).

## Risks / Trade-offs

- **Curvas de aprendizaje**: TanStack Table es más complejo que una tabla manual, pero ofrece mucha más flexibilidad.
- **Esfuerzo de Migración**: Reemplazar todas las tablas del sistema requiere una verificación exhaustiva de los cell renderers actuales.
- **Tablas Div**: La transición de `div` a `table` (dentro del componente) puede afectar layouts CSS muy específicos que deben ser ajustados.
