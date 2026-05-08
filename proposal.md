# Proposal: Logical Elimination and Generic Table Migration for Category Types

## Goal
Refactorizar la gestión de Tipos de Categoría para implementar eliminación lógica (`soft-delete`) y migrar la tabla de administración al componente estándar `DataTable` del proyecto.

## User Review Required
- **Política de Eliminación**: Al "eliminar" un tipo de categoría, este no se borrará de la base de datos. En su lugar, se marcará como `status: false`.
- **Cambio de UI**: La tabla cambiará su diseño actual por el diseño estandarizado de `DataTable` para mantener la consistencia visual en todo el panel administrativo.

## Proposed Changes

### [Backend] Refactor de Servicio y API
- **Archivo**: `src/features/category-types/services/category-type.service.ts`
  - Modificar `deleteCategoryType` para usar `prisma.categoryType.update` con `status: false`.
- **Archivo**: `src/app/api/category-types/[id]/route.ts`
  - Asegurar que el método `DELETE` maneje correctamente la respuesta del servicio actualizado.

### [Frontend] Migración de Tabla
- **Archivo**: `src/features/category-types/components/category-types-table.tsx`
  - Reescritura completa usando el componente `DataTable`.
  - Implementación de `useDataTableURLState` para persistir filtros y paginación en la URL.
  - Definición de columnas que incluyan: Nombre/Descripción, Estado (Badge), Fecha de Modificación y Acciones (Editar, Activar/Inactivar, Eliminar).

## Verification Plan

### Pruebas Automatizadas
- Actualizar tests unitarios del servicio para validar que la eliminación sea lógica.
- Validar que las consultas de listado sigan filtrando correctamente por estado.

### Verificación Manual
- Confirmar que al hacer clic en "Eliminar", el registro permanece en la base de datos pero con `status: false`.
- Verificar que la búsqueda y la paginación funcionen correctamente en la nueva tabla.
- Asegurar que el botón de "Nuevo Tipo" siga funcionando correctamente.
