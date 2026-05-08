# Specification: Logical Elimination and Generic Table Migration for Category Types

## Context
Los Tipos de Categoría son la clasificación de nivel superior para las comisiones. La eliminación física puede romper el historial si las categorías se asociaron previamente con un tipo. La migración a la `DataTable` genérica garantiza una experiencia de usuario unificada.

## Requirements

### R1: Eliminación Lógica (Soft-Delete)
- La acción "Eliminar" **no debe** borrar el registro de la base de datos.
- Debe actualizar el campo `status` a `false`.
- Esta operación debe permitirse incluso si hay categorías referenciando al tipo (a diferencia de la eliminación física que estaba bloqueada).

### R2: Migración a Tabla Genérica
- Usar el componente `DataTable` de `src/features/shared/ui/DataTable`.
- **Columnas**:
  - `name`: Mostrar el nombre en negrita.
  - `description`: Mostrar la descripción o "Sin descripción" en itálica.
  - `status`: Mostrar usando el componente `StatusBadge`.
  - `updatedAt`: Formatear como `dd MMM yyyy`.
  - `actions`: Incluir Editar, Cambiar Estado (Activar/Inactivar) y Eliminar.
- **Filtros**:
  - Búsqueda global por nombre/descripción.
  - Filtro de estado (Todos, Activos, Inactivos).
- **Sincronización de URL**:
  - Sincronizar los parámetros `search`, `status` y `page` con la URL usando `useDataTableURLState`.

### R4: Integración en Formularios (Dropdowns)
- Al mostrar Tipos de Categoría en selectores (ej. creación de Categoría), **no se debe** obtener la lista completa y filtrar en el cliente.
- Se debe crear y consumir un endpoint dedicado (ej. `GET /api/category-types/active`) que llame a `findActiveCategoryTypes()` para devolver la lista de registros activos sin sobrecarga de paginación o metadatos.

### R3: Refactor de Servicio
- `deleteCategoryType(id: number)`: Realiza un soft-delete.
- `toggleCategoryTypeStatus(id: number, currentStatus: boolean)`: Cambia el campo `status` (ya existe, pero debe verificarse su uso correcto).

## Scenarios

### Escenario 1: Eliminación lógica de un tipo activo
- **Dado** un tipo de categoría activo con ID 1.
- **Cuando** el usuario hace clic en "Eliminar" y confirma.
- **Entonces** el registro con ID 1 debe tener `status: false` en la base de datos.
- **Y** el registro debe seguir existiendo físicamente.

### Escenario 2: Filtrado de tabla por estado
- **Dado** varios tipos de categoría con estados mixtos.
- **Cuando** el usuario selecciona "Inactivos" en el filtro de estado.
- **Entonces** solo se deben mostrar los registros con `status: false`.

### Escenario 3: Persistencia de URL
- **Dado** que un usuario está en la página 2 con un filtro de búsqueda "Comisión".
- **Cuando** el usuario recarga la página.
- **Entonces** la tabla debe seguir mostrando los resultados de la página 2 para "Comisión".
