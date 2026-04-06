## Contexto (Context)

El sistema utiliza actualmente un campo estático `idProductPercentageCommissionNewBusinesses` en `ProductConfiguration` para determinar la distribución "activa" que se muestra en la tabla. Sin embargo, dado que las distribuciones pueden activarse o desactivarse manualmente mediante un campo booleano `active`, esta referencia estática a menudo apunta a reglas obsoletas o inactivas.
En el lado de la interfaz, la migración a Tailwind v4 ha causado una regresión donde las variables CSS (HSL) no se mapean correctamente a las utilidades de Tailwind, rompiendo el estado visual del componente Switch de Shadcn/UI.

## Objetivos / No-Objetivos (Goals / Non-Goals)

**Objetivos:**
- Asegurar que la columna "Distribución para nuevos negocios" siempre muestre la descripción de la Regla marcada como `active: true`.
- Corregir el estilo del componente Switch para mostrar el riel, las transiciones y los colores HSL correctos (Verde/Teal para activo).
- Centralizar la solución en el sistema de interfaz (`@theme` en `globals.css`).

**No-Objetivos:**
- No modificar el esquema de la base de datos.
- No cambiar la forma en que se activan/desactivan las reglas (el endpoint PATCH existente es suficiente).

## Decisiones (Decisions)

1.  **Obtención de Datos**: Actualizar la lógica de consulta de Prisma para incluir el arreglo de `productPercentageCommissions` seleccionando solo los campos `active` y `description`.
2.  **Lógica del Mapeador**: En `prismaProductConfigToProductConfig`, buscar la primera regla donde `active` sea verdadero. Si se encuentra, su descripción tendrá prioridad para el campo `newBusinessesDistributionDescription`.
3.  **Tema de Tailwind v4**: Añadir un bloque `@theme` en `src/app/globals.css` para mapear las variables CSS (HSL) a los colores de Tailwind (primary, background, etc.).
4.  **Componente Switch**: Revisar y asegurar que `src/features/shared/ui/switch.tsx` utilice los patrones estándar de shadcn/ui y respete el nuevo tema definido.

## Riesgos / Compensaciones (Risks / Trade-offs)

- **Rendimiento**: Incluir la lista de comisiones añade una pequeña sobrecarga a la consulta, pero se mitiga seleccionando solo los campos necesarios y manteniendo la paginación existente.
- **Estado Inconsistente**: Si por alguna razón hay múltiples reglas activas, el mapeador tomará la primera. El sistema idealmente debería forzar una sola activa, pero eso está fuera del alcance de esta corrección.
