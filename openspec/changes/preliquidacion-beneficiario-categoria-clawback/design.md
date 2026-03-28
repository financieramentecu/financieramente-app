# Design: Pre-liquidation beneficiary per category and clawback alignment

## Technical Approach

Two complementary layers: (1) **catalog-driven resolver** in `src/features/pre-liquidacion/lib/` used by `procesarPreLiquidacion`, `recalcularComisionesPorCambioOrigen`, and `obtenerDistribucionComision`; (2) **admin category forms** that expose `beneficiaryMode` + optional `idFixedBeneficiaryUser` so operators can configure each category. Persist `ComissionDistribution.idBeneficiaryUser` on every create; set `Clawback.idUser` to the same id. If resolution fails for any PPC row, skip that `SettlementCommission` (stay `SYNCHRONIZED`), log structured reason — no partial distributions.

Maps proposal: `FIXED_BENEFICIARY` + FK; `UPLINE_CHAIN` + chain walk; block record on failure.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Match order (upline) | First user in `[agent, leader, …]` with `idCategoria === category.idCategory` | Last in chain; fail on duplicates | Closest-to-business wins; spec can tighten to "fail if 2+" later |
| Chain load | Iterative `user.findUnique` with `leader` select until null | Single raw recursive SQL | Matches existing Prisma patterns; cap depth + cycle Set |
| Blocked row UX | `console.warn` + optional `registrosOmitidos` in return | `SettlementCommission` new status | Avoids new status enum until product asks |
| Prisma FK nullability | `idFixedBeneficiaryUser` optional on `Category` | Required column | `UPLINE_CHAIN` rows leave null; rule enforced in code |
| Resolver location | `pre-liquidacion/lib/resolve-beneficiary.ts` | `shared` | Only pre-liquidación + recalc use it today |
| System CategoryType detection | Convention `CategoryType.name === 'SISTEMA'`; constant `SYSTEM_CATEGORY_TYPE_NAME` in code | Add `isSystem` DB flag | No schema migration needed; product name is stable; flag can be added later |
| Fixed user picker in form | Select from `/api/admin/users` (all active users) | Free text input | Ensures FK always points to a valid User; consistent with other FK pickers |
| Origin change PPC validation | Early guard in route handler, before `recalcularComisionesPorCambioOrigen` | Validate inside `$transaction` (current behavior) | Fail fast before opening a transaction; clearer error semantics; no rollback needed |
| PPC-exists check location | `src/features/negocios/services/product-configuration.service.ts` (new fn) | Inline in route handler | Keeps Prisma queries in services per project convention; reusable from server actions |

## Data Flow

```
procesarPreLiquidacion
  → load registro + business.user
  → load PPC categories: include { category: { include: { fixedBeneficiaryUser: true } } }
  → buildUplineChain(agentUserId) → UserLink[]
  → for each config: resolveBeneficiaryUserId(category, chain) → ok | err
  → if any err: continue (skip registro)
  → else $transaction: create ComissionDistribution (+ idBeneficiaryUser); Clawback.idUser = same; SETTLE PRE-SETTLED

Category admin (create / edit)
  → form shows beneficiaryMode selector (always)
  → if FIXED_BENEFICIARY: show user picker → idFixedBeneficiaryUser
  → if categoryType === SISTEMA: show read-only linked user display (name + email)
  → PUT /api/categories/[id] → route validates FIXED_BENEFICIARY ⇒ non-null user before upsert

Origin change (PUT /api/negocios/[id] with idClientOrigin)
  → Zod validates body (updateBusinessSchema)
  → Route loads existingBusiness (includes PPC → ProductConfiguration for idProduct + idCategory)
  → EARLY GUARD: call validateProductConfigurationExists(idProduct, idCategory, newIdClientOrigin)
      → prisma.productConfiguration.findUnique({ where: { idProduct_idClientOrigin_idCategory } })
      → if null → return 400 ApiErrorResponse immediately, NO transaction opened
  → Only if guard passes → recalcularComisionesPorCambioOrigen(businessId, idClientOrigin, user)
  → BusinessViewModal shows toast.error with the rejection message
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Done | `BeneficiaryMode` enum + `Category` fields + `ComissionDistribution.idBeneficiaryUser` already merged |
| `prisma/migrations/*` | Create | Backfill `id_beneficiary_user` from settlement chain; NOT NULL constraint |
| `src/features/pre-liquidacion/lib/resolve-beneficiary.ts` | Create | `buildUplineChain`, `resolveBeneficiaryUserId` |
| `src/features/pre-liquidacion/lib/__tests__/resolve-beneficiary.test.ts` | Create | Unit tests per proposal success criteria |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | Wire resolver; `idBeneficiaryUser` on create; skip on failure; include fixedBeneficiaryUser in PPC query |
| `src/features/pre-liquidacion/types/types.ts` | Modify | `ItemDistribucionComision` beneficiary display fields |
| `src/features/pre-liquidacion/components/ModalDetalleDistribucion.tsx` | Modify | Beneficiary column |
| `src/features/categories/types/category.types.ts` | Modify | Add `beneficiaryMode`, `idFixedBeneficiaryUser`, optional `fixedBeneficiaryUser` to `Category` domain type |
| `src/features/categories/lib/category-schemas.ts` | Modify | Add `beneficiaryMode` + `idFixedBeneficiaryUser` to create/update schemas with cross-field validation |
| `src/features/categories/mappers/category.mapper.ts` | Modify | Map `beneficiaryMode`, `idFixedBeneficiaryUser`, `fixedBeneficiaryUser` from Prisma |
| `src/features/categories/components/category-form.tsx` | Modify | Add beneficiary mode selector; conditional user picker when `FIXED_BENEFICIARY`; read-only user display when `CategoryType === SISTEMA` |
| `src/app/api/categories/[id]/route.ts` | Modify | GET: include `fixedBeneficiaryUser`; PUT: accept + validate beneficiary fields (FIXED_BENEFICIARY ⇒ non-null user) |
| `src/app/api/categories/route.ts` | Modify | POST: accept `beneficiaryMode` + `idFixedBeneficiaryUser` |
| `prisma/seeds/category.ts` | Modify | Set `beneficiaryMode`, `AGENCIA` FK after user seed |
| `prisma/seeds/user.ts` | Modify | Agencia system user if missing |
| `.env.example` | Modify | `AGENCIA_USER_PASSWORD` optional |
| `src/features/negocios/services/product-configuration.service.ts` | Modify | Add `validateProductConfigurationExists` function |
| `src/app/api/negocios/[id]/route.ts` | Modify | Add early PPC-exists guard before `recalcularComisionesPorCambioOrigen` call |
| `src/app/api/negocios/[id]/__tests__/route.test.ts` | Modify | Add tests for PPC validation rejection |

## Interfaces / Contracts

```typescript
// resolve-beneficiary.ts
export type ResolveBeneficiaryResult =
  | { ok: true; idUser: number }
  | { ok: false; code: 'FIXED_MISSING_USER' | 'UPLINE_NO_MATCH' | 'FIXED_USER_INACTIVE'; categoryCode: string }

export function resolveBeneficiaryUserId(
  category: Pick<Category, 'idCategory' | 'code' | 'beneficiaryMode' | 'idFixedBeneficiaryUser'> & {
    fixedBeneficiaryUser?: Pick<User, 'idUser' | 'active'> | null
  },
  chain: ReadonlyArray<{ idUser: number; idCategoria: number | null }>
): ResolveBeneficiaryResult

// category.types.ts additions
export const SYSTEM_CATEGORY_TYPE_NAME = 'SISTEMA' as const

export interface Category extends Record<string, unknown> {
  // ... existing fields ...
  beneficiaryMode: 'UPLINE_CHAIN' | 'FIXED_BENEFICIARY'
  idFixedBeneficiaryUser: number | null
  fixedBeneficiaryUser?: { idUser: number; name: string; email: string } | null
}
```

`procesarPreLiquidacion` return: extend with optional `registrosOmitidos?: number` (non-breaking).

```typescript
// product-configuration.service.ts — new export
export interface ValidateProductConfigParams {
  idProduct: number
  idClientOrigin: number
  idCategory: number
}

/**
 * Returns true if a ProductConfiguration row exists for the combination.
 * Pure lookup — no side effects.
 */
export async function validateProductConfigurationExists(
  params: ValidateProductConfigParams
): Promise<boolean>
```

Route handler error shape (follows existing `ApiResponse` pattern):
```typescript
// PUT /api/negocios/[id] — 400 when PPC missing
{
  data: null,
  error: "No existe una configuración de distribución para la combinación de categoría, producto y el nuevo origen seleccionado. Debe crear la configuración antes de cambiar el origen."
}
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Resolver: FIXED null, UPLINE miss, UPLINE hit, cycle, max depth | Vitest colocated `__tests__` |
| Unit | `procesarPreLiquidacion`: blocked row → no `create`, no PRE-SETTLED | Extend `pre-liquidacion.service.test.ts` |
| Unit | Category schema: FIXED_BENEFICIARY without user fails validation | Extend `category-schemas.test.ts` |
| Unit | Origin PPC guard: missing config → 400; existing config → pass-through to recalc | Extend `route.test.ts` for `PUT /api/negocios/[id]` |
| Integration | Optional | DB seed minimal chain + one SYNCHRONIZED row |

## Migration / Rollout

1. Schema already merged (`BeneficiaryMode`, `Category` fields).
2. Add `comission_distribution.id_beneficiary_user` nullable → backfill via `settlement_commission."idSettlementCommission"` (post-refactor PK) → NOT NULL + FK.
3. Deploy app; old rows already backfilled.
4. Optional: `CHECK (beneficiary_mode != 'FIXED_BENEFICIARY') OR (id_fixed_beneficiary_user IS NOT NULL)`.

## Open Questions

- [ ] Should VOLUNTARIA rows (zero clawback) still require full PPC category config + beneficiary?
- [ ] Product copy for omitted rows: logs only vs UI surfacing in pre-liquidación response?
- [ ] Admin user picker for `idFixedBeneficiaryUser`: filter active users only, or all users?

---

**Envelope**: `status` ok · `executive_summary` updated design covering resolver + admin category UI + origin-change PPC validation guard · `artifacts` `openspec/changes/preliquidacion-beneficiario-categoria-clawback/design.md` · `next_recommended` sdd-tasks · `risks` category form cross-field validation UX, missing seed for AGENCIA user, error message i18n
