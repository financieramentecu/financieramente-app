# Proposal: Liquidar y Rezagar Pre-liquidaciones

## Intent

The liquidar/rezagar service functions currently perform incomplete updates -- settling only updates `settlement_commission.status` without touching distributions, clawbacks, business status, or recording user-initiated lags. This leaves financial data in an inconsistent state where commissions appear settled but downstream records are not.

## Scope

### In Scope
- Prisma migration: add `isLagByUser` (Boolean) and `isLagByUserDate` (DateTime?) to `SettlementCommission`
- Enrich `liquidarRegistros`: update distributions, apply clawbacks for POLIZA, update clawback balances, transition business EMITIDO to COMISIONANDO, set file `COMPLETED` only when **no** `SYNCHRONIZED` **and** **no** `PRE-SETTLED` commissions remain for that import
- Enrich `rezagarRegistros`: set `isLagByUser=true`, `isLagByUserDate=now()`
- Add `COMISIONANDO` to business status types, Zod schema, and badge component
- Extend existing tests for new behavior paths

### Out of Scope
- UI changes to liquidar/rezagar buttons, modals, or table (already complete)
- Batch/pagination for large settlement sets
- Audit log of who settled/lagged

## Approach

Decompose into helper functions within a single Prisma `$transaction`:
- `applyClawbacksForSettlement(tx, commissions)` -- updates clawback records and balances for POLIZA flows (via `deriveFlow` / `shouldPersistClawback`)
- `updateBusinessStatusOnSettle(tx, businessIds)` -- transitions EMITIDO to COMISIONANDO only
- After settlement: `count` `SYNCHRONIZED` and `count` `PRE-SETTLED` per `fileId`; `FileImport` → `COMPLETED` only when **both** counts are zero

All helpers called within the atomic transaction in `liquidarRegistros`. For `rezagarRegistros`, extend the existing update to include the two new fields.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `isLagByUser`, `isLagByUserDate` to SettlementCommission |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modified | Enrich liquidar/rezagar with full business logic |
| `src/features/negocios/types/business-entity.types.ts` | Modified | Add COMISIONANDO status |
| `src/features/negocios/types/business-status.types.ts` | Modified | Add COMISIONANDO to const/type |
| `src/features/negocios/lib/business-api.schemas.ts` | Modified | Add COMISIONANDO to Zod enum |
| `src/features/negocios/components/ui/BusinessStatusBadge.tsx` | Modified | Add COMISIONANDO badge |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts` | Modified | New test cases |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Clawback balance race condition on concurrent settles | Low | Use Prisma `upsert` with `increment` inside transaction |
| Large transaction locking many rows | Low | Typical use is dozens of records; batch if needed later |
| Clawback reason append requires read-then-write | Med | Fetch current value inside transaction, concatenate in app code |

## Rollback Plan

1. Revert the Prisma migration: `npx prisma migrate resolve --rolled-back <migration_name>` then restore previous schema
2. Revert service changes via git -- the old liquidar/rezagar behavior is a strict subset
3. Remove COMISIONANDO from types/badge -- no existing data uses this status

## Dependencies

- None -- all affected tables and services already exist

## Success Criteria

- [x] `rezagarRegistros` sets `isLagByUser=true` and `isLagByUserDate` on selected `PRE-SETTLED` records
- [x] `liquidarRegistros` updates `settlement_commission`, `comission_distribution`, clawbacks, and clawback balances atomically (single transaction)
- [x] POLIZA settlements apply clawback with correct reason append and update `ClawbackBalance`
- [x] Business status transitions from `EMITIDO` to `COMISIONANDO` on settlement; non-`EMITIDO` rows unchanged
- [x] `FileImport` becomes `COMPLETED` when zero `SettlementCommission` rows remain `SYNCHRONIZED` **and** zero remain `PRE-SETTLED` for that import (after Liquidar)
- [x] `BusinessStatusBadge` renders `COMISIONANDO` correctly
- [x] New behavior covered by unit tests (service colocated + legacy suite, API routes, badge)
