# Proposal: mejoras-product-configuration-sin-origen

## Intent

Simplificar la identificacion de configuraciones de producto eliminando el origen del cliente (`idClientOrigin`) de la clave de unicidad y del codigo de PPC. Hoy una misma combinacion COMPANIA-PRODUCTO-CATEGORIA puede generar multiples configuraciones por origen, lo que duplica administracion sin aportar diferenciacion comercial real: el equipo de operaciones quiere una sola PPC por COMPANIA-PRODUCTO-CATEGORIA y aplicarla a todos los negocios sin importar el origen del cliente.

Adicionalmente, se aprovecha el cambio para nivelar dos faltantes que el equipo arrastra:

- Auditoria: las rutas de `ProductConfiguration` y `DistributionCommission` no registran eventos en `AuditLog`, contradiciendo la regla del proyecto de que toda mutacion debe loguear.
- Soft delete: la convencion del proyecto prohibe `prisma.delete`, pero `Business` y `ComissionDistribution` no tienen un campo de estado para implementar borrado logico.

El resultado es un modelo de PPC mas simple, trazable y consistente con el resto del dominio.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `product-configuration` — la clave unica pasa de `(idProduct, idClientOrigin, idCategory)` a `(idProduct, idCategory)`. El codigo generado por `buildProductConfigurationCode` pasa de `COMPANY-PRODUCT-ORIGIN-CATEGORY` a `COMPANY-PRODUCT-CATEGORY`. Las rutas API y server actions dejan de aceptar/requerir `idClientOrigin` para identificar la PPC y comienzan a registrar eventos en `AuditLog` (`PRODUCT_CONFIGURATION_CREATED`, `_UPDATED`, `_DEACTIVATED`).
- `negocios` — el lookup de PPC al crear/actualizar negocios deja de filtrar por `idClientOrigin`. La funcion `findProductPercentageCommission` recibe solo `{ idProduct, idCategory }`. El origen del cliente se conserva en el negocio como metadato pero no condiciona la PPC aplicada.
- `distribution-commission` — las rutas y acciones que crean, actualizan o desactivan `ComissionDistribution` agregan logging a `AuditLog` (`DISTRIBUTION_COMMISSION_CREATED`, `_UPDATED`, `_DEACTIVATED`) y migran a soft delete via campo `status` en `ComissionDistribution`.
- `business` — `Business` incorpora campo `status: Boolean @default(true)` para soportar soft delete consistente con el resto de entidades del proyecto.

### Removed Capabilities

- Diferenciacion de PPC por `ClientOrigin`: ya no es posible tener dos `ProductConfiguration` activas con la misma combinacion `(idProduct, idCategory)` y distinto `idClientOrigin`.
- Segmento `ORIGIN` en el codigo de PPC.

## Approach

1. **Schema (Prisma)**: cambiar `@@unique([idProduct, idClientOrigin, idCategory])` a `@@unique([idProduct, idCategory])` en `ProductConfiguration`. Agregar `status Boolean @default(true)` a `Business` y `ComissionDistribution`. Generar migracion `mejoras_product_configuration_sin_origen`.
2. **Data migration**: en la misma migracion, antes de aplicar la nueva constraint, deduplicar `ProductConfiguration` por `(idProduct, idCategory)` segun politica acordada (mantener la mas reciente activa, desactivar el resto via `active = false`). Regenerar `code` para todas las filas usando el nuevo formato `COMPANY-PRODUCT-CATEGORY`.
3. **Codigo generador**: actualizar `buildProductConfigurationCode` para no incluir el origen y ajustar todos los call sites que arman el codigo manualmente.
4. **Lookup de PPC en negocios**: simplificar `findProductPercentageCommission` y sus consumidores para que reciban solo `idProduct` e `idCategory`.
5. **API/Actions**: remover `idClientOrigin` de schemas Zod de creacion/actualizacion de PPC; mantener compatibilidad de payload de negocios (sigue aceptando `idClientOrigin` como dato del negocio, no como filtro de PPC).
6. **Audit log**: agregar nuevos `AuditAction` (`PRODUCT_CONFIGURATION_*`, `DISTRIBUTION_COMMISSION_*`) en `audit-logger.ts` y llamar `logAuditEvent` desde cada handler/action de PPC y de `ComissionDistribution`.
7. **Soft delete**: reemplazar cualquier `prisma.business.delete` o `prisma.comissionDistribution.delete` por `update({ data: { status: false } })`. Actualizar listados/queries para filtrar por `status: true` por defecto.
8. **Seeds**: regenerar seeds de PPC para que no produzcan duplicados por origen y para que los codigos sigan el nuevo formato.
9. **Tests**: actualizar mocks/fixtures de `ProductConfiguration`, `Business` y `ComissionDistribution` para incluir los nuevos campos; ajustar tests de `findProductPercentageCommission` y de los handlers afectados.

## Affected Areas

- `prisma/schema.prisma` — cambiar `@@unique` de `ProductConfiguration`, agregar `status` en `Business` y `ComissionDistribution`.
- `prisma/migrations/<timestamp>_mejoras_product_configuration_sin_origen/` — nueva migracion con deduplicacion + regeneracion de codes + nueva constraint + nuevas columnas `status`.
- `prisma/seeds/` — actualizar seeds de `ProductConfiguration` (sin origen, codigo nuevo) y de `Business`/`ComissionDistribution` (incluir `status`).
- `src/features/product-configuration/lib/build-product-configuration-code.ts` (o equivalente) — eliminar segmento ORIGIN.
- `src/features/product-configuration/services/` y `actions/` — quitar `idClientOrigin` de validaciones, queries de unicidad y payloads.
- `src/app/api/product-configurations/route.ts` y `[id]/route.ts` — quitar `idClientOrigin` de filtros, agregar `logAuditEvent`.
- `src/features/negocios/services/` (lookup de PPC) — simplificar `findProductPercentageCommission` y sus consumidores; quitar `idClientOrigin` del filtro.
- `src/features/negocios/actions/` — ajustar llamados al lookup de PPC.
- `src/app/api/distribution-commissions/` (o equivalente) y `src/features/distribution-commission/` — agregar `logAuditEvent`, migrar a soft delete via `status`.
- `src/app/api/businesses/` y `src/features/negocios/` — migrar `delete` a soft delete via `status`, filtrar listados por `status: true`.
- `src/features/auth/lib/audit-logger.ts` — agregar `PRODUCT_CONFIGURATION_CREATED|UPDATED|DEACTIVATED` y `DISTRIBUTION_COMMISSION_CREATED|UPDATED|DEACTIVATED`.
- `src/features/product-configuration/__tests__/`, `src/features/negocios/__tests__/`, `src/features/distribution-commission/__tests__/` — actualizar mocks (`mock-prisma-business.ts`, fixtures de PPC) y casos de prueba.
- `prisma/ERD.md` — regenerar para reflejar los cambios de schema.

## Out of Scope

- Eliminar `idClientOrigin` del modelo `Business` o de cualquier otra entidad: el origen del cliente sigue siendo un atributo valido del negocio.
- Renombrar `ClientOrigin` u otras entidades relacionadas.
- Cambiar la logica de calculo de comisiones, splits o liquidaciones mas alla del lookup de PPC.
- Implementar UI nueva para gestionar PPC: solo se ajustan los formularios existentes para que no pidan `idClientOrigin` al crear/editar PPC.
- Soft delete para entidades distintas de `Business` y `ComissionDistribution`.
- Backfill historico de `AuditLog` para mutaciones previas: el audit log empieza a registrarse desde el deploy.

## Risks

- **Deduplicacion destructiva**: si existen multiples PPC activas por `(idProduct, idCategory)` con valores distintos, la migracion debe elegir cual conservar. Mitigacion: dry-run en staging y reporte de duplicados antes de correr en produccion; mantener las descartadas con `active = false` (no borrar fisicamente) para auditoria.
- **Codigos duplicados tras regeneracion**: si dos filas terminan con el mismo `code` despues de quitar el origen, la unicidad de `code` se rompe. Mitigacion: la deduplicacion previa por `(idProduct, idCategory)` cubre el caso, pero la migracion debe validar explicitamente que no queden colisiones de `code` antes de aplicar la constraint.
- **Lookups stale en codigo**: cualquier consumidor que aun pase `idClientOrigin` al lookup de PPC dejara de filtrar como antes y podria devolver una PPC distinta. Mitigacion: busqueda exhaustiva de call sites + tests de integracion en `negocios`.
- **Soft delete retroactivo**: los registros existentes de `Business` y `ComissionDistribution` quedaran con `status = true` por default. Si hay registros que en la realidad estaban "borrados" via otro mecanismo (flag ad-hoc, no usados), no se detectaran automaticamente. Mitigacion: revisar con producto si existe algun flag previo y, de existir, mapearlo en la misma migracion.
- **Volumen de AuditLog**: agregar logging a PPC y `ComissionDistribution` incrementara el volumen de la tabla. Mitigacion: ya esta dimensionada para el resto de entidades; monitorear crecimiento post-deploy.
- **Tests desactualizados**: fixtures de Prisma que no incluyan los nuevos campos haran fallar la suite. Mitigacion: actualizar mocks (`mock-prisma-business.ts` y similares) como parte del mismo cambio.
