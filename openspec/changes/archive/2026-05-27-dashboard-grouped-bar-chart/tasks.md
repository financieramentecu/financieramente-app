# Tasks: Dashboard Grouped Bar Chart — MS USD vs Nacional

**Change name**: `dashboard-grouped-bar-chart`
**Created**: 2026-05-27
**Status**: ready-for-apply
**Author**: SDD tasks agent
**Depends on**: `proposal.md`, `spec.md`, `design.md`

---

## Summary

16 tasks across 6 groups. Critical path: T-001 → T-002 → T-003 → T-006 → T-008 → T-010. All tasks are atomic and executable in a single coding session.

---

## Dependency Graph

```
T-001 (recharts install)
  └──▶ T-008 (MsGroupedBarChart)

T-002 (types)
  ├──▶ T-003 (ms-chart.service)
  │     ├──▶ T-004 (refactor production-kpi.service)
  │     ├──▶ T-005 (ms-chart route handler)
  │     └──▶ T-006 (useMsBarChart hook)
  ├──▶ T-006
  ├──▶ T-007 (MsBarTooltip)
  └──▶ T-008

T-006 ──▶ T-009 (UsdKpiPanel refactor)
T-006 ──▶ T-010 (DashboardShell integration)
T-008 ──▶ T-010

T-003 ──▶ T-011 (service tests)
T-005 ──▶ T-012 (route tests)
T-006 ──▶ T-013 (hook tests)
T-007, T-008 ──▶ T-014 (component tests)
T-009 ──▶ T-015 (UsdKpiPanel test update)

T-003, T-005, T-006, T-008, T-009, T-010, T-011, T-012, T-013, T-014, T-015 ──▶ T-016 (index exports)
```

---

## Complexity Legend

| Size | Description |
|------|-------------|
| XS | < 30 min — trivial change, few lines |
| S | 30–60 min — straightforward implementation |
| M | 60–120 min — moderate complexity, several moving parts |
| L | 120+ min — high complexity, requires deep context |

---

## Group 1: Foundation (no dependencies)

### T-001 — Install recharts dependency

**Complexity**: XS  
**Depends on**: —  
**Files**: `package.json`, `package-lock.json`

**Acceptance**:
- `recharts` appears in `package.json` dependencies (not devDependencies).
- `npm ls recharts` resolves without peer-dependency errors against React 19.
- `@types/recharts` is NOT installed (Recharts ships its own types since v2).

**Implementation notes**:
```bash
npm install recharts
```
After install, verify `node_modules/recharts/types` exists. If there is a React peer-dep warning for React 19, it is safe to ignore — Recharts v2 works with React 19 at runtime. Do NOT add `--legacy-peer-deps` unless CI enforces it project-wide.

---

### T-002 — Extend production-kpi.types.ts with MsKpiRaw, MsBarDatum, MsChartQueryParams

**Complexity**: S  
**Depends on**: —  
**Files**: `src/features/production-dashboard/types/production-kpi.types.ts`

**Acceptance**:
- Three new interfaces (`MsKpiRaw`, `MsBarDatum`, `MsChartQueryParams`) are exported from the file.
- All existing types (`ProductionKpiRaw`, `ProductionKpiQueryParams`, etc.) are unchanged.
- All fields are `readonly`; no `any`.

**Implementation notes**:

Append the following three interfaces to the end of the existing file. Do NOT modify any existing type.

```typescript
/**
 * One row of the per-user, per-currency groupBy result from getMsChartRaw().
 * At most N × 2 rows where N = number of selected users.
 */
export interface MsKpiRaw {
  readonly userId: number
  /**
   * Currency type identifier.
   * 1 = COP (national); any other value = foreign currency (USD-denominated).
   */
  readonly currencyType: number
  /** Raw sum of Business.value in native currency (COP or USD). NOT converted. */
  readonly totalAmount: number
  readonly count: number
}

/**
 * Client-side computed shape for one MS agent's bar group.
 * Produced by useMsBarChart after joining MsKpiRaw[] with hierarchy nodes
 * and applying TRM conversion.
 */
export interface MsBarDatum {
  readonly userId: number
  /** Display name from HierarchyNode — NOT from API data */
  readonly fullName: string
  readonly levelCode: string
  /** Foreign-currency total already in USD (no conversion) */
  readonly foreignUsd: number
  /**
   * National COP total converted to USD: Math.round((totalCop / trmRate) * 100) / 100.
   * null when trmRate is null (TRM unavailable).
   */
  readonly nationalUsd: number | null
  /**
   * Chart-safe display value: nationalUsd ?? 0.
   * Used as Recharts dataKey so the bar renders at zero height (gray) when TRM is null.
   */
  readonly nationalUsdDisplay: number
  /** Raw COP amount kept for tooltip display */
  readonly totalCop: number
  readonly foreignCount: number
  readonly nationalCount: number
}

/**
 * Query parameter contract for GET /api/production-dashboard/ms-chart.
 * Mirrors ProductionKpiQueryParams for filter parity with /kpis.
 */
export interface MsChartQueryParams {
  readonly userIds: readonly number[]
  readonly appliedFilters: DashboardAppliedFilters
}
```

> Note: `DashboardAppliedFilters` must already be imported in the file. If it is not, add the import from `./dashboard-filter.types` (check the existing imports in the file first).

---

## Group 2: Backend (depends on T-002)

### T-003 — Implement ms-chart.service.ts with buildProductionWhereClause() and getMsChartRaw()

**Complexity**: M  
**Depends on**: T-002  
**Files**: `src/features/production-dashboard/services/ms-chart.service.ts` *(new)*

**Acceptance**:
- `buildProductionWhereClause()` is exported as a pure function (no Prisma calls, no side effects).
- `getMsChartRaw()` calls `prisma.business.groupBy({ by: ['idUser', 'idCurrency'], ... })`.
- `getMsChartRaw()` returns `[]` immediately when `params.userIds.length === 0` — no DB query.
- All 9 filter types from `appliedFilters` are handled (date range, statuses, plazos, originIds, categoryIds, productIds, companyIds, periodicidades).
- Each Prisma row is mapped to `MsKpiRaw` using the field mapping in implementation notes.

**Implementation notes**:

Create the file at `src/features/production-dashboard/services/ms-chart.service.ts`.

**Imports needed** (verify paths against existing codebase):
```typescript
import { prisma } from '@/lib/prisma'
import { parseBogotaInclusiveUtcRange } from '@/features/negocios/lib/bogota-date-range'
import type { MsKpiRaw, MsChartQueryParams } from '../types/production-kpi.types'
```

**`buildProductionWhereClause()`** — copy the `where` object construction from `production-kpi.service.ts` (lines 36–75) and wrap it in this exported function. The logic is identical; the only difference is it accepts `MsChartQueryParams` instead of being inline.

```typescript
export function buildProductionWhereClause(params: MsChartQueryParams) {
  const { userIds, appliedFilters } = params
  const {
    dateRange, statuses, categoryIds, companyIds,
    productIds, originIds, plazos, periodicidades,
  } = appliedFilters

  let createdAtFilter: { gte: Date; lte: Date } | undefined
  if (dateRange.start && dateRange.end) {
    try {
      const startIso = dateRange.start.toISOString().slice(0, 10)
      const endIso   = dateRange.end.toISOString().slice(0, 10)
      createdAtFilter = parseBogotaInclusiveUtcRange(startIso, endIso)
    } catch { /* invalid date range — skip */ }
  }

  return {
    idUser: { in: [...userIds] },       // spread readonly array to mutable
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    ...(statuses.length > 0   ? { status: { in: statuses } } : {}),
    ...(plazos.length > 0     ? { term:   { in: plazos   } } : {}),
    ...(originIds.length > 0  ? { idClientOrigin: { in: originIds } } : {}),
    ...(categoryIds.length > 0 ? { user: { idCategory: { in: categoryIds } } } : {}),
    ...(productIds.length > 0 ? {
      productPercentageCommission: {
        productConfiguration: { idProduct: { in: productIds } },
      },
    } : {}),
    ...(companyIds.length > 0 ? {
      productPercentageCommission: {
        productConfiguration: { product: { idCompany: { in: companyIds } } },
      },
    } : {}),
    ...(periodicidades.length > 0 ? {
      buyPeriodicity: { name: { in: periodicidades } },
    } : {}),
  }
}
```

**`getMsChartRaw()`** — Prisma row mapping:

| Prisma field | MsKpiRaw field |
|---|---|
| `row.idUser` | `userId` |
| `row.idCurrency ?? 1` | `currencyType` |
| `Number(row._sum.value ?? 0)` | `totalAmount` |
| `row._count.idBusiness ?? 0` | `count` |

Use `Number()` to coerce Prisma's `Decimal` type to `number`. Do NOT import a separate coerce helper; inline the cast.

```typescript
const COP_CURRENCY_ID = 1

export async function getMsChartRaw(
  params: MsChartQueryParams
): Promise<MsKpiRaw[]> {
  if (params.userIds.length === 0) return []

  const rows = await prisma.business.groupBy({
    by: ['idUser', 'idCurrency'],
    where: buildProductionWhereClause(params),
    _sum: { value: true },
    _count: { idBusiness: true },
  })

  return rows.map((row) => ({
    userId: row.idUser,
    currencyType: row.idCurrency ?? COP_CURRENCY_ID,
    totalAmount: Number(row._sum.value ?? 0),
    count: row._count.idBusiness ?? 0,
  }))
}
```

---

### T-004 — Refactor production-kpi.service.ts to import buildProductionWhereClause

**Complexity**: XS  
**Depends on**: T-003  
**Files**: `src/features/production-dashboard/services/production-kpi.service.ts`

**Acceptance**:
- The inline `where` object (lines 49–75 of current file) is removed.
- `buildProductionWhereClause` is imported from `./ms-chart.service`.
- `getProductionKpiRaw` passes `{ userIds: params.userIds, appliedFilters: params.appliedFilters }` (which satisfies `MsChartQueryParams`) to `buildProductionWhereClause`.
- All local variable declarations for `dateRange`, `statuses`, etc. that were only used for the `where` object are removed (if they become unused).
- Existing behavior is identical — no functional changes to `/api/production-dashboard/kpis`.

**Implementation notes**:

Add import at the top:
```typescript
import { buildProductionWhereClause } from './ms-chart.service'
```

Replace lines 35–75 (the destructuring + `where` object construction) with:
```typescript
const where = buildProductionWhereClause(params)
```

Note: `ProductionKpiQueryParams` and `MsChartQueryParams` have the same shape (`userIds` + `appliedFilters`). TypeScript will accept the pass-through without a cast.

After the refactor, run `npm run type-check` to confirm no type errors.

---

### T-005 — Implement GET /api/production-dashboard/ms-chart route handler

**Complexity**: M  
**Depends on**: T-002, T-003  
**Files**: `src/app/api/production-dashboard/ms-chart/route.ts` *(new)*

**Acceptance**:
- `GET /api/production-dashboard/ms-chart` is reachable via Next.js App Router.
- Returns HTTP 401 `{ data: null, error: 'No autorizado' }` when unauthenticated.
- Returns HTTP 400 `{ data: null, error: 'El parámetro userIds es requerido' }` when `userIds` param is absent.
- Returns HTTP 400 `{ data: null, error: 'El parámetro userIds contiene valores inválidos' }` when any userId is non-integer.
- Returns HTTP 200 `{ data: [] }` immediately when `userIds` is empty string (no service call).
- Returns HTTP 200 `{ data: MsKpiRaw[] }` on success.
- Returns HTTP 500 on unhandled exceptions; error is `console.error`-logged.

**Implementation notes**:

Create directory: `src/app/api/production-dashboard/ms-chart/`. Then create `route.ts`.

Mirror the structure of `src/app/api/production-dashboard/kpis/route.ts` exactly. Key differences:
1. Import `getMsChartRaw` from `@/features/production-dashboard/services/ms-chart.service`.
2. Response type is `ApiResponse<MsKpiRaw[]>`.
3. Copy the `parseIds()` helper verbatim — or check if there is a shared route util to import it from; if not, co-locate it in this file.
4. Copy the `buildFiltersFromSearchParams()` helper (or its equivalent) from the `/kpis` route — this converts raw `searchParams` into a `DashboardAppliedFilters` object.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getMsChartRaw } from '@/features/production-dashboard/services/ms-chart.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { MsKpiRaw } from '@/features/production-dashboard/types/production-kpi.types'

// Copy parseIds from kpis/route.ts (or import from shared util if it exists)
function parseIds(raw: string | null): number[] | null {
  if (raw === null) return null
  if (raw === '') return []
  const parts = raw.split(',')
  const ids = parts.map((p) => parseInt(p.trim(), 10))
  if (ids.some(isNaN)) return null
  return ids
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<MsKpiRaw[]>>> {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    // Required: userIds
    const rawUserIds = searchParams.get('userIds')
    if (rawUserIds === null) {
      return NextResponse.json(
        { data: null, error: 'El parámetro userIds es requerido' },
        { status: 400 }
      )
    }
    const userIds = parseIds(rawUserIds)
    if (userIds === null) {
      return NextResponse.json(
        { data: null, error: 'El parámetro userIds contiene valores inválidos' },
        { status: 400 }
      )
    }
    if (userIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Parse optional filters — mirror kpis/route.ts buildFiltersFromSearchParams()
    const appliedFilters = buildFiltersFromSearchParams(searchParams)

    const result = await getMsChartRaw({ userIds, appliedFilters })
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error al obtener producción por MS:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

> Look at `src/app/api/production-dashboard/kpis/route.ts` to find the exact implementation of `buildFiltersFromSearchParams()` (date defaults, parseIds for optional arrays, string arrays, etc.) and replicate it here verbatim. Do NOT refactor it into a shared util in this task — that is a separate concern.

---

## Group 3: Frontend (depends on T-002 + T-003)

### T-006 — Implement useMsBarChart hook with collectMsNodesInOrder, data join, TRM conversion, AsyncState

**Complexity**: L  
**Depends on**: T-002, T-003  
**Files**: `src/features/production-dashboard/hooks/use-ms-bar-chart.ts` *(new)*

**Acceptance**:
- Hook returns `AsyncState<MsBarDatum[]>` (single discriminated union — no separate `isLoading`, `data`, `error` fields).
- `collectNodesInOrder(nodes, selfUserId)` is exported as a named pure function (renamed from `collectMsNodesInOrder`; no levelCode filter — all included nodes participate).
- Self-node (authenticated user) appears first in the result regardless of tree position or levelCode.
- MS Junior path: when `nodes.length === 0`, hook uses `session.user.id` from `useSession()`.
- TRM conversion is NOT a fetch dependency — changing `trmRate` recomputes `MsBarDatum[]` without re-fetching.
- `MsBarDatum` includes `nationalUsdDisplay: number` (`nationalUsd ?? 0`).
- Fetch effect uses `cancelled` flag to prevent stale state overwrites.
- File begins with `'use client'` directive.

**Implementation notes**:

File structure:
```
'use client'

// 1. Exports: collectMsNodesInOrder (pure, testable)
// 2. Internal: joinAndConvert (pure, called in render phase)
// 3. Export: useMsBarChart hook
```

**`collectNodesInOrder(nodes, selfUserId)`** — all roles produce businesses, no levelCode filter:

> **Clarification (2026-05-27)**: Renamed from `collectMsNodesInOrder`. Removed `MS_LEVEL_CODES` — ALL included nodes appear in the chart regardless of levelCode.

```typescript
export function collectNodesInOrder(
  nodes: HierarchyNode[],
  selfUserId: number | undefined
): HierarchyNode[] {
  const result: HierarchyNode[] = []
  let selfNode: HierarchyNode | undefined

  function walk(ns: HierarchyNode[]): void {
    for (const node of ns) {
      if (node.included) {
        if (node.userId === selfUserId) {
          selfNode = node
        } else {
          result.push(node)
        }
      }
      walk(node.children)
    }
  }

  walk(nodes)
  return selfNode !== undefined ? [selfNode, ...result] : result
}
```

**`joinAndConvert(raw, orderedNodes, trmRate)`** — internal helper:

```typescript
function joinAndConvert(
  raw: MsKpiRaw[],
  orderedNodes: HierarchyNode[],
  trmRate: number | null
): MsBarDatum[] {
  const byUser = new Map<number, { cop?: MsKpiRaw; foreign?: MsKpiRaw }>()
  for (const row of raw) {
    const entry = byUser.get(row.userId) ?? {}
    if (row.currencyType === 1) { entry.cop = row } else { entry.foreign = row }
    byUser.set(row.userId, entry)
  }

  return orderedNodes.map((node) => {
    const entry = byUser.get(node.userId) ?? {}
    const totalCop = entry.cop?.totalAmount ?? 0
    const foreignUsd = entry.foreign?.totalAmount ?? 0
    const nationalUsd =
      trmRate !== null && trmRate > 0
        ? Math.round((totalCop / trmRate) * 100) / 100
        : null

    return {
      userId:              node.userId,
      fullName:            node.fullName,
      levelCode:           node.levelCode,
      foreignUsd,
      nationalUsd,
      nationalUsdDisplay:  nationalUsd ?? 0,  // chart-safe: gray bar when TRM null
      totalCop,
      foreignCount:        entry.foreign?.count ?? 0,
      nationalCount:       entry.cop?.count ?? 0,
    }
  })
}
```

**State design** — two pieces of state, derived output:
```typescript
const [rawData, setRawData]           = useState<MsKpiRaw[] | null>(null)
const [orderedNodes, setOrderedNodes] = useState<HierarchyNode[]>([])
const [fetchState, setFetchState]     = useState<
  { status: 'idle' | 'loading' | 'error'; error: string }
>({ status: 'idle', error: '' })
```

Derive output in the render phase (not in the effect):
```typescript
if (fetchState.status === 'loading') return { status: 'loading', data: undefined, error: '' }
if (fetchState.status === 'error')   return { status: 'error',   data: undefined, error: fetchState.error }
if (rawData === null)                return { status: 'idle',    data: undefined, error: '' }

const data = joinAndConvert(rawData, orderedNodes, trmRate)
return { status: 'success', data, error: '' }
```

This pattern means a `trmRate` change triggers a re-render that recomputes `data` without a new fetch.

**`useEffect` dependencies**: `[selectedUserIds, appliedFilters, selfUserId]` — `trmRate` is intentionally excluded.

**MS Junior synthetic node** (when `nodes.length === 0`):
```typescript
const syntheticNode: HierarchyNode = {
  userId:    selfUserId,
  fullName:  session?.user?.name ?? `Usuario ${selfUserId}`,
  levelCode: 'MS_JUNIOR',
  included:  true,
  children:  [],
}
```
Use the `HierarchyNode` type from wherever `useHierarchySelection` is typed. Verify the exact shape (it may have additional fields like `idLevel`).

**URL serialization** — copy the `buildSearchParams` pattern from `use-production-kpis.ts` to serialize `userIds` and `appliedFilters` into query string parameters for `/api/production-dashboard/ms-chart`.

---

### T-007 — Implement MsBarTooltip component and format-currency.ts utility

**Complexity**: S  
**Depends on**: T-002  
**Files**:
- `src/features/production-dashboard/lib/format-currency.ts` *(new)*
- `src/features/production-dashboard/components/MsBarTooltip.tsx` *(new)*

**Acceptance**:
- `formatUsd(185000)` returns `'USD 185.000,00'` in `es-CO` locale.
- `formatCop(292815000)` returns `'COP 292.815.000'` in `es-CO` locale.
- `formatUsdCompact(185000)` returns a compact string like `'USD 185K'`.
- `MsBarTooltip` renders correct format for foreign bar with value > 0: `"USD {value} · {count} negocios"`.
- `MsBarTooltip` renders correct format for national bar with TRM and value > 0: `"USD {usd} (COP {cop}) · {count} negocios"`.
- `MsBarTooltip` returns `null` (no tooltip) when `foreignUsd === 0` for the foreign bar.
- `MsBarTooltip` returns `null` (no tooltip) when `nationalUsd === null` or `nationalUsdDisplay === 0` for the national bar.
- If ALL bars for a group are zero, `MsBarTooltip` returns `null` (no tooltip rendered at all).

**Implementation notes**:

**`format-currency.ts`** — module-level formatter instances (expensive to construct):

```typescript
const usdFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const copFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const usdCompactFormatter = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatUsd(value: number): string {
  return `USD ${usdFormatter.format(value)}`
}
export function formatCop(value: number): string {
  return `COP ${copFormatter.format(value)}`
}
export function formatUsdCompact(value: number): string {
  return `USD ${usdCompactFormatter.format(value)}`
}
```

**`MsBarTooltip`** — Recharts custom tooltip receives `active`, `payload`, `label` props. The `payload` array has one entry per `<Bar>` in hover scope. Use the `payload[n].payload` (the `MsBarDatum`) to access `foreignCount`, `nationalCount`, `totalCop`, `nationalUsd`.

```typescript
interface MsBarTooltipProps {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<{
    readonly dataKey: string
    readonly value: number | null
    readonly payload: MsBarDatum
  }>
  readonly trmRate: number | null
}
```

This component does NOT need `'use client'` itself — it is only rendered inside the client component `MsGroupedBarChart`.

**Singular/plural**: use `count === 1 ? 'negocio' : 'negocios'` for both bars.

---

### T-008 — Implement MsGroupedBarChart component with Recharts, loading/error/empty states, horizontal scroll

**Complexity**: L  
**Depends on**: T-001, T-002, T-007  
**Files**: `src/features/production-dashboard/components/MsGroupedBarChart.tsx` *(new)*

**Acceptance**:
- File begins with `'use client'` directive.
- Renders `MsBarChartSkeleton` (with `aria-busy="true"`) on `status === 'loading'` or `'idle'`.
- Renders error message `"Error al cargar la producción por MS"` on `status === 'error'`.
- Renders `<EmptyState title="Sin producción registrada para los filtros aplicados" />` on `status === 'success'` with empty data.
- On success with data: renders Recharts `<BarChart>` with two `<Bar>` children (blue `foreignUsd`, green `nationalUsd`).
- Chart wrapper `<div>` has `role="img"` and `aria-label="Producción por MS: moneda extranjera vs nacional convertida"`.
- Chart wrapper has `overflow-x-auto` class.
- Chart width = `Math.max(msCount * 120, containerWidth)` via `ResizeObserver`.
- `<Tooltip content={<MsBarTooltip trmRate={trmRate} />} />` is included.

**Implementation notes**:

**Recharts imports** (tree-shaken):
```typescript
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'
```
Do NOT import `ResponsiveContainer` — width is computed manually via `ResizeObserver`.

**`MsBarChartSkeleton`** — internal component (not exported). Four mock groups at varying heights:
```typescript
function MsBarChartSkeleton() {
  return (
    <div aria-busy="true" className="rounded-xl border bg-card p-4 space-y-3">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="flex items-end gap-4 h-52 px-8">
        {[60, 80, 45, 70].map((h, i) => (
          <div key={i} className="flex gap-1 items-end">
            <div className="w-8 animate-pulse rounded-t bg-blue-200" style={{ height: `${h}%` }} />
            <div className="w-8 animate-pulse rounded-t bg-green-200" style={{ height: `${Math.floor(h * 0.7)}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

**ResizeObserver pattern**:
```typescript
const containerRef = useRef<HTMLDivElement>(null)
const [containerWidth, setContainerWidth] = useState(600)

useEffect(() => {
  const el = containerRef.current
  if (!el) return
  const observer = new ResizeObserver(([entry]) => {
    setContainerWidth(entry.contentRect.width)
  })
  observer.observe(el)
  return () => observer.disconnect()
}, [])

const chartWidth = Math.max(chartState.data.length * 120, containerWidth)
```

**`EmptyState` import**: check if `src/features/shared/ui/empty-state.tsx` exists. If it does, use it. If it does not, render an inline placeholder:
```typescript
<div className="rounded-xl border bg-card p-8 text-center">
  <p className="text-sm text-muted-foreground">
    Sin producción registrada para los filtros aplicados
  </p>
</div>
```

**Bar props** — use `<Cell>` for per-datum color (gray when TRM unavailable):

> **Clarification (2026-05-27)**: Use `nationalUsdDisplay` (number, never null) as the dataKey. Gray fill (#94a3b8) when `nationalUsd === null`.

```tsx
import { Bar, Cell } from 'recharts'

<Bar dataKey="foreignUsd" name="Moneda extranjera (USD)" radius={[3,3,0,0]}>
  {chartState.data.map((_, i) => (
    <Cell key={i} fill="#3b82f6" />
  ))}
</Bar>

<Bar dataKey="nationalUsdDisplay" name="Nacional (COP → USD)" radius={[3,3,0,0]}>
  {chartState.data.map((entry, i) => (
    <Cell key={i} fill={entry.nationalUsd !== null ? '#22c55e' : '#94a3b8'} />
  ))}
</Bar>
```

**Legend**: pass `trmRate` to the Legend `formatter` to note "TRM no disponible" when `trmRate === null`:
```tsx
<Legend
  formatter={(value) => {
    if (value === 'foreignUsd') return 'Moneda extranjera (USD)'
    return trmRate !== null ? 'Nacional (COP → USD)' : 'Nacional (COP → USD) — TRM no disponible'
  }}
/>
```

**T-008 acceptance addition**: The national `<Bar>` uses `dataKey="nationalUsdDisplay"` and `<Cell>` per datum for green/gray fill.

**XAxis angle**: labels at `angle={-35}` with `textAnchor="end"` and `interval={0}` to show all names.

**YAxis tickFormatter**: use `formatUsdCompact` from `format-currency.ts`.

---

## Group 4: Integration (depends on T-006, T-008, T-009)

### T-009 — Refactor UsdKpiPanel to accept trmRate as prop (remove internal useTrm call)

**Complexity**: S  
**Depends on**: T-006  
**Files**: `src/features/production-dashboard/components/UsdKpiPanel.tsx`

**Acceptance**:
- `UsdKpiPanel` no longer calls `useTrm()` internally.
- `UsdKpiPanel` accepts all TRM-related values as props (matching the current `useTrm()` return shape).
- All downstream logic (`effectiveTrmRate`, `trmAvailable`, etc.) is unchanged.
- TypeScript compiles without errors.
- The component's visual output is identical — only data source changes.

**Implementation notes**:

Read `src/features/production-dashboard/hooks/use-trm.ts` to find the exact return type of `useTrm()`. It currently returns `{ isLoading, trmRate, trmState, isManual, error, setManualTrm }`. The prop interface should mirror this:

```typescript
interface UsdKpiPanelProps {
  readonly isLoading: boolean         // trmLoading
  readonly trmRate: number | null
  readonly trmState: TrmState         // check exact type in use-trm.ts
  readonly isManual: boolean
  readonly error: string | null
  readonly setManualTrm: (rate: number) => void
}
```

Steps:
1. Add the props interface above the component.
2. Change the function signature to `function UsdKpiPanel(props: UsdKpiPanelProps)`.
3. Destructure all props: `const { isLoading: trmLoading, trmRate, trmState, isManual, error, setManualTrm } = props`
   (use the same local variable names so the rest of the function body is unchanged).
4. Remove the `import { useTrm } from '../hooks/use-trm'` line.
5. Remove the `useTrm()` call (line 17 in the current file).

Do NOT change any other logic in the component — only the data source for TRM values.

---

### T-010 — Update DashboardShell: lift useTrm(), add MsBarChartPanel below UsdKpiPanel

**Complexity**: M  
**Depends on**: T-006, T-008, T-009  
**Files**: `src/features/production-dashboard/components/DashboardShell.tsx`

**Acceptance**:
- `useTrm()` is called once at the `ShellContent` level (not inside `UsdKpiPanel`).
- All TRM props are passed to `UsdKpiPanel`.
- New `MsBarChartPanel` renders directly below `<UsdKpiPanel />` inside the same `space-y-4` layout.
- `<MsGroupedBarChart>` is rendered inside `MsBarChartPanel` receiving `chartState` and `trmRate`.
- No layout changes to `HierarchyTreePanel` or `DashboardFilterPanel`.

**Implementation notes**:

First, read `DashboardShell.tsx` in full. Find the `ShellContent` component (the inner component with `DashboardFilterPanel` and `UsdKpiPanel`).

**`MsBarChartPanel`** — define as a local component (not exported) within `DashboardShell.tsx` or in a co-located file. It is a thin wrapper:

```typescript
interface MsBarChartPanelProps {
  readonly trmRate: number | null
}

function MsBarChartPanel({ trmRate }: MsBarChartPanelProps) {
  const chartState = useMsBarChart(trmRate)
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        Producción por Money Strategist
      </h2>
      <MsGroupedBarChart chartState={chartState} trmRate={trmRate} />
    </section>
  )
}
```

**`ShellContent` after changes**:
```typescript
function ShellContent() {
  const { appliedFilters } = useDashboardFilter()
  const { isLoading: trmLoading, trmRate, trmState, isManual, error, setManualTrm } = useTrm()  // lifted

  return (
    <main className="... space-y-4">      {/* existing classes */}
      <DashboardFilterPanel />
      <UsdKpiPanel
        isLoading={trmLoading}
        trmRate={trmRate}
        trmState={trmState}
        isManual={isManual}
        error={error}
        setManualTrm={setManualTrm}
      />
      <MsBarChartPanel trmRate={trmRate} />   {/* new */}
    </main>
  )
}
```

Add imports at the top:
```typescript
import { useMsBarChart } from '../hooks/use-ms-bar-chart'
import { MsGroupedBarChart } from './MsGroupedBarChart'
```

`MsBarChartPanel` and `MsGroupedBarChart` both require `'use client'` context — `DashboardShell.tsx` already has `'use client'` since it calls `useDashboardFilter`. Verify this.

---

## Group 5: Tests (each depends on its implementation task)

### T-011 — Tests for ms-chart.service.ts

**Complexity**: S  
**Depends on**: T-003  
**Files**: `src/features/production-dashboard/__tests__/ms-chart.service.test.ts` *(new)*

**Acceptance**:
- 4 test cases pass (see implementation notes).
- Prisma is mocked — no real DB calls.

**Implementation notes**:

Follow the test patterns in other `__tests__/` files in `production-dashboard`. Prisma mock likely uses `vitest` + manual mock or `vi.mock('@/lib/prisma')`.

Required test cases (from SPEC-070):
1. `getMsChartRaw` returns `[]` when `userIds` is empty — assert `prisma.business.groupBy` is NOT called.
2. `getMsChartRaw` calls `prisma.business.groupBy` with `{ by: ['idUser', 'idCurrency'] }`.
3. `getMsChartRaw` maps Prisma rows to `MsKpiRaw` correctly — provide a mock row with `Decimal` value and assert the `Number()` coercion.
4. `buildProductionWhereClause` produces correct `where.idUser` from `userIds`.
5. `buildProductionWhereClause` includes `createdAt` filter when `dateRange` has valid dates.
6. `buildProductionWhereClause` omits optional filter keys when arrays are empty (no `status` key, no `user` key, etc.).

---

### T-012 — Tests for /api/production-dashboard/ms-chart route

**Complexity**: S  
**Depends on**: T-005  
**Files**: `src/features/production-dashboard/__tests__/ms-chart.route.test.ts` *(new)*

> Note: Route tests may live in `src/app/api/production-dashboard/ms-chart/__tests__/` depending on project convention. Check where `kpis/route.ts` tests live and mirror that location.

**Acceptance**:
- 5 test cases pass (see implementation notes).
- `getMsChartRaw` is mocked — no real service calls.
- `auth()` is mocked.

**Implementation notes**:

Required test cases (from SPEC-070):
1. Returns 401 when `auth()` returns `null`.
2. Returns 400 with `'El parámetro userIds es requerido'` when `userIds` is missing.
3. Returns 400 with `'El parámetro userIds contiene valores inválidos'` when `userIds=abc`.
4. Returns 200 `{ data: [] }` when `userIds=` (empty string) — service NOT called.
5. Returns 200 `{ data: [...] }` with mocked service result when `userIds=1,2`.
6. Returns 500 when service throws an unexpected error.

Use `NextRequest` test instances with a mocked URL, consistent with how `kpis/route.ts` tests are structured.

---

### T-013 — Tests for useMsBarChart hook

**Complexity**: M  
**Depends on**: T-006  
**Files**: `src/features/production-dashboard/__tests__/use-ms-bar-chart.test.ts` *(new)*

**Acceptance**:
- 6 test cases pass (see implementation notes).
- `fetch` is mocked via MSW (`msw/node`) or `vi.fn()`.
- `useHierarchySelection`, `useDashboardFilter`, `useSession` are mocked.

**Implementation notes**:

Required test cases (from SPEC-071):

1. **`collectMsNodesInOrder` — depth-first, included only**: Build a tree with one `TEAM_LEADER` root (included=true) and two children: `MS_SENIOR` included=true, `MS_JUNIOR` included=false. Assert result contains only the `MS_SENIOR` node. No `selfUserId`.

2. **`collectMsNodesInOrder` — self-node prepended**: Build a tree where `MS_SENIOR userId=10` is the root. Call with `selfUserId=10`. Assert `result[0].userId === 10` even though it was already first.

3. **`collectMsNodesInOrder` — TEAM_LEADER self-node included**: Build tree with `TEAM_LEADER userId=5` root and `MS_SENIOR userId=11` child, both included. Call with `selfUserId=5`. Assert `result` is `[5, 11]`.

4. **MS Junior edge case**: Mock `useSession` → `{ id: '42', name: 'Jhon' }`. Mock `useHierarchySelection` → `nodes = []`. Mock `fetch` to return `[{ userId: 42, currencyType: 1, totalAmount: 100000, count: 3 }]`. Assert final state is `success` with one `MsBarDatum` entry where `userId === 42`.

5. **TRM unavailable**: Mock nodes with one MS node, mock fetch to return valid data, render hook with `trmRate = null`. Assert all `MsBarDatum` entries have `nationalUsd === null`.

6. **API error → error state**: Mock fetch to reject or return non-200. Assert hook transitions to `{ status: 'error' }`.

---

### T-014 — Tests for MsGroupedBarChart component

**Complexity**: S  
**Depends on**: T-007, T-008  
**Files**:
- `src/features/production-dashboard/__tests__/MsGroupedBarChart.test.tsx` *(new)*
- `src/features/production-dashboard/__tests__/format-currency.test.ts` *(new)*

**Acceptance**:
- 4 component test cases pass + 2 formatter test cases pass.
- `ResizeObserver` is mocked in test setup (required for Recharts).

**Implementation notes**:

**`ResizeObserver` mock** — add to vitest setup file or at top of test file:
```typescript
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
```

Required component test cases (from SPEC-072):
1. Renders skeleton with `aria-busy` when `chartState.status === 'loading'`.
2. Renders `'Sin producción registrada para los filtros aplicados'` when `status === 'success'` and `data.length === 0`.
3. Renders `'Error al cargar la producción por MS'` when `status === 'error'`.
4. Renders `role="img"` wrapper with correct `aria-label` when success with non-empty data.

Required formatter test cases:
1. `formatUsd(185000)` → `'USD 185.000,00'` (es-CO uses `.` as thousands separator and `,` as decimal).
2. `formatCop(292815000)` → `'COP 292.815.000'`.

---

### T-015 — Update existing UsdKpiPanel tests for new props signature

**Complexity**: XS  
**Depends on**: T-009  
**Files**: `src/features/production-dashboard/__tests__/UsdKpiPanel.test.tsx` *(existing, if present)*

**Acceptance**:
- All existing `UsdKpiPanel` tests pass with the new props-based signature.
- No test renders `<UsdKpiPanel />` without providing the required TRM props.

**Implementation notes**:

First, check if a test file for `UsdKpiPanel` exists. If it does not, this task is a no-op (mark complete).

If it exists, find all `render(<UsdKpiPanel` calls and add the TRM props:
```typescript
const defaultTrmProps = {
  isLoading: false,
  trmRate: 4050,
  trmState: 'loaded' as const,    // use the correct union value from use-trm.ts
  isManual: false,
  error: null,
  setManualTrm: vi.fn(),
}

render(<UsdKpiPanel {...defaultTrmProps} />)
```

If mocks for `useTrm` are already set up in the test file (e.g., `vi.mock('../hooks/use-trm')`), those mocks can be removed — the hook is no longer called internally.

---

## Group 6: Exports (depends on all above)

### T-016 — Update index.ts exports

**Complexity**: XS  
**Depends on**: T-003, T-005, T-006, T-007, T-008, T-009, T-010, T-011, T-012, T-013, T-014, T-015  
**Files**: `src/features/production-dashboard/index.ts`

**Acceptance**:
- `MsGroupedBarChart` is exported from `./components/MsGroupedBarChart`.
- `useMsBarChart` is exported from `./hooks/use-ms-bar-chart`.
- `MsKpiRaw`, `MsBarDatum`, `MsChartQueryParams` are exported from `./types/production-kpi.types`.
- `collectMsNodesInOrder` is exported from `./hooks/use-ms-bar-chart` (it is a named export from that file).
- All pre-existing exports remain unchanged.

**Implementation notes**:

Read the current `index.ts` first. Append the following lines at the end (or after the existing type exports section):

```typescript
// MS Bar Chart
export { MsGroupedBarChart } from './components/MsGroupedBarChart'
export { useMsBarChart, collectMsNodesInOrder } from './hooks/use-ms-bar-chart'
export type { MsKpiRaw, MsBarDatum, MsChartQueryParams } from './types/production-kpi.types'
```

---

## Complexity Summary

| Task | Title | Complexity | Group |
|------|-------|------------|-------|
| T-001 | Install recharts | XS | 1 |
| T-002 | Add MsKpiRaw, MsBarDatum, MsChartQueryParams types | S | 1 |
| T-003 | Implement ms-chart.service.ts | M | 2 |
| T-004 | Refactor production-kpi.service.ts | XS | 2 |
| T-005 | Implement ms-chart route handler | M | 2 |
| T-006 | Implement useMsBarChart hook | L | 3 |
| T-007 | Implement MsBarTooltip + format-currency.ts | S | 3 |
| T-008 | Implement MsGroupedBarChart component | L | 3 |
| T-009 | Refactor UsdKpiPanel TRM props | S | 4 |
| T-010 | Update DashboardShell with lifted TRM + MsBarChartPanel | M | 4 |
| T-011 | Tests: ms-chart.service | S | 5 |
| T-012 | Tests: ms-chart route | S | 5 |
| T-013 | Tests: useMsBarChart hook | M | 5 |
| T-014 | Tests: MsGroupedBarChart + format-currency | S | 5 |
| T-015 | Update UsdKpiPanel tests | XS | 5 |
| T-016 | Update index.ts exports | XS | 6 |

---

## Critical Path

```
T-001 → T-008 → T-010
T-002 → T-003 → T-006 → T-010
T-002 → T-008 → T-010
```

**Minimum sequential path to a working chart**: T-001 → T-002 → T-003 → T-005 → T-006 → T-007 → T-008 → T-009 → T-010

---

## Risks and Notes

| Risk | Severity | Task(s) Affected | Mitigation |
|------|----------|-----------------|------------|
| `HierarchyNode` type shape may have extra required fields beyond `{ userId, fullName, levelCode, included, children }` | Medium | T-006 | Read `useHierarchySelection` hook types before implementing the synthetic node in MS Junior path |
| `session.user.id` from NextAuth is a `string` — must cast to `Number()` | Medium | T-006 | Explicit `Number(session.user.id)` + test in T-013 |
| `ResizeObserver` not available in jsdom (Vitest) | Low | T-008, T-014 | Add global mock in test setup before using RTL render |
| `UsdKpiPanel` TRM prop type depends on exact `useTrm()` return type — verify `TrmState` union | Low | T-009, T-010 | Read `use-trm.ts` fully before implementing props interface |
| `buildFiltersFromSearchParams` in the route handler may not exist as a standalone function in the `/kpis` route — may be inline | Low | T-005 | Read `kpis/route.ts` before writing `ms-chart/route.ts`; duplicate inline if not extracted |
| `productIds` + `companyIds` both map to `productPercentageCommission` — Prisma may not allow two partial relation filters — verify with existing `/kpis` behavior | Low | T-003 | The existing `production-kpi.service.ts` already handles this; copy exactly |
| `collectMsNodesInOrder` with TL self-node: guard `node.userId !== selfUserId` in MS walk prevents double-counting if TL is also listed as MS_SENIOR | Low | T-006 | The design §5 already guards this; follow the reference implementation exactly |

---

## Spec Cross-Reference

| Task | Spec IDs |
|------|----------|
| T-002 | SPEC-001, SPEC-002, SPEC-003 |
| T-003 | SPEC-010, SPEC-011 |
| T-004 | SPEC-010 R4 |
| T-005 | SPEC-020, SPEC-021, SPEC-022, SPEC-023, SPEC-024 |
| T-006 | SPEC-030, SPEC-031, SPEC-032, SPEC-033, SPEC-034, SPEC-035 |
| T-007 | SPEC-045, SPEC-046 |
| T-008 | SPEC-040, SPEC-041, SPEC-042, SPEC-043, SPEC-044, SPEC-047 |
| T-009 | SPEC-050 R3 |
| T-010 | SPEC-050 |
| T-011 | SPEC-070 |
| T-012 | SPEC-070 (route) |
| T-013 | SPEC-071 |
| T-014 | SPEC-072 |
| T-015 | SPEC-050 R3 |
| T-016 | SPEC-051 |
