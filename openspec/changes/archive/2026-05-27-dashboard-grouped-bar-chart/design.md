# Design: Dashboard Grouped Bar Chart — MS USD vs Nacional

**Change name**: `dashboard-grouped-bar-chart`
**Designed**: 2026-05-27
**Status**: ready-for-tasks
**Author**: SDD design agent
**Depends on**: `openspec/changes/dashboard-grouped-bar-chart/proposal.md`, `openspec/changes/dashboard-grouped-bar-chart/spec.md`

---

## 1. Architecture Overview

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                            │
│                                                                     │
│  DashboardShell (ShellContent)          ← 'use client'             │
│    │                                                                │
│    ├── useTrm()                          ← lifted here (once)      │
│    │    └── GET /api/trm                                           │
│    │                                                                │
│    ├── UsdKpiPanel(trmRate)             ← receives trmRate as prop │
│    │    └── useProductionKpis(trmRate)                             │
│    │         └── GET /api/production-dashboard/kpis                │
│    │                                                                │
│    └── MsBarChartPanel(trmRate)         ← new wrapper, same level  │
│         ├── useMsBarChart(trmRate)      ← new hook                 │
│         │    ├── useHierarchySelection()                           │
│         │    ├── useDashboardFilter()                              │
│         │    ├── useSession()           ← for MS Junior edge case  │
│         │    └── GET /api/production-dashboard/ms-chart  ← NEW     │
│         └── <MsGroupedBarChart chartState trmRate />   ← new comp │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Server                                                             │
│                                                                     │
│  GET /api/production-dashboard/ms-chart/route.ts   ← NEW           │
│    └── auth() guard                                                 │
│    └── parseIds() / parseFilters()                                  │
│    └── getMsChartRaw(params)            ← new service function     │
│         └── buildProductionWhereClause(params)  ← shared helper   │
│         └── prisma.business.groupBy({                               │
│               by: ['idUser', 'idCurrency'],                         │
│               _sum: { value }, _count: { idBusiness }              │
│             })                                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Additive Flow — Zero Changes to Existing KPI Path

The new flow is **100% additive**. The existing `/api/production-dashboard/kpis` endpoint, `getProductionKpiRaw`, `useProductionKpis`, and `UsdKpiPanel` are not modified except for the TRM lifting described in §7.

### TRM Sharing Decision (ADR-1)

**Decision**: Lift `useTrm()` from `UsdKpiPanel` into `ShellContent` and pass `trmRate` as a prop to both `UsdKpiPanel` and `MsBarChartPanel`.

**Rationale**: `useTrm()` fetches once on mount. Having two independent callers (one in `UsdKpiPanel`, one in `MsBarChartPanel`) would produce two separate `GET /api/trm` network requests. Lifting to `ShellContent` guarantees a single fetch while keeping both panels reactive to manual TRM overrides.

**Impact**: `UsdKpiPanel` receives a new `trmRate: number | null` prop and drops its internal `useTrm()` call. This is a minimal, backward-compatible change confined to two files.

---

## 2. Database Design

### Business Model — Relevant Fields

```prisma
model Business {
  idBusiness                    Int      @id @default(autoincrement()) @map("id_business")
  idUser                        Int      @map("id_user")        // ← groupBy key
  idCurrency                    Int      @map("id_currency")    // ← groupBy key (1 = COP)
  value                         Decimal  @db.Decimal(15, 2)    // ← _sum target
  status                        String?  @db.VarChar(20)       // ← filter
  createdAt                     DateTime @default(now())        // ← date range filter
  term                          Int?                            // ← plazos filter
  idClientOrigin                Int      @map("id_client_origin")

  user                          User     @relation(...)
  buyPeriodicity                BuyPeriodicity? @relation(...)
  productPercentageCommission   ProductPercentageCommission @relation(...)

  @@index([idUser])       // ← ALREADY EXISTS — no migration needed
  @@index([contract])
  @@index([idClientOrigin])
}
```

### Index Analysis

**`@@index([idUser])`** already exists in `prisma/schema.prisma`. No migration is required for the `groupBy(['idUser', 'idCurrency'])` query. The index will be used for the `WHERE idUser IN (...)` filter that precedes the groupBy.

**Composite index consideration**: A composite index `@@index([idUser, idCurrency, createdAt])` would allow the groupBy to be resolved entirely via index scan. This is an optimization for future performance tuning if needed, but not required for the initial implementation given expected team sizes (< 50 users per organization).

### Prisma groupBy Query

```typescript
const rows = await prisma.business.groupBy({
  by: ['idUser', 'idCurrency'],
  where: buildProductionWhereClause(params),
  _sum: { value: true },
  _count: { idBusiness: true },
})
```

**Result cardinality**: At most `N × 2` rows where `N` = number of selected users. Each user can have at most one COP row and one foreign-currency row. Rows with no matching businesses are simply absent (zero-fill happens client-side in the hook).

---

## 3. API Design

**File**: `src/app/api/production-dashboard/ms-chart/route.ts`

### Route Handler Pattern

Mirrors `src/app/api/production-dashboard/kpis/route.ts` exactly:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getMsChartRaw } from '@/features/production-dashboard/services/ms-chart.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { MsKpiRaw } from '@/features/production-dashboard/types/production-kpi.types'
import type { DashboardAppliedFilters } from '@/features/production-dashboard/types/dashboard-filter.types'

// Reuse the same parseIds helper (copy — or extract to shared route util)
function parseIds(raw: string | null): number[] | null { /* same impl */ }

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<MsKpiRaw[]>>> {
  try {
    // 1. Auth guard
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
    }

    // 2. Parse required userIds
    const { searchParams } = new URL(req.url)
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

    // 3. Short-circuit on empty userIds
    if (userIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // 4. Parse optional filters (identical to /kpis handler)
    const appliedFilters: DashboardAppliedFilters = buildFiltersFromSearchParams(searchParams)

    // 5. Call service
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

### Query Parameter Contract

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `userIds` | comma-sep integers | Yes | — |
| `dateFrom` | `YYYY-MM-DD` | No | first day of current month |
| `dateTo` | `YYYY-MM-DD` | No | last day of current month |
| `statuses` | comma-sep strings | No | `[]` |
| `categoryIds` | comma-sep integers | No | `[]` |
| `companyIds` | comma-sep integers | No | `[]` |
| `productIds` | comma-sep integers | No | `[]` |
| `originIds` | comma-sep integers | No | `[]` |
| `plazos` | comma-sep integers | No | `[]` |
| `periodicidades` | comma-sep strings | No | `[]` |

### Response Shape

```typescript
// Success — HTTP 200
{ data: MsKpiRaw[] }

// Empty result — HTTP 200 (not 404)
{ data: [] }

// Validation error — HTTP 400
{ data: null, error: 'El parámetro userIds es requerido' }

// Auth failure — HTTP 401
{ data: null, error: 'No autorizado' }

// Server error — HTTP 500
{ data: null, error: 'Error interno del servidor' }
```

---

## 4. Service Design

**File**: `src/features/production-dashboard/services/ms-chart.service.ts` (new)

### `buildProductionWhereClause()` — Shared Helper

This function is the key refactoring that prevents filter-drift between the two services.

```typescript
import { parseBogotaInclusiveUtcRange } from '@/features/negocios/lib/bogota-date-range'
import type { MsChartQueryParams } from '../types/production-kpi.types'

/**
 * Builds the Prisma where clause for Business table queries scoped to
 * selectedUserIds and the dashboard applied filters.
 * Pure function — no Prisma calls, no side effects.
 * Used by both getMsChartRaw and (via import) getProductionKpiRaw.
 */
export function buildProductionWhereClause(params: MsChartQueryParams) {
  const { userIds, appliedFilters } = params
  const { dateRange, statuses, categoryIds, companyIds, productIds,
          originIds, plazos, periodicidades } = appliedFilters

  let createdAtFilter: { gte: Date; lte: Date } | undefined
  if (dateRange.start && dateRange.end) {
    try {
      const startIso = dateRange.start.toISOString().slice(0, 10)
      const endIso   = dateRange.end.toISOString().slice(0, 10)
      createdAtFilter = parseBogotaInclusiveUtcRange(startIso, endIso)
    } catch { /* invalid date range — skip */ }
  }

  return {
    idUser: { in: userIds },
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
    ...(plazos.length > 0 ? { term: { in: plazos } } : {}),
    ...(originIds.length > 0 ? { idClientOrigin: { in: originIds } } : {}),
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

**Migration plan for `production-kpi.service.ts`**: After this helper is created, `getProductionKpiRaw` imports and delegates its `where` construction to `buildProductionWhereClause(params)` instead of building it inline. This eliminates duplicated logic.

### `getMsChartRaw()` — Service Function

```typescript
import { prisma } from '@/lib/prisma'
import type { MsKpiRaw, MsChartQueryParams } from '../types/production-kpi.types'

const COP_CURRENCY_ID = 1

/**
 * Returns per-user, per-currency production aggregation.
 * One row per (userId × idCurrency) pair found in the Business table.
 * Short-circuits on empty userIds — no DB query issued.
 */
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
    totalAmount: coerceDecimal(row._sum.value),
    count: row._count.idBusiness ?? 0,
  }))
}
```

**`coerceDecimal()` helper** — same logic as `coerceValue()` in `currency-classifier.ts`. Either import from there or co-locate in the new service file to handle Prisma's `Decimal` type.

### Raw Row Mapping

```
Prisma row                              → MsKpiRaw
────────────────────────────────────────────────────
row.idUser                             → userId
row.idCurrency ?? 1                    → currencyType
row._sum.value ?? 0  (Decimal → num)   → totalAmount
row._count.idBusiness ?? 0             → count
```

**Currency classification rule** (applied in the hook, not the service):
- `currencyType === 1` → COP national row → contributes to `totalCop`
- `currencyType !== 1` → foreign USD row → contributes to `foreignUsd`

---

## 5. Hook Design: `useMsBarChart`

**File**: `src/features/production-dashboard/hooks/use-ms-bar-chart.ts`

### Full State Machine

```
idle ──(mount/selectedUserIds change)──→ loading ──(fetch ok)──→ success
                                                  └──(fetch err)──→ error
         (selectedUserIds.length === 0, not MS-Junior) ──→ success (data: [])
```

### Hook Signature

```typescript
'use client'

export function useMsBarChart(trmRate: number | null): AsyncState<MsBarDatum[]>
```

### Dependency Array Design

```typescript
useEffect(() => {
  // ...fetch and set state...
}, [selectedUserIds, appliedFilters, sessionUserId])
// NOTE: trmRate intentionally excluded — TRM conversion is client-side.
// This mirrors the pattern established in useProductionKpis.
```

`trmRate` changes do NOT trigger a re-fetch. Instead, `MsBarDatum[]` is recomputed synchronously outside the effect using the latest raw data + current `trmRate`. This is implemented as a derived value (not a `useMemo` that re-triggers fetch):

```typescript
const [raw, setRaw] = useState<MsKpiRaw[] | null>(null)
const [orderedNodes, setOrderedNodes] = useState<HierarchyNode[]>([])

// Derived — recomputes whenever trmRate or raw changes, without new fetch
const data: MsBarDatum[] | undefined = raw !== null
  ? joinAndConvert(raw, orderedNodes, trmRate)
  : undefined
```

### `collectNodesInOrder()` — Ordering Algorithm

> **Clarification (2026-05-27)**: All roles produce businesses. The `MS_LEVEL_CODES` filter is removed. ALL included nodes participate in the chart.

```typescript
/**
 * Depth-first walk of the hierarchy tree.
 * Collects ALL included nodes (any levelCode — all roles can produce businesses).
 * The authenticated user's own node is placed FIRST in the result.
 *
 * Pure function — exported for unit testing.
 */
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

**Design rationale**: Any user in the hierarchy (Team Leader, Business Leader, MIA, etc.) can close deals personally. Restricting to MS-level nodes would hide their production. The self-node is prepended first to match AC-1's "own group first" requirement at every role level.

### MS Junior Edge Case

```typescript
const { data: session, status: sessionStatus } = useSession()

// When no hierarchy nodes — MS Junior viewing own data
if (nodes.length === 0) {
  if (sessionStatus === 'loading') {
    // Stay in loading state until session resolves
    return { status: 'loading', data: undefined, error: '' }
  }
  if (!session?.user?.id) {
    return { status: 'error', data: undefined,
             error: 'No se pudo obtener el usuario de la sesión' }
  }
  // Construct synthetic node for the MS Junior themselves
  selfUserId = Number(session.user.id)
  // orderedNodes = [{userId: selfUserId, fullName: session.user.name, levelCode: 'MS_JUNIOR', ...}]
}
```

### Data Join — `joinAndConvert()`

```typescript
function joinAndConvert(
  raw: MsKpiRaw[],
  orderedNodes: HierarchyNode[],
  trmRate: number | null
): MsBarDatum[] {
  // Index raw rows by userId for O(1) lookup
  const byUser = new Map<number, { cop?: MsKpiRaw; foreign?: MsKpiRaw }>()
  for (const row of raw) {
    const entry = byUser.get(row.userId) ?? {}
    if (row.currencyType === 1) {
      entry.cop = row
    } else {
      entry.foreign = row
    }
    byUser.set(row.userId, entry)
  }

  // Map each ordered node to MsBarDatum (zero-fill for missing rows)
  return orderedNodes.map((node) => {
    const entry = byUser.get(node.userId) ?? {}
    const totalCop = entry.cop?.totalAmount ?? 0
    const foreignUsd = entry.foreign?.totalAmount ?? 0
    const nationalUsd =
      trmRate !== null && trmRate > 0
        ? Math.round((totalCop / trmRate) * 100) / 100
        : null

    return {
      userId: node.userId,
      fullName: node.fullName,
      levelCode: node.levelCode,
      foreignUsd,
      nationalUsd,
      nationalUsdDisplay: nationalUsd ?? 0,  // chart-safe; gray bar when null
      totalCop,
      foreignCount: entry.foreign?.count ?? 0,
      nationalCount: entry.cop?.count ?? 0,
    }
  })
}
```

### Complete Hook Pseudocode

```typescript
export function useMsBarChart(trmRate: number | null): AsyncState<MsBarDatum[]> {
  const { nodes, selectedUserIds } = useHierarchySelection()
  const { appliedFilters }         = useDashboardFilter()
  const { data: session, status: sessionStatus } = useSession()

  const [asyncState, setAsyncState] = useState<AsyncState<MsKpiRaw[] | null>>({
    status: 'idle', data: undefined, error: '',
  })
  const [orderedNodesRef, setOrderedNodesRef] = useState<HierarchyNode[]>([])

  const selfUserId = session?.user?.id ? Number(session.user.id) : undefined

  useEffect(() => {
    // MS Junior path: nodes empty, use session userId
    if (nodes.length === 0) {
      if (sessionStatus === 'loading') return
      if (!selfUserId) {
        setAsyncState({ status: 'error', data: undefined,
                        error: 'No se pudo obtener el usuario de la sesión' })
        return
      }
    }

    const orderedMs = collectMsNodesInOrder(nodes, selfUserId)
    setOrderedNodesRef(orderedMs)

    // If no MS nodes are selected (and not MS Junior path), short-circuit
    if (nodes.length > 0 && orderedMs.length === 0) {
      setAsyncState({ status: 'success', data: null, error: '' }) // raw=null → data=[]
      return
    }

    setAsyncState({ status: 'loading', data: undefined, error: '' })

    let cancelled = false

    async function fetchChart() {
      try {
        const effectiveUserIds = nodes.length === 0
          ? [selfUserId!]
          : selectedUserIds.filter((id) => orderedMs.some((n) => n.userId === id))

        const params = buildSearchParams(effectiveUserIds, appliedFilters)
        const response = await fetch(
          `/api/production-dashboard/ms-chart?${params}`,
          { credentials: 'include' }
        )

        if (cancelled) return

        if (!response.ok) {
          setAsyncState({ status: 'error', data: undefined,
                          error: 'Error al obtener datos de producción por MS' })
          return
        }

        const body = await response.json() as ApiResponse<MsKpiRaw[]>

        if (cancelled) return

        if ('error' in body || body.data === null) {
          setAsyncState({ status: 'error', data: undefined,
                          error: body.error ?? 'Error al obtener datos de producción por MS' })
          return
        }

        setAsyncState({ status: 'success', data: body.data, error: '' })
      } catch {
        if (!cancelled) {
          setAsyncState({ status: 'error', data: undefined,
                          error: 'Error al obtener datos de producción por MS' })
        }
      }
    }

    fetchChart()
    return () => { cancelled = true }
  }, [selectedUserIds, appliedFilters, selfUserId]) // trmRate excluded — client-side only

  // Derived: recompute MsBarDatum[] on trmRate change without re-fetch
  if (asyncState.status !== 'success') {
    return asyncState as AsyncState<MsBarDatum[]>
  }

  const data = asyncState.data !== null
    ? joinAndConvert(asyncState.data, orderedNodesRef, trmRate)
    : []

  return { status: 'success', data, error: '' }
}
```

---

## 6. Component Design: `MsGroupedBarChart`

**File**: `src/features/production-dashboard/components/MsGroupedBarChart.tsx`

### Props Interface

```typescript
interface MsGroupedBarChartProps {
  readonly chartState: AsyncState<MsBarDatum[]>
  readonly trmRate: number | null
}
```

Note: `trmRate` is passed as a prop (not consumed via hook) to keep the component as a pure renderer. It is used only for the tooltip "TRM no disponible" guard in the national bar.

### Recharts Composition

```
<div role="img" aria-label="Producción por MS: moneda extranjera vs nacional convertida"
     className="overflow-x-auto">
  <BarChart
    width={Math.max(msCount * 120, containerWidth)}
    height={320}
    data={chartState.data}
    margin={{ top: 16, right: 24, bottom: 40, left: 48 }}
  >
    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
    <XAxis
      dataKey="fullName"
      tick={{ fontSize: 11, fill: '#64748b' }}
      angle={-35}
      textAnchor="end"
      interval={0}
    />
    <YAxis
      tickFormatter={(v) => formatUsdCompact(v)}
      tick={{ fontSize: 11, fill: '#64748b' }}
    />
    <Tooltip content={<MsBarTooltip trmRate={trmRate} />} />
    <Legend
      formatter={(value) => {
        if (value === 'foreignUsd') return 'Moneda extranjera (USD)'
        // nationalUsdDisplay — note TRM unavailability in legend when applicable
        return trmRate !== null
          ? 'Nacional (COP → USD)'
          : 'Nacional (COP → USD) — TRM no disponible'
      }}
    />
    <Bar dataKey="foreignUsd" name="foreignUsd" radius={[3,3,0,0]}>
      {chartState.data.map((_, i) => (
        <Cell key={i} fill="#3b82f6" />
      ))}
    </Bar>
    {/* nationalUsdDisplay = nationalUsd ?? 0; gray when TRM unavailable */}
    <Bar dataKey="nationalUsdDisplay" name="nationalUsdDisplay" radius={[3,3,0,0]}>
      {chartState.data.map((entry, i) => (
        <Cell key={i} fill={entry.nationalUsd !== null ? '#22c55e' : '#94a3b8'} />
      ))}
    </Bar>
  </BarChart>
</div>
```

**Dynamic width calculation**:
```typescript
const containerRef = useRef<HTMLDivElement>(null)
const [containerWidth, setContainerWidth] = useState(600)

useEffect(() => {
  if (!containerRef.current) return
  const observer = new ResizeObserver(([entry]) => {
    setContainerWidth(entry.contentRect.width)
  })
  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [])

const chartWidth = Math.max(msCount * 120, containerWidth)
```

### Custom Tooltip: `MsBarTooltip`

```typescript
interface MsBarTooltipProps {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<{
    dataKey: string
    value: number | null
    payload: MsBarDatum
  }>
  readonly label?: string
  readonly trmRate: number | null
}

function MsBarTooltip({ active, payload, trmRate }: MsBarTooltipProps) {
  if (!active || !payload?.length) return null

  // Build only non-zero entries (suppress tooltip rows for zero-value bars)
  const lines = payload.flatMap((entry) => {
    if (entry.dataKey === 'foreignUsd') {
      if (entry.payload.foreignUsd === 0) return []   // suppress zero
      const usd   = formatUsd(entry.payload.foreignUsd)
      const count = entry.payload.foreignCount
      return [(
        <p key="foreign" className="text-blue-600 font-medium">
          {usd} · {count} {count === 1 ? 'negocio' : 'negocios'}
        </p>
      )]
    }

    // nationalUsdDisplay bar — suppress when TRM null or display value is 0
    const datum = entry.payload
    if (datum.nationalUsd === null || datum.nationalUsdDisplay === 0) return []

    const usdVal = formatUsd(datum.nationalUsd)
    const copVal = formatCop(datum.totalCop)
    const count  = datum.nationalCount
    return [(
      <p key="national" className="text-green-600 font-medium">
        {usdVal} ({copVal}) · {count} {count === 1 ? 'negocio' : 'negocios'}
      </p>
    )]
  })

  // If all bars are zero for this group, render nothing
  if (lines.length === 0) return null

  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-xs space-y-1">
      {lines}
    </div>
  )
}
```

### Currency Formatters

```typescript
// src/features/production-dashboard/lib/format-currency.ts  (new utility)

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

**Why module-level formatters**: `Intl.NumberFormat` construction is expensive. Module-level instances are created once and reused across all renders, matching the performance pattern in `UsdKpiCard.tsx`.

### Loading Skeleton

```typescript
function MsBarChartSkeleton() {
  return (
    <div aria-busy="true" className="rounded-xl border bg-card p-4 space-y-3">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="flex items-end gap-4 h-52 px-8">
        {[60, 80, 45, 70].map((h, i) => (
          <div key={i} className="flex gap-1 items-end">
            <div
              className="w-8 animate-pulse rounded-t bg-blue-200"
              style={{ height: `${h}%` }}
            />
            <div
              className="w-8 animate-pulse rounded-t bg-green-200"
              style={{ height: `${Math.floor(h * 0.7)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Empty State

```typescript
import { EmptyState } from '@/features/shared/ui/empty-state'
import { BarChart2 } from 'lucide-react'  // or any neutral icon

// In render:
<EmptyState
  icon={<BarChart2 className="h-8 w-8 opacity-40" />}
  title="Sin producción registrada para los filtros aplicados"
/>
```

### Complete Component Structure

```typescript
'use client'

export function MsGroupedBarChart({ chartState, trmRate }: MsGroupedBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(600)

  // ResizeObserver for responsive width
  useEffect(() => { /* ... */ }, [])

  // Loading state
  if (chartState.status === 'loading' || chartState.status === 'idle') {
    return <MsBarChartSkeleton />
  }

  // Error state
  if (chartState.status === 'error') {
    return (
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-destructive">Error al cargar la producción por MS</p>
      </div>
    )
  }

  // Empty state
  if (chartState.data.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={<BarChart2 className="h-8 w-8 opacity-40" />}
          title="Sin producción registrada para los filtros aplicados"
        />
      </div>
    )
  }

  const msCount = chartState.data.length
  const chartWidth = Math.max(msCount * 120, containerWidth)

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Producción por MS: moneda extranjera vs nacional convertida"
      className="overflow-x-auto rounded-xl border bg-card p-4"
    >
      <BarChart width={chartWidth} height={320} data={chartState.data} ...>
        {/* ... composition as above ... */}
      </BarChart>
    </div>
  )
}
```

---

## 7. Integration Design: DashboardShell

### TRM Lifting — ShellContent Refactor

**Current state** (`UsdKpiPanel` owns `useTrm`):
```typescript
function ShellContent() {
  const { appliedFilters } = useDashboardFilter()
  return (
    <main>
      <DashboardFilterPanel />
      <UsdKpiPanel />                  {/* calls useTrm() internally */}
    </main>
  )
}
```

**Target state** (TRM lifted to `ShellContent`):
```typescript
function ShellContent() {
  const { appliedFilters } = useDashboardFilter()
  const { trmRate, trmLoading, trmState, isManual, error, setManualTrm } = useTrm()  // ← lifted

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-4">
      <DashboardFilterPanel />
      <UsdKpiPanel trmRate={trmRate} trmLoading={trmLoading}
                   trmState={trmState} isManual={isManual}
                   error={error} setManualTrm={setManualTrm} />
      <MsBarChartPanel trmRate={trmRate} />  {/* ← new */}
    </main>
  )
}
```

**`UsdKpiPanel` change**: Accepts `UseTrmResult` fields as props instead of calling `useTrm()` internally. Internal `useTrm()` call is removed. All downstream logic (`effectiveTrmRate`, `trmAvailable`, etc.) remains unchanged.

### New `MsBarChartPanel` Wrapper

```typescript
'use client'

interface MsBarChartPanelProps {
  readonly trmRate: number | null
}

/**
 * Thin wrapper that owns the useMsBarChart hook call and passes results
 * to the pure MsGroupedBarChart renderer.
 */
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

### Visual Separation

`MsBarChartPanel` renders below `UsdKpiPanel` in the existing `space-y-4` main section — no additional margin required since `space-y-4` already handles vertical separation.

### Sequence Diagram — Data Flow on Mount

```
ShellContent           useTrm         useMsBarChart         API
    │                    │                  │                 │
    │──mount─────────────▶ GET /api/trm     │                 │
    │                    │──────────────────────────────────▶ │
    │                    │                  │                 │
    │                    │◀─ { valor: 4050 }│                 │
    │──trmRate=4050──────────────────────▶  │                 │
    │                    │                  │──loading────────│
    │                    │                  │                 │
    │                    │                  │ GET /ms-chart?  │
    │                    │                  │ userIds=1,2,3   │
    │                    │                  │────────────────▶│
    │                    │                  │                 │─ groupBy ─▶ DB
    │                    │                  │◀─ MsKpiRaw[] ───│
    │                    │                  │                 │
    │                    │                  │─join+convert────│
    │                    │                  │─ success(data) ─▶ MsGroupedBarChart renders
```

---

## 8. File Layout

### New Files

| File | Description |
|------|-------------|
| `src/features/production-dashboard/types/production-kpi.types.ts` | **Extend**: Add `MsKpiRaw`, `MsBarDatum`, `MsChartQueryParams` interfaces (existing types untouched) |
| `src/features/production-dashboard/lib/format-currency.ts` | **New**: `formatUsd()`, `formatCop()`, `formatUsdCompact()` using module-level `Intl.NumberFormat` instances |
| `src/features/production-dashboard/services/ms-chart.service.ts` | **New**: `buildProductionWhereClause()`, `getMsChartRaw()` |
| `src/app/api/production-dashboard/ms-chart/route.ts` | **New**: `GET /api/production-dashboard/ms-chart` route handler |
| `src/features/production-dashboard/hooks/use-ms-bar-chart.ts` | **New**: `useMsBarChart(trmRate)` hook + `collectMsNodesInOrder()` pure function |
| `src/features/production-dashboard/components/MsGroupedBarChart.tsx` | **New**: Recharts BarChart renderer + `MsBarTooltip` + `MsBarChartSkeleton` |
| `src/features/production-dashboard/__tests__/ms-chart.service.test.ts` | **New**: Unit tests for service layer |
| `src/features/production-dashboard/__tests__/use-ms-bar-chart.test.ts` | **New**: Unit tests for hook + `collectMsNodesInOrder` |
| `src/features/production-dashboard/__tests__/MsGroupedBarChart.test.tsx` | **New**: RTL tests for component states |
| `src/features/production-dashboard/__tests__/format-currency.test.ts` | **New**: Unit tests for formatters |

### Modified Files

| File | Change |
|------|--------|
| `src/features/production-dashboard/components/DashboardShell.tsx` | Lift `useTrm()` to `ShellContent`; add `<MsBarChartPanel>` below `<UsdKpiPanel>` |
| `src/features/production-dashboard/components/UsdKpiPanel.tsx` | Accept TRM props instead of calling `useTrm()` internally |
| `src/features/production-dashboard/services/production-kpi.service.ts` | Replace inline `where` with import of `buildProductionWhereClause()` from `ms-chart.service.ts` |
| `src/features/production-dashboard/index.ts` | Export `MsGroupedBarChart`, `useMsBarChart`, `MsKpiRaw`, `MsBarDatum`, `MsChartQueryParams` |
| `package.json` | Add `recharts` as production dependency |

---

## 9. Test Design

### Service Tests (`ms-chart.service.test.ts`)

```typescript
describe('getMsChartRaw', () => {
  it('returns [] immediately when userIds is empty — no Prisma call', async () => {
    const spy = vi.spyOn(prisma.business, 'groupBy')
    const result = await getMsChartRaw({ userIds: [], appliedFilters: defaultFilters })
    expect(result).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it('calls groupBy with by: [idUser, idCurrency]', async () => {
    prisma.business.groupBy.mockResolvedValue([])
    await getMsChartRaw({ userIds: [1, 2], appliedFilters: defaultFilters })
    expect(prisma.business.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['idUser', 'idCurrency'] })
    )
  })

  it('maps Prisma rows to MsKpiRaw correctly', async () => {
    prisma.business.groupBy.mockResolvedValue([
      { idUser: 1, idCurrency: 1, _sum: { value: new Decimal('500000') }, _count: { idBusiness: 5 } },
      { idUser: 1, idCurrency: 2, _sum: { value: new Decimal('10000') }, _count: { idBusiness: 2 } },
    ])
    const result = await getMsChartRaw({ userIds: [1], appliedFilters: defaultFilters })
    expect(result).toEqual([
      { userId: 1, currencyType: 1, totalAmount: 500000, count: 5 },
      { userId: 1, currencyType: 2, totalAmount: 10000, count: 2 },
    ])
  })
})

describe('buildProductionWhereClause', () => {
  it('includes idUser IN filter from userIds', () => {
    const where = buildProductionWhereClause({ userIds: [1, 2, 3], appliedFilters: defaultFilters })
    expect(where.idUser).toEqual({ in: [1, 2, 3] })
  })

  it('includes createdAt filter when dateRange present', () => {
    const filters = { ...defaultFilters, dateRange: { start: new Date('2026-01-01'), end: new Date('2026-03-31') } }
    const where = buildProductionWhereClause({ userIds: [1], appliedFilters: filters })
    expect(where.createdAt).toBeDefined()
  })

  it('excludes optional filters when arrays are empty', () => {
    const where = buildProductionWhereClause({ userIds: [1], appliedFilters: defaultFilters })
    expect(where.status).toBeUndefined()
    expect(where.user).toBeUndefined()
  })
})
```

### Hook Tests (`use-ms-bar-chart.test.ts`)

```typescript
describe('collectMsNodesInOrder', () => {
  it('walks depth-first and collects MS_SENIOR/MS_JUNIOR included nodes', () => {
    const tree = buildTestTree([
      { userId: 10, levelCode: 'TEAM_LEADER', included: true, children: [
        { userId: 11, levelCode: 'MS_SENIOR', included: true, children: [] },
        { userId: 12, levelCode: 'MS_JUNIOR', included: false, children: [] },
      ]},
    ])
    expect(collectMsNodesInOrder(tree, undefined)).toEqual([
      expect.objectContaining({ userId: 11 }),
    ])
  })

  it('places self-node first regardless of tree position', () => {
    const tree = buildTestTree([
      { userId: 10, levelCode: 'MS_SENIOR', included: true, children: [
        { userId: 11, levelCode: 'MS_JUNIOR', included: true, children: [] },
      ]},
    ])
    // selfUserId = 10 → appears first even though it's root
    const result = collectMsNodesInOrder(tree, 10)
    expect(result[0].userId).toBe(10)
  })

  it('includes TEAM_LEADER self-node when selfUserId matches', () => {
    const tree = buildTestTree([
      { userId: 5, levelCode: 'TEAM_LEADER', included: true, children: [
        { userId: 11, levelCode: 'MS_SENIOR', included: true, children: [] },
      ]},
    ])
    const result = collectMsNodesInOrder(tree, 5)
    expect(result.map((n) => n.userId)).toEqual([5, 11])
  })
})

describe('useMsBarChart', () => {
  it('uses session userId when nodes is empty (MS Junior)', async () => {
    mockSession({ user: { id: '42', name: 'Jhon MS' } })
    mockNodes([])
    mockApiResponse([{ userId: 42, currencyType: 1, totalAmount: 100000, count: 3 }])

    const { result } = renderHook(() => useMsBarChart(4050))

    await waitFor(() => expect(result.current.status).toBe('success'))
    const data = (result.current as AsyncSuccessState<MsBarDatum[]>).data
    expect(data).toHaveLength(1)
    expect(data[0].userId).toBe(42)
  })

  it('sets nationalUsd to null when trmRate is null', async () => {
    mockNodes(testNodes)
    mockApiResponse(testRawData)

    const { result } = renderHook(() => useMsBarChart(null))

    await waitFor(() => expect(result.current.status).toBe('success'))
    const data = (result.current as AsyncSuccessState<MsBarDatum[]>).data
    expect(data.every((d) => d.nationalUsd === null)).toBe(true)
  })

  it('transitions to error state on API failure', async () => {
    mockNodes(testNodes)
    server.use(http.get('/api/production-dashboard/ms-chart', () => HttpResponse.error()))

    const { result } = renderHook(() => useMsBarChart(4050))

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('matches ordering of orderedMsNodes after successful fetch', async () => {
    const nodes = buildTestNodes([
      { userId: 1, levelCode: 'MS_SENIOR' },
      { userId: 2, levelCode: 'MS_JUNIOR' },
    ])
    mockNodes(nodes)
    mockApiResponse([
      { userId: 2, currencyType: 1, totalAmount: 50000, count: 1 },
      { userId: 1, currencyType: 2, totalAmount: 20000, count: 2 },
    ])

    const { result } = renderHook(() => useMsBarChart(4050))
    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<MsBarDatum[]>).data
    // Ordering follows node tree order: userId 1 first (root MS_SENIOR), then 2
    expect(data[0].userId).toBe(1)
    expect(data[1].userId).toBe(2)
  })
})
```

### Component Tests (`MsGroupedBarChart.test.tsx`)

```typescript
// Note: Recharts requires ResizeObserver mock in test env
describe('MsGroupedBarChart', () => {
  it('renders skeleton with aria-busy when status is loading', () => {
    render(<MsGroupedBarChart
      chartState={{ status: 'loading', data: undefined, error: '' }}
      trmRate={4050}
    />)
    expect(screen.getByRole('status') /* or aria-busy */).toBeInTheDocument()
  })

  it('renders empty state message when success with empty data', () => {
    render(<MsGroupedBarChart
      chartState={{ status: 'success', data: [], error: '' }}
      trmRate={4050}
    />)
    expect(screen.getByText('Sin producción registrada para los filtros aplicados')).toBeInTheDocument()
  })

  it('renders error message when status is error', () => {
    render(<MsGroupedBarChart
      chartState={{ status: 'error', data: undefined, error: 'fail' }}
      trmRate={4050}
    />)
    expect(screen.getByText('Error al cargar la producción por MS')).toBeInTheDocument()
  })

  it('renders chart wrapper with aria-label on success with data', () => {
    render(<MsGroupedBarChart
      chartState={{ status: 'success', data: testBarData, error: '' }}
      trmRate={4050}
    />)
    expect(screen.getByRole('img', {
      name: 'Producción por MS: moneda extranjera vs nacional convertida'
    })).toBeInTheDocument()
  })
})

// Formatter unit tests (format-currency.test.ts)
describe('formatUsd', () => {
  it('formats 185000 as "USD 185.000,00" in es-CO locale', () => {
    expect(formatUsd(185000)).toBe('USD 185.000,00')
  })
})

describe('formatCop', () => {
  it('formats 292815000 as "COP 292.815.000" in es-CO locale', () => {
    expect(formatCop(292815000)).toBe('COP 292.815.000')
  })
})
```

---

## 10. Open Question Resolution

### RQ-04: TEAM_LEADER self-node in chart (resolved)

**Spec flag**: AC-1 states "TL's own group first" but `collectMsNodesInOrder` as originally written filters only `MS_SENIOR`/`MS_JUNIOR` nodes, which would exclude the TL's own node.

**Design decision**: `collectMsNodesInOrder` accepts `selfUserId: number | undefined` as a second parameter. Any node where `node.userId === selfUserId` AND `node.included === true` is included as the **first** element of the result, regardless of `levelCode`.

**Rationale**:
- A Team Leader CAN have personal production (businesses attributed to their own `idUser`).
- The chart's purpose is to show individual production — the authenticated user's own production is relevant regardless of their role.
- A Team Leader appearing first in the chart of their own subordinates aligns with the hierarchy ordering mental model (self → team).
- A Business Leader or MIA viewing the chart would NOT have their own MS-level node in the result (their `levelCode` is `GENERAL_LEVEL` or `TEAM_LEADER` — they would appear as self, which is meaningful).

**AC-1 satisfaction**: 5 groups are shown — TL self-node first, then Ana (MS_SENIOR), Julieta (MS_SENIOR), Jhon (MS_JUNIOR), Paula (MS_JUNIOR). The TL's self-node has `levelCode === 'TEAM_LEADER'` but appears in the chart because `node.userId === session.user.id`.

### RQ-02: Double `useTrm()` call (resolved)

**Decision**: Lift `useTrm()` to `ShellContent`, pass TRM values as props to both panels. This is the cleanest solution — one network call, one source of truth for TRM across both panels.

---

## 11. Dependency: Recharts

```bash
npm install recharts
```

- **Version**: Recharts 2.x (latest) — supports React 18/19, TypeScript included, no `@types/recharts` needed.
- **Bundle impact**: ~200 KB gzip, tree-shakeable. Only `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `CartesianGrid`, `ResponsiveContainer` (not used directly) are imported.
- **SSR safety**: `'use client'` directive on `MsGroupedBarChart.tsx` prevents Recharts from being imported in Server Components.
- **Tailwind v4 compatibility**: Recharts renders SVG — no CSS class conflicts. Color values are passed as hex strings (`#3b82f6`, `#22c55e`) since Recharts reads fill/stroke props directly, not CSS variables.

---

## 12. Architecture Compliance

| Check | Status | Notes |
|-------|--------|-------|
| Route handler → service only, no direct Prisma | ✅ | Route calls `getMsChartRaw` |
| Service returns domain data, not ApiResponse | ✅ | `MsKpiRaw[]` only |
| Hook uses `AsyncState<T>` discriminated union | ✅ | Single `useState<AsyncState<...>>` |
| Component is pure renderer — no business logic | ✅ | Hook owns data, component owns render |
| All identifiers in English | ✅ | |
| User-facing strings in Spanish | ✅ | All error/empty/tooltip text |
| Feature code in `src/features/production-dashboard/` | ✅ | |
| No root-level `src/utils/`, `src/services/` | ✅ | |
| Soft delete: N/A (read-only feature) | ✅ | |
| Audit log: N/A (read-only feature) | ✅ | |
| `'use client'` on Recharts component | ✅ | Required directive |
| Tests co-located in `__tests__/` | ✅ | |
| SOLID: single responsibility per layer | ✅ | Route=HTTP, Service=DB, Hook=state, Component=render |

---

## 13. Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `recharts` not installed yet — blocks `MsGroupedBarChart` compilation | Medium | Install is the first task; verify React 19 compatibility during install |
| `UsdKpiPanel` API change (TRM props) may break existing tests | Low | Update props and test fixtures in the same PR; isolated change |
| Recharts `ResizeObserver` not available in test environment (Vitest/jsdom) | Low | Add `ResizeObserver` mock in test setup; standard pattern for Recharts + RTL |
| MS Junior `session.user.id` may be string (NextAuth) — must cast to `Number()` | Medium | Explicit `Number(session.user.id)` coercion + unit test for this case |
| `collectMsNodesInOrder` with `selfUserId` may double-count if TL is also MS_SENIOR | Low | Guard: `node.userId !== selfUserId` in the MS-level walk; self-node added separately via prepend |
| `buildProductionWhereClause` shared between two services — single import point | Low | If `ms-chart.service.ts` is deleted in future refactor, the import in `production-kpi.service.ts` breaks. Mitigated by co-locating in a `lib/` file instead (can be raised as follow-up task) |
| Recharts tooltip fires on zero-height bars — hover target may be too small | Low | Recharts handles zero-value bars with hover targets; covered by AC-4 manual test |
