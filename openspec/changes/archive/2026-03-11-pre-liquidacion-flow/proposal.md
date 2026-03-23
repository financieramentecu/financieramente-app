# Proposal: Pre-liquidación flow — clawback persistence and balance by flow

## Intent

**Problem**: During pre-liquidación, clawback is only applied as a mathematical deduction to the net commission. No `Clawback` history rows are created and `ClawbackBalance` is never updated. There is no audit trail, no per-user clawback balance, and no differentiation by commission type (Poliza CLAW vs Poliza no-CLAW vs CARTERA vs Voluntarias).

**Additional problem (hallazgo)**: After pre-liquidating, the "Historial" tab shows no results and the file can disappear from the list. Root cause: (1) APIs for results and export filter by `status: 'PRELIQUIDADO'` while the DB and processing use `'PRE-SETTLED'`; (2) the file list only includes files with at least one `SYNCHRONIZED` record and counts "registros preliquidados" as SYNCHRONIZED count, so once all records are PRE-SETTLED the file no longer appears and the count is zero. This fix is in scope for this change.

**Why this change**: Pre-liquidación processes SYNCHRONIZED records grouped by File (file import). Persistence of clawback must depend on the **flow**:

- **CLAW (isClawback)**: Percentage is zero (discount from general clawback). Register in `Clawback`, distribute amount by category, and **subtract** that value from the user's clawback balance.
- **Poliza (no CLAW)**: Apply clawback and discount; register in `Clawback` and **add** to the user's clawback balance.
- **CARTERA**: Use `porcentaje_portfolio` (ProductPercentageCommissionCategory); normal distribution with discount and clawback; register in `Clawback` and **add** to the user's clawback balance.
- **Voluntarias**: Distribution by category only; **no** clawback calculation, **no** `Clawback` row, **no** change to the user's clawback balance.

All of the above must run within the same transactional boundary as `ComissionDistribution` creation and `SettlementCommission` status update.

## Scope

### In Scope

- **Pre-liquidación service**: When processing a batch (registros SYNCHRONIZED by file in date range), branch by flow:
  1. **Voluntarias** (`commissionType === 'VOLUNTARIA'`): Create `ComissionDistribution` only (discount applied; clawback percentage already 0 from load). Do **not** create `Clawback`; do **not** update `ClawbackBalance`.
  2. **Poliza CARTERA** (`commissionType === 'POLIZA'`, `originCommission === 'CARTERA'`): Use `porcentaje_portfolio`; apply discount and clawback; create distributions; when `valorClawback > 0`, create `Clawback` and **add** `valorClawback` to user's `ClawbackBalance`.
  3. **Poliza no-CLAW** (`commissionType === 'POLIZA'`, `isClawback === false`): Apply discount and clawback; create distributions; when `valorClawback > 0`, create `Clawback` and **add** to user's `ClawbackBalance`.
  4. **Poliza CLAW** (`commissionType === 'POLIZA'`, `isClawback === true`): Clawback percentage is 0 (consuming from general clawback). Register in `Clawback` (amount to be defined in spec: e.g. amount distributed by category or amount debited from balance); distribute by category; **subtract** that value from the user's `ClawbackBalance`.
- **Transaction boundary**: For each `SettlementCommission`, all writes (distribution(s), Clawback(s) when applicable, ClawbackBalance update(s), status update) run in one Prisma transaction.
- **Data access**: Query must include `business.user` (and `commissionType`, `originCommission`, `isClawback` from `SettlementCommission`) to resolve user and flow.
- **Historial visibility fix**: (1) In `GET /api/pre-liquidacion/resultados/[fileId]` and `POST /api/pre-liquidacion/exportar/[fileId]`, change filter from `status: 'PRELIQUIDADO'` to `'PRE-SETTLED'`. (2) In `obtenerArchivosDisponiblesPreliquidacion`: include FileImports that have at least one `SYNCHRONIZED` **or** at least one `PRE-SETTLED`; and set `registrosPreliquidados` to the count of `PRE-SETTLED` records for that file (so the "Histórico" tab shows pre-liquidated files correctly).

### Out of Scope

- **Load-file / process-batch**: No change to how `discountPercentage`, `clawbackPercentage`, or `isClawback` are set on `SettlementCommission`; they are already supplied per type.
- **Schema changes**: No Prisma schema changes; `Clawback` and `ClawbackBalance` models already exist.
- **Release/apply flows**: Logic for changing `Clawback.state` (e.g. to `LIBERADO`/`APLICADO`) or adjusting balance on release/apply is a separate change.
- **Backfill**: No backfill of `Clawback` or `ClawbackBalance` for already pre-liquidated records in this change.

## Approach

1. **Where**: Extend `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` inside the existing `prisma.$transaction` that creates `ComissionDistribution` rows and updates `SettlementCommission` to `PRE-SETTLED`.

2. **Flow selection**: For each registro, derive flow from `registro.commissionType`, `registro.originCommission`, and `registro.isClawback`:
   - Voluntarias → no Clawback persistence.
   - Poliza CARTERA → use `porcentajePortfolio`, create Clawback when `valorClawback > 0`, add to balance.
   - Poliza no-CLAW → create Clawback when `valorClawback > 0`, add to balance.
   - Poliza CLAW → create Clawback (amount per spec), subtract from balance.

3. **Clawback row**: When creating `Clawback`, set `idComissionDistribution`, `idUser` (from `business.user`), `valueClawback`, `porcentajeApplied`, `state` (e.g. `RETENIDO`). For CLAW flow, spec will define how `valueClawback` is derived when percentage is 0.

4. **ClawbackBalance**: Upsert by user; **add** `valorClawback` for Poliza (CARTERA / no-CLAW); **subtract** the CLAW amount for Poliza CLAW. Guard against negative balance if needed (spec/design).

5. **Idempotency**: Only process SYNCHRONIZED registros; once PRE-SETTLED, do not create duplicate Clawback (unique `idComissionDistribution` on Clawback). Re-run behavior to be defined in spec.

6. **Historial fix**: Use state `PRE-SETTLED` consistently. In API routes for resultados and exportar, filter by `status: 'PRE-SETTLED'`. In `obtenerArchivosDisponiblesPreliquidacion`, broaden the `where` to include files with `some SYNCHRONIZED` or `some PRE-SETTLED`, and expose two counts (or derive): sincronizados (SYNCHRONIZED) and registrosPreliquidados (PRE-SETTLED), so the UI "Pendientes" and "Histórico" tabs both work.

Spec and design will define: exact `valueClawback` for CLAW flow, initial `Clawback.state`, and any guards for balance sign or negative balance.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | High | Branch by flow; Clawback/ClawbackBalance; ensure business.user and flow fields loaded. **Also**: `obtenerArchivosDisponiblesPreliquidacion` — include files with SYNCHRONIZED or PRE-SETTLED; `registrosPreliquidados` = count PRE-SETTLED. |
| `src/app/api/pre-liquidacion/resultados/[fileId]/route.ts` | Low | Change filter from `status: 'PRELIQUIDADO'` to `'PRE-SETTLED'` so historial shows results. |
| `src/app/api/pre-liquidacion/exportar/[fileId]/route.ts` | Low | Same: filter by `'PRE-SETTLED'` instead of `'PRELIQUIDADO'`. |
| `src/features/pre-liquidacion/types/` | Low | Add or reuse types for flow enum and Clawback/balance if needed. |
| Pre-liquidación unit/integration tests | Medium | Tests per flow; optionally test that list includes files with only PRE-SETTLED and that registrosPreliquidados reflects PRE-SETTLED count. |
| API contract (`POST /api/pre-liquidacion/procesar`) | None | No change to request/response. |
| Load-file / batch processors | None | No change. |
| Prisma schema | None | No change. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Transaction scope or deadlocks | Medium | One transaction per `SettlementCommission`; use ClawbackBalance upsert; avoid long cross-registro transactions. |
| Wrong user for Clawback | Medium | Use agent (business owner) from `business.user`; validate in spec and tests. |
| Double-counting or wrong sign on balance (add vs subtract) | Medium | Explicit flow branching; tests for each flow; spec defines CLAW amount and subtract semantics. |
| CLAW flow: negative ClawbackBalance | Low | Spec/design: allow negative, or cap subtract at current balance; document behavior. |
| Existing pre-liquidated data has no Clawback/Balance | Low | Backfill out of scope; document for future migration if needed. |
| Listado returns more files after broadening where | Low | Include files with SYNCHRONIZED or PRE-SETTLED; UI already splits by sincronizados vs registrosPreliquidados; verify performance if many files. |

## Rollback Plan

- **Code**: Revert the feature branch; redeploy. New pre-liquidaciones stop creating/updating Clawback and ClawbackBalance; existing rows remain.
- **Data**: No automatic rollback of already-created `Clawback` or `ClawbackBalance`. If required, run a one-off script to delete or adjust data (only if rollback is needed).
- **Compatibility**: No API or schema change; rollback does not break clients.

## Dependencies

- **Internal**: Prisma schema with `Clawback` and `ClawbackBalance`; pre-liquidación service and its transaction structure; `SettlementCommission` fields `commissionType`, `originCommission`, `isClawback` (already present).
- **Upstream**: Load-file already sets commission type, origin, and clawback flags/percentages — no new dependency.
- **Downstream**: Release/apply flows (future) will depend on Clawback state and ClawbackBalance; this change does not block them.

## Success Criteria

- [ ] **Voluntarias**: Pre-liquidación creates distributions with discount only; no `Clawback` row and no `ClawbackBalance` change.
- [ ] **Poliza (no CLAW) / CARTERA**: When `valorClawback > 0`, a `Clawback` row is created and the user's `ClawbackBalance` is **increased** by that value.
- [ ] **Poliza CLAW**: A `Clawback` row is created (amount per spec); user's `ClawbackBalance` is **decreased** by that value.
- [ ] All persistence for a single `SettlementCommission` (distributions, Clawback(s) when applicable, ClawbackBalance, status update) happens in a single transaction.
- [ ] Pre-liquidación API contract and response shape remain unchanged.
- [ ] Unit/integration tests cover all four flows and balance add vs subtract.
- [ ] **Historial**: After pre-liquidating, results and export APIs return data (filter by `PRE-SETTLED`). File list includes pre-liquidated files; "Histórico" tab shows files with `registrosPreliquidados` > 0 (count of PRE-SETTLED).
