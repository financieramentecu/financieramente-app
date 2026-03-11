# Design: Pre-liquidación flow — clawback persistence and balance by flow

## Technical Approach

Extend the existing pre-liquidación processing so that clawback persistence and balance updates follow the four flows (Voluntarias, Poliza CARTERA, Poliza no-CLAW, Poliza CLAW), while respecting project architecture: **no Prisma in API routes**, **all data access in the feature service**, **strict typing in feature types**, and **small single-responsibility functions**. Additionally, **fix historial visibility** by using the canonical state `PRE-SETTLED` everywhere and by making the file list include both pending and pre-liquidated files with correct counts.

1. **API route** (`src/app/api/pre-liquidacion/procesar/route.ts`): Only auth, body parse, Zod validation, build `rangoFecha`, call **service** `procesarPreLiquidacion`, return HTTP response. **No Prisma, no business logic.**
2. **Service** (`pre-liquidacion.service.ts`): Single place for Prisma. Load FileImport and SettlementCommissions (include `business.user`); for each registro, derive flow (via **lib** helper), run one transaction: create distributions, create Clawback(s) when applicable, upsert ClawbackBalance, update status. Optionally delegate transaction body to a focused helper (e.g. `processRegistroTransaction`) to keep functions under ~50 lines. **Also**: `obtenerArchivosDisponiblesPreliquidacion` — broaden list to files with any SYNCHRONIZED or PRE-SETTLED; expose live counts (sincronizados = count SYNCHRONIZED, registrosPreliquidados = count PRE-SETTLED) per file.
3. **Lib** (`lib/`): Pure functions with no Prisma: `deriveFlow(registro)`, and optionally `shouldPersistClawback(flow)`, `getClawbackBalanceDelta(flow, totalValorClawback)`. Easy to unit test.
4. **Types** (`types/types.ts`): Domain types for flow (`PreLiquidacionFlow`), and input type for `deriveFlow` (readonly where appropriate). Service uses these types so business logic does not depend on raw Prisma include shapes.
5. **Data access**: All Prisma calls remain in the service. Include `business: { include: { user: true, productPercentageCommission: true } }` in the SettlementCommission query.
6. **Historial fix**: Use state `PRE-SETTLED` only (DB and migration already use it). In `GET /api/pre-liquidacion/resultados/[fileId]` and `POST /api/pre-liquidacion/exportar/[fileId]`, filter by `status: 'PRE-SETTLED'`. In `obtenerArchivosDisponiblesPreliquidacion`, include files that have at least one SYNCHRONIZED or one PRE-SETTLED; report per-file counts so "Pendientes" and "Histórico" tabs work (sincronizados = live count SYNCHRONIZED, registrosPreliquidados = live count PRE-SETTLED).

All persistence for a single registro stays inside one `prisma.$transaction` (distributions, Clawback(s), ClawbackBalance, status update) so state is atomic.

## Architecture Decisions

### Decision: One Clawback row per ComissionDistribution when clawback applies

**Choice**: Create one `Clawback` record per `ComissionDistribution` that has `valorClawback > 0` (or, for CLAW flow, the debited amount as defined in spec). Each `Clawback` links to a single distribution via `idComissionDistribution` (unique in schema).

**Alternatives considered**: (1) One Clawback per SettlementCommission aggregating all categories — would require schema change (e.g. optional FK to SettlementCommission) or linking to “first” distribution only, and complicates audit per category. (2) No Clawback per category, only balance update — loses per-distribution audit.

**Rationale**: Schema already has 1:1 `Clawback` ↔ `ComissionDistribution`. One row per distribution keeps history clear and matches existing model. Balance is updated once per registro (sum of clawback amounts for that registro) to avoid N upserts per user per registro.

### Decision: ClawbackBalance updated once per registro (per user)

**Choice**: For each registro we compute `totalValorClawback` (sum of `valorClawback` over all categories, or for CLAW the single debited amount). We then perform one upsert on `ClawbackBalance` for `registro.business.user.idUser`: add `totalValorClawback` for Poliza (CARTERA / no-CLAW), or subtract it for Poliza CLAW.

**Alternatives considered**: Update balance after each distribution (N upserts per registro) — more writes and harder to reason about totals.

**Rationale**: One balance update per registro keeps the transaction simple and matches the “one delta per commission record” mental model. Clawback rows still provide per-category audit.

### Decision: User for Clawback and ClawbackBalance = business owner (agent)

**Choice**: `idUser` on `Clawback` and `ClawbackBalance` is the agent who owns the business: `registro.business.user.idUser`.

**Alternatives considered**: File uploader (`fileImport.idUser`) — wrong, clawback is about the agent’s commission. System user — not applicable.

**Rationale**: Aligns with proposal and domain: clawback is retained/credited to the agent associated with the business. Load-file and pre-liquidación already use `business` for product/config; we only need to include `user` in the query.

### Decision: Initial Clawback.state = 'RETENIDO'

**Choice**: When creating a `Clawback` row, set `state: 'RETENIDO'`. Leave `appliedDate`, `releaseDate`, `reason` as null until future release/apply flows.

**Alternatives considered**: Other states (e.g. 'APLICADO') — would imply clawback already applied; schema comment and proposal use “retención”.

**Rationale**: Matches existing schema comment (“Histórico de retenciones clawback”) and proposal. Release/apply will change state in a later change.

### Decision: ClawbackBalance upsert: create or increment/decrement

**Choice**: Use Prisma `upsert` on `ClawbackBalance` by `idUser`: if no row exists, create with `totalAmount = delta` (delta may be negative for CLAW). If row exists, update `totalAmount = totalAmount + delta` (delta is negative for CLAW subtract). Use raw increment/decrement or read-modify-write inside the same transaction to avoid races.

**Alternatives considered**: Always read then write — two round-trips; another process could update between read and write. Prisma does not support `increment` with negative for Decimal in all versions; use `update` with `current + delta` or two-step (find then update) inside transaction.

**Rationale**: Single transaction per registro already serializes per-user updates when processing one file. For concurrent pre-liquidaciones for different files (different users or same user), transaction isolation ensures consistency. We will use: `tx.clawbackBalance.upsert({ where: { idUser }, create: { idUser, totalAmount: delta }, update: { totalAmount: { increment: delta } } })` — but Prisma `increment` for Decimal may need a raw query or explicit read+write. Design implementation: inside transaction, `findUnique` ClawbackBalance for user; if null, create with totalAmount = delta; else update totalAmount = totalAmount + delta (using Prisma’s Decimal handling). This avoids relying on increment with negative.

### Decision: Negative ClawbackBalance allowed for CLAW flow

**Choice**: Allow `ClawbackBalance.totalAmount` to go negative when subtracting for Poliza CLAW. No cap at zero in this change.

**Alternatives considered**: Cap subtract at current balance (min(0, totalAmount - amount)) — requires product/spec rule for overdraw; “allow negative” is simpler and can be tightened later.

**Rationale**: Proposal leaves guard as optional (“if needed”). Allowing negative keeps first version simple; reporting and release/apply can enforce rules later.

### Decision: No Prisma in API route; service owns all data access

**Choice**: The API route handler (`src/app/api/pre-liquidacion/procesar/route.ts`) must **not** import or call `prisma`. It only: (1) auth, (2) parse body and validate with Zod, (3) build `rangoFecha`, (4) call `procesarPreLiquidacion(fileImportId, rangoFecha)` from the feature service, (5) map service result to HTTP status and JSON.

**Alternatives considered**: Putting the Prisma query in the route for "simplicity" — violates project rule (ARCHITECTURE.md: "NUNCA llamar Prisma desde las API routes").

**Rationale**: Aligns with existing convention: API Route = HTTP + validation + delegate to feature service. Service = Prisma + domain logic. The current route already complies; this decision makes the rule explicit for this change and any future edits.

### Decision: Domain types and pure helpers in feature; service uses them

**Choice**: Define `PreLiquidacionFlow` and a small input type for flow derivation in `src/features/pre-liquidacion/types/types.ts` (readonly where appropriate). Implement `deriveFlow(registro)` in `src/features/pre-liquidacion/lib/` as a **pure function** (no Prisma, no side effects). Service imports and uses it so business rules are testable and typed without depending on Prisma include shapes.

**Alternatives considered**: Inlining flow logic and using Prisma return types only — harder to test and couples logic to DB shape.

**Rationale**: Clean code and separation of responsibilities: types and pure logic in types/ and lib/; service orchestrates and performs persistence. Matches project preference for strict typing and small functions.

### Decision: Keep service functions small; extract transaction body if needed

**Choice**: Prefer functions under ~50 lines. If the per-registro transaction logic grows (distributions + clawbacks + balance + status), extract a dedicated function e.g. `processRegistroTransaction(tx, registro, configCategorias, flow, ...)` that the main loop calls inside `prisma.$transaction(callback)`. The exported entry point `procesarPreLiquidacion` remains orchestration only (file validation, load registros, loop, file update, email).

**Alternatives considered**: One large transaction callback — works but hurts readability and single responsibility.

**Rationale**: ARCHITECTURE.md and config favor "small functions, max 3 params". Extracting the transaction body keeps the service maintainable and testable (transaction helper can be unit-tested with a mock `tx`).

### Decision: Use only PRE-SETTLED for pre-liquidated state

**Choice**: Everywhere we refer to "pre-liquidated" commission records we use the canonical DB value `'PRE-SETTLED'`. The migration `20260224212108_update_load_file_states` already normalized data from `PRELIQUIDADO` to `PRE-SETTLED`; the code must not use `PRELIQUIDADO` in queries or filters.

**Alternatives considered**: Keeping `PRELIQUIDADO` in APIs and adding a mapping layer — would perpetuate inconsistency and require dual handling.

**Rationale**: Single source of truth; historial and export APIs currently filter by `PRELIQUIDADO` and return no rows; changing to `PRE-SETTLED` fixes that with minimal change.

### Decision: File list includes files with SYNCHRONIZED or PRE-SETTLED; two live counts per file

**Choice**: `obtenerArchivosDisponiblesPreliquidacion` (1) lists `FileImport` with `status: 'LOAD'` and `settlementCommissions: { some: { status: { in: ['SYNCHRONIZED', 'PRE-SETTLED'] } } }` so both pending and fully pre-liquidated files appear. (2) For each file we need two counts: `sincronizados` = number of `SettlementCommission` with `status: 'SYNCHRONIZED'`, `registrosPreliquidados` = number with `status: 'PRE-SETTLED'`. Prisma does not support two filtered `_count` on the same relation in one `findMany`. So we use a two-step: (a) `findMany` FileImport with the broad `where` (no _count or single _count if needed); (b) `prisma.settlementCommission.groupBy({ by: ['idFileImport', 'status'], where: { idFileImport: { in: fileIds }, status: { in: ['SYNCHRONIZED', 'PRE-SETTLED'] } }, _count: true })` to get per-file per-status counts; (c) build a map `idFileImport -> { sincronizados, registrosPreliquidados }` and merge into the archivos list.

**Alternatives considered**: (1) One _count with SYNCHRONIZED only (current) — then pre-liquidated files disappear and registrosPreliquidados is wrong. (2) Raw SQL to get both counts in one query — possible but less portable; groupBy is clear and uses Prisma. (3) N+1: for each file run two count queries — simpler but more round-trips.

**Rationale**: UI "Pendientes" uses sincronizados > 0, "Histórico" uses registrosPreliquidados > 0; both must be live counts so after pre-liquidating, files move correctly to Histórico and results/export show data. Two-step with groupBy keeps a single extra query and avoids N+1.

## Data Flow

```
  Route (POST /api/pre-liquidacion/procesar)
         │  auth, Zod, rangoFecha only — no Prisma
         ▼
  procesarPreLiquidacion(fileImportId, rangoFecha)  [service]
         │
         ▼
  FileImport validated (status === 'LOAD')            [Prisma in service]
         │
         ▼
  findMany SettlementCommission (SYNCHRONIZED, createdAt in range)
           include: { business: { include: { user: true, productPercentageCommission: true } } }
         │
         ▼
  for each registro (with business):
    ├─ deriveFlow(registro)                          [lib, pure]
    ├─ configCategorias = ProductPercentageCommissionCategory (active)
    ├─ tx.$transaction:
    │    ├─ for each category:
    │    │    ├─ valorComisionBruta, valorDescuento, valorClawback, totalDescuento, valorComisionFinal
    │    │    ├─ tx.comissionDistribution.create(...)
    │    │    └─ if (flow !== Voluntarias && valorClawback > 0 or flow === CLAW):
    │    │         tx.clawback.create({ idComissionDistribution, idUser: business.user.idUser, valueClawback, porcentajeApplied, state: 'RETENIDO' })
    │    ├─ totalValorClawback = sum(valorClawback) for registro (or CLAW amount TBD)
    │    ├─ if (flow !== Voluntarias && totalValorClawback !== 0):
    │    │    ClawbackBalance upsert (add or subtract by flow)
    │    └─ tx.settlementCommission.update({ status: 'PRE-SETTLED' })
    └─ registrosProcesados++
         │
         ▼
  FileImport.update(preLiquidacionDate); optional email
```

**Data flow — Historial (file list and results)**

```
  GET /api/pre-liquidacion/archivos
         │  auth only
         ▼
  obtenerArchivosDisponiblesPreliquidacion()  [service]
         │
         ├─ findMany FileImport (status LOAD, settlementCommissions some status in ['SYNCHRONIZED','PRE-SETTLED'])
         ├─ groupBy SettlementCommission by idFileImport, status (where status in ['SYNCHRONIZED','PRE-SETTLED'])
         ├─ build map idFileImport -> { sincronizados, registrosPreliquidados }
         └─ return archivos with live counts → UI Pendientes (sincronizados > 0) / Histórico (registrosPreliquidados > 0)

  GET /api/pre-liquidacion/resultados/[fileId]
  POST /api/pre-liquidacion/exportar/[fileId]
         │  filter: status 'PRE-SETTLED' (not PRELIQUIDADO)
         ▼
  findMany SettlementCommission → historial and export show data
```

## Code Quality and Architecture Checklist

- **API route**: No Prisma, no business logic. Auth → Zod → build params → call service → return HTTP.
- **Service**: Single place for Prisma. Orchestration + persistence; optionally extract `processRegistroTransaction` to keep functions small (under ~50 lines, max 3 params where feasible).
- **Lib**: Pure functions only (`deriveFlow`, etc.). No Prisma, no I/O. Easy to unit test.
- **Types**: Domain types in `types/types.ts`; readonly where appropriate; use in lib and service so logic does not depend on raw Prisma shapes.
- **Testing**: Unit tests for lib (deriveFlow and helpers); unit tests for service with mocked Prisma (per-flow behavior, no clawback for Voluntarias, balance add/subtract). Follow project TDD and colocated tests in `__tests__/`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/pre-liquidacion/procesar/route.ts` | No change | Already compliant: no Prisma; only auth, Zod, call service, return response. Do **not** add any Prisma or business logic here. |
| `src/features/pre-liquidacion/types/types.ts` | Modify | Add `PreLiquidacionFlow` union type and `DeriveFlowInput` (readonly fields) for flow derivation. Used by lib and service for strict typing. |
| `src/features/pre-liquidacion/lib/pre-liquidacion-flow.ts` | Create | Pure helpers: `deriveFlow(registro: DeriveFlowInput): PreLiquidacionFlow`, optionally `shouldPersistClawback(flow): boolean`, `getClawbackBalanceDelta(flow, totalValorClawback)`. No Prisma. |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | Add `business: { include: { user: true } }` to findMany. Import `deriveFlow` from lib; use it per registro. Inside transaction: create distributions, create Clawback(s) when applicable, upsert ClawbackBalance, update status. Optionally extract `processRegistroTransaction(tx, ...)` to keep functions under ~50 lines. All Prisma stays in this file. |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts` | Modify | Add mocks for prisma.clawback.create, prisma.clawbackBalance (findUnique + create/update). Tests per flow (Voluntarias, Poliza add, Poliza CLAW subtract). Extend existing test with commissionType/isClawback; assert no clawback when Voluntarias. |
| `src/features/pre-liquidacion/lib/__tests__/pre-liquidacion-flow.test.ts` | Create | Unit tests for `deriveFlow()` (all combinations) and any other pure helpers. |
| `src/app/api/pre-liquidacion/resultados/[fileId]/route.ts` | Modify | Change `where.status` from `'PRELIQUIDADO'` to `'PRE-SETTLED'` so historial results return data. |
| `src/app/api/pre-liquidacion/exportar/[fileId]/route.ts` | Modify | Change `where.status` from `'PRELIQUIDADO'` to `'PRE-SETTLED'` so export returns data. |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` (obtenerArchivosDisponiblesPreliquidacion) | Modify | Where: include files with `settlementCommissions: { some: { status: { in: ['SYNCHRONIZED', 'PRE-SETTLED'] } } }`. Two-step: findMany then groupBy SettlementCommission by idFileImport and status; build map of counts; set `sincronizados` and `registrosPreliquidados` from that map (live counts). |

## Interfaces / Contracts

No new public API contracts. Internal typing and contracts:

- **Types** (`types/types.ts`): Domain types with readonly where appropriate.

```ts
// Flow enum for pre-liquidación clawback behavior
export type PreLiquidacionFlow =
  | 'VOLUNTARIA'
  | 'POLIZA_CARTERA'
  | 'POLIZA_NO_CLAW'
  | 'POLIZA_CLAW'

// Input for pure flow derivation (no Prisma shape leakage)
export interface DeriveFlowInput {
  readonly commissionType: string
  readonly originCommission: string | null
  readonly isClawback: boolean
}
```

- **Lib** (`lib/pre-liquidacion-flow.ts`): Pure function, no Prisma.

```ts
import type { DeriveFlowInput, PreLiquidacionFlow } from '../types/types'

export function deriveFlow(registro: DeriveFlowInput): PreLiquidacionFlow {
  if (registro.commissionType === 'VOLUNTARIA') return 'VOLUNTARIA'
  if (registro.commissionType === 'POLIZA' && registro.isClawback) return 'POLIZA_CLAW'
  if (registro.commissionType === 'POLIZA' && registro.originCommission === 'CARTERA') return 'POLIZA_CARTERA'
  if (registro.commissionType === 'POLIZA') return 'POLIZA_NO_CLAW'
  return 'VOLUNTARIA'
}
```

- **Service**: Uses `deriveFlow(registro)` with registro fields (service receives Prisma result but passes only the minimal shape to lib). All Prisma calls (Clawback create, ClawbackBalance read/upsert) stay inside the service.

- **Clawback create** (in service, inside tx): `idUser`, `idComissionDistribution`, `valueClawback`, `porcentajeApplied` (Decimal), `state: 'RETENIDO'`. Optional: `reason` for traceability.

- **ClawbackBalance**: Upsert key `idUser`. Create: `{ idUser, totalAmount: delta }`. Update: `totalAmount = current + delta`. Use transaction-scoped read then write if Prisma `increment` for Decimal is not suitable.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (lib) | `deriveFlow()` | All combinations of commissionType, originCommission, isClawback map to correct PreLiquidacionFlow. No mocks; pure function. Colocated: `lib/__tests__/pre-liquidacion-flow.test.ts`. |
| Unit (service) | `procesarPreLiquidacion` Voluntarias | Mock Prisma; registro with commissionType 'VOLUNTARIA'; assert ComissionDistribution.create called; assert Clawback create and ClawbackBalance never called. |
| Unit (service) | `procesarPreLiquidacion` Poliza with clawback > 0 | Mock Prisma; registro POLIZA, clawbackPercentage 0.1, business.user.idUser; assert Clawback create per category with valorClawback > 0, ClawbackBalance updated with positive delta. |
| Unit (service) | `procesarPreLiquidacion` Poliza CLAW | Mock Prisma; registro POLIZA, isClawback true; assert Clawback create (amount TBD), ClawbackBalance with negative delta. |
| Unit (service) | Transaction atomicity | Mock to throw on clawback.create; expect entire transaction rolls back (no PRE-SETTLED, no distributions). |
| Unit (service) | obtenerArchivosDisponiblesPreliquidacion | Mock findMany and groupBy; assert files with only PRE-SETTLED appear and registrosPreliquidados is count PRE-SETTLED; assert files with only SYNCHRONIZED have registrosPreliquidados 0. Optional. |
| API | Route does not call Prisma | No test needed if route is unchanged; manual/review check that route only calls service. |
| API (resultados / exportar) | Filter uses PRE-SETTLED | Manual or integration: after pre-liquidating, GET resultados and POST exportar return data. |
| Integration | E2E pre-liquidación with real DB | Optional: create FileImport + SettlementCommission (POLIZA, business.user), run procesarPreLiquidacion, query Clawback and ClawbackBalance; verify historial shows file and results. |

## Migration / Rollout

No migration required. No schema changes. Existing pre-liquidated data has no Clawback/ClawbackBalance rows; backfill is out of scope. Deploy as usual; new pre-liquidaciones will start creating Clawback and updating ClawbackBalance by flow.

## Open Questions

- [ ] **CLAW amount**: For Poliza CLAW, `clawbackPercentage` is 0 so `valorClawback` per category is 0. The amount to subtract from balance (and to store in `Clawback.valueClawback`) must be defined in spec: e.g. fixed per registro, or `baseCommission * X`, or minimum of (user balance, Y). Until then, implementation can stub (e.g. 0 or skip CLAW balance subtract) or implement a placeholder rule and mark with TODO.
- [ ] **One vs N Clawback rows for CLAW**: If CLAW debits a single amount per registro, we could create one Clawback row linked to the first ComissionDistribution only (with that amount), or one per category with a share of the amount. Schema allows only 1:1 Clawback–ComissionDistribution; recommend one Clawback per distribution with `valueClawback = totalDebit / categories.length` or one Clawback for the first distribution with `valueClawback = totalDebit` (others 0). Spec should confirm.
- [ ] **ClawbackBalance upsert and Decimal**: Prisma `update` with `{ totalAmount: current.add(delta) }` requires a read first. Confirm whether `upsert` with raw SQL or `increment` (if supported for Decimal in project’s Prisma version) is preferred to avoid two round-trips.
