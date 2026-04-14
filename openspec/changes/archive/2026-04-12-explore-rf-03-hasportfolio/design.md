# Design: PPC `hasPortfolio` and portfolio percentages (RF-03 / RF-04)

## Technical Approach

Add `hasPortfolio` on **ProductPercentageCommission**, expose it on **GET/POST/PUT** commission-rule APIs, and extend **Zod + React Hook Form** so category lines optionally carry **portfolio %** (0–100 UI → fraction in DB, same as distribution). **RF-04:** when `hasPortfolio` is false, **hide** portfolio inputs but **persist** existing `porcentaje_portfolio` on category replace. Implement that in the **PUT transaction** by snapshotting previous rows **before** `deleteMany`, then reusing stored portfolio values per `idCategory` when the flag is off. When the flag is on, take portfolio from the validated body. **Pre-liquidación** stays on `originCommission === 'CARTERA'` (out of scope).

## Architecture Decisions

| Decision | Options | Choice |
|----------|---------|--------|
| Preserve portfolio when flag off | Trust client to send hidden fields; server merge from DB | **Server merge** — avoids stripped payloads and matches RF-04 |
| Portfolio optional in Zod | Always optional vs conditional | **Conditional**: when `hasPortfolio`, portfolio required per line (same rules as distribution: 1–100, sum ≤ 100); when false, omit validation |
| Checkbox scope | Global config vs per rule | **Per PPC** (per rule), PRD-aligned |
| API field names | `hasPortfolio` + `portfolioPercentage` vs snake_case in JSON | **`hasPortfolio` + `portfolioPercentage`** on wire (camelCase like today); map to Prisma in route handlers |
| List/table view | Show portfolio column always | **Only when any rule in list has `hasPortfolio`** or hide column entirely on list — prefer **hide unless row has flag** to avoid empty columns |
| List search UX | Dos campos de búsqueda (página + DataTable) | **Un solo buscador** en toolbar del `DataTable`, cableado a `useCommissionRules` con `onGlobalSearch` / `setSearch` |
| Read-only % en tabla | Mismo formato que RF-01 | **`formatPercentDisplay`** sin ceros finales; badges distribución + cartera con estilo unificado (verde oscuro / blanco) y contenedor flex con wrap |

## Data Flow

```
CommissionRuleForm
  → commissionRuleApi (POST/PUT JSON)
    → Route handlers validate (Zod api schemas)
      → prisma.$transaction
        → [PUT+categories] load previous categories (portfolio map)
        → update PPC (description, active, hasPortfolio)
        → deleteMany categories
        → createMany: porcentajeDistribucion + porcentajePortfolio
             (portfolio from body if hasPortfolio else from map)
      → prismaCommissionRuleToDomain
  ← CommissionRule + categories (both percents 0–100 in domain)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | `hasPortfolio Boolean @default(false)` on `ProductPercentageCommission` |
| `prisma/migrations/...` | Create | Add column + default |
| `commission-rule.types.ts` | Modify | `hasPortfolio` on `CommissionRule`; `porcentajePortfolio?` on category; inputs |
| `commission-rule.mapper.ts` | Modify | Map flag; map `porcentajePortfolio` with same ×100 as distribution |
| `commission-rule-schemas.ts` | Modify | Root + line fields; `superRefine` for portfolio sum when flag on |
| `commission-rule-form.tsx` | Modify | Checkbox; pass `hasPortfolio` to rows; totals for both sums |
| `category-percentage-row.tsx` | Modify | Second `PercentageField` when `hasPortfolio` |
| `distribution-commission/route.ts` (POST) | Modify | Persist flag + `porcentajePortfolio` on createMany |
| `distribution-commission/[ruleId]/route.ts` (PUT) | Modify | Update flag; merge portfolio on recreate |
| `commission-rules-table.tsx` | Modify | Portfolio cuando `rule.hasPortfolio`; props opcionales `onSearchChange` / `searchPlaceholder` para búsqueda servidor; estilos chips |
| `reglas/page.tsx` (listado) | Modify | Sin input duplicado; pasa búsqueda al `CommissionRulesTable` |
| `format-percent.ts` | Modify | `formatPercentDisplay` sin relleno de ceros finales (coherencia RF-01 en solo lectura) |
| `prisma/seeds/product-percentage.ts` | Modify | Suma de fracciones = 1 por PPC (datos semilla válidos) |
| `commission-rule-api.ts` / mutations hook | Modify | Types only if inputs change |
| Route tests under `distribution-commission` | Modify | Payloads + assertions |

## Interfaces / Contracts

**Request/response (commission rule):**

- `hasPortfolio: boolean` on rule object (GET/POST/PUT body where applicable).
- Category line: `percentage` (distribution, 0–100 UI, stored fraction), `portfolioPercentage` optional when `hasPortfolio` false; required when true (same numeric rules as `percentage`).

**DB:** `porcentaje_portfolio` nullable `Decimal(8,6)`; unchanged precision.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Zod: portfolio sum/range; flag off ignores portfolio | Extend `commission-rule-schemas.test.ts` |
| Unit | Mapper: portfolio 0–100 round-trip | `commission-rule.mapper.test.ts` |
| Integration | PUT clears categories but keeps portfolio when flag off | Route test with Prisma mock or DB |
| Component | Row shows/hides second field; blur validation | RTL on form/row |

## Migration / Rollout

Single migration: `hasPortfolio` default `false`. No feature flag. Rollback: drop column + redeploy prior API (clients must tolerate unknown fields until aligned).

## Open Questions

- [x] Etiqueta del switch: **«Porcentajes de cartera»**; sin párrafo auxiliar (decisión UX posterior al apply).
- [x] List view: columna Cartera solo si alguna regla tiene `hasPortfolio` (implementado).
