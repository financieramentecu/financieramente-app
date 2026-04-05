# Spec: Liquidaciones

## Purpose
TBD - Documentación del proceso de liquidación de comisiones.

## Requirements

### Requirement: Migración de Registros de Liquidación
La tabla de `RegistrosLiquidacionTable` (actualmente `<table>` nativo) debe ser reemplazada por el componente `DataTable`.

#### Scenario: Selección masiva nativa
- **WHEN** El usuario selecciona el checkbox de "seleccionar todos".
- **THEN** El estado de selección debe sincronizarse con el contexto de liquidación mediante el callback `onSelectionChange` nativo del `DataTable`.

#### Scenario: Integración en Acordeones
- **WHEN** Se abre un acordeón de liquidación.
- **THEN** La tabla interna debe ser una instancia del `DataTable` estándar, manteniendo el diseño uniforme con el resto del sistema.
