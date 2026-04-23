# Design: Enhanced Business Excel Export

## Architecture Decisions

### 1. Style Support Dependency
- **Decision**: Use `xlsx-js-style` instead of standard `xlsx`.
- **Rationale**: Standard `xlsx` (SheetJS Community Edition) does not support cell styles in the browser/node without a paid license. `xlsx-js-style` is a compatible fork that enables basic styles (colors, fonts, borders).

### 2. Month Representation
- **Decision**: Calculate "Mes" as a name in Spanish.
- **Rationale**: Analysts prefer reading "Enero" instead of "1" for manual reports.

### 3. Column Auto-sizing
- **Decision**: Calculate width dynamically during export.
- **Rationale**: Improves readability by ensuring all data is visible without manual adjustment.

## Components

### 1. Mapper de Exportación (`src/features/negocios/lib/map-business-to-export-row.ts`)
- **Modificación**: Se actualizará `negociosExportColumnHeaders` para retornar las cabeceras en el nuevo orden y con nombres ajustados (Agente, Nombres y Apellidos del Cliente, Mes, Año).
- **Modificación**: Se actualizará `mapBusinessToExportRow` para:
  - Convertir el índice del mes en nombre (e.g., 0 -> "Enero").
  - Generar el objeto con las claves exactas solicitadas y primera letra en mayúscula.
  - Resolver el "Líder encargado" (primer nivel de la cadena de líderes).

### 2. Route Handler (`src/app/api/negocios/export/route.ts`)
- **Cambio**: Importar de `xlsx-js-style`.
- **Lógica de Estilo**: 
  - Iterar sobre las celdas de la primera fila (`A1`, `B1`, etc.) y aplicar fondo azul claro y negrita.
  - Aplicar formato numérico `z: "$#,##0.00"` a la columna "Valor negocio".
- **Lógica de Dimensionado**: 
  - Calcular el ancho máximo de caracteres por columna iterando sobre headers y datos.
  - Asignar el resultado a `worksheet['!cols']` con la propiedad `wch`.

## File Changes
- `package.json`: Añadir `xlsx-js-style`.
- `src/features/negocios/lib/map-business-to-export-row.ts`: Refactorizar mapeo.
- `src/app/api/negocios/export/route.ts`: Implementar estilos y auto-ajuste.
- `src/features/negocios/lib/__tests__/map-business-to-export-row.test.ts`: Nuevos tests.
