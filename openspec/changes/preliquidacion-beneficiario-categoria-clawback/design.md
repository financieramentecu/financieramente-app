# Design: Pre-liquidation beneficiary per category and clawback alignment

## Technical Approach

Add **catalog-driven** beneficiary resolution in `src/features/pre-liquidacion/lib/`: pure functions used by `procesarPreLiquidacion`, `recalcularComisionesPorCambioOrigen`, and `obtenerDistribucionComision` (read path joins stored `idBeneficiaryUser`). Persist **`ComissionDistribution.idBeneficiaryUser`** on every create; set **`Clawback.idUser`** to the **same** id when a clawback row is created (existing flow flags in `deriveFlow` / `pre-liquidacion-flow.ts` unchanged). If resolution fails for any PPC row, **skip** that `SettlementCommission` (stay `SYNCHRONIZED`), log structured reason—no partial distributions.

Maps proposal: `FIXED_BENEFICIARY` + FK; `UPLINE_CHAIN` + chain walk; block record on failure.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Match order (upline) | First user in `[agent, leader, …]` with `idCategoria === distribution category.idCategory` | Last in chain; fail on duplicates | Closest-to-business wins; simple; spec can tighten to “fail if 2+” later |
| Chain load | Iterative `user.findUnique` with `leader` select until null | Single raw recursive SQL | Matches existing Prisma patterns; cap depth + cycle Set |
| Blocked row UX | `console.warn` + optional extend API `registrosOmitidos` / message suffix | `SettlementCommission` new status | Avoids new status enum until product asks; same as other skips today |
| Prisma FK nullability | `idFixedBeneficiaryUser` optional on `Category` | Required column | `UPLINE_CHAIN` rows leave null; rule enforced in code (+ optional CHECK) |
| Resolver location | `pre-liquidacion/lib/resolve-beneficiary.ts` | `shared` | Only pre-liquidación + recalc use it today; move to shared if reused |

## Data Flow

```
procesarPreLiquidacion
  → load registro + business.user
  → load PPC categories with include: { category: true }
  → buildUplineChain(agentUserId) → UserLink[]
  → for each config: resolveBeneficiaryUserId(category, chain) → ok | err
  → if any err: continue (skip registro)
  → else $transaction: create ComissionDistribution (+ idBeneficiaryUser); Clawback.idUser = same when applicable; SETTLE registro PRE-SETTLED
obtenerDistribucionComision
  → findMany distributions include beneficiaryUser select name, lastName
  → map to API item + display name
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | `enum BeneficiaryMode`; `Category.beneficiaryMode`, `idFixedBeneficiaryUser`; `ComissionDistribution.idBeneficiaryUser` + `User` relation; `User.comissionDistributionsAsBeneficiary` |
| `prisma/migrations/*` | Create | Enum + columns; backfill `id_beneficiary_user` from `settlement → business → user`; default `beneficiary_mode`; NOT NULL beneficiary on distribution |
| `src/features/pre-liquidacion/lib/resolve-beneficiary.ts` | Create | `buildUplineChain`, `resolveBeneficiaryUserId` |
| `src/features/pre-liquidacion/lib/__tests__/resolve-beneficiary.test.ts` | Create | Unit tests per proposal |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | Wire resolver; `idBeneficiaryUser` on create; clawback `idUser`; skip on failure; include category in PPC query |
| `src/features/pre-liquidacion/types/types.ts` | Modify | `ItemDistribucionComision` beneficiary fields |
| `src/features/pre-liquidacion/components/ModalDetalleDistribucion.tsx` | Modify | Beneficiary column |
| `src/app/api/pre-liquidacion/distribucion/*` | Modify | If Zod/schema for response |
| `prisma/seeds/category.ts` | Modify | `beneficiaryMode`, `AGENCIA`, fixed FK after user seed |
| `prisma/seeds/user.ts` | Modify | Agencia system user if missing |
| `.env.example` | Modify | `AGENCIA_USER_PASSWORD` optional |

## Interfaces / Contracts

```typescript
// resolve-beneficiary.ts (illustrative)
export type ResolveBeneficiaryResult =
  | { ok: true; idUser: number }
  | { ok: false; code: 'FIXED_MISSING_USER' | 'UPLINE_NO_MATCH' | 'FIXED_USER_INACTIVE'; categoryCode: string }

export function resolveBeneficiaryUserId(
  category: Pick<Category, 'idCategory' | 'code' | 'beneficiaryMode' | 'idFixedBeneficiaryUser'> & {
    fixedBeneficiaryUser?: Pick<User, 'idUser' | 'active'> | null
  },
  chain: ReadonlyArray<{ idUser: number; idCategoria: number | null }>
): ResolveBeneficiaryResult
```

`procesarPreLiquidacion` return type: extend with optional `registrosOmitidos?: number` and append omit summary to `mensaje` when > 0 (non-breaking for callers if optional).

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Resolver: FIXED null, UPLINE miss, UPLINE hit, cycle, max depth | Vitest colocated `__tests__` |
| Unit | `procesarPreLiquidacion` mocks | Extend `pre-liquidacion.service.test.ts`: blocked row → no `comissionDistribution.create`, no `update` PRE-SETTLED |
| Integration | Optional | DB seed minimal chain + one SYNCHRONIZED row |

## Migration / Rollout

1. Add enum + `Category` columns (default `UPLINE_CHAIN`).
2. Add `comission_distribution.id_beneficiary_user` nullable → backfill join `settlement_commission` + `business` → `id_user` → NOT NULL + FK. **Raw SQL must use** `settlement_commission."idSettlementCommission"` **as PK** (post-refactor name); `id_settlement_commission` no longer exists.
3. Deploy app that writes new column; old rows already backfilled.
4. Optional: PostgreSQL `CHECK` for `FIXED_BENEFICIARY` ⇒ non-null fixed user id.

## Open Questions

- [ ] Should **VOLUNTARIA** rows with zero clawback still require full category config + beneficiary (yes per NOT NULL distribution—confirm all PPC rows exist)?
- [ ] Product copy for **omitted** rows: only logs vs UI surfacing in pre-liquidación response?

---

**Envelope**: `status` ok · `executive_summary` design file for beneficiary resolver, schema, service wiring, block-on-fail · `artifacts` `openspec/.../design.md` · `next_recommended` sdd-tasks · `risks` incomplete seeds, migration on large `comission_distribution` tables
