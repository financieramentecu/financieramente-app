# Tasks: Enhanced Business Excel Export

## Fase 1: Infraestructura y Dependencias
- [x] 1.1 Instalar la librería `xlsx-js-style` mediante `npm install xlsx-js-style`.
- [x] 1.2 Verificar que la dependencia se haya añadido correctamente en `package.json`.

## Fase 2: Implementación de Lógica de Mapeo
- [x] 2.1 Crear/Actualizar tests unitarios para el mapeador en `src/features/negocios/lib/__tests__/map-business-to-export-row.test.ts`.
  - [x] Testear el nuevo orden de columnas.
  - [x] Testear el cálculo correcto de Mes (Nombre) y Año.
  - [x] Testear la inclusión del líder encargado.
- [x] 2.2 Modificar `src/features/negocios/lib/map-business-to-export-row.ts`:
  - [x] Actualizar `negociosExportColumnHeaders` con los nombres y orden solicitados (Agente, Nombres y Apellidos del Cliente).
  - [x] Asegurar primera letra en mayúscula para todas las columnas.
  - [x] Implementar lógica de Mes como nombre en español.
  - [x] Refactorizar `mapBusinessToExportRow` para mapear los campos al nuevo esquema e incluir la lógica de fechas.

## Fase 3: Implementación de Estilos en el API Route
- [x] 3.1 Modificar `src/app/api/negocios/export/route.ts`:
  - [x] Cambiar el import de `xlsx` por `xlsx-js-style`.
  - [x] Implementar la lógica para aplicar fondo azul claro y negrita a la fila de cabeceras.
  - [x] Implementar el formato de moneda para la columna "Valor negocio".
  - [x] Implementar el ajuste automático del ancho de las columnas (`!cols`).

## Fase 4: Verificación y QA
- [x] 4.1 Ejecutar los tests unitarios creados en la Fase 2 y asegurar que pasen.
- [x] 4.2 Realizar una exportación manual desde el dashboard de negocios.
- [x] 4.3 Validar visualmente el archivo Excel:
  - [x] Cabecera azul y negrita.
  - [x] Columnas en orden correcto.
  - [x] Datos de Mes y Año correctos.
  - [x] Columna de Valor con formato de moneda.
