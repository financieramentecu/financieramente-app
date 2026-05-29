# Design: Negocios por Estado Donut Chart

## Technical Approach

Mirror the existing `company-donut` pattern (service → lib → hook → component → API route → DashboardShell). Differences from the company donut: (a) data source is a single `prisma.business.groupBy(['status'])` — no Company chain traversal, no findMany+reduce; (b) no currency dimension (status alone defines slices); (c) fixed color map keyed by status (no palette index, no light variant). Filters reuse `buildProductionWhereClause`. Layout: expand the donut grid from 2 to 3 columns on `xl` breakpoint.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Aggregation strategy | `prisma.business.groupBy(['status'])` | `findMany` + in-memory reduce (company-donut style) | Status is a direct column on Business — no relation traversal needed. `groupBy` is the smaller, faster, idiomatic primitive. |
| Allowed statuses | Hard filter `status: { in: ['VENTA_EFECTUADA','EMITIDO','FONDEADO'] }` in WHERE | Aggregate everything, drop client-side | Push filter to DB to skip null/CANCELADO/LIQUIDADO at source — smaller payload, cleaner contract. Nullable `status` column makes IN-list explicit. |
| Color mapping | Fixed `Record<BusinessStatus, string>` lookup | Palette index like `buildCompanyPaletteMap` | Status set is closed (3 values). Fixed semantic colors are clearer than position-based palette. |
| Currency dimension | Omitted | Mirror `(status × currency)` like company donut | Out-of-scope per proposal. Status semantics do not vary by currency. |
| Filter reuse | Reuse `buildProductionWhereClause(params)` | Build new where clause | Maintains parity with sibling donuts on dateRange/agent/category/etc. |
| Status panel filter coexistence | Honored as-is (may produce 1 slice = 100%) | Disable when applied | Accepted in proposal — consistent with sibling KPIs. |
| Layout breakpoint | `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` | `lg:grid-cols-3` | `xl` (1280px) avoids cramped 3-up at 1024–1279. Sibling donuts already fit md 2-up. |

## Data Flow

```
DashboardFilterContext + HierarchySelectionContext
        │ (appliedFilters, selectedUserIds)
        ▼
useStatusDonut hook ──► GET /api/production-dashboard/by-status?<query>
        │                       │
        │                       ▼
        │              route.ts (auth + parseQuery)
        │                       │
        │                       ▼
        │              getBusinessesByStatusRaw(params)
        │                       │ prisma.business.groupBy
        │                       ▼
        │              StatusDonutRaw[]  ──► ApiResponse<StatusDonutRaw[]>
        ▼
aggregateStatusDonut(raw) ──► StatusDonutSlice[]  (percentage + fill)
        ▼
StatusDonutPanel ──► StatusDonutChart (Recharts Pie)
                       ├─► StatusDonutTooltip   "63 (45%)"
                       └─► StatusDonutLegend    "Venta Efectuada · 35%"
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/api/production-dashboard/by-status/route.ts` | Create | GET handler: auth → parse query → call service → return `ApiResponse<StatusDonutRaw[]>` |
| `src/features/production-dashboard/services/by-status.service.ts` | Create | `getBusinessesByStatusRaw(params)` using `prisma.business.groupBy(['status'])` |
| `src/features/production-dashboard/lib/by-status-aggregate.ts` | Create | `aggregateStatusDonut(raw)` — computes percentage, attaches fill from color map |
| `src/features/production-dashboard/lib/by-status-colors.ts` | Create | Fixed `STATUS_COLORS: Record<BusinessStatus, string>` + label map |
| `src/features/production-dashboard/hooks/use-status-donut.ts` | Create | Same AsyncState pattern as `useCompanyDonut` (no `trmRate` param) |
| `src/features/production-dashboard/components/StatusDonutPanel.tsx` | Create | Section wrapper + hook call + state branching |
| `src/features/production-dashboard/components/StatusDonutChart.tsx` | Create | Recharts `PieChart` + `Pie` + colored cells |
| `src/features/production-dashboard/components/StatusDonutTooltip.tsx` | Create | Custom tooltip rendering `"<count> (<pct>%)"` |
| `src/features/production-dashboard/components/StatusDonutLegend.tsx` | Create | Custom legend rendering `"<label> · <pct>%"` |
| `src/features/production-dashboard/types/production-kpi.types.ts` | Modify | Append `StatusDonutQueryParams`, `StatusDonutRaw`, `StatusDonutSlice` |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modify | Import `StatusDonutPanel`; change grid to `md:grid-cols-2 xl:grid-cols-3` |
| `src/features/production-dashboard/__tests__/by-status-aggregate.test.ts` | Create | Pure-function tests |
| `src/features/production-dashboard/__tests__/by-status.service.test.ts` | Create | Service tests with mocked Prisma |
| `src/features/production-dashboard/__tests__/use-status-donut.test.tsx` | Create | Hook tests with mocked fetch |

## Interfaces / Contracts

```ts
// Allowed statuses (subset of BUSINESS_STATUS)
export const STATUS_DONUT_ALLOWED = ['VENTA_EFECTUADA', 'EMITIDO', 'FONDEADO'] as const
export type StatusDonutKey = (typeof STATUS_DONUT_ALLOWED)[number]

export interface StatusDonutQueryParams {
  readonly userIds: readonly number[]
  readonly appliedFilters: DashboardAppliedFilters
}

export interface StatusDonutRaw {
  readonly status: StatusDonutKey
  readonly count: number
}

export interface StatusDonutSlice {
  readonly status: StatusDonutKey
  readonly label: string        // "Venta Efectuada" | "Emitido" | "Fondeado"
  readonly count: number
  readonly percentage: number   // 0–100, 1 decimal
  readonly fill: string         // hex from STATUS_COLORS
}

// Fixed color map (not palette-indexed)
export const STATUS_COLORS: Record<StatusDonutKey, string> = {
  VENTA_EFECTUADA: '#3B82F6', // blue   — sale recorded
  EMITIDO:         '#F59E0B', // amber  — issued, in motion
  FONDEADO:        '#10B981', // green  — funded, terminal-positive
}
```

Service skeleton:

```ts
export async function getBusinessesByStatusRaw(
  params: StatusDonutQueryParams,
): Promise<StatusDonutRaw[]> {
  if (params.userIds.length === 0) return []

  const rows = await prisma.business.groupBy({
    by: ['status'],
    where: {
      ...buildProductionWhereClause(params),
      status: { in: [...STATUS_DONUT_ALLOWED] },
    },
    _count: { _all: true },
  })

  return rows
    .filter((r): r is { status: string; _count: { _all: number } } => r.status !== null)
    .filter((r) => (STATUS_DONUT_ALLOWED as readonly string[]).includes(r.status))
    .map((r) => ({ status: r.status as StatusDonutKey, count: r._count._all }))
}
```

Hook state machine: identical to `useCompanyDonut` — `idle | loading | success | error` via `AsyncState`. No `trmRate` dependency.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (lib) | `aggregateStatusDonut`: percentage rounding, empty array, zero counts, fill assignment | Vitest, pure-function table tests |
| Unit (service) | `groupBy` called with correct WHERE (IN filter + delegated clause); null filtering; empty userIds short-circuit | Mock `prisma.business.groupBy`; assert call args |
| Unit (hook) | Loading → success → error; abort on unmount; refetch on `selectedUserIds`/`appliedFilters` change | `renderHook` + `waitFor`; mock global fetch |
| Integration (route) | Auth gate; query parsing; ApiResponse shape | Existing route-test pattern (mock service) |
| Visual (manual) | 3-up layout on xl, 2-up on md, 1-up on mobile; tooltip "63 (45%)"; empty state | Storybook-free — sanity-check in dev |

## Migration / Rollout

No DB migration. No feature flag — additive UI behind existing dashboard route. Rollback = revert grid + remove new files (see proposal).

## Open Questions

- None — colors, labels, layout breakpoint, and allowed statuses are fixed by the proposal.
