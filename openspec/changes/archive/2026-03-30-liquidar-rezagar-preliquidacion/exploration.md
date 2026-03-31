# Exploration: liquidar-rezagar-preliquidacion

## Current State

The pre-liquidation module already has a significant amount of scaffolding in place for the liquidar/rezagar flows, but the implementations are **incomplete** compared to the full business requirements. Here is the exact current state:

### DB Schema (`prisma/schema.prisma`)

**`SettlementCommission`** fields currently:
- `status`: String — states: PENDING, SYNCHRONIZED, LAG, PRE-SETTLED, SETTLED
- `isLag`: Boolean (default false)
- `isClawback`: Boolean (default false)
- `lagDate`: DateTime? — set when lagged
- `syncDate`: DateTime?
- `settledDate`: DateTime? — set when settled
- `commissionType`: String (VOLUNTARIA | POLIZA)
- `originCommission`: String? (CARTERA | other)

**MISSING fields** (required by feature request):
- `isLagByUser`: Boolean — NEW — tracks if lag was triggered by user (vs. automated)
- `isLagByUserDate`: DateTime? — NEW — records when user manually flagged as lag

**`ComissionDistribution`** fields:
- `status`: String (no default in schema, set on create)
- `valueComission`, `valueComissionFinal`, `totalDiscount`, `appliedDiscountPercentage`
- Relation to `Clawback` (one-to-one, unique)
- `idBeneficiaryUser`: Int

**`Clawback`** fields:
- `state`: String
- `appliedDate`: DateTime?
- `reason`: String?
- `valueClawback`: Decimal
- `porcentajeApplied`: Decimal
- Relation to `ComissionDistribution` (1:1, unique)
- `idUser`: Int (beneficiary user)

**`ClawbackBalance`**:
- `idUser`: Int (PK — one row per user)
- `totalAmount`: Decimal

**`Business`**:
- `status`: String? — currently values: VENTA_EFECTUADA, EMITIDO, CANCELADO
- **MISSING** state: `COMISIONANDO` — not in type definitions, not in badges, not in schema

**`FileImport`**:
- `status`: String — values: PROCESSING, LOAD, COMPLETED, ERROR, CANCELLED, PRE-SETTLED, SETTLED

### Existing Service Functions

**`liquidarRegistros(ids, userId, fileId)`** (line 670):
- Updates `settlement_commission.status` → `SETTLED` for given `ids` where status = SYNCHRONIZED
- Counts remaining SYNCHRONIZED for the file → if 0, sets `file_import.status = COMPLETED`
- **MISSING**: Does NOT update `commission_distribution.status`
- **MISSING**: Does NOT apply clawback (`applied_date`, `reason`) for POLIZA type
- **MISSING**: Does NOT update `clawback_balance.total_amount`
- **MISSING**: Does NOT set `settled_date` on `settlement_commission`
- **MISSING**: Does NOT transition `business.status` from EMITIDO → COMISIONANDO

**`rezagarRegistros(ids, userId)`** (line 709):
- Updates `settlement_commission`: status → LAG, isLag → true, lagDate → now()
- **MISSING**: Does NOT set `isLagByUser = true` (field doesn't exist yet in schema)
- **MISSING**: Does NOT set `isLagByUserDate = now()` (field doesn't exist yet)
- Route signature accepts `userId` but the service ignores it (`_userId`)

### Existing API Routes

- `POST /api/pre-liquidacion/liquidar` — complete, delegates to `liquidarRegistros`
- `POST /api/pre-liquidacion/rezagar` — complete, delegates to `rezagarRegistros`
- Both have auth, role checks (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE), Zod validation

### Existing UI Components

- `BarraAccionesLiquidacion.tsx` — sticky bar with Liquidar/Rezagar buttons, checkbox count display
- `RegistrosLiquidacionTable.tsx` — table with checkbox selection per row, shows Rezagado badge
- `ModalConfirmacionLiquidar.tsx` — confirm dialog for liquidar
- `ModalConfirmacionRezagar.tsx` — confirm dialog for rezagar
- `useRezagarRegistros` hook — calls POST /api/pre-liquidacion/rezagar
- `useLiquidarRegistros` hook — calls POST /api/pre-liquidacion/liquidar

### Business Status

- Current states in `business-entity.types.ts`: VENTA_EFECTUADA, EMITIDO, CANCELADO
- `BusinessStatusBadge.tsx` only handles those 3 states
- `COMISIONANDO` is a **new state** not yet in any type, badge, or service

### Commission Type Flows

The `pre-liquidacion-flow.ts` already defines:
```
VOLUNTARIA → basic settlement
POLIZA_CLAW → clawback must be applied
POLIZA_CARTERA → portfolio clawback
POLIZA_NO_CLAW → poliza without clawback
```

`shouldPersistClawback(flow)` returns true for all POLIZA flows.

---

## Affected Areas

### DB Schema
- `/prisma/schema.prisma` — Add `isLagByUser` (Boolean, default false), `isLagByUserDate` (DateTime?) to `SettlementCommission`; Add `COMISIONANDO` to `Business.status` (currently a raw String, not an enum — so no Prisma enum change, just type update)

### Services
- `/src/features/pre-liquidacion/services/pre-liquidacion.service.ts` — Extend `liquidarRegistros` and `rezagarRegistros` with full business logic

### Types
- `/src/features/negocios/types/business-entity.types.ts` — Add `COMISIONANDO` to `BUSINESS_STATUS` const and `BusinessStatus` type
- `/src/features/negocios/types/business-status.types.ts` — Add `COMISIONANDO` to `BusinessStatus` type and `BUSINESS_STATUS` const
- `/src/features/negocios/lib/business-api.schemas.ts` — Add `COMISIONANDO` to the status enum in Zod schema
- `/src/features/pre-liquidacion/types/types.ts` — No changes needed unless new return types are required

### UI Components
- `/src/features/negocios/components/ui/BusinessStatusBadge.tsx` — Add `COMISIONANDO` badge config
- No changes required to `BarraAccionesLiquidacion.tsx` or `RegistrosLiquidacionTable.tsx` — UI is already complete for the action triggers

### Tests
- `/src/app/api/pre-liquidacion/liquidar/__tests__/route.test.ts` — Extend tests for new behavior
- `/src/app/api/pre-liquidacion/rezagar/__tests__/route.test.ts` — Extend tests for new behavior
- `/src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts` — Update/extend unit tests

---

## Approaches

### 1. Extend existing `liquidarRegistros` inline (monolithic transaction)

Expand the existing Prisma `$transaction` in `liquidarRegistros` to also:
1. Fetch each selected `settlement_commission` with `commissionType` and related `comissionDistributions` and their `clawbacks`
2. Update `comissionDistribution.status → SETTLED` for all distributions
3. For each POLIZA-type commission: update `clawback.applied_date`, append to `clawback.reason`, and update `clawback_balance.total_amount` per user
4. For each settled business: if `business.status === EMITIDO` → update to `COMISIONANDO`
5. Check if file is complete → update `file_import.status = COMPLETED`

- **Pros**: Single atomic transaction, simple mental model, consistent with existing pattern
- **Cons**: Large transaction touching many tables may create lock contention on busy systems; harder to test granular steps
- **Effort**: Medium

### 2. Decompose into specialized service helpers (recommended)

Extract helpers alongside the existing service:
- `applyClawbacksForSettlement(tx, ids)` — handles clawback updates per commission distribution
- `updateBusinessStatusOnSettle(tx, businessIds)` — transitions EMITIDO → COMISIONANDO
- `finalizeFileIfComplete(tx, fileId)` — already partially exists

All called within a single `$transaction`. This preserves atomicity while making code testable.

- **Pros**: Testable in isolation, clear separation of concerns, easy to extend
- **Cons**: Slightly more files/functions to maintain
- **Effort**: Medium

### 3. Event-driven / async processing

Fire-and-forget side effects (clawback, business status) after the main settle transaction succeeds.

- **Pros**: Fast response for the primary settle; non-blocking
- **Cons**: Breaks atomicity — if clawback update fails, settlement is already committed; complex to debug; inconsistent with existing architecture
- **Effort**: High
- **NOT recommended** for financial data

---

## Recommendation

**Approach 2** — decompose into helper functions, all within a single `$transaction`.

The key insight is that `liquidarRegistros` currently does a naive single-table update. It must become a richer transaction that:

1. Fetches each `settlement_commission` with `commissionType`, `idBusiness`, and distributions+clawbacks
2. Separates VOLUNTARIA vs. POLIZA records
3. In a single `$transaction`:
   a. Update `settlement_commission`: `status = SETTLED`, `settled_date = now()`
   b. Update `comissionDistribution.status = SETTLED` for all distributions of these commissions
   c. For POLIZA records with clawbacks: update `clawback.applied_date = now()`, `reason = append("retención del clawback de la póliza")`
   d. For each affected user: sum clawback values, update/upsert `clawback_balance.total_amount += sum`
   e. For each `idBusiness` where `business.status === EMITIDO`: update to `COMISIONANDO`
   f. Check remaining SYNCHRONIZED for the file → if 0, set `file_import.status = COMPLETED`

For `rezagarRegistros`:
1. Add `isLagByUser = true`, `isLagByUserDate = now()` to the update

For `Business.status = COMISIONANDO`:
- No DB migration needed — `Business.status` is already a raw `String` field (not an enum)
- Only TS types, Zod schema, and `BusinessStatusBadge` need updating

---

## Risks

1. **Clawback balance upsert race condition**: If two liquidations run concurrently for the same user, incrementing `total_amount` with `$increment` in Prisma's `updateMany` would be correct, but we need to confirm `upsert` vs `update` logic for the case when `clawback_balance` doesn't yet exist for a user. Use `upsert` with `create`.

2. **Missing DB fields require migration**: `isLagByUser` and `isLagByUserDate` require `npx prisma migrate dev`. The `Business.status` string field does NOT require migration since it is a raw String.

3. **clawback.reason append semantics**: The requirement says "append" the string — the current `reason` field is `String?`. We must read the current value and concatenate, OR use a Postgres raw update. Since we're in a transaction, we can handle this with application-level string concatenation after fetching.

4. **COMISIONANDO state filter**: The negocios API currently filters by `status: z.enum(['VENTA_EFECTUADA', 'EMITIDO', 'CANCELADO'])`. Adding `COMISIONANDO` to the Zod enum is required or queries will reject `COMISIONANDO` as a filter value.

5. **Large transaction scope**: Settling many commissions at once could lock many rows. Consider batching if needed, but for typical use (dozens of records) it should be fine.

6. **Test coverage gaps**: The existing `liquidarRegistros` tests only check the simple path. All new behaviors (clawback, business status, distribution status) need new test cases.

---

## Ready for Proposal

Yes — the exploration is complete. The change is well-scoped:
- 1 Prisma migration (2 new fields on `settlement_commission`)
- 1 service file update (enrich `liquidarRegistros` and `rezagarRegistros`)
- 3 type files (add `COMISIONANDO` to business status)
- 1 UI component (BusinessStatusBadge)
- Test extensions for new behavior

The orchestrator should communicate to the user that the UI scaffolding (buttons, modals, table, hooks) is **already complete** — the work is primarily backend logic enrichment and the new DB fields.
