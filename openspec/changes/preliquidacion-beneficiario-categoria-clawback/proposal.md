# Proposal: Pre-liquidation beneficiary per category and clawback alignment

## Intent

Policy pre-liquidation today assigns every `Clawback.idUser` to the business owner and the distribution modal shows category names only. Product rules require mapping each `ProductPercentageCommissionCategory` row to a beneficiary: either a user matched on the upline chain, or a **fixed user** configured on the category (pool / company / any system user). **Every** distribution row must persist a concrete `User` (never null).

## Category beneficiary mode (generic fixed user)

**Decision**: Use a **small enum** plus an **optional FK** on `Category` so we are not tied to a single “Agencia” user in the type system.

| `beneficiaryMode` | Meaning | Resolver behavior |
|-------------------|---------|-------------------|
| `UPLINE_CHAIN` | Person in the sales hierarchy | Exactly one user in `[business.user, leader, …]` with `User.idCategoria === Category.idCategory` (match order in design/spec). If none → **block that settlement row** (no PRE-SETTLED). |
| `FIXED_BENEFICIARY` | Not resolved by chain | Beneficiary is **always** `Category.idFixedBeneficiaryUser` (required when this mode is set; validated in app/DB). |

**If another system user is added** (e.g. second pool, treasury bot user): create the `User`, set the relevant `Category` rows to `FIXED_BENEFICIARY` and `idFixedBeneficiaryUser = <that user>`. No new enum variant and no new code path per user—only data.

**Agencia today**: category `AGENCIA` (and any similar) uses `FIXED_BENEFICIARY` + `idFixedBeneficiaryUser` pointing at the seeded `agencia@financieramentecu.com` user.

**Implementation**: `Category.beneficiaryMode` NOT NULL (default `UPLINE_CHAIN`). `Category.idFixedBeneficiaryUser` nullable FK to `User`. Resolver never hardcodes email except optional bootstrap/seed.

### Invariants: `FIXED_BENEFICIARY` must have a user

| Rule | Description |
|------|-------------|
| **IF** `beneficiaryMode === FIXED_BENEFICIARY` | **THEN** `idFixedBeneficiaryUser` **MUST** be set to an existing, active `User` (product may allow inactive users only if explicitly decided—default: active). |
| **IF** `beneficiaryMode === UPLINE_CHAIN` | **THEN** `idFixedBeneficiaryUser` **SHOULD** be `NULL` (ignored by resolver; if set, implementation **must ignore** it to avoid two sources of truth). |
| **Pre-liquidación** | Before creating any `ComissionDistribution` for a row, validate every `ProductPercentageCommissionCategory → Category` used: if `FIXED_BENEFICIARY` and FK is null or user missing → **fail fast** for that `SettlementCommission` (block record; do not partial-write distributions). |
| **Seeds / migrations** | Every category seeded as `FIXED_BENEFICIARY` must resolve `idFixedBeneficiaryUser` after users exist (order: users → categories with FK). |

**Validation layers** (apply in this order where relevant):

1. **Resolver / service** — authoritative at runtime; throws or returns structured error → `procesarPreLiquidacion` skips that commission and logs a clear reason (e.g. `Category {code}: FIXED_BENEFICIARY sin idFixedBeneficiaryUser`).
2. **Seed scripts** — assert non-null FK for fixed categories before commit.
3. **Optional later**: Zod (or Prisma middleware) on admin “update category”; DB `CHECK` `(beneficiary_mode != 'FIXED_BENEFICIARY') OR (id_fixed_beneficiary_user IS NOT NULL)` for hard guarantee.

**Prisma note**: The FK may stay `Int?` in schema because `UPLINE_CHAIN` rows leave it null; **business rules** enforce “required when FIXED,” not the column’s SQL nullability alone—unless a `CHECK` is added as above.

> **Note**: If Prisma already introduced `SYSTEM_AGENCIA`, migrate enum to `FIXED_BENEFICIARY` and replace usages; semantics are identical but extensible.

## Scope

### In Scope

- **Prisma**: `BeneficiaryMode` (`UPLINE_CHAIN` | `FIXED_BENEFICIARY`); `Category.idFixedBeneficiaryUser`; `ComissionDistribution.idBeneficiaryUser` NOT NULL after backfill; `Clawback.idUser` aligned with beneficiary when clawback exists.
- Resolver: `UPLINE_CHAIN` → chain match or block record; `FIXED_BENEFICIARY` → require non-null `idFixedBeneficiaryUser`, else block record; ignore fixed FK when `UPLINE_CHAIN`.
- `procesarPreLiquidacion` + origin-recalc: set `idBeneficiaryUser` / `Clawback.idUser` from resolver.
- `obtenerDistribucionComision` + types + `ModalDetalleDistribucion`: beneficiary per row.
- Seeds: categories with correct mode; Agencia user + `AGENCIA` category linked via `idFixedBeneficiaryUser`; `.env.example` for `AGENCIA_USER_PASSWORD`.

### Out of Scope

- Liquidation / `ClawbackBalance`.
- Changing voluntarias / `POLIZA_CLAW` beyond aligning persisted users when applicable.
- Admin UI to edit mode / fixed user (optional follow-up).

## Approach

Shared lib: upline list with cycle guard + max depth. `resolveBeneficiary({ category, chain })` branches on `category.beneficiaryMode`, enforcing **FIXED_BENEFICIARY ⇒ non-null `idFixedBeneficiaryUser`** before returning an id. Persist on `ComissionDistribution.idBeneficiaryUser`; reuse for `Clawback.idUser`. API joins `User` for display.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Enum, `Category` fields, `ComissionDistribution.idBeneficiaryUser` |
| `prisma/migrations/*` | New | Backfill + NOT NULL |
| `src/features/pre-liquidacion/...` | Modified | Resolver, service, UI, types |
| `prisma/seeds/category.ts` | Modified | Mode + `idFixedBeneficiaryUser` where fixed |
| `openspec/specs/pre-liquidacion/spec.md` | Modified | Delta |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Category `FIXED_BENEFICIARY` with null FK | Low | Block record; seed asserts; optional DB CHECK |
| `UPLINE_CHAIN` with spurious `idFixedBeneficiaryUser` | Low | Resolver ignores FK; seeds prefer NULL |
| Incomplete upline for `UPLINE_CHAIN` | Med | Block record; clear message |
| Enum rename from prior draft | Low | One migration + find/replace |

## Rollback Plan

Revert migration(s) if safe; else forward-fix. Code rollback leaves columns unused.

## Dependencies

- Seeded users for each fixed-beneficiary category (at minimum Agencia for `AGENCIA`).

## Success Criteria

- [ ] Resolver supports `UPLINE_CHAIN` and `FIXED_BENEFICIARY` only; fixed path uses FK, not hardcoded user id (except tests/seed).
- [ ] **`FIXED_BENEFICIARY` without `idFixedBeneficiaryUser`** → settlement row blocked; no distributions persisted for that row.
- [ ] **`UPLINE_CHAIN`** never reads `idFixedBeneficiaryUser` (or it is always null in seeds).
- [ ] Adding a new system user for a new pool category requires **data only** (new `User` + category FK), no enum change.
- [ ] Every new `ComissionDistribution` has non-null `idBeneficiaryUser`.
- [ ] `Clawback.idUser` matches beneficiary where clawback exists.
- [ ] Unit tests: both modes, cycle, missing upline (blocked), **FIXED_BENEFICIARY + null FK (blocked)**, invalid user id (blocked).
- [ ] Delta spec: invariants table, validation layers, block-record behavior.
