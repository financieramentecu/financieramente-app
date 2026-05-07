# Proposal: mejoras-categorias-jerarquia

## Intent

El modelo actual de categorías carece de tres capacidades críticas:
1. Una secuencia de jerarquía explícita entre categorías — hoy es implícita y depende del orden de creación.
2. Un color identificador por categoría, necesario para visualización en tablas, badges y reportes.
3. Los valores del enum `BeneficiaryMode` usan nombres técnicos (`UPLINE_CHAIN`, `FIXED_BENEFICIARY`) que no expresan el dominio de negocio.

Además, los códigos y nombres del seed reflejan una nomenclatura antigua que no coincide con el modelo comercial vigente.

Este cambio alinea el modelo de datos, el seed y la UI con la nomenclatura y estructura reales del negocio.

## Value Drivers

- **Jerarquía explícita y navegable**: `idNextCategory` permite recorrer la cadena sin depender del orden de inserción. Habilita features futuras como progresión automática de agentes.
- **Identidad visual de categoría**: `color` permite renderizar badges diferenciados en tablas, reportes y dashboards.
- **Enum legible para el dominio**: `OVERRIDE` y `BENEFICIARIO_GENERAL` eliminan confusión en código, migraciones y mensajes de UI.
- **Seed actualizado al negocio real**: los códigos actuales no corresponden al modelo comercial vigente con la nomenclatura MIA.

## Scope

### In Scope

- Renombrar valores del enum `BeneficiaryMode`: `UPLINE_CHAIN → OVERRIDE`, `FIXED_BENEFICIARY → BENEFICIARIO_GENERAL`
- Agregar campo `color` (`VarChar(7)`, hex, nullable) al modelo `Category`
- Agregar campo `idNextCategory` (FK self-referencial opcional → `Category`) al modelo `Category`
- Migración Prisma para los cambios de schema
- Actualizar seed `prisma/seeds/category.ts`: nuevos códigos/nombres, colores, jerarquía, modo correcto (3-pass)
- Actualizar tipos TypeScript, mappers, validaciones Zod y componentes en `src/features/categories/`
- Actualizar API routes `/api/categories` para aceptar/retornar `color`, `idNextCategory`, nuevos valores de enum
- Actualizar tests y mocks afectados

### Out of Scope

- Lógica de progresión automática de categoría para usuarios
- Cambio del modelo `CategoryType` (MMS, ALIADO, TRINITY se mantienen)
- Endpoints de árbol/grafo (`GET /api/categories/hierarchy`)
- UI de visualización de árbol de jerarquía
- Migración de datos en producción de categorías de usuarios existentes

## Schema Changes

### Category model — campos nuevos

| Field | Type | Notes |
|-------|------|-------|
| `color` | `String @db.VarChar(7)` | Hex color, ej. `#6366f1`. Requerido. |
| `idNextCategory` | `Int? @map("id_next_category")` | FK self-referencial → `Category.idCategory`. Nullable (la categoría más alta no tiene siguiente). |
| `nextCategory` | Relación `Category? @relation("CategorySequence", ...)` | Relación hacia la siguiente categoría. |
| `previousCategories` | Relación inversa `Category[] @relation("CategorySequence")` | Requerida por Prisma para la relación self-referencial. |

### Enum rename

| Old value | New value | Comportamiento |
|-----------|-----------|----------------|
| `UPLINE_CHAIN` | `OVERRIDE` | Sin usuario requerido. |
| `FIXED_BENEFICIARY` | `BENEFICIARIO_GENERAL` | Requiere `idFixedBeneficiaryUser`. |

> `idFixedBeneficiaryUser` es REQUERIDO cuando `beneficiaryMode = BENEFICIARIO_GENERAL`. Validación en Zod y en service.

## Seed Renames (7 categorías — renombrado in-place)

| Old code | New code | New name | beneficiaryMode | color | nextCategory |
|----------|----------|----------|-----------------|-------|--------------|
| JUNIOR | MS_JUNIOR | MS Junior | OVERRIDE | #10b981 | — (base) |
| SENIOR | MS_SENIOR | MS Senior | OVERRIDE | #3b82f6 | MS_JUNIOR |
| LIDER | TEAM_LEADER | Team Leader | OVERRIDE | #8b5cf6 | MS_SENIOR |
| COACH | PERFORMANCE_LEADER | Performance Leader | OVERRIDE | #f59e0b | TEAM_LEADER |
| GENERAL | BUSINESS_LEADER | Business Leader | OVERRIDE | #ef4444 | PERFORMANCE_LEADER |
| PRESIDENTE | PARTNER | Partner | OVERRIDE | #ec4899 | BUSINESS_LEADER |
| AGENCIA | MIA | MIA | BENEFICIARIO_GENERAL | #6366f1 | PARTNER |

> Solo estas 7 categorías existen. No se agregan nuevas. El rename es in-place (update por código antiguo → código nuevo).

## Hierarchy Sequence

```
MS_JUNIOR → MS_SENIOR → TEAM_LEADER → PERFORMANCE_LEADER → BUSINESS_LEADER → PARTNER → MIA
```

MIA es el tope de la jerarquía (`nextCategory = null`).

## Seed Strategy (3-Pass)

**Pass 1**: Crear/actualizar todas las categorías con nombre, código, color y modo. Sin `idNextCategory`.

**Pass 2**: Resolver `idNextCategory` por código y hacer `update` con vínculos de jerarquía.

**Pass 3**: Resolver usuario beneficiario (`agencia@financieramentecu.com`) y asignar `idFixedBeneficiaryUser` a MIA (`BENEFICIARIO_GENERAL`).

> El rename de código (ej. JUNIOR → MS_JUNIOR) se implementa como: buscar por código antiguo → actualizar código, nombre, color y modo. Si no existe el antiguo, crear con código nuevo.

## UI Changes

### Formulario (Create/Edit)

1. **`beneficiaryMode`**: label "Modo Beneficiario". Opciones: `Override` / `Beneficiario General`. Al seleccionar `Beneficiario General`, mostrar selector de usuario (`idFixedBeneficiaryUser`) — campo requerido.
2. **`color`**: input type `color` con preview del hex seleccionado. Label: "Color de categoría".
3. **`idNextCategory`**: Select con categorías disponibles (excluye la propia). Label: "Siguiente en jerarquía". Opcional.

### Tabla de Categorías

- Columna **Color**: chip/badge circular con el color de la categoría.
- Columna **Modo**: texto legible ("Override" / "Beneficiario General").
- Columna **Siguiente**: nombre de la siguiente categoría (si existe).

## API Changes

**GET /api/categories** — response incluye `color`, `idNextCategory`, `nextCategory { name }`, nuevos valores de enum.

**POST /api/categories** — body acepta `color` (opcional, hex 7 chars), `idNextCategory` (opcional, Int), `beneficiaryMode` (OVERRIDE | BENEFICIARIO_GENERAL) con refinement para `idFixedBeneficiaryUser`.

**PUT /api/categories/[id]** — mismos campos.

**Zod refinement**:
```ts
color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable()
idNextCategory: z.number().int().positive().optional().nullable()
beneficiaryMode: z.enum(['OVERRIDE', 'BENEFICIARIO_GENERAL'])
// Refinement cross-field:
data => data.beneficiaryMode !== 'BENEFICIARIO_GENERAL' || !!data.idFixedBeneficiaryUser
```

## Constraints

- La migración de enum en PostgreSQL usa `ALTER TYPE ... RENAME VALUE` — no drop/recreate. Verificar que Prisma lo genere correctamente o ajustar la migración SQL manualmente.
- El seed NO borra categorías con FK activas. Solo renombra in-place.
- La relación self-referencial requiere que ambas categorías existan antes del link (por eso el 3-pass).

## Risks

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Rename de enum rompe datos existentes si la migración SQL no es correcta | Alta | Usar `ALTER TYPE ... RENAME VALUE`. Revisar SQL generado manualmente. |
| Renombrar códigos en seed deja registros huérfanos | Media | Seed busca por código antiguo y actualiza in-place. Si tiene FK activas, no borra. |
| Categorías con FK en `ProductConfiguration`, `User`, etc. no se pueden borrar | Alta | Seed NUNCA borra. Solo crea o actualiza. |
| Color picker puede entregar valores con alpha | Baja | Validación Zod con regex `/^#[0-9a-fA-F]{6}$/`. |
