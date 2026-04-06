## 1. Ajustes en Sección de Producto

- [x] 1.1 Eliminar `helperText` de Compañía en `ProductInfoSection`.
  - Archivo: `src/features/negocios/components/sections/product-info-section.tsx`
  - Eliminar la propiedad `helperText` del primer `FormSelectField` (líneas 56-60).

## 2. Ajustes en Sección de Negocio

- [x] 2.1 Actualizar mensaje de ayuda de Valor en `BusinessInfoSection`.
  - Archivo: `src/features/negocios/components/sections/business-info-section.tsx`
  - Reemplazar el bloque informativo actual (líneas 67-75) con el nuevo texto exacto: "Recuerde que el campo Valor debe ser equivalente al valor de la prima por 12".
  - Asegurarse de que el texto previo ("1. Si el negocio es Crea Patrimonio de Skandia... 2. Si tu cliente toma...") sea eliminado por completo.

## 3. Ajustes en Base de Datos (Seed)

- [x] 3.1 Renombrar etiqueta de moneda "Dólar Americano" a "Moneda Extranjera" en el Seed.
  - Archivo: `prisma/seeds/currency.ts`
  - Ejecutar el seed para aplicar cambios en la DB.

## 4. Verificación

- [x] 4.1 Verificar cambios visualmente en el formulario de creación.
- [x] 4.2 Verificar que el formulario de edición mantenga la consistencia.
- [x] 4.3 Ejecutar `npm run type-check` para asegurar que no hay errores de tipado.
