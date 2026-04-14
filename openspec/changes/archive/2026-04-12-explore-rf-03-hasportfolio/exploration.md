# Exploration: RF-03 — `hasPortfolio` scope and commission-by-category flow

## Current State

**Product intent (PRD):** RF-03 places a `hasPortfolio` flag on PPC (scheme B), edited only in the **commission-by-category / rules (C lines)** flow. There is **no** agreed rule yet linking that flag to the **settlement motor** (pending MAPA §F / §7). On save, percentages must satisfy RF-05 (range 1–100, sums ≤ 100 per B); RF-02 allows empty intermediate states until save/blur validation.

**Database:** `ProductPercentageCommissionCategory` already has optional `porcentaje_portfolio` (`Decimal(5,4)`). `ProductPercentageCommission` has **no** `hasPortfolio` (or equivalent) column in `prisma/schema.prisma` — the PRD’s “migration hasPortfolio on PPC” is **not** reflected in the current schema.

**Distribution commission UI (`src/features/distribution-commission/`):** Forms and Zod schemas only model **`percentage`** → `porcentaje_distribucion`. There is **no** UI for portfolio %, **no** `hasPortfolio` checkbox, and **no** API/types/mappers wiring `porcentaje_portfolio`. `CategoryPercentageRow` renders a single `PercentageField` for distribution only.

**Pre-liquidación motor:** Portfolio percentages are applied when `usePortfolio` is derived from **`originCommission === 'CARTERA'`** on the record/settlement, **not** from a PPC flag. `configFromCategories` picks `porcentajePortfolio` over `porcentaje_distribucion` when `usePortfolio && porcentajePortfolio !== null`. This matches the PRD statement that **`hasPortfolio` is not yet tied to liquidation**.

**OpenSpec:** Main `openspec/specs/commission-distribution-ui/spec.md` covers RF-01, RF-02, and RF-05 only — **no** requirements for RF-03/RF-04 (`hasPortfolio`, hide portfolio column, no DB wipe).

## Affected Areas

- `prisma/schema.prisma` — add boolean on PPC if product confirms; align precision with RF-05 (PRD mentions up to 6 decimals in DB; category line is still `Decimal(5,4)`).
- `src/features/distribution-commission/lib/commission-rule-schemas.ts` — conditional portfolio line schema + sum rules when `hasPortfolio` is true.
- `src/features/distribution-commission/components/category-percentage-row.tsx` (and/or parent form) — second column or conditional fields; checkbox at rule/PPC level.
- `src/features/distribution-commission/components/commission-rule-form.tsx` — default values, totals for portfolio sum, disabled save when invalid.
- `src/features/distribution-commission/types/commission-rule.types.ts` + `mappers/commission-rule.mapper.ts` — map `porcentajePortfolio`; preserve values when flag off (RF-04).
- Feature **services/actions/API** that create/update PPC categories — persist `porcentaje_portfolio` and future `hasPortfolio`.
- `openspec/specs/commission-distribution-ui/spec.md` (and likely delta under this change) — RF-03/04 scenarios.
- **Future / separate decision:** `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` — whether `usePortfolio` should also consider PPC `hasPortfolio` (explicitly **out of scope** until business defines MAPA §F).

## Approaches

1. **UI-first on existing schema (defer PPC flag column)** — Use only `porcentaje_portfolio` presence or a derived rule until `hasPortfolio` exists on PPC.
   - Pros: Smaller migration; can ship portfolio inputs for lines that need data.
   - Cons: Does not match PRD’s “checkbox on PPC”; ambiguous when all portfolio values are null.
   - Effort: Medium

2. **Schema + full stack (PRD-aligned)** — Add `hasPortfolio` to `ProductPercentageCommission`; extend GET/POST/PUT; form checkbox; show/hide portfolio column; never null-out `porcentaje_portfolio` when toggling off (RF-04).
   - Pros: Clear product model; testable; aligns with RF-03/04/05.
   - Cons: Migration + API + UI + tests; needs coordination on motor later.
   - Effort: High

3. **Spec-only spike** — Document RF-03/04 in OpenSpec and mock API contract before implementation.
   - Pros: Locks acceptance criteria; reduces rework.
   - Cons: No user-visible value until apply phase.
   - Effort: Low (alone)

## Recommendation

Proceed with **Approach 2** as the target, preceded by a short **Approach 3** delta spec so scenarios for checkbox placement, hidden portfolio UI, persistence on toggle-off, and save validation are explicit before coding. Confirm with product whether **`hasPortfolio` default** for existing PPC rows should be `false` and whether **motor** changes are explicitly excluded from this change (per RF-03).

## Risks

- **Motor mismatch:** Admins may assume `hasPortfolio` affects settlement; today only `originCommission === 'CARTERA'` drives portfolio %. UX copy or docs may be needed to avoid false expectations until MAPA §F.
- **PUT recreates categories (per PRD):** Bulk replace of lines must **re-send** both percentages and must **not** wipe `porcentaje_portfolio` when flag is off.
- **Precision:** PRD RF-05 mentions 6 decimal persistence; schema still `Decimal(5,4)` — may need a separate migration decision.

## Ready for Proposal

**Yes.** Orchestrator should run **`/sdd-propose`** for change `explore-rf-03-hasportfolio` (or rename) with scope: PPC `hasPortfolio` + rules UI + API + persistence, **excluding** pre-liquidación motor changes unless product extends scope.
