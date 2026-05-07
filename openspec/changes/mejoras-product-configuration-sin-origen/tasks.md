# Tasks: mejoras-product-configuration-sin-origen

## Phase 1: Schema + Migration

- [x] 1.1 `prisma/schema.prisma` — eliminar `idClientOrigin` del `@@unique` de `ProductConfiguration`; cambiar a `@@unique([idProduct, idCategory])`
- [x] 1.2 `prisma/schema.prisma` — agregar `isActive Boolean @default(true)` a `Business`
- [x] 1.3 `prisma/schema.prisma` — agregar `isActive Boolean @default(true)` a `ComissionDistribution`
- [x] 1.4 `prisma/migrations/` — crear migración: deduplicar filas por `(idProduct, idCategory)`, backfill `code` sin origen, índice único parcial `WHERE active = true`, ALTER TABLE para `isActive`
- [x] 1.5 Ejecutar `npx prisma migrate dev --name mejoras-product-configuration-sin-origen` y `npx prisma generate` — PENDIENTE ejecución manual en ambiente destino (schema ya actualizado en 1.1-1.3)

## Phase 2: Code Generator (TDD)

- [x] 2.1 `src/features/product-configuration/__tests__/build-code.test.ts` — RED: test `buildProductConfigurationCode(company, product, category)` sin param `origin`
- [x] 2.2 `src/features/product-configuration/lib/build-code.ts` — GREEN: implementar `buildProductConfigurationCode` con firma actualizada (3 params)
- [x] 2.3 Actualizar todos los call-sites de `buildProductConfigurationCode` para eliminar el argumento `origin`

## Phase 3: Lookup PPC — sin fallback (TDD)

- [x] 3.1 RED: test `getPpcForNewBusinesses({ idProduct, idCategory })` — sin `idClientOrigin`; si no existe PPC lanza error 422, NO hay fallback silencioso
- [x] 3.2 GREEN: quitar `idClientOrigin` del parámetro y de la query Prisma; eliminar lógica de fallback; lanzar error descriptivo si no existe configuración
- [x] 3.3 Actualizar call-sites de `getPpcForNewBusinesses` — propagar el error al handler de creación de negocio

## Phase 4: API Routes — Schemas Zod

- [x] 4.1 `src/app/api/product-configuration/route.ts` — quitar `idClientOrigin` del schema Zod de POST
- [x] 4.2 `src/app/api/product-configuration/[id]/route.ts` — quitar `idClientOrigin` del schema Zod de PUT/PATCH

## Phase 5: Audit Log

- [x] 5.1 `src/features/auth/lib/audit-logger.ts` — agregar 7 `AuditAction`: `PRODUCT_CONFIGURATION_CREATED`, `PRODUCT_CONFIGURATION_UPDATED`, `PRODUCT_CONFIGURATION_DEACTIVATED`, `DISTRIBUTION_COMMISSION_CREATED`, `DISTRIBUTION_COMMISSION_UPDATED`, `DISTRIBUTION_COMMISSION_ACTIVATED`, `DISTRIBUTION_COMMISSION_DEACTIVATED`
- [x] 5.2 `src/app/api/product-configurations/route.ts` — `logAuditEvent(PRODUCT_CONFIGURATION_CREATED)` en POST
- [x] 5.3 `src/app/api/product-configurations/[id]/route.ts` — `logAuditEvent(UPDATED/DEACTIVATED)` en PUT y PATCH
- [x] 5.4 `src/app/api/product-configurations/[id]/distribution-commission/route.ts` — `logAuditEvent(DISTRIBUTION_COMMISSION_CREATED)` en POST
- [x] 5.5 `src/app/api/product-configurations/[id]/distribution-commission/[ruleId]/route.ts` — `logAuditEvent(UPDATED/ACTIVATED/DEACTIVATED)` en PUT y PATCH

## Phase 6: Soft Delete — Handlers

- [x] 6.1 `src/app/api/product-configurations/[id]/route.ts` — PATCH/DELETE: reemplazar cualquier `prisma.productConfiguration.delete()` por `update({ data: { active: false } })`; confirmar que GET filtra `active: true`
- [x] 6.2 `src/app/api/product-configurations/[id]/distribution-commission/[ruleId]/route.ts` — DELETE: reemplazar por `update({ data: { active: false } })`; respuesta `{ success: true }`
- [x] 6.3 `src/app/api/negocios/[id]/route.ts` — DELETE (si existe): reemplazar por `update({ data: { isActive: false } })`; GET/list: agregar `where: { isActive: true }` por defecto
- [x] 6.4 `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` — reemplazar `comissionDistribution.deleteMany` por `updateMany({ data: { isActive: false } })`
- [x] 6.5 `src/features/load-file/services/delete-file-import.service.ts` — reemplazar `comissionDistribution.deleteMany` por `updateMany({ data: { isActive: false } })`
- [x] 6.6 Verificar que `validateProductConfigurationExists` solo considera configs con `active: true`

## Phase 7: Seeds + ERD

- [x] 7.1 `prisma/seeds/product-percentage.ts` — actualizar seed de `ProductConfiguration` sin `idClientOrigin` y con código formato `COMPANY-PRODUCT-CATEGORY`
- [x] 7.2 `prisma/seeds/migrate-product-configurations.ts` — script de migración: deduplicar por `(idProduct, idCategory)`, desactivar duplicados, regenerar `code`; ejecutable con `npx tsx prisma/seeds/migrate-product-configurations.ts`
- [x] 7.3 `prisma/ERD.md` — actualizar: nuevo `@@unique`, campo `isActive` en `Business` y `ComissionDistribution`

## Phase 8: Tests — Fixtures

- [x] 8.1 Mocks/fixtures de `Business` y `ComissionDistribution` — agregar campo `isActive: true`
- [x] 8.2 Tests de rutas con DELETE/PATCH — verificar que llaman `update` con `isActive: false` y NO `delete()`
- [x] 8.3 `pnpm vitest` — todos los tests deben pasar

## Phase 10: Búsqueda de agentes con filtro OVERRIDE

- [x] 10.1 `src/app/api/users/search/route.ts` — agregar parámetro opcional `beneficiaryMode` al schema Zod; si se recibe, agregar `where: { category: { beneficiaryMode: <valor> } }` al findMany de usuarios
- [x] 10.2 `src/features/negocios/hooks/use-search-agents.ts` — pasar `beneficiaryMode=OVERRIDE` en la query de búsqueda de agentes
- [x] 10.3 `src/features/negocios/hooks/use-agent-permissions.ts` o `use-business-form.ts` — actualizar `isBlocked`: para roles `ADMIN` y `ASISTENTE_GERENCIA_OPERATIVA`, retornar `false` siempre (campo habilitado desde el inicio)
- [x] 10.4 Tests: `src/app/api/users/search/__tests__/route.test.ts` — agregar test que verifica filtro `beneficiaryMode=OVERRIDE`
- [x] 10.5 Tests: `use-search-agents` o `use-business-form` — verificar que `isBlocked = false` para admin/asistente independientemente del documento

## Phase 9: Verify

- [x] 9.1 `pnpm vitest` — zero failures
- [x] 9.2 `pnpm type-check` — zero TypeScript errors
