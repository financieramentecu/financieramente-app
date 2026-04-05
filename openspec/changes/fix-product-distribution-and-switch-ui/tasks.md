## 1. Estilos de Interfaz - Tema Tailwind v4

- [ ] 1.1 Añadir el bloque `@theme` en `src/app/globals.css` para mapear las variables CSS (HSL) a las utilidades de Tailwind.
- [ ] 1.2 Revisar `src/features/shared/ui/switch.tsx` para asegurar que utilice las variables del tema mapeadas para los estados y variantes.

## 2. Actualización de API - Consulta de Configuración de Producto

- [ ] 2.1 Modificar `src/app/api/product-configurations/route.ts` para actualizar el `include` de Prisma y obtener todas las `productPercentageCommissions` (seleccionando solo `active` y `description`).

## 3. Lógica del Mapeador - Distribución Activa Dinámica

- [ ] 3.1 Actualizar la interfaz `PrismaProductConfigurationWithIncludes` en `src/features/product-configuration/mappers/product-configuration.mapper.ts`.
- [ ] 3.2 Añadir pruebas unitarias en `src/features/product-configuration/__tests__/mappers/product-configuration.mapper.test.ts` que cubran los escenarios de distribución activa/inactiva.
- [ ] 3.3 Actualizar la función `prismaProductConfigToProductConfig` para encontrar la distribución con `active: true` y usar su descripción.

## 4. Verificación

- [ ] 4.1 Ejecutar las pruebas unitarias del mapeador: `npm test src/features/product-configuration/__tests__/mappers/product-configuration.mapper.test.ts`.
- [ ] 4.2 Verificación manual de la tabla de Configuración de Producto: verificar los colores del Switch y el contenido de la columna "Distribución para nuevos negocios".
