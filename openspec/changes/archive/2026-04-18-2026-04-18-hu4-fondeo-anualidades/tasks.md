# Tasks: HU4 — Fondeo con anualidades

## Phase 1: Foundation

- [x] 1.1 Add `BUSINESS_ANNUAL_FUNDED` to `AuditAction` in `src/features/auth/lib/audit-logger.ts`.
- [x] 1.2 Create `src/features/negocios/lib/fondear-anualidades.schema.ts`: Zod `{ fundedInstallmentIndexes }`, export type.

## Phase 2: API routes

- [x] 2.1 Create `src/app/api/negocios/[id]/annual-payments/route.ts`: GET, auth + AGENTE guard como `[id]/route.ts`, installments por `installmentIndex`.
- [x] 2.2 Create `src/app/api/negocios/[id]/fondear-anualidades/route.ts`: POST, Zod, roles=`fondear`, padre `EMITIDO` ó (`FONDEADO`+pending), `$transaction`, audit, `prismaBusinessToEntity`.

## Phase 3: Client integration

- [x] 3.1 `business.service.ts`: `getAnnualPayments`, `fondearAnualidades`.
- [x] 3.2 `use-business-mutation.ts`: `fondearAnualidadesBusiness`, loading, toasts.

## Phase 4: UI

- [x] 4.1 `AnnualFundingModal.tsx`: dialog, checkboxes `SIN_FONDEAR`, fechas `FONDEADO`, `contractLabel` en título.
- [x] 4.2 `BusinessTableSection.tsx`: `showFondearDirect` / `showFondearAnnual`, toolbar DataTable, labels desde `fondear-action-copy.ts`.
- [x] 4.3 `negocios-page-client.tsx`: rama anual → GET cuotas + modal; `annualFundingContract`; confirm → hook + refetch.
- [x] 4.4 `ActionCell.tsx`: mismos gates + `hasPendingAnnualFunding`, labels anual/directo.
- [x] 4.5 `fondear-action-copy.ts`: `FONDEAR_ANNUAL_LABEL`, tooltips directo vs anual.
- [x] 4.6 `business-prisma.types.ts` + `business-entity.mapper.ts` + `business.types.ts`: `hasPendingAnnualFunding`, include cuotas pending.

## Phase 5: Testing & verification

- [x] 5.1 `fondear-anualidades/__tests__/route.test.ts`: 401, 400 índices sin match, 200+`BUSINESS_ANNUAL_FUNDED`.
- [x] 5.2 `annual-payments/__tests__/route.test.ts`: orden + AGENTE 404 ajeno.
- [x] 5.3 `fondear-anualidades.schema.test.ts`: vacío, índice inválido, dedupe.
- [x] 5.4 `action-cell.test.tsx`: «Fondear» / «Fondear anualidad», `FONDEADO`+pending, ANALISTA.
- [x] 5.5 Ejecutar suites tocadas + smoke manual delta spec.

## Phase 6: Test backlog (post-verify)

- [x] 6.1 `fondear-anualidades/__tests__/route.test.ts`: caso padre **FONDEADO**, segunda tanda solo actualiza `AnnualPayment`.
- [x] 6.2 Mismo archivo: idempotencia — índice ya **FONDEADO** no baja a `SIN_FONDEAR`.
- [x] 6.3 RTL `AnnualFundingModal`: título incluye texto de `contractLabel` (y fallback id si vacío).
