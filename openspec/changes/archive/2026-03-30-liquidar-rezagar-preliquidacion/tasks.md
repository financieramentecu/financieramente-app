# Tasks: Liquidar y Rezagar Pre-liquidaciones

## Baseline (implemented)

- [x] **1.x–2.x** — `SettlementCommission` lag fields + migration; `COMISIONANDO` in `src/features/negocios/types/*`, `business-api.schemas.ts`
- [x] **3.x–4.x** — `pre-liquidacion.service.ts`: `applyClawbacksForSettlement`, `updateBusinessStatusOnSettle`, `liquidarRegistros` transaction, `rezagarRegistros`; `BusinessStatusBadge.tsx`
- [x] **5.x** — Unit tests in `__tests__/services/pre-liquidacion.service.test.ts`, `services/pre-liquidacion.service.test.ts`, API `liquidar`/`rezagar`, `BusinessStatusBadge.test.tsx`

## Phase 6: Verification & docs

- [x] 6.1 Scoped `vitest` + `npm run type-check` on change files
- [x] 6.2 `proposal.md` success criteria (dual gate per 7.4)
- [x] 6.3 Archive change (`openspec-archive`) after sign-off and fresh verify

## Phase 7: File dual-gate + COMISIONANDO (delta spec + design)

- [x] 7.1 `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` — In `liquidarRegistros`, set `fileCompleted` and `fileImport.update` to `COMPLETED` only when **both** `settlementCommission.count({ idFileImport: fileId, status: 'SYNCHRONIZED' })` and `count({ …, status: 'PRE-SETTLED' })` are **0**
- [x] 7.2 `src/features/pre-liquidacion/__tests__/services/pre-liquidacion.service.test.ts` and `services/pre-liquidacion.service.test.ts` — Mock both counts; **partial** Liquidar (PRE-SETTLED remain) → no `COMPLETED`; **SYNCHRONIZED** > 0 → no `COMPLETED`; both 0 → `COMPLETED` + `fileCompleted`
- [x] 7.3 **COMISIONANDO** — Dedupe `businessIds` in `liquidarRegistros`; EMITIDO filter unchanged; env checklist in design if issues persist
- [x] 7.4 `openspec/changes/liquidar-rezagar-preliquidacion/proposal.md` — Success criteria: file `COMPLETED` only with **zero SYNCHRONIZED and zero PRE-SETTLED**
- [x] 7.5 Refresh `verify-report.md`, run scoped tests + type-check, then `/sdd-verify`
