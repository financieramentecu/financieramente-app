# Proposal: Enhanced Business Excel Export

## Intent
Mejorar la funcionalidad de exportación de negocios a Excel para proporcionar todos los campos necesarios para el análisis de liquidación manual, con un formato profesional y legible.

## Scope

### In Scope
- Sustituir la librería `xlsx` por `xlsx-js-style` en el backend para habilitar el soporte de estilos (colores y negritas).
- Modificar el mapeo de datos en `src/features/negocios/lib/map-business-to-export-row.ts` para cumplir con el orden y nombres de columnas solicitados (Agente, Nombres y Apellidos del Cliente, Mes como nombre, etc.).
- Asegurar que todas las cabeceras comiencen con mayúscula.
- Añadir la lógica para las nuevas columnas `Mes` (Nombre) y `Año`.
- Implementar el formato visual en `src/app/api/negocios/export/route.ts`:
  - Cabecera: fondo azul claro (`#ADD8E6` o similar) y fuente en negrita.
  - Columna de Valor: formato de moneda.
  - Ajuste automático del ancho de las columnas según el contenido.

### Out of Scope
- Modificar el diseño de la tabla en el frontend.
- Cambiar la lógica de filtros de búsqueda.

## Approach
1. **Infraestructura**: Cambiar la dependencia a `xlsx-js-style`.
2. **Mapeo**: Refactorizar el generador de filas para incluir los nuevos campos y el orden exacto (22 columnas).
3. **Estilos**: Aplicar el objeto de estilos de `xlsx-js-style` durante la creación de la hoja de cálculo en el API Route.
4. **Auto-size**: Calcular el ancho de cada columna basado en el contenido máximo de las celdas.

## Risk Assessment
- **Compatibility**: `xlsx-js-style` es un fork de `xlsx`, por lo que la migración debería ser transparente para la lógica actual.
- **Performance**: El cálculo de anchos de columna añade un pequeño overhead proporcional al número de filas, pero aceptable para los volúmenes actuales.
