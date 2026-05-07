# Design: Logical Elimination and Generic Table Migration for Category Types

## Architecture Decisions

### AD1: Implementación de Eliminación Lógica
- **Decisión**: Modificar `deleteCategoryType` para realizar una actualización parcial (`status: false`) en lugar de un `delete`.
- **Justificación**: Preservar la integridad referencial y mantener datos históricos.
- **Impacto**: Se elimina la restricción de borrar registros con referencias, ya que ahora solo se inactivan.

### AD2: Definición de Columnas para DataTable
- **Decisión**: Definir las columnas usando `createColumnHelper` de TanStack Table para máxima seguridad de tipos.
- **Justificación**: Consistencia con el componente `DataTable` genérico y mejor mantenibilidad.

### AD3: Sincronización de Estado mediante URL
- **Decisión**: Utilizar el hook `useDataTableURLState` para manejar `search`, `status` y `page`.
- **Justificación**: Soporte para "deep linking" y consistencia con otras vistas administrativas.

## Implementation Details

### [Backend] CategoryType Service
- **Archivo**: `src/features/category-types/services/category-type.service.ts`
- **Cambio**: 
  - Actualizar `deleteCategoryType(id: number)` para ejecutar:
    ```typescript
    await prisma.categoryType.update({
      where: { id },
      data: { status: false }
    })
    ```
  - Evaluar si `countCategoryTypeReferences` sigue siendo necesario (posiblemente para mostrar una advertencia, pero no para bloquear).

### [Frontend] Definición de Columnas
- **Archivo**: `src/features/category-types/components/category-types-columns.tsx` [NEW]
- **Columnas**:
  - **Nombre/Descripción**: Celda combinada con diseño específico.
  - **Estado**: Badge de activo/inactivo.
  - **Modificado**: Fecha formateada con `date-fns`.
  - **Acciones**: Componente que encapsula Editar, Activar/Inactivar y Eliminar.

### [Frontend] Refactor de CategoryTypesTable
- **Archivo**: `src/features/category-types/components/category-types-table.tsx`
- **Cambios**:
  - Eliminar estados manuales de búsqueda y paginación.
  - Integrar `DataTable` pasando las nuevas columnas.
  - Configurar `renderAdditionalFilters` para el selector de estado.
  - Usar `useDataTableURLState` para sincronizar con la URL.

## Verification Steps
1. **Tests Unitarios**: Validar el servicio con Vitest.
2. **UI Test**: Confirmar que la eliminación lógica refleja el cambio de estado en la tabla.
3. **URL State**: Verificar que al cambiar de página o filtrar, la URL se actualice correctamente.
