# Proposal: Homologación de Tablas con TanStack Table

## Why

Actualmente, el sistema presenta una fragmentación crítica en la implementación de tablas:
- Mezcla de componentes `DataTable` manuales, `CrudTable` específicos de admin y tablas de HTML nativo (`<table>`).
- Uso de `div` para simular tablas en ciertos módulos, lo que rompe la consistencia visual y accesibilidad.
- Lógica de selección y paginación duplicada en múltiples funciones.

Esta propuesta busca unificar la experiencia de usuario y desarrollador utilizando **TanStack Table v8**, que ya es una dependencia del proyecto pero está subutilizada.

## What Changes

- **Fase 1: Componente Core**: Refactorizar/Crear el componente `DataTable` en `src/features/shared/ui/DataTable` usando `@tanstack/react-table`. Debe incluir soporte nativo para selección, búsqueda global debounced, acciones y estados de carga (Skeleton).
- **Fase 2: Migración Masiva**: 
    - Reemplazar `CrudTable` en todos los módulos de Admin.
    - Migrar tablas basadas en `div` al nuevo componente `DataTable`.
    - Actualizar tablas dentro de Acordeones para que usen el componente estándar.
    - Migrar `RegistrosLiquidacionTable` y `BusinessTableSection` al nuevo estándar.

## Capabilities

### New Capabilities
- `ui-system`: Sistema de tablas unificado basado en TanStack Table con soporte para selección masiva, búsqueda global y acciones dinámicas.

### Modified Capabilities
- `negocios`: Actualización de la visualización de negocios para usar el componente estándar.
- `liquidaciones`: Homologación de la tabla de registros de liquidación.
- `admin`: Reemplazo de todas las tablas CRUD por el componente único.

## Impact

- **Shared UI**: Centralización de la lógica de tablas en `features/shared/ui`.
- **Admin**: Afecta a Monedas, Productos, Periodicidades y Categorías.
- **Negocios y Pre-liquidación**: Afecta a las vistas principales de estos módulos.
- **Bundle**: Reducción de lógica duplicada al centralizar en TanStack Table.
