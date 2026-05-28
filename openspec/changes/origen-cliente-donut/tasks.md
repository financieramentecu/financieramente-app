# Tasks: Gráfica dona Origen del cliente

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 600–750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Foundation + Service + Route + Tests → PR 2: Hook + Lib + UI + Shell Integration + Tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types + Service + Route (backend slice) | PR 1 | Targets `feat/table-dashboard`; includes service + route tests |
| 2 | Lib helpers + Hook + UI components + Shell integration | PR 2 | Targets PR 1 branch; includes hook, lib, component tests |

---

## Phase 1: Foundation — Types & Pure Lib

- [x] 1.1 Add `OriginDonutQueryParams`, `OriginDonutRaw`, `OriginDonutSlice` interfaces to `src/features/production-dashboard/types/production-kpi.types.ts`. Use `readonly` on all fields.
- [x] 1.2 Create `src/features/production-dashboard/lib/origin-donut-colors.ts` with `ORIGIN_BASE_PALETTE`, `ORIGIN_LIGHT_PALETTE`, `COP_CURRENCY_ID = 1`, `resolveDonutColor(paletteIndex, currencyId)`, `buildOriginPaletteMap(originIds)`.
- [x] 1.3 Create `src/features/production-dashboard/lib/origin-donut-aggregate.ts` with `aggregateOriginDonut(raw: readonly OriginDonutRaw[]): OriginDonutSlice[]` (computes percentage + fill; returns `[]` on empty/zero totalCount).

---

## Phase 2: Service

- [x] 2.1 Create `src/features/production-dashboard/services/origin-donut.service.ts` — `getOriginDonutRaw(params: OriginDonutQueryParams): Promise<OriginDonutRaw[]>`.
  - Short-circuit `userIds.length === 0 → return []`.
  - `prisma.business.groupBy({ by: ['idClientOrigin', 'idCurrency'], where: buildProductionWhereClause(params), _count: { idBusiness: true } })`.
  - Parallel `Promise.all` for `clientOrigin.findMany` (no `status` filter) and `currency.findMany`.
  - Fallback names `Origen #N` / `#N` when join misses.
  - Returns `OriginDonutRaw[]` (no percentage, no fill).

---

## Phase 3: API Route

- [x] 3.1 Create `src/app/api/production-dashboard/by-origin/route.ts`.
  - Parse `userIds`, `dateFrom`, `dateTo`, `statuses`, `categoryIds`, `productIds`, `companyIds`, `originIds`, `plazos`, `periodicidades` from `searchParams` (duplicate helpers from `ms-chart/route.ts` per ADR-D4).
  - Return 401 when no session, 400 when `userIds` missing/invalid.
  - Call `getOriginDonutRaw(params)`, wrap in `{ data }`, return 200.
  - Return 500 on service throw; no Prisma import in route file.

---

## Phase 4: Tests — Service & Route (RED → GREEN)

- [x] 4.1 Create `src/features/production-dashboard/__tests__/lib/origin-donut-colors.test.ts`.
  - `buildOriginPaletteMap` stable regardless of input order.
  - `resolveDonutColor` returns `ORIGIN_LIGHT_PALETTE[idx]` for `COP_CURRENCY_ID=1`, `ORIGIN_BASE_PALETTE[idx]` otherwise.
  - Modulo wraps correctly when `paletteIndex >= 8`.
- [x] 4.2 Create `src/features/production-dashboard/__tests__/lib/origin-donut-aggregate.test.ts`.
  - Empty input → `[]`.
  - Percentages of all slices sum to 100 ± 0.1.
  - Each slice `fill` matches expected palette color.
- [x] 4.3 Create `src/features/production-dashboard/__tests__/services/origin-donut.service.test.ts`.
  - `userIds = []` → `[]` without calling `prisma.business.groupBy`.
  - Normal groupBy result → correct `OriginDonutRaw[]` with joined names.
  - Missing origin/currency → fallback names `Origen #N` / `#N`.
  - Deactivated origin (no `status: true` in `clientOrigin.findMany` args).
  - `buildProductionWhereClause` called with parsed params.
- [x] 4.4 Create `src/features/production-dashboard/__tests__/services/by-origin.route.test.ts`.
  - 401 when no session.
  - 400 when `userIds` missing.
  - 400 when `userIds` non-integer.
  - 200 `{ data: [] }` when `userIds` empty CSV.
  - 200 with service result on valid input.
  - 500 on service throw.

---

## Phase 5: Hook

- [ ] 5.1 Create `src/features/production-dashboard/hooks/use-origin-donut.ts`.
  - Reads `HierarchySelectionContext` (`selectedUserIds`) and `DashboardFilterContext` (`appliedFilters`).
  - Returns `AsyncState<OriginDonutSlice[]>`.
  - `useEffect` deps: `[selectedUserIds, appliedFilters, selfUserId]`.
  - Uses `cancelled` flag + `AbortController.abort()` (ADR-D5).
  - On success: calls `aggregateOriginDonut(body.data)` to build slices before setting state.
  - Mirrors auth/hierarchy gating from `use-ms-bar-chart.ts`.

---

## Phase 6: UI Components

- [ ] 6.1 Create `src/features/production-dashboard/components/OriginDonutTooltip.tsx` (pure, no hooks).
  - Props: Recharts `active`, `payload`, `trmRate: number | null`.
  - Line 1: `"[originName] · [currencyName]"`, Line 2: `"NN negocios (NN.N%)"`.
  - Does NOT render a TRM COP line (ADR-D3); accepts `trmRate` as a prop for forward-compat only.
- [ ] 6.2 Create `src/features/production-dashboard/components/OriginDonutLegend.tsx` (pure, no hooks).
  - Props: `slices: readonly OriginDonutSlice[]`.
  - Sorted descending by `percentage`.
  - Each item: color swatch (fill), `"[originName] [currencySymbol] · XX.X%"` (uses `currencyName` from `OriginDonutSlice`; confirmed design decision: legend label uses `Currency.symbol` e.g. "USD", "COP").
  - Empty `slices` → renders nothing.
- [ ] 6.3 Create `src/features/production-dashboard/components/OriginDonutChart.tsx` (pure renderer, `'use client'`).
  - Props: `{ chartState: AsyncState<OriginDonutSlice[]>, trmRate: number | null }`.
  - `loading | idle` → `<OriginDonutSkeleton />` (pulse div matching 320px height).
  - `error` → error card (red text, message from state).
  - `success && data.length === 0` → neutral icon + "Sin negocios para los filtros aplicados".
  - `success && data.length > 0` → `<ResponsiveContainer height={320}><PieChart><Pie innerRadius={60} outerRadius={110} dataKey="count">{cells}</Pie><Tooltip content={<OriginDonutTooltip />} /><Legend content={<OriginDonutLegend />} /></PieChart></ResponsiveContainer>`.
- [ ] 6.4 Create `src/features/production-dashboard/components/OriginDonutPanel.tsx` (`'use client'`, thin wrapper).
  - Props: `{ trmRate: number | null }`.
  - Calls `useOriginDonut()`.
  - Renders `<section><h2>Distribución por origen del cliente</h2><OriginDonutChart chartState={...} trmRate={trmRate} /></section>`.

---

## Phase 7: Tests — Hook & Components (RED → GREEN)

- [ ] 7.1 Create `src/features/production-dashboard/__tests__/hooks/use-origin-donut.test.ts`.
  - Returns `idle` when `selectedUserIds` is empty and `selfUserId` not resolved.
  - `loading` then `success` on happy path; `data` passes through `aggregateOriginDonut`.
  - `error` state when `fetch` returns non-OK.
  - Cancels prior fetch when `selectedUserIds` changes mid-flight; final state reflects second call only.
  - Aborts via `controller.abort()` on unmount.
- [ ] 7.2 Create `src/features/production-dashboard/__tests__/components/OriginDonutChart.test.tsx`.
  - Renders skeleton when `loading`.
  - Renders skeleton when `idle`.
  - Renders empty state when `success` + `data = []`.
  - Renders `<svg>` with N `<path>` elements when `success` + data has N slices.
  - Renders error card when `error`.

---

## Phase 8: Shell Integration

- [ ] 8.1 Modify `src/features/production-dashboard/components/DashboardShell.tsx`:
  - Import `OriginDonutPanel`.
  - Insert `<OriginDonutPanel trmRate={trmRate} />` between `<UsdKpiPanel ... />` and `<MsBarChartPanel ... />`.
  - Confirm `trmRate` is already in scope at insertion point (it is, per ADR-D6).

---

## Phase 9: Smoke / Integration

- [ ] 9.1 Run `npm run type-check` — zero new errors.
- [ ] 9.2 Run `npm run test:unit` — all new tests green.
- [ ] 9.3 Manual smoke: load dashboard as Partner (MIA) → donut renders with correct slices; change a filter → donut re-fetches.
- [ ] 9.4 Manual smoke: load dashboard as MS Junior → donut shows only own negocios.
