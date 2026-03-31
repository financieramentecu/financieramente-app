# Tasks: Commission Distribution Modal

## Phase 1: Foundation — Types & API Route

- [x] 1.1 In `src/features/pre-liquidacion/types/types.ts`, add `ItemDistribucionComision`, `DistribucionComision`, and `RespuestaDistribucionComision` interfaces exactly as specified in design.md (readonly ids, clawback as nested object or null). `ItemDistribucionComision` must include `readonly value_commission_final: number` (final settled commission amount).
- [x] 1.1.1 Add `readonly value_commission_final: number` to the `ItemDistribucionComision` interface in `src/features/pre-liquidacion/types/types.ts` (alongside `comisionBruta`, `comisionNeta`, etc.).
- [x] 1.1.2 Add `readonly value_clawback_percentage: number` to the `ItemDistribucionComision` interface in `src/features/pre-liquidacion/types/types.ts` (represents the clawback percentage applied to the commission record).
- [x] 1.2 Create directory `src/app/api/pre-liquidacion/distribucion/[settlementCommissionId]/` and add `route.ts`: GET handler with `auth()` session check, role guard (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE), parse `settlementCommissionId` as integer, call service, return `ApiResponse<RespuestaDistribucionComision>` (200) or 404 if null.

## Phase 2: Data Layer — Service & Hook

- [x] 2.1 In `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`, add `obtenerDistribucionComision(id: number)`: single `prisma.comissionDistribution.findMany` with the 4-level include chain (productPercentageCommissionCategory → category + productPercentageCommission → productConfiguration → product + clientOrigin; settlementCommission → business → user; clawback). Map results to `DistribucionComision`; apply `porcentajePortfolio` when `typeCategory === 'CARTERA'`, otherwise `porcentajeDistribucion`. Return null if no rows found.
- [x] 2.2 Create `src/features/pre-liquidacion/hooks/use-distribucion-comision.ts`: `useDistribucionComision(id: number | null)` using `AsyncState<DistribucionComision>`. `useCallback`-wrapped fetch fn; `useEffect` on `id` change (skip fetch when id is null). Mirror `useComisionesPreliquidadas` pattern exactly.

## Phase 3: UI Components & Wiring

- [x] 3.1 Create `src/features/pre-liquidacion/components/ModalDetalleDistribucion.tsx` (`'use client'`): props `{ idSettlementCommission: number | null; open: boolean; onClose: () => void }`. Uses `useDistribucionComision`. Renders: loading spinner (see 3.1.1), error message, empty-state when `distribuciones.length === 0`, and full layout (header section with categoria/producto/origen/nombreAsesor + distribution rows table with columns: categoria, comisionBruta, porcentajeDistribucion, totalDescuento, porcentajeDescuento, value_commission_final "Comisión final", clawback). Uses `Modal` from `src/features/shared/ui/modal.tsx` with `size="xl"` and `DialogContent className="max-w-4xl"` (see 3.1.2).
- [x] 3.1.1 In `ModalDetalleDistribucion`, when `status === 'loading'`, render a centered `Loader2` icon from `lucide-react` with `animate-spin` class inside a centered `<div>` — do NOT render blank content or a skeleton.
- [x] 3.1.2 Apply `className="max-w-4xl"` to `DialogContent` in `ModalDetalleDistribucion` so the modal opens at large size for comfortable table readability.
- [x] 3.1.3 Add a "Comisión final" column to the distribution rows table in `ModalDetalleDistribucion`, mapping to `value_commission_final` formatted as currency.
- [x] 3.1.4 Add a "% Clawback aplicado" column to the distribution rows table in `ModalDetalleDistribucion`, mapping to `value_clawback_percentage` rendered as `{Math.round(value_clawback_percentage * 100)}%` (no decimals). Note: stored as decimal 0–1; multiply by 100 for display.
- [x] 3.1.5 Reorder table columns to: Categoría | Comisión Bruta | % Descuento | Total Descuento | % Clawback | Descuento Clawback | Tipo Clawback | % Distribución de Comisión | Comisión Final.
- [x] 3.1.6 Add "Tipo Clawback" column: render `clawback.estado` as `<Badge variant="neutral">` from `@/features/shared/ui/badge`; show `—` when `clawback` is null.
- [x] 3.1.7 Render `value_commission_final` cell with `font-bold` class.
- [x] 3.2 In `src/features/pre-liquidacion/components/RegistrosLiquidacionTable.tsx`, add `onVerDistribucion: (id: number) => void` to the component props interface and render a "Detalle de Distribución" `Button` in the actions `<td>` for each row, calling `onVerDistribucion(row.idSettlementCommission)`.
- [x] 3.3 In `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx`, add `selectedCommissionId` (`number | null`) and `modalDistribucionOpen` (`boolean`) state; add `handleVerDistribucion` callback that sets both; pass `onVerDistribucion={handleVerDistribucion}` to `<RegistrosLiquidacionTable>`; render `<ModalDetalleDistribucion idSettlementCommission={selectedCommissionId} open={modalDistribucionOpen} onClose={() => setModalDistribucionOpen(false)} />`.

## Phase 4: Testing

- [x] 4.1 Create `src/features/pre-liquidacion/__tests__/use-distribucion-comision.test.ts`: test idle state when id is null; test loading → success transition with mocked `global.fetch` returning valid `RespuestaDistribucionComision`; test loading → error on fetch failure.
- [x] 4.2 Create `src/features/pre-liquidacion/__tests__/ModalDetalleDistribucion.test.tsx`: render with mocked hook returning `{ state: 'loading' }` → verify skeleton; `{ state: 'success', data: { distribuciones: [] } }` → verify empty-state message; `{ state: 'success', data: { distribuciones: [...] } }` → verify header fields and table rows rendered; `{ state: 'error' }` → verify error message shown.
- [x] 4.3 Extend `src/features/pre-liquidacion/__tests__/RegistrosLiquidacionTable.test.tsx`: verify "Detalle de Distribución" button renders per row; `fireEvent.click` calls `onVerDistribucion` with the correct `idSettlementCommission`.
- [x] 4.4 Create `src/app/api/pre-liquidacion/distribucion/[settlementCommissionId]/__tests__/route.test.ts`: test 401 when `auth()` returns null; test 403 when role not in allowed list; test 400 on non-numeric id param; test 404 when service returns null; test 200 with correctly shaped `ApiResponse<RespuestaDistribucionComision>`.
- [x] 4.5 Run `npm run type-check` and `npm run test:unit` — all must pass with zero TypeScript errors and no `any` types introduced.
