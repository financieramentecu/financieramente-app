# Spec Delta: Negocios - Tabla Homologada

## ADDED Requirements

### Requirement: Migración a DataTable Unificado
La tabla de negocios debe dejar de usar el componente manual y migrar al nuevo `DataTable` estándar.

#### Scenario: Transición Visual
- **WHEN** Se navega a la sección de Negocios.
- **THEN** Se debe ver la misma información actual (Cliente, Monto, Estado, etc.) pero renderizada mediante el nuevo `DataTable`.

#### Scenario: Funcionalidad de Acciones
- **WHEN** El usuario tiene permisos de edición o cancelación.
- **THEN** Los botones correspondientes deben aparecer en la columna de Acciones inyectada mediante el prop `actions`.
