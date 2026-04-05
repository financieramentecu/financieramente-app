# Spec Delta: Admin - Eliminación de CrudTable

## ADDED Requirements

### Requirement: Unificación de UI Admin
Todos los módulos que utilizan `CrudTable` (Monedas, Productos, Periodicidades) deben migrar al componente `DataTable` unificado.

#### Scenario: Consistencia de Acciones
- **WHEN** Se migra una tabla de Admin.
- **THEN** Las acciones de Editar y Eliminar deben seguir funcionando pero inyectadas como celdas estándar en el nuevo motor.

#### Scenario: Búsqueda y Paginación
- **WHEN** El usuario busca o navega entre páginas en un módulo Admin.
- **THEN** El comportamiento debe ser el provisto por el motor TanStack integrado en `DataTable`.
