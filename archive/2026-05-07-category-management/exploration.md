## Exploration: Logical Elimination and Generic Table Migration for Category Types

### Current State
El sistema actual para Tipos de Categoría utiliza una implementación de tabla personalizada (`CategoryTypesTable`) que no sigue el estándar del proyecto. Además, la eliminación es física (`hard delete`), lo cual entra en conflicto con la política de eliminación lógica del proyecto.

### Affected Areas
- `src/features/category-types/services/category-type.service.ts` — Se debe refactorizar `deleteCategoryType` para que realice una actualización de estado (`status: false`).
- `src/features/category-types/components/category-types-table.tsx` — Se debe reescribir completamente usando el componente genérico `DataTable`.
- `src/app/api/category-types/[id]/route.ts` — El manejador `DELETE` ahora disparará una eliminación lógica.

### Approaches
1. **Migración a DataTable Genérica + Refactor de Servicio**
   - **Pros**: Consistencia visual y funcional, cumple con la política de eliminación lógica, reduce código redundante.
   - **Cons**: Requiere una reescritura total del componente de tabla.
   - **Effort**: Medium

### Recommendation
Se recomienda proceder con la migración. El uso de `DataTable` permitirá manejar filtros, búsqueda y paginación de forma consistente con otras vistas de administración (como la de categorías). La eliminación lógica garantizará que no se pierda integridad referencial.

### Risks
- Categorías existentes vinculadas a tipos que ahora están inactivos (lógicamente eliminados).
- Sincronización de los Query Params en la nueva tabla (se usará `useDataTableURLState`).

### Ready for Proposal
Yes.
