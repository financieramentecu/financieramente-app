# Design: Clawback en pre-liquidación — solo registro (sin ClawbackBalance)

## Technical Approach

Remove all `ClawbackBalance` create/update logic from the pre-liquidación service while keeping `Clawback` row creation unchanged. Pre-liquidación will continue to create one `Clawback` row per category when the flow requires it (Poliza CARTERA, no-CLAW; POLIZA_CLAW is not yet implemented in code), but will no longer call `clawbackBalance.findUnique`, `clawbackBalance.create`, or `clawbackBalance.update`. The source of truth for "balance is updated only in liquidación" is the proposal and will be reflected in the main pre-liquidación spec (delta or direct edit). Tests will be updated to assert that `ClawbackBalance` is never touched during pre-liquidación.

## Architecture Decisions

### Decision: Remove ClawbackBalance operations from pre-liquidación transaction

**Choice**: Delete the entire block (lines ~471–491 in `pre-liquidacion.service.ts`) that performs `clawbackBalance.findUnique` / `create` / `update` after creating `Clawback` rows.

**Alternatives considered**: (1) Keep the logic behind a feature flag — rejected because the business rule is definitive. (2) Move balance update to a separate "post–pre-liquidación" job — rejected; balance is owned by the liquidación process, not pre-liquidación.

**Rationale**: The proposal states that the user's general clawback (balance) must be updated only in the liquidation process. Pre-liquidación is limited to recording the clawback movement in the `Clawback` table for audit and calculation; no side effect on `ClawbackBalance`.

### Decision: Keep existing Clawback row creation unchanged

**Choice**: Do not modify the logic that creates `Clawback` rows (one per `ComissionDistribution` with `valorClawback > 0` for flows other than VOLUNTARIA and POLIZA_CLAW).

**Alternatives considered**: Refactoring creation into a helper — out of scope for this change.

**Rationale**: The proposal explicitly keeps "crear las filas en la tabla Clawback"; only balance updates are removed.

### Decision: Update tests to assert no ClawbackBalance usage

**Choice**: Change the test "should create Clawback per category and update ClawbackBalance when POLIZA with clawbackPercentage > 0" so it expects `clawback.create` to be called (unchanged) and expects `clawbackBalance.findUnique`, `clawbackBalance.create`, and `clawbackBalance.update` **not** to be called.

**Alternatives considered**: Removing the test — rejected; we keep coverage and invert the assertion. Leaving the test as-is would fail after the code change.

**Rationale**: Tests must reflect the new contract: Clawback rows are created, ClawbackBalance is never updated in pre-liquidación.

## Data Flow

Unchanged except that the ClawbackBalance branch is removed:

```
procesarPreLiquidacion(fileId, rangoFecha)
  → findMany SettlementCommission (SYNCHRONIZED, include business.user)
  → for each registro:
       deriveFlow(registro)
       load configCategorias
       prisma.$transaction:
         for each configCategoria:
           compute valorComisionBruta, valorDescuento, valorClawback, valorComisionFinal
           tx.comissionDistribution.create(...)
           if flow !== VOLUNTARIA && flow !== POLIZA_CLAW && valorClawback > 0:
             tx.clawback.create(...)     ← KEEP
         // REMOVE: if flow !== VOLUNTARIA && totalValorClawback > 0: clawbackBalance findUnique/create/update
         tx.settlementCommission.update({ status: 'PRE-SETTLED' })
  → fileImport.update(preLiquidacionDate)
  → (async) email resumen
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | Remove the block that upserts `ClawbackBalance` (lines ~454–491: computation of `totalValorClawback` can stay for clarity but is only used for that block — remove the entire `if (flow !== 'VOLUNTARIA' && totalValorClawback.gt(0) && idUser !== undefined)` block with findUnique/create/update). Optionally remove `totalValorClawback` accumulation if it becomes unused. |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts` | Modify | In the test "should create Clawback per category and update ClawbackBalance when POLIZA with clawbackPercentage > 0": rename to "...and NOT update ClawbackBalance"; remove expectations for `clawbackBalance.findUnique` and `clawbackBalance.create`; add expectations that `clawbackBalance.findUnique`, `clawbackBalance.create`, and `clawbackBalance.update` were not called. Keep `clawback.create` expectations. |
| `openspec/specs/pre-liquidacion/spec.md` | Modify | Update requirements that currently say "create or update ClawbackBalance" to "SHALL NOT create or update ClawbackBalance in pre-liquidación; the liquidation process is responsible for updating ClawbackBalance." Can be done via a delta spec in this change (e.g. `openspec/changes/clawback-pre-liquidacion-solo-registro/specs/pre-liquidacion/spec.md`) and then merged into main, or by direct edit to `openspec/specs/pre-liquidacion/spec.md` in a task. |

## Interfaces / Contracts

No new interfaces. Existing Prisma usage:

- `tx.clawback.create({ data: { idComissionDistribution, idUser, valueClawback, porcentajeApplied, state: 'RETENIDO' } })` — unchanged.
- `tx.clawbackBalance.findUnique` / `create` / `update` — **removed** from this flow; no API or type changes.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Pre-liquidación never updates ClawbackBalance | In `pre-liquidacion.service.test.ts`: the POLIZA clawback test must assert `clawbackBalance.findUnique`, `clawbackBalance.create`, and `clawbackBalance.update` are not called; `clawback.create` still called as before. |
| Unit | General success path still works | Existing "should return success and process records when everything is correct" test: ensure mocks for `clawbackBalance` (if any) do not require being called; test continues to pass. |
| Integration | Optional | If there is an integration test that runs full pre-liquidación and checks DB state, ensure it does not expect `ClawbackBalance` to change after pre-liquidating. |

## Migration / Rollback

No migration required. No schema changes. Rollback: revert the branch to restore ClawbackBalance updates in pre-liquidación if needed; existing `Clawback` rows remain valid.

## Open Questions

- None blocking. Optional: confirm with product that any UI or report showing "clawback balance" after pre-liquidación should not rely on `ClawbackBalance` until liquidación has run (or should derive from `Clawback` table instead).
