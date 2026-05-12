# Proposal: mejoras-jerarquia-level-category

## Intent

El modelo `Category` mezcla dos conceptos: **jerarquía de comisión** (qué nivel del organigrama es el agente) y **categoría de presentación** (cómo agrupamos a los agentes para mostrar). Esta dualidad confunde el dominio, dificulta evolucionar comisiones independientemente de la presentación, y obliga a `pre-liquidacion` a hacer matching frágil por nombre (`configFromCategories`). Además, los códigos `MS_JUNIOR`, `TEAM_LEADER`, etc. expresan rol comercial pero no posición numérica en la cadena, y el formato del code de `ProductConfiguration` (`COMPANY-PRODUCT-CATCODE`) hereda esa ambigüedad.

## Scope

### In Scope

- Renombrar modelo Prisma `Category → Level` (tabla `level`); preservar todos los campos actuales y agregar `levelNumber Int?`.
- Migración seed: renombrar codes (`MS_JUNIOR→LEVEL_0`, `MS_SENIOR→LEVEL_1`, `TEAM_LEADER→LEVEL_2`, `PERFORMANCE_LEADER→LEVEL_3`, `BUSINESS_LEADER→LEVEL_4`, `PARTNER→LEVEL_5`, `MIA→GENERAL_LEVEL`) y poblar `levelNumber` (0..5; null para `GENERAL_LEVEL`).
- Crear nuevo modelo `Category` (tabla `category`) con campos: `idCategory`, `name`, `description`, `status`, `idCategoryType` (FK).
- Renombrar FK `User.idCategoria → User.idLevel` (FK a `Level`); agregar `User.idCategory Int?` (FK opcional al nuevo `Category`).
- Renombrar FK en `ProductConfiguration.idCategory → idLevel` (FK a `Level`); cambiar formato `code` a `COMPANY-PRODUCT-LEVEL_X`.
- Renombrar FK en `ProductPercentageCommissionCategory.idCategory → idLevel` (FK a `Level`).
- Actualizar service de creación de Business: lookup de `ProductConfiguration` por `idLevel` del usuario (no por `idCategoria`).
- Actualizar `pre-liquidacion`: reemplazar matching por nombre en `configFromCategories` por lookup por `levelNumber` (o `code`).
- Actualizar features afectadas: `categories` (renombrar a `levels` + crear feature nueva `categories`), `users`, `product-configuration`, `pre-liquidacion`, `negocios`.
- Actualizar tipos TypeScript, mappers, schemas Zod, API routes (`/api/categories` → `/api/levels` + nuevo `/api/categories`), tests y mocks.
- AuditLog: agregar enum values `LEVEL_*` y `CATEGORY_*` para mutaciones en ambos modelos.
- Actualizar `prisma/ERD.md`.

### Out of Scope

- UI de asignación masiva de `idCategory` a usuarios existentes (data backfill se ejecuta vacío — `idCategory` queda null).
- Lógica de progresión automática entre levels (ya excluida en `mejoras-categorias-jerarquia`).
- Endpoints de jerarquía/grafo sobre `Level` (`GET /api/levels/hierarchy`).
- Cambios en `CategoryType` (se reusa para tipificar el nuevo `Category`).
- Migración de comisiones por valores `levelNumber` distintos a los actuales (los porcentajes se mantienen).

## Capabilities

### New Capabilities

- `levels`: gestiona la jerarquía de comisión (ex-`Category` con `levelNumber`, `code`, `beneficiaryMode`, `idNextCategory` self-ref renombrado a `idNextLevel`). Reemplaza la spec actual `categories` cuyo dominio era jerarquía.
- `categories`: nueva spec para la categoría de presentación/agrupamiento de agentes (`name`, `description`, `idCategoryType`, `status`). Independiente de comisiones.

### Modified Capabilities

- `product-configuration`: el code pasa de `COMPANY-PRODUCT-CATEGORY` a `COMPANY-PRODUCT-LEVEL_X`; la FK pasa de `idCategory` a `idLevel`; el unique key pasa de `[idProduct, idCategory]` a `[idProduct, idLevel]`.

> La spec actual `openspec/specs/categories` será reemplazada por `openspec/specs/levels` (rename) y se creará una nueva `openspec/specs/categories` con el nuevo dominio. La sincronización ocurre en `sdd-archive`.

## Approach

1. **Prisma**: rename `model Category {} @@map("category") → model Level {} @@map("level")`. Agregar `levelNumber Int?`. Agregar nuevo `model Category` (tabla `category`).
2. **Migración SQL**: `ALTER TABLE category RENAME TO level`; agregar columna `level_number`; crear nueva tabla `category`; renombrar columnas FK (`id_categoria → id_level`) en tablas dependientes.
3. **Seed multi-pass**: pass 1 actualiza `level` con nuevos codes y `level_number`; pass 2 mantiene `idNextLevel`; pass 3 conserva fixed beneficiary; pass 4 (opcional) seeds de `category` vacíos.
4. **Code generator**: `buildProductConfigurationCode` usa `level.code` (`LEVEL_0`..`LEVEL_5`, `GENERAL_LEVEL`).
5. **pre-liquidacion**: `configFromCategories(name)` → `configFromLevel({ levelNumber } | { code })` con lookup directo por `levelNumber`.
6. **Features**: rename `src/features/categories/` → `src/features/levels/`. Crear nueva `src/features/categories/` (CRUD simple, patrón de `categories` actual).
7. **TDD**: cada batch de implementación arranca con un test RED (schema migration, service, API route, hook, UI).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Rename Category→Level (+ levelNumber); new Category model; rename FKs en User, ProductConfiguration, ProductPercentageCommissionCategory. |
| `prisma/migrations/*` | New | Migración `rename-category-to-level-and-add-category` con renames + create. |
| `prisma/seeds/category.ts` | Modified → renamed `level.ts` | Nuevos codes (LEVEL_0..5, GENERAL_LEVEL), levelNumber. |
| `prisma/seeds/category-presentation.ts` | New | Seed (probablemente vacío) para nuevo Category. |
| `prisma/ERD.md` | Modified | Reflejar Level + Category nuevo. |
| `src/features/categories/` | Renamed → `levels/` | Tipos, services, hooks, components, API client. |
| `src/features/categories/` (new) | New | Feature nueva con CRUD simple para Category presentation. |
| `src/features/users/` | Modified | `idCategoria → idLevel` + nuevo `idCategory` en mappers, types, formularios. |
| `src/features/product-configuration/` | Modified | Code generator + lookup por `idLevel`. |
| `src/features/pre-liquidacion/` | Modified | `configFromCategories` → lookup por `levelNumber`/`code`. |
| `src/features/negocios/` | Modified | Lookup de ProductConfiguration por `user.idLevel`. |
| `src/app/api/categories/*` | Renamed → `/api/levels/*` + new `/api/categories/*` | Routes split. |
| `src/features/auth/lib/audit-logger.ts` | Modified | Nuevos enum: `LEVEL_*`, `CATEGORY_*`. |
| `__tests__/*` mocks | Modified | `mock-prisma-business.ts`, fixtures Category→Level. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Conflicto de nombre de tabla — la nueva `category` choca con la existente | High | La migración renombra primero `category → level` ANTES de crear la nueva `category`. SQL de migración revisado a mano. |
| Reescribir FKs (`idCategoria → idLevel`) puede romper queries en runtime | High | Migración Prisma + `prisma generate` antes de tocar código; tests RED por feature antes de cada cambio. |
| `pre-liquidacion` pierde matches si seeds de niveles no quedan exactos | High | Tests con fixtures por `levelNumber`; lookup es ahora por entero, más estable que strings. |
| Cambio del `code` de ProductConfiguration invalida configuraciones existentes | High | Backfill en migración: regenerar todos los `code` con nuevo formato; verificar unicidad (`@@unique [idProduct, idLevel]`). |
| VS Code/TS server cachea tipos Prisma viejos | Medium | Documentar `npx prisma generate` + reload TS server tras migración. |
| `configFromCategories` puede tener llamadores fuera de pre-liquidacion | Medium | `rg` exhaustivo del símbolo antes de eliminar; alias temporal si aparece uso externo. |

## Rollback Plan

1. **Pre-merge**: revertir el branch (no se aplicaron migraciones a prod).
2. **Post-merge / pre-deploy**: revertir merge commit; regenerar Prisma client; restaurar features afectadas.
3. **Post-deploy**: ejecutar migración inversa (script `down`): `ALTER TABLE level RENAME TO category` + `DROP TABLE category` (la nueva) + revert FK renames + restaurar codes antiguos vía seed inverso. Mantener un snapshot DB previo al deploy como respaldo.

## Dependencies

- Cambio anterior `mejoras-categorias-jerarquia` debe estar mergeado y aplicado (provee `idNextCategory`, `color`, enum renames, codes `MS_JUNIOR`/`TEAM_LEADER`/etc. que esta migración va a renombrar).
- Sin dependencias externas (no hay servicios/APIs de terceros tocados).

## Success Criteria

- [ ] `npx prisma migrate dev` ejecuta sin errores y `prisma/schema.prisma` muestra `model Level` y nuevo `model Category`.
- [ ] Seed produce 7 levels con codes `LEVEL_0..5` + `GENERAL_LEVEL` y `levelNumber` correcto (0..5, null).
- [ ] Todos los tests pasan: `npm run test:unit && npm run test:integration`.
- [ ] `pre-liquidacion` resuelve configs por `levelNumber` en lugar de string matching y produce los mismos resultados que la baseline.
- [ ] `ProductConfiguration.code` sigue formato `COMPANY-PRODUCT-LEVEL_X` y la unicidad `[idProduct, idLevel]` se respeta.
- [ ] `prisma/ERD.md` refleja Level + Category nuevo (entidades, FKs, enums).
- [ ] AuditLog registra mutaciones para ambos modelos (`LEVEL_*`, `CATEGORY_*`).
- [ ] Soft delete (`status = false`) sigue siendo el único path de "eliminación" en ambos modelos.
