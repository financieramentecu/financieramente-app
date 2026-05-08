# Tasks: Logical Elimination and Generic Table Migration for Category Types

## Phase 1: Backend Refactor (Logical Delete)
- [x] Refactorizar `deleteCategoryType` en `src/features/category-types/services/category-type.service.ts` para usar `prisma.categoryType.update` con `status: false`.
- [x] Actualizar tests unitarios de `CategoryTypeService` para verificar el comportamiento de soft-delete.

## Phase 2: Table Migration (Generic DataTable)
- [x] Crear `src/features/category-types/components/category-types-columns.tsx` y definir las columnas usando `createColumnHelper` (Nombre/Descripción, StatusBadge, Fecha, Acciones).
- [x] Refactorizar `src/features/category-types/components/category-types-table.tsx`:
  - [x] Integrar `useDataTableURLState` para sincronización con la URL.
  - [x] Reemplazar el layout de tabla personalizado por el componente `DataTable`.
  - [x] Implementar `renderAdditionalFilters` para el selector de Estado.
  - [x] Implementar la prop `actions` usando las acciones definidas en las columnas.

## Phase 3: Verification & Cleanup
- [x] Verificar que la acción "Eliminar" funcione correctamente desde la UI (eliminación lógica).
- [x] Verificar que la búsqueda y los filtros de estado funcionen correctamente en la nueva tabla.
- [x] Eliminar componentes o lógica obsoleta de `CategoryTypesTable` (ej. controles de paginación manual).
- [x] Verificación final de todos los escenarios definidos en `spec.md`.

## Phase 4: Bugfixes & Optimizations (Dropdowns & Active Endpoint)
- [x] 4.1 Crear el endpoint `src/app/api/category-types/active/route.ts` que llame a `findActiveCategoryTypes()` sin paginación.
- [x] 4.2 Añadir el método `getActiveCategoryTypes` a `src/features/category-types/lib/category-type-api.ts`.
- [x] 4.3 Refactorizar `CategoryForm` en `src/features/categories/components/category-form.tsx` para poblar el dropdown de tipos de categoría usando el nuevo endpoint, excluyendo los inactivos.

## Phase 5: Bugfix (Edit Category Type 500 Error)
- [x] 5.1 Recibir y analizar el output de `DEBUG:` proveniente de la alerta en UI para identificar la línea que crashea en `src/app/api/category-types/[id]/route.ts`.
- [x] 5.2 Aplicar el fix definitivo en el endpoint dinámico `[id]/route.ts`.
- [x] 5.3 Verificar que el flujo de edición funcione correctamente en la UI.
