# Design: Liquidar y Rezagar Pre-liquidaciones

## Technical Approach

Extend `liquidarRegistros` and `rezagarRegistros` in `pre-liquidacion.service.ts`: all Liquidar mutations run in one Prisma `$transaction`. Clawback application and business promotion are internal async helpers that take the transaction client `tx`. Rezagar remains a single `updateMany` (no file status change). Domain model adds `isLagByUser` / `isLagByUserDate` on `SettlementCommission` and `COMISIONANDO` on `Business.status` (types, Zod, badge).

**Targets after fix:** `EMITIDO` → `COMISIONANDO` on liquidate; `FileImport` not `COMPLETED` until no sync/pre-liquid backlog (see gate table below).

## Architecture Decisions

### Helpers vs monolith

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline only | Harder to unit-test clawback vs business rules | Rejected |
| `applyClawbacksForSettlement` + `updateBusinessStatusOnSettle` | Same transaction, mockable `tx` | **Chosen** |
| Outbox/events | Weak atomicity for money | Rejected |

### Clawback balance

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `update` + `increment` | Missing row fails | Rejected |
| `upsert` + `increment` on update | First balance row per user | **Chosen** |

### User lag fields

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reuse `isLag` only | Cannot tell user vs system lag | Rejected |
| `isLagByUser` + `isLagByUserDate` | Explicit audit | **Chosen** |

### Eligibility filters vs file completion gate

| Concern | Rule (intended after fix) |
|---------|---------------------------|
| Liquidar / Rezagar `updateMany` / initial `findMany` | Only rows in **`PRE-SETTLED`** |
| `FileImport` while **`SYNCHRONIZED` > 0** | **Do not** `COMPLETED`; keep non-terminal file state (`PRE-SETTLED` / `LOAD` per existing flows). |
| `FileImport` → **`COMPLETED`** | Only if **`SYNCHRONIZED` === 0 AND `PRE-SETTLED` === 0** for `fileId` (no rows left to sync or queue for Liquidar). |

**Why two gates:** After pre-liquidación, **`SYNCHRONIZED`** is often **0** while **`PRE-SETTLED`** > 0. **`SYNCHRONIZED`-only completion** marks the file **`COMPLETED`** on the first partial Liquidar. **Apply-phase fix:** add **`PRE-SETTLED` count** to the completion condition; refresh **`fileCompleted`** + unit tests.

### Business `COMISIONANDO` — investigation checklist (apply phase)

Verify per failing case: `idBusiness` present on liquidated commissions; DB `Business.status === 'EMITIDO'` (filter is exact); non-empty deduped `businessIds`; helper runs after commissions are `SETTLED` in the same transaction. If data matches and still no update, trace Prisma `updateMany` result count and schema drift.

### POLIZA clawback scope

Clawbacks run only when `shouldPersistClawback(deriveFlow(commission))` is true (same flow rules as pre-liquidación). Helper loads `ComissionDistribution` with `clawback` for those commission ids, then updates clawbacks and upserts balances.

## Data Flow

```
API route → liquidarRegistros(ids, userId, fileId)
  → $transaction:
       findMany SettlementCommission (ids, PRE-SETTLED) [minimal select]
       updateMany SettlementCommission → SETTLED + settledDate
       updateMany ComissionDistribution → SETTLED
       applyClawbacksForSettlement(tx, commissions)
       updateBusinessStatusOnSettle(tx, businessIds)
       count SYNCHRONIZED for fileId; count PRE-SETTLED for fileId
       if both 0 → fileImport.update COMPLETED (else do not force COMPLETED)
  → { liquidated, fileCompleted }

API route → rezagarRegistros(ids, userId)
  → settlementCommission.updateMany (ids, PRE-SETTLED) → LAG + lag flags + user lag fields
  → { lagged }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | `SettlementCommission`: `isLagByUser`, `isLagByUserDate` |
| Migration under `prisma/migrations/` | Create | Add columns with safe defaults |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | `liquidarRegistros`, `rezagarRegistros`, helpers |
| `src/features/negocios/types/*` | Modify | `COMISIONANDO` in const + union |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | Zod enums |
| `src/features/negocios/components/ui/BusinessStatusBadge.tsx` | Modify | `STATUS_CONFIG` |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts` | Modify | Legacy mocks / liquidar-rezagar smoke |
| `src/features/pre-liquidacion/__tests__/services/pre-liquidacion.service.test.ts` | Modify | Focused unit tests for helpers + transaction |
| `src/app/api/pre-liquidacion/liquidar|rezagar/__tests__/` | Modify | Route delegation + shapes |

## Interfaces / Contracts

- **Service**: `liquidarRegistros(ids: number[], _userId: number, fileId: number) → Promise<{ liquidated: number; fileCompleted: boolean }>`
- **Service**: `rezagarRegistros(ids: number[], _userId: number) → Promise<{ lagged: number }>`
- **Internal**: `applyClawbacksForSettlement(tx: PrismaTx, commissions: Array<{ idSettlementCommission; commissionType; originCommission; isClawback }>)`
- **Internal**: `updateBusinessStatusOnSettle(tx: PrismaTx, businessIds: number[])`
- **PrismaTx**: `Parameters<Parameters<typeof prisma.$transaction>[0]>[0]` (transaction client type alias in service file)

API routes stay thin: session/role, Zod body, call service, map to `ApiResponse`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Clawback apply, EMITIDO filter, **dual file gate** (SYNCHRONIZED + PRE-SETTLED), rezagar payload | Mock `prisma` / `tx` in Vitest |
| Unit | `BusinessStatusBadge` COMISIONANDO | RTL |
| Integration | POST liquidar / rezagar | Mock service or auth as in existing route tests |

## Migration / Rollout

Migration `add_is_lag_by_user_to_settlement_commission`: boolean default `false`, nullable timestamp; deploy with app. `Business.status` is string—no DB enum migration.

## Open Questions

- [ ] Clawback `reason` append: prepend timestamp? (Currently comma-append Spanish fragment only.)
- [ ] Sync delta spec + `proposal.md` success criteria to the two-gate file rule when code changes land.
