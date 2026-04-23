# Tasks: H6 — Listado principal de negocios mejorado

## Phase 1: Types and row shape

- [x] 1.1 Add `BUSINESS_STATUS.LIQUIDADO` and extend `BusinessStatus` in `src/features/negocios/types/business-entity.types.ts`.
- [x] 1.2 Extend `Business` in `src/features/negocios/types/business.types.ts`: Spanish `status` union includes Liquidado; add required `statusCode` typed from `business-entity.types`.

## Phase 2: Badge and mapping

- [x] 2.1 Add `LIQUIDADO` to `STATUS_CONFIG` in `src/features/negocios/components/ui/BusinessStatusBadge.tsx` (label “Liquidado”, DS-consistent classes).
- [x] 2.2 Update `businessDataForTable` in `src/app/dashboard/negocios/negocios-page-client.tsx`: map every `BUSINESS_STATUS` including `LIQUIDADO`; set `statusCode: b.status`; default branch MUST NOT assign `'Cancelado'` unless `CANCELADO` (spec: accurate canceled presentation).
- [x] 2.3 *(Optional but recommended)* Extract mapping to `src/features/negocios/lib/map-entity-to-table-row.ts` and call it from the `useMemo` for unit-test isolation.

## Phase 3: Table UI and filters

- [x] 3.1 In `src/features/negocios/components/BusinessTableSection.tsx`, replace `getStatusBadge` with `<BusinessStatusBadge status={row.original.statusCode} />` on the estado column (spec: parity with modals).
- [x] 3.2 Update `LIST_STATUS_OPTIONS`: include `LIQUIDADO`; remove `COMISIONANDO` from filter options (spec: renewed filter).
- [x] 3.3 Rename creation column header from “Fecha” to “Fecha creación” (`accessorKey` `date`) per spec.
- [x] 3.4 Refactor `actions` toolbar in `BusinessTableSection.tsx` to branch on `row.statusCode` / `BUSINESS_STATUS` instead of Spanish strings; define `LIQUIDADO` behavior per product decision (mirror design open question if still unset—document TODO in code only if blocked).

## Phase 4: Tests (TDD-friendly order)

- [x] 4.1 Extend `src/features/negocios/__tests__/components/ui/BusinessStatusBadge.test.tsx`: `LIQUIDADO` renders “Liquidado” and expected classes.
- [x] 4.2 Add mapper tests (inline or against extracted helper): each known `BusinessStatus` → correct `status` + `statusCode`; unknown status → not labeled Cancelado (spec: unknown/unmapped).
- [x] 4.3 Add RTL coverage for list filter: options include Liquidado-equivalent and exclude Comisionando (spec: renewed filter scenarios)—use minimal render of `BusinessTableSection` or filter fragment as appropriate.

## Phase 5: Verification

- [x] 5.1 Run unit tests for `negocios` and fix regressions (`npm run test` or scoped Vitest for touched files).
- [x] 5.2 Run ESLint on edited files and resolve new issues.

## Phase 6: Ciclo EMITIDO → FONDEADO → LIQUIDADO (pre-liquidación)

- [x] 6.1 En `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`, asegurar que al liquidar el `updateMany` de negocios solo afecte filas con `status: 'FONDEADO'` y las deje en `'LIQUIDADO'` (no `EMITIDO` → `LIQUIDADO`).
- [x] 6.2 Actualizar comentarios/JSDoc en el flujo de `liquidarRegistros` / `updateBusinessStatusOnSettle` para documentar el orden canónico de estados.
- [x] 6.3 Ajustar `src/features/pre-liquidacion/__tests__/services/pre-liquidacion.service.test.ts` al `where` esperado (`FONDEADO`).
- [x] 6.4 Documentar en OpenSpec: `specs/pre-liquidacion/spec.md` + alineación en `proposal.md` / `design.md` (este cambio).
