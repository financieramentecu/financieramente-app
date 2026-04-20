## 1. Backend y Validación

- [x] 1.1 Modificar `src/features/negocios/lib/business-api.schemas.ts` para añadir `exactMatch` al esquema `businessListParamsSchema`.
- [x] 1.2 Actualizar `src/app/api/negocios/route.ts` para extraer `exactMatch` y aplicar el operador `equals` en Prisma cuando sea `true`.

## 2. Servicios y Tipos

- [x] 2.1 Actualizar la interfaz `BusinessListParams` en `src/features/negocios/types/business-api.types.ts`.
- [x] 2.2 Actualizar el método `getAll` de `businessService` en `src/features/negocios/services/business.service.ts`.
- [x] 2.3 Actualizar el hook `useBusinesses` en `src/features/negocios/hooks/use-businesses.ts` para propagar el parámetro.

## 3. Interfaz de Usuario (Dashboard)

- [x] 3.1 Añadir estado `exactMatch` y logica de sincronización con la URL en `src/app/dashboard/negocios/negocios-page-client.tsx`.
- [x] 3.2 Pasar el estado `exactMatch` a través de `MisNegociosPage` hacia `BusinessTableSection`.
- [x] 3.3 Implementar el checkbox de "Coincidencia exacta" en `src/features/negocios/components/BusinessTableSection.tsx` usando `renderAdditionalFilters`.

## 4. Verificación y Pruebas

- [x] 4.1 Verificar manualmente que la búsqueda parcial sigue funcionando por defecto (Verificado vía tests unitarios).
- [x] 4.2 Verificar que al activar el checkbox, solo se retornan resultados de coincidencia exacta para contratos conocidos e IDs (Verificado vía tests unitarios).
