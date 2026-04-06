# Tasks: Homologación de Tablas

## 1. Preparación y Componente Core

- [x] 1.1 Crear la estructura de carpetas en `src/features/shared/ui/DataTable/`.
- [x] 1.2 Implementar el componente base `DataTable` usando TanStack Table v8.
- [x] 1.3 Implementar sub-componentes: `DataTablePagination`, `DataTableColumnHeader`, `DataTableViewOptions`, `DataTableToolbar`.
- [x] 1.4 Soporte para selección masiva (checkbox nativo) y selección controlada externa.
- [x] 1.5 Soporte para búsqueda global (con debounce configurable) y filtros específicos por columna.
- [x] 1.6 Control de visibilidad de UI (prop `searchable` y `exportable`).
- [x] 1.7 Implementar **exportación a Excel (.xlsx)** usando una librería compatible.
- [x] 1.8 Implementar hook `useDataTableURLState` para persistencia opcional en query params.
- [x] 1.9 Implementar Skeleton rows dinámicos según columnas.
- [x] 1.10 Crear test unitario `DataTable.test.tsx` verificando renderizado, búsqueda, selección y exportación Excel.

## 2. Migración Módulos Admin (Eliminación CrudTable)

- [x] 2.1 Migrar `currencies-table.tsx` al nuevo `DataTable`.
- [x] 2.2 Migrar `products-table.tsx` (Admin) al nuevo `DataTable`.
- [x] 2.3 Migrar `periodicities-table.tsx` al nuevo `DataTable`.
- [x] 2.4 Migrar `admin-categories-table.tsx` al nuevo `DataTable`.
- [x] 2.5 Migrar tablas de **Orígenes de Productos y Clientes** en `origins/page.tsx`.
- [x] 2.6 Verificar visualmente y mediante tests que las acciones CRUD sigan funcionando.

## 3. Migración Módulos de Operación (Negocios y Liquidaciones)

- [x] 3.1 Refactorizar `BusinessTableSection.tsx` para usar el nuevo engine.
- [x] 3.2 Refactorizar `RegistrosLiquidacionTable.tsx` (Migrado a `historico-liquidaciones.tsx`).
- [x] 3.3 Buscar componentes que usan `div` para tablas y migrarlos (e.g. `ModalDetalleDistribucion.tsx`).
- [x] 3.4 Asegurar que las tablas dentro de Acordeones en Liquidación usen el componente estándar.

## 4. Limpieza y Consolidación

- [x] 4.1 Eliminar `src/features/admin/shared/CrudTable.tsx`.
- [x] 4.2 Eliminar `src/features/shared/ui/data-table-enhanced.tsx`.
- [x] 4.3 Renombrar/Reemplazar el `DataTable.tsx` original (manual) por el nuevo si el impacto es manejable, o mantenerlo como alias temporal.
- [x] 4.4 Correr linter y type-check en todo el proyecto.
