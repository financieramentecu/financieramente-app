# Design: mejoras-product-configuration-sin-origen

## Technical Approach

El cambio toca cuatro capas en una sola migración coordinada:

1. **Schema (Prisma)**: reducir la unicidad de `ProductConfiguration` a `(idProduct, idCategory)` y agregar `status Boolean @default(true)` a `Business` y `ComissionDistribution`. Una sola migración SQL hace deduplicación → backfill de `code` → cambio de constraint → nuevas columnas.
2. **Code generator**: simplificar `buildProductConfigurationCode` a 3 segmentos (`COMPANY-PRODUCT-CATEGORY`) y propagar el cambio a todos los call sites (route POST, seed, tests).
3. **Lookup de PPC en negocios**: `getPpcForNewBusinesses` y `validateProductConfigurationExists` pierden `idClientOrigin` de su firma y del filtro Prisma. Las acciones que las consumen (`create-business`, `find-product-percentage-commission`, `update-business`) se actualizan en cascada.
4. **Audit log + soft delete**: nuevos `AuditAction` en `audit-logger.ts` y llamadas a `logAuditEvent` desde cada handler de PPC y `ComissionDistribution`. Cualquier intento de borrado físico se reemplaza por `update({ data: { status: false } })`. Los listados aplican `where: { status: true }` por defecto.

El origen del cliente sigue viviendo en `Business.idClientOrigin` como metadato para reportes y para `recalcularComisionesPorCambioOrigen`, pero deja de condicionar la PPC.

## Architecture Decisions

### Decision: Una sola migración SQL coordinada con deduplicación previa
**Choice**: Hacer la migración Prisma `mejoras_product_configuration_sin_origen` con SQL crudo en este orden estricto:
1. Detectar duplicados por `(id_product, id_category)` y desactivar (`active = false`) todos menos el "ganador" (el más reciente con `active = true`, fallback al de mayor `id`).
2. Regenerar `code` para todas las filas como `UPPER(REPLACE(company.name || '-' || product.name || '-' || category.name, ' ', '_'))`.
3. Validar que no queden colisiones de `code` activo (`SELECT code, COUNT(*) HAVING COUNT(*) > 1` debe ser 0).
4. `DROP` del índice único `(id_product, id_client_origin, id_category)` y `CREATE` del nuevo `(id_product, id_category)`.
5. `ALTER TABLE business ADD COLUMN status BOOLEAN NOT NULL DEFAULT TRUE`.
6. `ALTER TABLE comission_distribution ADD COLUMN status BOOLEAN NOT NULL DEFAULT TRUE`.

**Alternatives considered**:
- Dos migraciones separadas (deduplicación primero, luego constraint). Descartado: deja una ventana donde el schema y los datos no son coherentes y aumenta el riesgo de despliegue parcial.
- Borrado físico de duplicados. Descartado: contradice la regla de soft delete del proyecto y pierde trazabilidad.
- Dejar `code` legacy y solo cambiar la unicidad. Descartado: la propuesta exige el formato nuevo `COMPANY-PRODUCT-CATEGORY` y tener filas con formato viejo dificulta búsquedas.

**Rationale**: la migración tiene que ser idempotente y completa. Si falla en producción, querés que falle ANTES de tocar la constraint. Validar colisiones de `code` antes del `CREATE UNIQUE INDEX` es la única forma segura.

### Decision: Mantener `idClientOrigin` en `ProductConfiguration` pero ignorarlo
**Choice**: NO eliminar la columna `id_client_origin` de `product_configuration` en esta migración. Solo se elimina del índice único y de los call sites de código.

**Alternatives considered**:
- Drop completo de la columna. Descartado: rompe relaciones existentes (`ClientOrigin.productConfigurations`), exige migrar reportes históricos y no aporta al objetivo del cambio (la propuesta lo declara out of scope implícito).
- Hacer la columna nullable. Descartado: cambio de schema más invasivo sin beneficio.

**Rationale**: la propuesta declara fuera de alcance "eliminar `idClientOrigin` del modelo Business o de cualquier otra entidad". Aplicamos el mismo criterio a `ProductConfiguration`: el dato sigue ahí como histórico, pero no participa de la unicidad ni del lookup. En una iteración futura se puede limpiar.

### Decision: `status: Boolean` en lugar de `deletedAt: DateTime?`
**Choice**: Usar `status Boolean @default(true)` para soft delete en `Business` y `ComissionDistribution`, alineado con el resto del proyecto (`Product.status`, `ClientOrigin.status`, `Category.status`).

**Alternatives considered**:
- `deletedAt DateTime?` (patrón clásico de soft delete). Descartado: no hay ningún modelo en el schema que use ese patrón; introducir uno nuevo viola la convención.
- Reusar `Business.status: String?` existente con un valor `INACTIVE`. Descartado: ese campo ya tiene semántica de negocio (`VENTA_EFECTUADA`, `EMITIDO`, `CANCELADO`, `LIQUIDADO`); mezclarlo con activo/inactivo crea ambigüedad.

**Rationale**: consistencia. El equipo ya sabe leer `status: true` como "activo" en el resto de entidades.

### Decision: Audit log con tres acciones por entidad (CREATED / UPDATED / DEACTIVATED)
**Choice**: Agregar exactamente seis nuevos valores al enum `AuditAction`:
- `PRODUCT_CONFIGURATION_CREATED`
- `PRODUCT_CONFIGURATION_UPDATED`
- `PRODUCT_CONFIGURATION_DEACTIVATED`
- `DISTRIBUTION_COMMISSION_CREATED`
- `DISTRIBUTION_COMMISSION_UPDATED`
- `DISTRIBUTION_COMMISSION_DEACTIVATED`

**Alternatives considered**:
- Una sola acción genérica `PRODUCT_CONFIGURATION_CHANGED` con `details` describiendo el subtipo. Descartado: hace queries de auditoría más caras y rompe la convención `ENTITY_ACTION` declarada en el `CLAUDE.md` del proyecto.
- Acciones más granulares (`PRODUCT_CONFIGURATION_PPC_REASSIGNED`, `PRODUCT_CONFIGURATION_REACTIVATED`). Descartado: la información granular vive en `details`; el enum debe ser estable y discreto.

**Rationale**: la regla del proyecto dice `ENTITY_ACTION` y enumera precedentes (`CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED`). Replicamos ese patrón sin innovar.

### Decision: Eliminar el fallback de getPpcForNewBusinesses — sin config = sin negocio
**Choice**: Si `getPpcForNewBusinesses({ idProduct, idCategory })` no encuentra ninguna `ProductConfiguration` activa para ese par, lanza un error descriptivo y bloquea la creación del negocio (HTTP 422). No hay fallback silencioso.

**Alternatives considered**:
- Mantener fallback a "cualquier PPC activo del mismo producto". Descartado por el equipo: un negocio creado con una configuración de distribución incorrecta genera liquidaciones erróneas. Es preferible un error explícito que una asignación silenciosa incorrecta.
- Fallback con warning visible al usuario. Descartado: la UI de configuración de producto es la fuente de verdad; si falta la config, el operativo debe crearla primero.

**Rationale**: consistencia entre modelo y datos. El nuevo constraint `(idProduct, idCategory)` hace que cada par tenga exactamente una config. Si no existe, el sistema no puede adivinar cuál usar — debe pedirle al admin que la configure primero. Error message: `"No existe configuración de distribución para el producto y categoría seleccionados. Configurá la distribución antes de continuar."`

### Decision: Script de migración de datos como seed independiente
**Choice**: Crear `prisma/seeds/migrate-product-configurations.ts` — script ejecutable con `npx tsx` que: (1) detecta duplicados por `(idProduct, idCategory)`, (2) desactiva duplicados (`active = false`), (3) regenera `code` para todas las filas activas con el formato `COMPANY-PRODUCT-CATEGORY`. Se ejecuta ANTES de aplicar la nueva constraint en producción.

**Alternatives considered**:
- Embeber la migración de datos en el SQL de Prisma migrate. Descartado: es más difícil de testear, revisar y hacer dry-run. Un script TypeScript con Prisma client es legible y seguro.
- Ejecutar la migración de datos dentro del seed principal. Descartado: el seed principal es idempotente para datos de referencia; la migración de producción es una operación única que no debe re-ejecutarse automáticamente.

**Rationale**: separar concerns. La migración de datos es una operación única de transición; el seed es recurrente. El script independiente permite: dry-run (`--dry-run`), reporte de duplicados antes de ejecutar, y rollback manual si algo falla.

## Data Flow

```
Antes:
  Cliente UI → POST /api/product-configurations
              { idCompany, idProduct, idClientOrigin, idCategory }
              ↓
              findUnique idProduct_idClientOrigin_idCategory
              ↓
              code = COMPANY-PRODUCT-ORIGIN-CATEGORY
              ↓
              create ProductConfiguration + PPC

  Negocio nuevo → findProductPercentageCommission({ idProduct, idClientOrigin, idCategory })
                  ↓
                  getPpcForNewBusinesses → findUnique idProduct_idClientOrigin_idCategory
                  ↓
                  PPC.idProductPercentageCommissionNewBusinesses

Después:
  Cliente UI → POST /api/product-configurations
              { idCompany, idProduct, idCategory }   // idClientOrigin ya no se envía
              ↓
              findUnique idProduct_idCategory
              ↓
              code = COMPANY-PRODUCT-CATEGORY
              ↓
              create ProductConfiguration + PPC
              ↓
              logAuditEvent(PRODUCT_CONFIGURATION_CREATED)

  Negocio nuevo → findProductPercentageCommission({ idProduct, idCategory })
                  ↓
                  getPpcForNewBusinesses → findUnique idProduct_idCategory
                  ↓
                  PPC.idProductPercentageCommissionNewBusinesses
                  ↓
                  business.idClientOrigin se persiste como dato del negocio,
                  pero NO participa del lookup
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Cambiar `@@unique([idProduct, idClientOrigin, idCategory])` → `@@unique([idProduct, idCategory])` en `ProductConfiguration`. Agregar `status Boolean @default(true)` a `Business` y `ComissionDistribution`. Mantener `idClientOrigin` y su relación. |
| `prisma/migrations/<ts>_mejoras_product_configuration_sin_origen/migration.sql` | Create | Migración SQL coordinada: deduplicación + regeneración de codes + nueva constraint + nuevas columnas `status`. |
| `prisma/seeds/product-percentage.ts` | Modify | Quitar `clientOriginPropio` del `findUnique` y del `create`. Cambiar `buildProductConfigurationCode(...)` a 3 args. Mantener relación `Business → ClientOrigin` solo en seeds que crean negocios. |
| `prisma/ERD.md` | Modify | Regenerar para reflejar nueva unicidad y nuevos campos `status`. |
| `src/features/negocios/lib/product-configuration-code.ts` | Modify | Eliminar parámetro `originName` y segmento `ORIGIN`. Firma queda `(companyName, productName, categoryName)`. Actualizar JSDoc. |
| `src/features/negocios/lib/__tests__/product-configuration-code.test.ts` | Modify | Quitar argumento de origen, actualizar fixtures de output. |
| `src/features/negocios/services/product-configuration.service.ts` | Modify | `GetPpcForNewBusinessesParams` pierde `idClientOrigin`. `findUnique` pasa a `idProduct_idCategory`. `validateProductConfigurationExists(idCategory, idProduct)` pierde `idClientOrigin`. |
| `src/features/negocios/actions/find-product-percentage-commission.ts` | Modify | `FindProductPercentageCommissionInput` pierde `idClientOrigin`. Mensajes de error dejan de mencionar "origen". |
| `src/features/negocios/actions/create-business.ts` | Modify | Llamada a `findProductPercentageCommission` pasa solo `{ idProduct, idCategory }`. `idClientOrigin` se sigue persistiendo en `Business.idClientOrigin`. |
| `src/features/negocios/actions/update-client.ts` | Modify | Si pasa `idClientOrigin` al lookup, removerlo. |
| `src/features/product-configuration/lib/product-configuration-schemas.ts` | Modify | `createProductConfigurationSchema` pierde `idClientOrigin`. |
| `src/features/product-configuration/services/product-configuration.service.ts` | Modify | Quitar `idClientOrigin` del `productConfigurationInclude` solo si deja de ser necesario para mostrar en UI; si la UI sigue mostrando origen como histórico, se conserva. |
| `src/app/api/product-configurations/route.ts` | Modify | POST: dejar de validar/aceptar `idClientOrigin` en body. `findUnique` pasa a `idProduct_idCategory`. `buildProductConfigurationCode` con 3 args. Mensajes de error sin "origen". Llamar `logAuditEvent(PRODUCT_CONFIGURATION_CREATED)` tras crear. |
| `src/app/api/product-configurations/[id]/route.ts` | Modify | PUT: `logAuditEvent(PRODUCT_CONFIGURATION_UPDATED)` tras update. PATCH: si `active === false`, `logAuditEvent(PRODUCT_CONFIGURATION_DEACTIVATED)`; si `active === true`, `PRODUCT_CONFIGURATION_UPDATED`. |
| `src/app/api/product-configurations/[id]/distribution-commission/route.ts` | Modify | POST: `logAuditEvent(DISTRIBUTION_COMMISSION_CREATED)` tras crear regla. |
| `src/app/api/product-configurations/[id]/distribution-commission/[ruleId]/route.ts` | Modify | PUT: `logAuditEvent(DISTRIBUTION_COMMISSION_UPDATED)`. PATCH: si `active === false` → `DEACTIVATED`, si no → `UPDATED`. |
| `src/app/api/negocios/[id]/route.ts` | Modify | Llamada a `validateProductConfigurationExists` sin `idClientOrigin`. Si hay un futuro `DELETE` handler, debe ser soft delete con `status: false` y log. |
| `src/app/api/negocios/[id]/cancel/route.ts` | Review | Confirmar que `cancel` cambia `Business.status: String` a `CANCELADO` (semántica de negocio) y NO toca `Business.status: Boolean` (soft delete). Son campos distintos. |
| `src/features/auth/lib/audit-logger.ts` | Modify | Agregar 6 valores al enum `AuditAction`: `PRODUCT_CONFIGURATION_CREATED|UPDATED|DEACTIVATED`, `DISTRIBUTION_COMMISSION_CREATED|UPDATED|DEACTIVATED`. |
| `src/features/negocios/__tests__/fixtures/mock-prisma-business.ts` | Modify | Agregar `status: true` al fixture base de `Business` Prisma. |
| `src/features/negocios/__tests__/services/product-configuration.service.test.ts` | Modify | Quitar `idClientOrigin` de inputs de test, ajustar expects de `findUnique`. |
| `src/features/negocios/__tests__/actions/find-product-percentage-commission.test.ts` | Modify | Inputs sin `idClientOrigin`, mensajes de error nuevos. |
| `src/features/negocios/__tests__/actions/create-business.test.ts` | Modify | Mocks de `findProductPercentageCommission` con nueva firma. |
| `src/app/api/product-configurations/__tests__/route.test.ts` | Modify | Body sin `idClientOrigin`, mock de `buildProductConfigurationCode` con 3 args, expects de `logAuditEvent`. |
| `src/app/api/product-configurations/[id]/__tests__/*.test.ts` | Modify | Expects de `logAuditEvent` en PUT/PATCH. |
| `src/app/api/product-configurations/[id]/distribution-commission/__tests__/*.test.ts` | Modify | Expects de `logAuditEvent` en POST/PUT/PATCH. |
| `src/features/distribution-commission/__tests__/` | Modify | Fixtures de `ComissionDistribution` con `status: true`. |
| `src/app/api/product-configurations/[id]/distribution-commission/route.ts` (listado) | Modify | Si lista distribuciones, filtrar `status: true` por default (parametrizable con `?includeInactive=true` para admins). |

## Interfaces / Contracts

### `buildProductConfigurationCode` (cambia firma)

```typescript
// ANTES
export function buildProductConfigurationCode(
  companyName: string,
  productName: string,
  originName: string,
  categoryName: string
): string

// DESPUÉS
export function buildProductConfigurationCode(
  companyName: string,
  productName: string,
  categoryName: string
): string
// Formato: COMPANY-PRODUCT-CATEGORY (mayúsculas, espacios → '_')
// Ej: buildProductConfigurationCode('Skandia', 'CREA PATRIMONIO', 'Junior')
//   => 'SKANDIA-CREA_PATRIMONIO-JUNIOR'
```

### `GetPpcForNewBusinessesParams` y `FindProductPercentageCommissionInput`

```typescript
// ANTES
export interface GetPpcForNewBusinessesParams {
  idProduct: number
  idClientOrigin: number
  idCategory: number
}

// DESPUÉS
export interface GetPpcForNewBusinessesParams {
  idProduct: number
  idCategory: number
}

// Mismo cambio para FindProductPercentageCommissionInput
```

### `validateProductConfigurationExists` (cambia firma)

```typescript
// ANTES
export async function validateProductConfigurationExists(
  idCategory: number,
  idProduct: number,
  idClientOrigin: number
): Promise<OriginValidationResult>

// DESPUÉS
export async function validateProductConfigurationExists(
  idCategory: number,
  idProduct: number
): Promise<OriginValidationResult>
// Mensajes de error dejan de referirse a "origen"
```

### `createProductConfigurationSchema` (Zod)

```typescript
// ANTES
export const createProductConfigurationSchema = z.object({
  idCompany: z.number().int().positive(),
  idProduct: z.number().int().positive(),
  idClientOrigin: z.number().int().positive(),
  idCategory: z.number().int().positive(),
})

// DESPUÉS
export const createProductConfigurationSchema = z.object({
  idCompany: z.number().int().positive(),
  idProduct: z.number().int().positive(),
  idCategory: z.number().int().positive(),
})
```

### `AuditAction` (enum extendido)

```typescript
export enum AuditAction {
  // ... existentes
  PRODUCT_CONFIGURATION_CREATED = 'PRODUCT_CONFIGURATION_CREATED',
  PRODUCT_CONFIGURATION_UPDATED = 'PRODUCT_CONFIGURATION_UPDATED',
  PRODUCT_CONFIGURATION_DEACTIVATED = 'PRODUCT_CONFIGURATION_DEACTIVATED',
  DISTRIBUTION_COMMISSION_CREATED = 'DISTRIBUTION_COMMISSION_CREATED',
  DISTRIBUTION_COMMISSION_UPDATED = 'DISTRIBUTION_COMMISSION_UPDATED',
  DISTRIBUTION_COMMISSION_DEACTIVATED = 'DISTRIBUTION_COMMISSION_DEACTIVATED',
}
```

### Schema Prisma (deltas relevantes)

```prisma
model ProductConfiguration {
  // ... campos existentes incluyendo idClientOrigin (se conserva)
  @@unique([idProduct, idCategory])  // antes: [idProduct, idClientOrigin, idCategory]
  @@index([idProduct])
  @@index([idClientOrigin])  // se conserva el índice por consultas históricas
  @@index([idCategory])
  @@map("product_configuration")
}

model Business {
  // ... campos existentes
  status Boolean @default(true) @map("status_active")  // soft delete
  // OJO: el campo `status: String?` existente (semántica de negocio) se mantiene
  // intacto. Para evitar colisión de nombres en TS, mapear el nuevo a otro nombre
  // de columna o renombrar la propiedad TS a `isActive`.
  // ...
}

model ComissionDistribution {
  // ... campos existentes
  // OJO mismo: `status: String` ya existe; el nuevo bool va con otro nombre.
  isActive Boolean @default(true) @map("is_active")
  // ...
}
```

> **Nota crítica**: tanto `Business.status` como `ComissionDistribution.status` ya existen como `String` con semántica de negocio (`VENTA_EFECTUADA`, `EMITIDO`, etc. en Business; estados de distribución en `ComissionDistribution`). El campo nuevo de soft delete debe llamarse distinto en TS y en SQL para evitar colisión. Propuesta: TS → `isActive: boolean`, SQL → `is_active`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (lib) | `buildProductConfigurationCode` con 3 args | Vitest. Casos: normal, espacios múltiples, mayúsculas mixtas, caracteres especiales. |
| Unit (service) | `getPpcForNewBusinesses` con `(idProduct, idCategory)` | Vitest + mock de `prisma.productConfiguration.findUnique`. Casos: PPC asignado, fallback global, no existe. |
| Unit (service) | `validateProductConfigurationExists` sin origen | Vitest + mock. Casos: válido, sin config, sin PPC activo, sin categorías. |
| Unit (action) | `findProductPercentageCommission` | Vitest + mock de service. Verifica que NO se pase `idClientOrigin`. |
| Unit (action) | `create-business` | Mock de `findProductPercentageCommission` con nueva firma; verifica que `Business.idClientOrigin` se sigue persistiendo. |
| Integration (API) | `POST /api/product-configurations` | Body sin `idClientOrigin`; valida creación + `logAuditEvent` llamado con `PRODUCT_CONFIGURATION_CREATED`. |
| Integration (API) | `PUT /api/product-configurations/[id]` | Verifica `logAuditEvent(PRODUCT_CONFIGURATION_UPDATED)`. |
| Integration (API) | `PATCH /api/product-configurations/[id]` | Caso `active=false` → `DEACTIVATED`; caso `active=true` → `UPDATED`. |
| Integration (API) | `POST/PUT/PATCH /api/product-configurations/[id]/distribution-commission/...` | Verifica `logAuditEvent` con las nuevas acciones. |
| Migration (SQL) | Deduplicación + regeneración de `code` | Test manual en staging con `pg_dump` antes/después. Asserts: 0 colisiones de `code` activo, 0 violaciones de `(idProduct, idCategory)` activo, todas las filas con código en formato `^[A-Z0-9_]+-[A-Z0-9_]+-[A-Z0-9_]+$`. |
| Regression | `recalcularComisionesPorCambioOrigen` | Tests existentes deben seguir pasando: el origen sigue siendo dato del negocio aunque no condicione la PPC. |
| Regression | Mocks `mock-prisma-business.ts` | Compilar tests existentes con el nuevo campo `isActive`. |

## Migration / Rollout

### SQL de la migración (orden no negociable)

```sql
-- 1. Identificar duplicados y desactivar todos menos el ganador
WITH duplicates AS (
  SELECT
    id_product_configuration,
    id_product,
    id_category,
    active,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY id_product, id_category
      ORDER BY active DESC, updated_at DESC, id_product_configuration DESC
    ) AS rn
  FROM product_configuration
)
UPDATE product_configuration pc
SET active = false, updated_at = NOW()
FROM duplicates d
WHERE pc.id_product_configuration = d.id_product_configuration
  AND d.rn > 1
  AND pc.active = true;

-- 2. Regenerar código sin origen
UPDATE product_configuration pc
SET code = UPPER(
    REGEXP_REPLACE(c.name, '\s+', '_', 'g') || '-' ||
    REGEXP_REPLACE(p.name, '\s+', '_', 'g') || '-' ||
    REGEXP_REPLACE(cat.name, '\s+', '_', 'g')
  ),
  updated_at = NOW()
FROM product p, company c, category cat
WHERE pc.id_product = p.id_product
  AND p.id_company = c.id_company
  AND pc.id_category = cat.id_category;

-- 3. Validación: abortar si hay colisión de code en filas activas
DO $$
DECLARE
  collision_count INT;
BEGIN
  SELECT COUNT(*) INTO collision_count FROM (
    SELECT code FROM product_configuration WHERE active = true GROUP BY code HAVING COUNT(*) > 1
  ) AS collisions;
  IF collision_count > 0 THEN
    RAISE EXCEPTION 'Code collisions detected after regeneration: %', collision_count;
  END IF;
END $$;

-- 4. Cambiar la unicidad
DROP INDEX IF EXISTS "product_configuration_id_product_id_client_origin_id_categor_key";
CREATE UNIQUE INDEX "product_configuration_id_product_id_category_key"
  ON product_configuration (id_product, id_category)
  WHERE active = true;
-- NOTA: el WHERE active=true convierte la constraint en parcial,
-- así filas históricas inactivas con duplicados no rompen.

-- 5. Soft delete columns
ALTER TABLE business ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE comission_distribution ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
```

### Plan de despliegue

1. **Staging**: ejecutar migración con dataset productivo clonado. Reportar:
   - Cantidad de PPC desactivadas por deduplicación.
   - Cantidad de codes regenerados.
   - Tiempo total de migración.
2. **Validación con producto**: enviar reporte de duplicados a operaciones para confirmar que la política "más reciente activo gana" es la correcta antes de prod.
3. **Backup pre-deploy**: dump de `product_configuration`, `business`, `comission_distribution`.
4. **Deploy**: una sola release con la migración + cambios de código. No hacer feature flag: el código nuevo no es compatible con el schema viejo (firma de `findUnique` cambia).
5. **Post-deploy**:
   - Smoke test: crear una `ProductConfiguration` desde UI, verificar code nuevo y registro en `AuditLog`.
   - Verificar que `findProductPercentageCommission` resuelve PPC para negocios existentes.
   - Confirmar que el cambio de `Business.idClientOrigin` ya NO afecta la PPC asignada.

### Plan de rollback

Si la migración falla en step 3 (colisión de codes), abortar transaction. Estado de DB queda intacto porque los steps 4 y 5 no corrieron. Investigar duplicados manualmente, ajustar la política de "ganador" y reintentar.

Si el deploy de código falla post-migración, rollback de código a la versión anterior es seguro: el schema nuevo es retro-compatible para lectura (la query vieja con `idProduct_idClientOrigin_idCategory` ya no existe como índice único, pero `findFirst` sobre los tres campos sigue funcionando como query no-única). Sin embargo, los `code` ya están regenerados en formato nuevo, lo que rompe lookups por code legacy. Mitigación: la versión vieja no hace lookups por code excepto en `getProductConfigurationByCode`, que es de uso administrativo; el riesgo es aceptable.

## Open Questions

- [ ] **Política de "ganador" en deduplicación**: ¿"más reciente activo" es la correcta o producto prefiere "el que tenga más negocios asociados"? Confirmar con operaciones antes de correr en prod.
- [ ] **Filtrado por defecto de `isActive`**: ¿los listados administrativos de `Business` y `ComissionDistribution` deben filtrar `isActive: true` por default, o exponer toggle "incluir inactivos"? Asumimos default `isActive: true` con override por query param `?includeInactive=true`.
- [ ] **Nombre del campo soft delete**: usar `isActive` (TS) / `is_active` (SQL) para evitar colisión con `status: String` existente. Confirmar con el equipo si prefieren `active` (alineado con `ProductConfiguration.active`) o `isActive` (camelCase explícito).
- [ ] **Audit log retroactivo**: la propuesta declara que el audit log empieza desde el deploy. ¿Queda confirmado que NO se backfileará histórico de mutaciones previas?
- [ ] **`distribution-commission` listado**: el endpoint actual no expone DELETE; el soft delete de `ComissionDistribution` se ejercita desde `pre-liquidacion.service.ts` con `deleteMany`. ¿Se migra ese `deleteMany` a `updateMany({ data: { isActive: false } })` en este cambio o se difiere a una iteración separada?
