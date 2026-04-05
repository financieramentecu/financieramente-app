## Por Qué (Why)

La columna "Distribución para nuevos negocios" en la tabla de Configuración de Producto muestra actualmente información desactualizada. Esto ocurre porque depende de una relación estática (`idProductPercentageCommissionNewBusinesses`) en lugar de reflejar dinámicamente la distribución que está marcada como `activa`. Los usuarios necesitan ver la regla de comisión vigente para tener el contexto correcto al configurar productos.

Además, el componente Switch (interruptor) utilizado para cambiar estados carece de los estilos adecuados (riel y colores) en el entorno de Tailwind v4, lo que dificulta que los usuarios perciban si está activo o no.

## Qué Cambiará (What Changes)

1.  **Visualización Dinámica de la Distribución**: Se actualizará la API y el mapeo de datos para identificar la distribución marcada como `activa` dentro de la lista de reglas de la configuración y mostrar su descripción.
2.  **Corrección de la Interfaz del Switch**: Se actualizará el CSS global del proyecto con un bloque `@theme` de Tailwind v4 para asegurar que las variantes de los componentes como `data-[state]` (utilizadas por shadcn/ui Switch) se vinculen correctamente con las variables CSS (HSL).

## Capacidades (Capabilities)

### Nuevas Capacidades
- Ninguna (Se trata de una corrección de error y refinamiento de la interfaz).

### Capacidades Modificadas
- `product-configuration`: La visualización de la lista ahora muestra la descripción de la distribución activa dinámicamente en lugar de una referencia estática.

## Impacto (Impact)

- `src/app/api/product-configurations/route.ts`: Actualización de los `includes` de Prisma.
- `src/features/product-configuration/mappers/product-configuration.mapper.ts`: Actualización de la lógica de mapeo para buscar la distribución activa.
- `src/app/globals.css`: Adición de la configuración `@theme` de Tailwind v4.
- `src/features/shared/ui/switch.tsx`: Asegurarse de que utilice los patrones estándar de shadcn/ui compatibles con el nuevo tema.
