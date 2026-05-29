# Design: Gráfica de dona "Origen del cliente" — Production Dashboard

## Architecture Approach

Strict layering parallel to the existing `ms-chart` slice of the Production Dashboard feature:

```
HTTP   src/app/api/production-dashboard/by-origin/route.ts        (no Prisma)
  ↓
Service src/features/production-dashboard/services/origin-donut.service.ts   (all Prisma)
  ↓
Hook   src/features/production-dashboard/hooks/use-origin-donut.ts          (AsyncState + AbortController)
  ↓
UI     OriginDonutPanel (container) → OriginDonutChart (pure renderer)
                                       ├── OriginDonutTooltip
                                       └── OriginDonutLegend
Pure   src/features/production-dashboard/lib/origin-donut-colors.ts         (hue × luminosity resolver)
```

Filter parity with the rest of the dashboard is enforced by reusing `buildProductionWhereClause` from `ms-chart.service.ts` — exactly one source of truth for the WHERE shape across KPIs, MS chart, heatmap, and now donut.

## Component Tree (rendered inside `DashboardShell`)

```
DashboardShell (existing)
 └── ShellContent
      └── (NEW) OriginDonutPanel { trmRate }
            └── OriginDonutChart { chartState, trmRate }
                  └── ResponsiveContainer (height 320)
                        └── PieChart
                              ├── Pie (innerRadius 60, outerRadius 110, dataKey "count")
                              │     └── Cell × N   (fill from origin-donut-colors)
                              ├── Tooltip content={<OriginDonutTooltip trmRate={trmRate} />}
                              └── Legend content={<OriginDonutLegend slices={data} />}
```

`OriginDonutPanel` follows the same shape as `MsBarChartPanel` (thin container that calls the hook). It is inserted in `ShellContent` between `<UsdKpiPanel>` and `<MsBarChartPanel>`.

## Decision 1 — Prisma groupBy query shape

Service `getOriginDonutRaw(params)`:

```ts
// Short-circuit
if (params.userIds.length === 0) return []

const rows = await prisma.business.groupBy({
  by: ['idClientOrigin', 'idCurrency'],
  where: buildProductionWhereClause(params),
  _count: { idBusiness: true },
})

if (rows.length === 0) return []

const originIds = Array.from(new Set(rows.map(r => r.idClientOrigin)))
const currencyIds = Array.from(new Set(rows.map(r => r.idCurrency)))

const [origins, currencies] = await Promise.all([
  prisma.clientOrigin.findMany({
    where: { idClientOrigin: { in: originIds } },
    // NO status filter — historical names preserved (proposal Risk #1)
    select: { idClientOrigin: true, name: true },
  }),
  prisma.currency.findMany({
    where: { idCurrency: { in: currencyIds } },
    select: { idCurrency: true, name: true, symbol: true },
  }),
])

const originById   = new Map(origins.map(o => [o.idClientOrigin, o.name]))
const currencyById = new Map(currencies.map(c => [c.idCurrency, { name: c.name, symbol: c.symbol }]))

return rows.map(r => ({
  originId:    r.idClientOrigin,
  originName:  originById.get(r.idClientOrigin) ?? `Origen #${r.idClientOrigin}`,
  currencyId:  r.idCurrency,
  currencyName: currencyById.get(r.idCurrency)?.name ?? `#${r.idCurrency}`,
  count:       r._count.idBusiness ?? 0,
})) satisfies OriginDonutRaw[]
```

Percentage is NOT computed in the service. The hook (or a pure helper in `lib/origin-donut-aggregate.ts`) computes `percentage = count / totalCount * 100` after summing.

Rationale: keep the service free of presentation concerns and trivially testable as a name-join pure mapper.

## Decision 2 — Color palette strategy

A pure file `lib/origin-donut-colors.ts`:

```ts
/** Base hue palette — 8 deterministic, accessible colors used across slices. */
export const ORIGIN_BASE_PALETTE = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#dc2626', // red-600
  '#9333ea', // purple-600
  '#ea580c', // orange-600
  '#0891b2', // cyan-600
  '#ca8a04', // yellow-600
  '#db2777', // pink-600
] as const

/** Lightened sibling for COP slices — visually paired with USD solid. */
export const ORIGIN_LIGHT_PALETTE = [
  '#93c5fd', // blue-300
  '#86efac', // green-300
  '#fca5a5', // red-300
  '#d8b4fe', // purple-300
  '#fdba74', // orange-300
  '#67e8f9', // cyan-300
  '#fde047', // yellow-300
  '#f9a8d4', // pink-300
] as const

/** COP currency id — single source of truth, also used by ms-chart.service.ts */
export const COP_CURRENCY_ID = 1

/**
 * Resolves the fill color for a (originId × currencyId) slice.
 * Assignment of origins to palette indices is deterministic by sort order
 * of originIds in the dataset (assigned once by the caller).
 *
 * @param paletteIndex  Index into the palette, already resolved by caller.
 * @param currencyId    From the slice.
 */
export function resolveDonutColor(paletteIndex: number, currencyId: number): string {
  const idx = paletteIndex % ORIGIN_BASE_PALETTE.length
  return currencyId === COP_CURRENCY_ID
    ? ORIGIN_LIGHT_PALETTE[idx]
    : ORIGIN_BASE_PALETTE[idx]
}

/**
 * Builds a Map<originId, paletteIndex> from a sorted list of unique origin ids.
 * Sort ascending so the same dataset always yields the same color mapping
 * across renders and reloads.
 */
export function buildOriginPaletteMap(originIds: readonly number[]): ReadonlyMap<number, number> {
  const sorted = [...new Set(originIds)].sort((a, b) => a - b)
  return new Map(sorted.map((id, i) => [id, i]))
}
```

Rationale for color-by-index (not by id):
- IDs may be sparse or large; modulo would still work but indices yield perceptually adjacent origins different hues consistently.
- Sorting ascending makes the mapping stable across renders (no dependency on Map iteration order from a Set).

Rationale for lightness pairing instead of opacity:
- Fixed hex pairs survive on any background and look correct in the legend.
- Opacity in Recharts `Cell` interacts with hover effects and is harder to keep accessible.

## Decision 3 — API contract

**Request**: `GET /api/production-dashboard/by-origin`

Query params (identical parser set to `ms-chart/route.ts`):
- `userIds` (required, CSV of ints)
- `dateFrom`, `dateTo` (ISO date `YYYY-MM-DD`)
- `statuses` (CSV strings)
- `categoryIds`, `productIds`, `companyIds`, `originIds`, `plazos` (CSV ints)
- `periodicidades` (CSV strings)

Helpers `parseIds` and `buildFiltersFromSearchParams` are duplicated from `ms-chart/route.ts` (or extracted to a shared helper — see Risks).

**Response**: `ApiResponse<OriginDonutRaw[]>`

```ts
// types/production-kpi.types.ts — additions
export interface OriginDonutQueryParams {
  readonly userIds: readonly number[]
  readonly appliedFilters: DashboardAppliedFilters
}

/** One row from the service: (origin × currency) aggregation, no % yet. */
export interface OriginDonutRaw {
  readonly originId: number
  readonly originName: string
  readonly currencyId: number
  readonly currencyName: string
  readonly count: number
}

/** Client-side computed slice ready for the chart. */
export interface OriginDonutSlice {
  readonly originId: number
  readonly originName: string
  readonly currencyId: number
  readonly currencyName: string
  readonly count: number
  /** 0–100, rounded to 1 decimal */
  readonly percentage: number
  /** Resolved hex fill from origin-donut-colors */
  readonly fill: string
}
```

The service returns `OriginDonutRaw[]`. The hook builds `OriginDonutSlice[]` after computing the palette map and percentages. This keeps the API payload minimal and the route handler trivially testable.

## Decision 4 — TRM integration

The dashboard already lifts `useTrm()` into `ShellContent` and passes `trmRate: number | null` to `MsBarChartPanel`, `HeatmapTablePanel`, etc. The donut follows the exact same pattern.

Flow:
1. `ShellContent` already calls `useTrm()` — no new fetch.
2. `MsBarChartPanel`-style `OriginDonutPanel` receives `trmRate` as a prop.
3. `OriginDonutPanel` calls `useOriginDonut()` (which does NOT depend on `trmRate`) and forwards `{ chartState, trmRate }` to `OriginDonutChart`.
4. `OriginDonutTooltip` receives `trmRate` as a prop. For a USD slice, when `trmRate !== null && trmRate > 0` it renders `≈ $ X COP` (X derived from a representative business-value heuristic — but per proposal the tooltip shows COUNTS and PERCENT, not value sums, so the COP line in fact shows nothing meaningful here).

**Refined**: revisiting the proposal — the tooltip shows `"NN negocios (NN%)"` and "USD also shows ≈ $… COP". Because the metric is COUNT (not money), there is no monetary conversion to perform. The "≈ COP" line in the proposal applies only if a future variant aggregates values. For this iteration, the tooltip does NOT show a TRM-derived line; `trmRate` is accepted as a prop for future-proofing and to keep the same shape as `MsBarTooltip`, but rendered only as a comment. If a later iteration adds value sums (`_sum.value`), the COP-equivalent line activates without prop changes.

Fallback when TRM is unavailable: nothing renders for that section — no error, no warning. This matches the explicit Risk mitigation in the proposal.

## Decision 5 — Component tree (detailed)

```
OriginDonutPanel (use client)
  reads:  trmRate prop
  calls:  useOriginDonut()  → AsyncState<OriginDonutSlice[]>
  renders: <section><h2>Distribución por origen del cliente</h2>
             <OriginDonutChart chartState trmRate /></section>

OriginDonutChart (use client)
  props:  { chartState: AsyncState<OriginDonutSlice[]>, trmRate: number | null }
  branches:
    status === 'loading' | 'idle' → <OriginDonutSkeleton />
    status === 'error'            → error card (red text)
    status === 'success' && data.length === 0 → <EmptyState />
    status === 'success' && data.length > 0   → Recharts donut

OriginDonutSkeleton
  pulse rings matching donut dimensions (320 height, centered)

OriginDonutTooltip
  pure component, accepts Recharts payload + trmRate
  renders: "<originName> · <currencyName>"
           "NN negocios (NN.N%)"

OriginDonutLegend
  pure component, custom legend that lists each slice (origin × currency · NN.N%).
  Uses the slice's `fill` to render a color swatch.
```

`OriginDonutPanel` is the only component that hits a context/hook — every other component is pure and receives props. This mirrors the existing pattern (e.g. `MsBarChartPanel` thin wrapper → `MsGroupedBarChart` pure renderer).

## Decision 6 — AbortController + cancelled-flag pattern

Verified from `useMsBarChart`: it uses a `let cancelled = false` flag with cleanup that flips it. We adopt the SAME approach for `useOriginDonut` (no `AbortController` is actually used in `useMsBarChart` — the proposal language was imprecise). For consistency, donut hook uses:

```ts
useEffect(() => {
  if (!ready) return  // session/hierarchy gating identical to use-ms-bar-chart

  setFetchStatus('loading')
  setFetchError('')

  let cancelled = false
  const controller = new AbortController()

  async function fetchDonut() {
    try {
      const params = new URLSearchParams({ userIds: effectiveUserIds.join(',') })
      // … same filter param mapping as use-ms-bar-chart …

      const response = await fetch(
        `/api/production-dashboard/by-origin?${params.toString()}`,
        { credentials: 'include', signal: controller.signal }
      )
      if (cancelled) return
      if (!response.ok) { setFetchError('…'); setFetchStatus('error'); return }
      const body = (await response.json()) as ApiResponse<OriginDonutRaw[]>
      if (cancelled) return
      if ('error' in body || body.data === null) { setFetchError(body.error ?? '…'); setFetchStatus('error'); return }
      setRawData(body.data)
      setFetchStatus('idle')
    } catch (err) {
      if (cancelled) return
      if ((err as Error).name === 'AbortError') return
      setFetchError('Error al obtener distribución por origen')
      setFetchStatus('error')
    }
  }

  fetchDonut()
  return () => { cancelled = true; controller.abort() }
}, [selectedUserIds, appliedFilters, selfUserId])
```

We add `controller.abort()` (improvement over `useMsBarChart`) to cancel in-flight fetches on the network layer too. The `cancelled` flag still guards state updates because `abort()` causes the fetch promise to reject after we have already moved on.

Derivation from raw → slices happens AFTER the success state is set, using a pure helper:

```ts
// lib/origin-donut-aggregate.ts
export function aggregateOriginDonut(raw: readonly OriginDonutRaw[]): OriginDonutSlice[] {
  if (raw.length === 0) return []
  const totalCount = raw.reduce((s, r) => s + r.count, 0)
  if (totalCount === 0) return []
  const paletteMap = buildOriginPaletteMap(raw.map(r => r.originId))
  return raw.map(r => ({
    ...r,
    percentage: Math.round((r.count / totalCount) * 1000) / 10,
    fill: resolveDonutColor(paletteMap.get(r.originId) ?? 0, r.currencyId),
  }))
}
```

The hook calls `aggregateOriginDonut(rawData)` in its render branch (memo-free per React 19 / project rules).

## Decision 7 — AsyncState<T>

Confirmed import path: `@/features/shared/types/async-state.types`. The hook returns `AsyncState<OriginDonutSlice[]>`:
- `idle` — initial / no userIds → empty result
- `loading` — fetch in flight
- `success` — data ready
- `error` — fetch failed

Same shape as `useMsBarChart` and `useTrm`.

## Decision 8 — Test strategy (per layer)

**Service `getOriginDonutRaw` (Vitest)**:
- Empty `userIds` → returns `[]` without touching Prisma (assert via `vi.mocked(prisma.business.groupBy).not.toHaveBeenCalled()`).
- Mixed origin × currency groupBy result → correct join with names; missing names → fallback `Origen #N` / `#N`.
- Deactivated `ClientOrigin.status` does NOT filter rows (assert by not passing `status: true` in the call args).
- Filter shape delegated to `buildProductionWhereClause` (assert called with `params`).

**Route `GET /api/production-dashboard/by-origin`**:
- 401 when no session.
- 400 when `userIds` missing.
- 400 when `userIds` invalid (non-int).
- 200 with `[]` when `userIds` empty CSV (`""`).
- Delegates to `getOriginDonutRaw` with parsed filters; returns `{ data }`.
- 500 on service throw.

**Hook `useOriginDonut`** (`renderHook` + `waitFor` + `act`):
- Returns `idle` when no nodes and no selfUserId resolved yet.
- Emits `loading` then `success` on happy path; data passed through `aggregateOriginDonut`.
- Emits `error` when fetch returns non-OK.
- Cancels prior request when `selectedUserIds` changes mid-flight (no race; verify last state matches second call).
- Aborts via `controller.abort()` on unmount.

**Pure `lib/origin-donut-colors.ts`**:
- `buildOriginPaletteMap` is stable for the same input regardless of input order.
- `resolveDonutColor` returns light palette for COP_CURRENCY_ID (1) and base palette otherwise.
- Wraps modulo when more than 8 origins.

**Pure `lib/origin-donut-aggregate.ts`**:
- Empty input → `[]`.
- Percentages sum to 100 ± rounding tolerance.
- Each slice carries the right fill from the palette map.

**Component `OriginDonutChart`** (Testing Library):
- Renders skeleton when `loading`/`idle`.
- Renders `<EmptyState />` when `success` + `data.length === 0`.
- Renders `<svg>` (Recharts) with N cells when data has N slices.
- Renders error card with red text when `error`.

Component test for `OriginDonutPanel` is omitted — it is a thin wrapper better covered indirectly by the hook + chart tests.

## ADR-style Records

### ADR-D1: Color encoding by `(paletteIndex, currencyId)` not `(originId, currencyName)`
- **Decision**: Map sorted origin IDs to palette indices, then choose base vs light palette by currency ID.
- **Why**: Deterministic, stable across renders, no string parsing of currency names, COP fixed by `COP_CURRENCY_ID = 1` constant already used in `ms-chart.service.ts`.
- **Rejected**: Hue derived from `originId % palette.length` directly — would assign adjacent IDs adjacent hues; sort-then-index spreads them visually.
- **Rejected**: HSL math (e.g. lighten by 40% lightness) — Recharts/Tailwind both accept hex; fixed palette is more accessible and predictable.

### ADR-D2: Service returns raw rows; hook computes percentages and colors
- **Decision**: `OriginDonutRaw` (no `percentage`, no `fill`) crosses the wire; `OriginDonutSlice` is built client-side.
- **Why**: Keeps the API payload minimal, the service trivially testable, and color/percentage logic colocated with the rendering layer.
- **Rejected**: Compute everything server-side — couples palette to backend, larger payload, harder to evolve color scheme without a redeploy.

### ADR-D3: Tooltip currently ignores TRM (count-based metric)
- **Decision**: Donut measures COUNTS, not values. Tooltip shows "NN negocios (NN.N%)". `trmRate` prop is plumbed through for forward compatibility but does not affect output yet.
- **Why**: Proposal scope is "distribution of negocios by origin × currency". Adding `_sum.value` would mix a money metric into a share-of-count chart, which is misleading and would also force a UI choice between summing local currencies.
- **Rejected**: Compute `_sum.value` in the same groupBy and show "≈ $X COP" — out of scope for this iteration; revisit if PM asks for a value-weighted variant.

### ADR-D4: Reuse `buildProductionWhereClause` — do not extract param parsing yet
- **Decision**: Duplicate `parseIds` and `buildFiltersFromSearchParams` into the new route handler exactly as in `ms-chart/route.ts`.
- **Why**: A third copy is the right point to extract; with two copies the abstraction is premature and would require touching `ms-chart/route.ts`. The donut PR stays additive.
- **Rejected**: Extract to `src/features/production-dashboard/lib/parse-filter-params.ts` now — out of scope; queue as a follow-up refactor once a third consumer appears.

### ADR-D5: AbortController + cancelled flag (improvement over `useMsBarChart`)
- **Decision**: Donut hook uses both `AbortController.abort()` AND the `cancelled = true` flag.
- **Why**: Network-level cancellation reduces wasted bandwidth on rapid filter changes; the flag still guards state setters because the rejected fetch resolves asynchronously.
- **Rejected**: Flag alone (current `useMsBarChart` behavior) — fine in practice but wastes a network round trip per cancelled change.

### ADR-D6: Insert donut between `UsdKpiPanel` and `MsBarChartPanel`
- **Decision**: New `<OriginDonutPanel trmRate={trmRate} />` between the KPI cards and the MS bar chart.
- **Why**: The donut is a "shape of business" summary — fits between aggregate KPIs and per-MS breakdown both narratively (zoom from totals → composition → per-person) and visually (KPI cards are short, then a wider donut, then a wide bar chart).
- **Rejected**: Place donut after `HeatmapTablePanel` — buries it below the densest section; users would miss it.
- **Rejected**: Replace one of the existing KPI cards — would lose detail and conflate metrics.

## Affected Files (mirrors proposal)

| Path | Status |
|---|---|
| `src/app/api/production-dashboard/by-origin/route.ts` | New |
| `src/features/production-dashboard/services/origin-donut.service.ts` | New |
| `src/features/production-dashboard/hooks/use-origin-donut.ts` | New |
| `src/features/production-dashboard/components/OriginDonutPanel.tsx` | New |
| `src/features/production-dashboard/components/OriginDonutChart.tsx` | New |
| `src/features/production-dashboard/components/OriginDonutTooltip.tsx` | New |
| `src/features/production-dashboard/components/OriginDonutLegend.tsx` | New |
| `src/features/production-dashboard/lib/origin-donut-colors.ts` | New |
| `src/features/production-dashboard/lib/origin-donut-aggregate.ts` | New |
| `src/features/production-dashboard/types/production-kpi.types.ts` | Modified (add 3 interfaces) |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modified (insert panel) |
| `src/features/production-dashboard/__tests__/services/origin-donut.service.test.ts` | New |
| `src/features/production-dashboard/__tests__/services/by-origin.route.test.ts` | New |
| `src/features/production-dashboard/__tests__/hooks/use-origin-donut.test.ts` | New |
| `src/features/production-dashboard/__tests__/lib/origin-donut-colors.test.ts` | New |
| `src/features/production-dashboard/__tests__/lib/origin-donut-aggregate.test.ts` | New |
| `src/features/production-dashboard/__tests__/components/OriginDonutChart.test.tsx` | New |

## Risks & Assumptions

- **Param parsing duplication**: deliberately accepted (ADR-D4). If a third consumer arrives, extract to `lib/parse-filter-params.ts`.
- **Recharts `ResponsiveContainer` sizing**: fixed height `320` on the wrapper matches `MsGroupedBarChart`'s approach; tested empirically.
- **TRM not used yet**: `trmRate` prop is plumbed but unused (ADR-D3). Pure addition for the upcoming value-weighted variant.
- **`Currency.symbol` vs `Currency.name`**: legend/tooltip use `name` for clarity ("Peso colombiano", "Dólar"). If PM prefers code (`COP`/`USD`), switch the select to also pull `symbol` and prefer it when present.
- **Deactivated origins surface historical names**: confirmed by proposal Risk #1. Service deliberately omits `status: true` filter on `clientOrigin.findMany`.

## Open Questions for `sdd-tasks`

- Verify with the team whether `Currency.name` or `Currency.symbol` is the preferred legend label.
- Confirm the section heading copy: proposed `Distribución por origen del cliente` (matches surrounding section titles in Spanish).
