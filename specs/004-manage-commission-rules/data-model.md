# Data Model: Gestión de Reglas de Comisión

**Branch**: `004-manage-commission-rules` | **Date**: 2026-02-12

## Entity Relationship Diagram

```
ProductConfiguration (1) ──── (*) ProductPercentageCommission (1) ──── (*) ProductPercentageCommissionCategory
       │                                    │                                          │
       │ idProductPercentageCommission-      │ businesses (FK)                          │ category (FK)
       │ NewBusinesses (0..1)                │                                          │
       └────────────────────────────────►    ▼                                          ▼
                                         Business (*)                              Category (1)
```

## Entities

### ProductPercentageCommission (modified — formerly `ProductPercentajeCommision`)

> Prisma model rename only. Table stays as `product_percentaje_commision` via `@@map`.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `idProductPercentageCommission` | `Int` | PK, autoincrement | `@map("id_product_percentaje_commision")` |
| `idProductConfiguration` | `Int` | FK → ProductConfiguration.id, NOT NULL | |
| `description` | `String?` | max 255 chars, optional | **NEW FIELD** — user label for UI identification |
| `active` | `Boolean` | default: `true` | Toggle via PATCH. Deactivation blocked if businesses exist. |
| `createdAt` | `DateTime` | auto | |
| `updatedAt` | `DateTime` | auto | |

**Relations**:
- `productConfiguration` → `ProductConfiguration` (many-to-one)
- `productConfigurationAsNewBusinesses` → `ProductConfiguration?` (one-to-one, inverse of `idProductPercentageCommissionNewBusinesses`)
- `productPercentageCommissionCategories` → `ProductPercentageCommissionCategory[]` (one-to-many)
- `businesses` → `Business[]` (one-to-many)

**Indexes**: `[idProductConfiguration]`

---

### ProductPercentageCommissionCategory (modified — formerly `ProductPercentajeCommisionCategory`)

> Prisma model rename only. Table stays as `product_percentaje_commision_category` via `@@map`.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `idCategory` | `Int` | FK → Category.idCategory, NOT NULL | |
| `idProductPercentageCommission` | `Int` | FK → ProductPercentageCommission, NOT NULL | `@map("id_product_percentaje_commision")` |
| `porcentajeDistribucion` | `Decimal(5,4)` | NOT NULL | Stored as fraction (0.15 = 15%). UI converts on input/output. |
| `active` | `Boolean` | default: `true` | |
| `createdAt` | `DateTime` | auto | |
| `updatedAt` | `DateTime` | auto | |

**Relations**:
- `category` → `Category` (many-to-one)
- `productPercentageCommission` → `ProductPercentageCommission` (many-to-one)
- `comissionDistributions` → `ComissionDistribution[]` (one-to-many)

**Indexes**: `[idCategory]`, `[idProductPercentageCommission]`

---

### ProductConfiguration (existing — field reference update)

> No schema changes needed. Only Prisma field name references update after model rename.

| Field (affected) | Change |
|-------------------|--------|
| `idProductPercentajeCommisionNewBusinesses` | Rename to `idProductPercentageCommissionNewBusinesses` (`@map` preserves column) |
| `productPercentajeCommisionNewBusinesses` | Rename relation to `productPercentageCommissionNewBusinesses` |
| `productPercentajeCommisions` | Rename relation to `productPercentageCommissions` |

---

### Category (existing — no changes)

Referenced by `ProductPercentageCommissionCategory.idCategory`. Only active categories (`status = true`) are selectable in the UI.

---

### Business (existing — field reference update)

| Field (affected) | Change |
|-------------------|--------|
| `idProductPercentajeCommision` | Rename to `idProductPercentageCommission` (`@map` preserves column) |
| `productPercentajeCommision` | Rename relation to `productPercentageCommission` |

---

## Validation Rules

### Create Commission Rule

| Field | Rule | Error Message |
|-------|------|---------------|
| `description` | Optional, max 255 chars | "La descripción no puede exceder 255 caracteres" |
| `categories` | Array, min 0 items (can be empty per EC-004) | — |
| `categories[].idCategory` | Required, positive integer, must exist and be active | "Categoría inválida" |
| `categories[].percentage` | Required, decimal, `0.01 <= value <= 999.99` | "El porcentaje debe estar entre 0.01 y 999.99" |
| Duplicate check | No two items with same `idCategory` in array | "Categoría duplicada en la regla" |

### Update Commission Rule

Same as create, plus:

| Field | Rule | Error Message |
|-------|------|---------------|
| `description` | Optional, max 255 chars | "La descripción no puede exceder 255 caracteres" |
| Impact warning | Frontend must show confirmation dialog before submit | (UI-only, not a Zod rule) |

### Toggle Active

| Condition | Rule | Error Message |
|-----------|------|---------------|
| Deactivate | Rule must have 0 associated businesses | "No se puede desactivar: existen negocios asociados a esta regla" |
| Deactivate default rule | Must warn user (EC-003) | "Esta regla está asignada como predeterminada para Nuevos Negocios. Debe asignar otra regla antes de desactivarla." |
| Reactivate | No restrictions | — |

### Assign as Default for New Businesses

| Condition | Rule | Error Message |
|-----------|------|---------------|
| Rule must be active | `active === true` | "Solo se puede asignar una regla activa como predeterminada" |
| Rule must belong to config | `rule.idProductConfiguration === configId` | "La regla no pertenece a esta configuración" |

---

## State Transitions

```
                    ┌──────────────┐
       create ────► │    Active    │ ◄──── reactivate
                    │              │
                    └──────┬───────┘
                           │
                    deactivate (only if 0 businesses)
                           │
                    ┌──────▼───────┐
                    │   Inactive   │
                    │              │
                    └──────────────┘
```

**Note**: No "Deleted" state. Rules are never physically removed.

---

## Domain Types (TypeScript)

```typescript
interface CommissionRule {
  readonly id: number
  readonly idProductConfiguration: number
  description: string
  active: boolean
  readonly createdAt: string
  readonly updatedAt: string
  categories: CommissionRuleCategory[]
  businessCount: number  // For deactivation guard in UI
  isDefaultForNewBusinesses: boolean  // Computed: config.idProductPercentageCommissionNewBusinesses === this.id
}

interface CommissionRuleCategory {
  readonly id: number
  readonly idCategory: number
  categoryName: string
  categoryCode: string
  percentage: number  // Displayed as whole number (15 = 15%), stored as 0.15
  active: boolean
}

interface CommissionRuleListItem {
  readonly id: number
  description: string
  active: boolean
  categoryCount: number
  businessCount: number
  isDefaultForNewBusinesses: boolean
  readonly createdAt: string
}

interface CreateCommissionRuleInput {
  description?: string
  categories: {
    idCategory: number
    percentage: number  // Whole number input (15 = 15%)
  }[]
}

interface UpdateCommissionRuleInput {
  description?: string
  categories: {
    idCategory: number
    percentage: number
  }[]
}
```
