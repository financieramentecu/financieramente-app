# Spec: Dashboard Grouped Bar Chart — MS USD vs Nacional

**Change name**: `dashboard-grouped-bar-chart`
**Specified**: 2026-05-27
**Status**: ready-for-tasks
**Author**: SDD spec agent
**Depends on**: `openspec/changes/dashboard-grouped-bar-chart/proposal.md`

---

## Overview

This document defines implementation contracts for the `dashboard-grouped-bar-chart` change using RFC 2119 keywords (MUST, SHALL, SHOULD, MAY). Each requirement has a unique identifier (`SPEC-NNN`) that tasks and verification can reference.

Acceptance criteria from the proposal (`AC-1` through `AC-12`) are mapped to specs in each section.

---

## 1. Data Types Spec

**File**: `src/features/production-dashboard/types/production-kpi.types.ts`  
**Operation**: Extend with new types — existing types MUST NOT be modified.

---

### SPEC-001 — `MsKpiRaw` interface

```typescript
/**
 * One row of the per-user, per-currency groupBy result returned by getMsChartRaw().
 * The service returns at most N × 2 rows where N = number of selected users.
 */
export interface MsKpiRaw {
  /** Internal user identifier (maps to Business.idUser) */
  readonly userId: number
  /**
   * Currency type identifier.
   * 1 = COP (national), any other value = foreign currency (USD-denominated).
   */
  readonly currencyType: number
  /** Sum of Business.value for this userId + currencyType combination */
  readonly totalAmount: number
  /** Count of businesses for this userId + currencyType combination */
  readonly count: number
}
```

**Requirements:**
- R1. `MsKpiRaw` MUST be exported from `production-kpi.types.ts`.
- R2. All fields MUST be `readonly`.
- R3. `currencyType === 1` SHALL be treated as COP (national); all other values SHALL be treated as foreign-currency (USD).
- R4. `totalAmount` MUST be the raw Prisma `_sum.value` result. The value is in the native currency (COP or USD) and MUST NOT be converted at the service layer.

**Acceptance criteria covered**: AC-2, AC-3, AC-4.

---

### SPEC-002 — `MsBarDatum` interface

```typescript
/**
 * Client-side computed shape for one MS agent's bar group.
 * Produced by useMsBarChart after joining MsKpiRaw[] with hierarchy nodes
 * and applying TRM conversion.
 */
export interface MsBarDatum {
  /** Internal user identifier */
  readonly userId: number
  /** Display name derived from the matching HierarchyNode */
  readonly fullName: string
  /** Level code from the matching HierarchyNode */
  readonly levelCode: string
  /** Foreign-currency total already in USD (no conversion required) */
  readonly foreignUsd: number
  /**
   * National COP total converted to USD: totalCop / trmRate.
   * null when trmRate is null (TRM unavailable).
   */
  readonly nationalUsd: number | null
  /**
   * Chart-safe display value for the national bar: nationalUsd ?? 0.
   * Used as the Recharts dataKey so the bar renders at zero height
   * (in gray) when TRM is unavailable instead of being absent.
   */
  readonly nationalUsdDisplay: number
  /** Original COP amount kept for tooltip display */
  readonly totalCop: number
  /** Count of foreign-currency businesses */
  readonly foreignCount: number
  /** Count of national (COP) businesses */
  readonly nationalCount: number
}
```

**Requirements:**
- R1. `MsBarDatum` MUST be exported from `production-kpi.types.ts`.
- R2. All fields MUST be `readonly`.
- R3. `foreignUsd` MUST equal the `totalAmount` of the row where `currencyType !== 1`. If no such row exists, `foreignUsd` MUST be `0`.
- R4. `nationalUsd` MUST equal `totalCop / trmRate` when `trmRate` is a positive number, rounded to 2 decimal places. When `trmRate` is `null`, `nationalUsd` MUST be `null`.
- R5. `totalCop` MUST equal the `totalAmount` of the row where `currencyType === 1`. If no such row exists, `totalCop` MUST be `0`.
- R6. `foreignCount` and `nationalCount` MUST equal the `count` fields from the corresponding `MsKpiRaw` rows. Missing rows produce `0`.
- R7. `fullName` and `levelCode` MUST be sourced from the matching `HierarchyNode` (matched by `userId`), NOT from API data.

**Acceptance criteria covered**: AC-1 through AC-7.

---

### SPEC-003 — `MsChartQueryParams` interface

```typescript
/**
 * Typed query-parameter contract for GET /api/production-dashboard/ms-chart.
 * Mirrors ProductionKpiQueryParams to guarantee filter parity with /kpis.
 */
export interface MsChartQueryParams {
  /** Non-empty array of user IDs to scope the query */
  readonly userIds: readonly number[]
  /** Applied dashboard filters — same contract as the /kpis endpoint */
  readonly appliedFilters: DashboardAppliedFilters
}
```

**Requirements:**
- R1. `MsChartQueryParams` MUST be exported from `production-kpi.types.ts`.
- R2. The `appliedFilters` field MUST use the exact same `DashboardAppliedFilters` type already imported in the file.
- R3. The shape MUST be kept in sync with `ProductionKpiQueryParams`. Any field added to `ProductionKpiQueryParams` MUST be evaluated for inclusion in `MsChartQueryParams`.

**Acceptance criteria covered**: AC-10, AC-11.

---

## 2. Service Function Spec

**File**: `src/features/production-dashboard/services/ms-chart.service.ts` (new file)

---

### SPEC-010 — `buildProductionWhereClause()` helper

```typescript
/**
 * Builds the Prisma where clause shared by both getProductionKpiRaw and getMsChartRaw.
 * Extracted to prevent filter drift between the two services.
 */
export function buildProductionWhereClause(
  params: MsChartQueryParams
): PrismaProductionWhereClause
```

**Requirements:**
- R1. `buildProductionWhereClause` MUST produce a where clause that is semantically identical to the inline where clause in `getProductionKpiRaw` (`production-kpi.service.ts`).
- R2. The helper MUST handle: `idUser` (from `userIds`), `createdAt` (from `dateRange`), `status`, `term` (plazos), `idClientOrigin`, `user.idCategory`, `productPercentageCommission.productConfiguration.idProduct`, `productPercentageCommission.productConfiguration.product.idCompany`, `buyPeriodicity.name` (periodicidades).
- R3. When `userIds` is empty, the function MUST return a where clause that matches zero rows (`{ idUser: { in: [] } }`).
- R4. This helper SHOULD be co-located in `ms-chart.service.ts` and imported by `production-kpi.service.ts` to eliminate duplication.
- R5. The helper MUST NOT call Prisma directly — it only constructs and returns the where object.

**Acceptance criteria covered**: AC-10, AC-11.

---

### SPEC-011 — `getMsChartRaw()` service function

```typescript
/**
 * Returns per-user, per-currency production aggregation for the given scope.
 * One row per (userId × currencyType) pair found in the Business table.
 */
export async function getMsChartRaw(
  params: MsChartQueryParams
): Promise<MsKpiRaw[]>
```

**Requirements:**
- R1. `getMsChartRaw` MUST execute a single `prisma.business.groupBy` with `by: ['idUser', 'idCurrency']`.
- R2. The `_sum` aggregate MUST include `value`; the `_count` aggregate MUST include `idBusiness`.
- R3. The where clause MUST be built via `buildProductionWhereClause(params)`.
- R4. When `params.userIds` is empty, `getMsChartRaw` MUST return `[]` immediately without issuing a DB query.
- R5. The function MUST NOT be called from any route handler directly — only from `GET /api/production-dashboard/ms-chart`.
- R6. The function MUST return domain data (`MsKpiRaw[]`), never an `ApiResponse` shape.
- R7. Each Prisma result row MUST be mapped to `MsKpiRaw` as follows:
  - `userId` ← `row.idUser`
  - `currencyType` ← `row.idCurrency`
  - `totalAmount` ← `row._sum.value ?? 0`
  - `count` ← `row._count.idBusiness ?? 0`

**Acceptance criteria covered**: AC-1, AC-5, AC-6, AC-7, AC-10, AC-11.

---

## 3. API Endpoint Spec

**File**: `src/app/api/production-dashboard/ms-chart/route.ts` (new file)

---

### SPEC-020 — Endpoint contract

**Method**: `GET`  
**Path**: `/api/production-dashboard/ms-chart`  
**Response type**: `NextResponse<ApiResponse<MsKpiRaw[]>>`

---

### SPEC-021 — Authentication

**Requirements:**
- R1. The handler MUST call `auth()` from `@/auth` as its first operation.
- R2. When `session?.user` is falsy, the handler MUST return `{ data: null, error: 'No autorizado' }` with HTTP status `401`.
- R3. No role-based scope enforcement is needed at this layer — the caller supplies `userIds` which are already scoped by the hierarchy service.

**Acceptance criteria covered**: AC-1 through AC-12.

---

### SPEC-022 — Query parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userIds` | comma-separated integers | Yes | — | User IDs to scope the query. Empty string is valid (→ `[]`). |
| `dateFrom` | ISO date string (`YYYY-MM-DD`) | No | First day of current month | Start of the date range (inclusive, Bogotá timezone). |
| `dateTo` | ISO date string (`YYYY-MM-DD`) | No | Last day of current month | End of the date range (inclusive, Bogotá timezone). |
| `statuses` | comma-separated strings | No | `[]` | Business status filter. |
| `categoryIds` | comma-separated integers | No | `[]` | Category IDs filter. |
| `companyIds` | comma-separated integers | No | `[]` | Company IDs filter. |
| `productIds` | comma-separated integers | No | `[]` | Product IDs filter. |
| `originIds` | comma-separated integers | No | `[]` | Origin IDs filter. |
| `plazos` | comma-separated integers | No | `[]` | Policy term (plazo) filter. |
| `periodicidades` | comma-separated strings | No | `[]` | Buy periodicity names filter. |

**Requirements:**
- R1. `userIds` MUST be present in the query string. If absent, return `{ data: null, error: 'El parámetro userIds es requerido' }` with HTTP `400`.
- R2. `userIds` with invalid (non-integer) values MUST return `{ data: null, error: 'El parámetro userIds contiene valores inválidos' }` with HTTP `400`.
- R3. All parameter parsing MUST use the same `parseIds()` helper pattern as `GET /api/production-dashboard/kpis/route.ts`.
- R4. When `userIds` is an empty array, the handler MUST return `{ data: [] }` with HTTP `200` without calling the service.
- R5. Date defaults MUST use the same logic as `/kpis`: first day of current month for `dateFrom`, last day of current month for `dateTo`.

**Acceptance criteria covered**: AC-10, AC-11.

---

### SPEC-023 — Success response

**Requirements:**
- R1. On success, return `{ data: MsKpiRaw[] }` with HTTP `200`.
- R2. An empty result set (no matching businesses) MUST return `{ data: [] }` with HTTP `200` — not `404`.
- R3. The response MUST follow the `ApiResponse<MsKpiRaw[]>` contract from `@/features/shared/types/api-response.types`.

**Acceptance criteria covered**: AC-12.

---

### SPEC-024 — Error response

**Requirements:**
- R1. Unhandled exceptions MUST be caught in the top-level `try/catch` and return `{ data: null, error: 'Error interno del servidor' }` with HTTP `500`.
- R2. The handler MUST log the caught error via `console.error` before returning the 500 response.

---

## 4. Hook Spec

**File**: `src/features/production-dashboard/hooks/use-ms-bar-chart.ts` (new file)

---

### SPEC-030 — Hook signature

```typescript
/**
 * Fetches per-MS production data and applies TRM conversion client-side.
 * Returns AsyncState<MsBarDatum[]> ordered by hierarchy depth-first traversal.
 */
export function useMsBarChart(trmRate: number | null): AsyncState<MsBarDatum[]>
```

**Requirements:**
- R1. The hook MUST be a `'use client'` module.
- R2. The hook MUST return a single `AsyncState<MsBarDatum[]>` discriminated union — it MUST NOT expose separate `isLoading`, `data`, `error` fields.
- R3. The initial state MUST be `{ status: 'idle', data: undefined, error: '' }`.

---

### SPEC-031 — Context consumption

**Requirements:**
- R1. The hook MUST call `useHierarchySelection()` to obtain `nodes: HierarchyNode[]` and `selectedUserIds: readonly number[]`.
- R2. The hook MUST call `useDashboardFilter()` to obtain `appliedFilters: DashboardAppliedFilters`.
- R3. The hook MUST NOT modify or dispatch to either context.

---

### SPEC-032 — MS Junior edge case

**Requirements:**
- R1. When `nodes.length === 0` (MS Junior scenario — empty hierarchy tree), the hook MUST use the authenticated user's own `userId` as the single query target.
- R2. The session `userId` MUST be obtained via `useSession()` from `next-auth/react`.
- R3. In this scenario, the hook MUST construct a synthetic `HierarchyNode`-like object with the session user's data to produce a valid `MsBarDatum` entry. The `fullName` SHOULD be derived from `session.user.name`; `levelCode` SHOULD be `'MS_JUNIOR'`.
- R4. When `nodes.length === 0` AND the session is loading, the hook MUST stay in `loading` state.
- R5. When `nodes.length === 0` AND `session.user.id` is undefined (session error), the hook MUST transition to `error` state with message `'No se pudo obtener el usuario de la sesión'`.

**Acceptance criteria covered**: AC-6.

---

### SPEC-033 — Ordering algorithm

> **Clarification applied (2026-05-27)**: All roles can produce businesses. The chart shows ALL included hierarchy nodes, not only MS-level ones. The `levelCode` filter is removed.

**Requirements:**
- R1. The hook MUST derive the ordered list of producer nodes via `collectNodesInOrder(nodes, selfUserId)` before fetching.
- R2. `collectNodesInOrder` MUST perform a depth-first walk of the `nodes` tree.
- R3. A node MUST be included in the result if and only if: `node.included === true`. There is NO `levelCode` restriction — any role (MS_JUNIOR, MS_SENIOR, TEAM_LEADER, PERFORMANCE_LEADER, BUSINESS_LEADER, PARTNER, MIA) may have personal production and MUST appear if `included`.
- R4. The walk MUST visit children in the order they appear in `node.children` (no additional sorting).
- R5. The authenticated user's own node (`node.userId === selfUserId`) MUST appear FIRST in the result, regardless of its position in the tree.
- R6. `collectNodesInOrder` MUST be a pure function exported from the hook file (or a collocated lib file) so it can be unit-tested independently.

**Reference implementation:**
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

**Acceptance criteria covered**: AC-1, AC-5, AC-7, AC-8, AC-9.

---

### SPEC-034 — Fetch lifecycle

**Requirements:**
- R1. The hook MUST re-fetch when `selectedUserIds` changes (reference equality, via `useMemo` from `HierarchySelectionContext`).
- R2. The hook MUST re-fetch when `appliedFilters` changes.
- R3. The hook MUST NOT re-fetch when `trmRate` changes — TRM conversion is client-side only.
- R4. The hook MUST set state to `{ status: 'loading', data: undefined, error: '' }` synchronously at the start of each fetch cycle.
- R5. Each effect run MUST use a cancellation flag (`let cancelled = false`) and check it before setting state after the `await`. This prevents stale state from overwriting a newer result.
- R6. When `selectedUserIds.length === 0` (and nodes is not empty — not the MS Junior case), the hook MUST return `{ status: 'success', data: [] }` immediately without fetching.
- R7. On a non-200 HTTP response or `error` in `ApiResponse`, the hook MUST transition to `{ status: 'error', data: undefined, error: '<message from API or default>' }`.
- R8. On an unhandled exception, the hook MUST transition to `{ status: 'error', data: undefined, error: 'Error al obtener datos de producción por MS' }`.
- R9. The fetch URL MUST be `/api/production-dashboard/ms-chart` with query parameters serialized using the same pattern as `useProductionKpis` in `use-production-kpis.ts`.
- R10. The fetch MUST include `credentials: 'include'`.

**Acceptance criteria covered**: AC-1, AC-5, AC-8, AC-9, AC-10, AC-11, AC-12.

---

### SPEC-035 — TRM conversion and data join

**Requirements:**
- R1. After a successful fetch, the hook MUST join `MsKpiRaw[]` with `orderedMsNodes` to produce `MsBarDatum[]`.
- R2. The join MUST preserve the order of `orderedMsNodes` — each entry in `orderedMsNodes` produces exactly one `MsBarDatum`, regardless of whether the API returned rows for that userId.
- R3. For a given `userId`, the hook MUST find the COP row (`currencyType === 1`) and the foreign row (`currencyType !== 1`) from the raw API response. Missing rows produce `totalAmount = 0` and `count = 0`.
- R4. `nationalUsd` MUST be computed as: `trmRate !== null && trmRate > 0 ? Math.round((totalCop / trmRate) * 100) / 100 : null`.
- R5. When `trmRate` is `null`, `nationalUsd` MUST be `null` for all `MsBarDatum` entries.
- R6. The conversion computation MUST NOT be placed inside a `useMemo` in a way that depends on `trmRate` as a dependency of the data fetch effect. The conversion MUST run synchronously in the derived value outside the effect.
- R7. The final `AsyncState<MsBarDatum[]>` value MUST reflect the latest combination of API data + current `trmRate`.

**Acceptance criteria covered**: AC-2, AC-3, AC-4.

---

## 5. Component Spec

**File**: `src/features/production-dashboard/components/MsGroupedBarChart.tsx` (new file)

---

### SPEC-040 — Component contract

```typescript
interface MsGroupedBarChartProps {
  readonly chartState: AsyncState<MsBarDatum[]>
  readonly trmRate: number | null
}

export function MsGroupedBarChart(props: MsGroupedBarChartProps): JSX.Element
```

**Requirements:**
- R1. The component file MUST start with `'use client'` (Recharts requires browser context).
- R2. The component MUST accept `chartState` and `trmRate` as props — it MUST NOT call `useMsBarChart` internally (separation of data-fetching from rendering).
- R3. The component MUST NOT contain business logic, Prisma calls, or direct API calls.
- R4. All TypeScript types MUST be `readonly`; no `any`.

---

### SPEC-041 — Loading state

**Requirements:**
- R1. When `chartState.status === 'loading'`, the component MUST render a skeleton placeholder.
- R2. The skeleton MUST use `animate-pulse` CSS class (Tailwind) consistent with `UsdKpiCard` loading pattern.
- R3. The skeleton MUST render a plausible bar chart outline (e.g., 3–4 mock bar groups with rounded rectangles at varying heights) without real data.
- R4. The skeleton container MUST match the approximate height of the rendered chart.

---

### SPEC-042 — Error state

**Requirements:**
- R1. When `chartState.status === 'error'`, the component MUST render an error message.
- R2. The error message MUST be user-facing Spanish text: `"Error al cargar la producción por MS"`.
- R3. The component SHOULD render a retry button that re-triggers the parent hook re-fetch. If implementing retry is out of scope for the initial implementation, the error message alone is sufficient.

---

### SPEC-043 — Empty state

**Requirements:**
- R1. When `chartState.status === 'success'` AND `chartState.data.length === 0`, the component MUST render an empty state message.
- R2. The empty state message MUST be exactly: `"Sin producción registrada para los filtros aplicados"` (user-facing Spanish).
- R3. No bars, axes, or chart scaffold MUST be rendered in the empty state.
- R4. The empty state SHOULD use the `<EmptyState>` component from `src/features/shared/ui/` if it exists, otherwise render an inline styled message.

**Acceptance criteria covered**: AC-12.

---

### SPEC-044 — Chart rendering

> **Clarification applied (2026-05-27)**: When TRM is null, the national bar renders in gray (#94a3b8) at height proportional to `totalCop` (shown as zero-converted), not hidden. `MsBarDatum` gains a `nationalUsdDisplay: number` field (`nationalUsd ?? 0`) used as the chart dataKey.

**Requirements:**
- R1. When `chartState.status === 'success'` AND `chartState.data.length > 0`, the component MUST render a Recharts `<BarChart>` with two `<Bar>` children per group.
- R2. The first `<Bar>` MUST use `dataKey="foreignUsd"` and render in blue (hex `#3b82f6`). Use `<Cell>` per datum to apply the fill.
- R3. The second `<Bar>` MUST use `dataKey="nationalUsdDisplay"` (a `number` field = `nationalUsd ?? 0`).
  - When `nationalUsd !== null`: fill green (hex `#22c55e`).
  - When `nationalUsd === null` (TRM unavailable): fill gray (hex `#94a3b8`) with a visual indicator. A `<Cell>` per datum handles the per-bar color.
- R4. When `nationalUsd` is `null`, the gray bar still renders at height corresponding to the zero value (since `nationalUsdDisplay = 0`). A label or legend note MUST indicate TRM is unavailable.
- R5. The `<XAxis>` MUST use `dataKey="fullName"` to label each group.
- R6. The chart MUST be wrapped in a `<div>` with `overflow-x: auto` (Tailwind: `overflow-x-auto`) to support horizontal scrolling.
- R7. The chart width MUST be `Math.max(msCount * 120, containerWidth)` where `msCount` is `chartState.data.length` and `containerWidth` is the available container width. MINIMUM width per MS group is `120px`.
- R8. The component MUST NOT use `<ResponsiveContainer>` directly as the scroll container — instead, calculate width explicitly and pass it to `<BarChart width={...}>`.
- R9. `MsBarDatum` MUST include a `nationalUsdDisplay: number` field equal to `nationalUsd ?? 0`. This field is computed in `joinAndConvert()`.

**Acceptance criteria covered**: AC-1, AC-4, AC-5, AC-7.

---

### SPEC-045 — Tooltip spec

> **Clarification applied (2026-05-27)**: Tooltip is suppressed (not rendered) when the bar value is zero. R4 updated accordingly.

**Requirements:**
- R1. The component MUST include a Recharts `<Tooltip>` with a custom `content` prop (`MsBarTooltip`).
- R2. When hovering the foreign bar (`foreignUsd`):
  - Display: `"USD {value} · {count} negocios"`
  - `value` is `foreignUsd` formatted with `Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
  - `count` is `foreignCount` from the `MsBarDatum`.
- R3. When hovering the national bar (`nationalUsdDisplay`):
  - When TRM available and value > 0: `"USD {usdValue} (COP {copValue}) · {count} negocios"`
  - When TRM unavailable (`nationalUsd === null`): render the bar in gray and show no tooltip (bar is disabled visually).
  - `usdValue` is `nationalUsd` formatted with 2 decimal places, locale `'es-CO'`.
  - `copValue` is `totalCop` formatted with 0 decimal places, locale `'es-CO'`.
  - `count` is `nationalCount` from the `MsBarDatum`.
- R4. **Zero-value bars — tooltip suppressed**:
  - When `foreignUsd === 0`: `MsBarTooltip` MUST return `null` for that bar entry (no tooltip rendered).
  - When `nationalUsdDisplay === 0` (either zero COP production or null TRM): `MsBarTooltip` MUST return `null` for that bar entry.
  - This applies per-bar: if one bar of the pair is zero and the other is not, the non-zero bar still shows its tooltip normally.
- R5. Currency formatting MUST use `Intl.NumberFormat` — no manual string manipulation.

**Acceptance criteria covered**: AC-2, AC-3, AC-4.

---

### SPEC-046 — Currency formatting rules

**Requirements:**
- R1. USD values MUST be formatted as: `Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)`.
- R2. COP values MUST be formatted as: `Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)`.
- R3. Formatting functions MUST be extracted into a utility (either in `lib/format-currency.ts` or reuse an existing formatter in the feature) — NOT inlined in the JSX.

---

### SPEC-047 — Accessibility

**Requirements:**
- R1. The chart wrapper `<div>` MUST have `role="img"`.
- R2. The chart wrapper MUST have `aria-label="Producción por MS: moneda extranjera vs nacional convertida"`.
- R3. When in loading state, the skeleton container MUST have `aria-busy="true"`.
- R4. When in empty state, the message element MUST be a semantic block element (`<p>` or `<div>`) visible to screen readers.

---

## 6. Integration Spec

**File**: `src/features/production-dashboard/components/DashboardShell.tsx` (modify)

---

### SPEC-050 — Shell composition

**Requirements:**
- R1. `<MsGroupedBarChart />` MUST be rendered in the main content area of `DashboardShell`, directly below `<UsdKpiPanel />`.
- R2. The integration MUST introduce a wrapper component or co-locate the hook call at the shell level. Specifically, `DashboardShell` MUST render an intermediate `MsBarChartPanel` (or inline wrapper) that:
  - Calls `useTrm()` — OR reuses the same TRM value already obtained by `UsdKpiPanel`.
  - Calls `useMsBarChart(trmRate)`.
  - Passes `chartState` and `trmRate` to `<MsGroupedBarChart chartState={...} trmRate={...} />`.
- R3. To avoid two independent `GET /api/trm` calls (one from `UsdKpiPanel`, one from the new panel), `useTrm()` SHOULD be lifted to `DashboardShell` level and passed down, OR a shared TRM context SHOULD be introduced. If lifting is impractical for the initial implementation, calling `useTrm()` in both panels is ACCEPTABLE since `useTrm` fetches once on mount.
- R4. No changes MUST be made to the sidebar layout (`HierarchyTreePanel`) or filter panel (`DashboardFilterPanel`).
- R5. The new chart section MUST be visually separated from `UsdKpiPanel` (e.g., margin-top or padding).

**Acceptance criteria covered**: AC-1, AC-5.

---

### SPEC-051 — Index exports

**File**: `src/features/production-dashboard/index.ts` (modify)

**Requirements:**
- R1. The index MUST export `MsGroupedBarChart` from `./components/MsGroupedBarChart`.
- R2. The index MUST export `useMsBarChart` from `./hooks/use-ms-bar-chart`.
- R3. The index MUST export `MsKpiRaw`, `MsBarDatum`, and `MsChartQueryParams` from `./types/production-kpi.types`.

---

## 7. Dependency Spec

### SPEC-060 — Recharts installation

**Requirements:**
- R1. `recharts` MUST be installed as a production dependency: `npm install recharts`.
- R2. The installed version MUST be compatible with React 19 (Recharts v2.x supports React 18+; verify compatibility with React 19).
- R3. `@types/recharts` MUST NOT be installed separately — Recharts ships its own TypeScript types as of v2.
- R4. The `'use client'` directive on `MsGroupedBarChart.tsx` MUST be present to prevent Recharts from being imported in a Server Component context.

---

## 8. Testing Spec

### SPEC-070 — Service tests

**File**: `src/features/production-dashboard/__tests__/ms-chart.service.test.ts`

**Requirements:**
- R1. MUST test: `getMsChartRaw` returns `[]` when `userIds` is empty (no Prisma call).
- R2. MUST test: `getMsChartRaw` calls `prisma.business.groupBy` with `by: ['idUser', 'idCurrency']`.
- R3. MUST test: `getMsChartRaw` maps Prisma rows to `MsKpiRaw` correctly.
- R4. MUST test: `buildProductionWhereClause` produces the correct where clause for each filter type.

---

### SPEC-071 — Hook tests

**File**: `src/features/production-dashboard/__tests__/use-ms-bar-chart.test.ts`

**Requirements:**
- R1. MUST test: `collectMsNodesInOrder` depth-first traversal (include only `included=true` + MS-level nodes).
- R2. MUST test: MS Junior edge case — `nodes.length === 0` → uses session userId.
- R3. MUST test: TRM unavailable → `nationalUsd === null` for all entries.
- R4. MUST test: successful fetch → correct `MsBarDatum[]` ordering matches tree order.
- R5. MUST test: API error → state transitions to `{ status: 'error' }`.
- R6. MUST test: uncheck node → orderedMsNodes excludes the unchecked user.

---

### SPEC-072 — Component tests

**File**: `src/features/production-dashboard/__tests__/MsGroupedBarChart.test.tsx`

**Requirements:**
- R1. MUST test: renders skeleton when `chartState.status === 'loading'`.
- R2. MUST test: renders empty state message when `chartState.status === 'success'` and `data.length === 0`.
- R3. MUST test: renders error message when `chartState.status === 'error'`.
- R4. MUST test: renders correct number of bar groups when `chartState.status === 'success'` and `data.length > 0`.
- R5. MUST test: `aria-label` is present on the wrapper.
- R6. MUST test: tooltip displays correct format strings (via unit-level formatter tests if Recharts tooltip is hard to test via RTL).

---

## 9. Requirement Traceability Matrix

| Spec ID | Acceptance Criteria |
|---------|-------------------|
| SPEC-001 | AC-2, AC-3, AC-4 |
| SPEC-002 | AC-1 through AC-7 |
| SPEC-003 | AC-10, AC-11 |
| SPEC-010 | AC-10, AC-11 |
| SPEC-011 | AC-1, AC-5, AC-6, AC-7, AC-10, AC-11 |
| SPEC-020 | AC-1 through AC-12 |
| SPEC-021 | AC-1 through AC-12 |
| SPEC-022 | AC-10, AC-11 |
| SPEC-023 | AC-12 |
| SPEC-030 | AC-1 through AC-12 |
| SPEC-031 | AC-1, AC-8, AC-9 |
| SPEC-032 | AC-6 |
| SPEC-033 | AC-1, AC-7, AC-8, AC-9 |
| SPEC-034 | AC-1, AC-5, AC-8–11, AC-12 |
| SPEC-035 | AC-2, AC-3, AC-4 |
| SPEC-040 | AC-1 through AC-12 |
| SPEC-041 | (loading UX) |
| SPEC-042 | (error UX) |
| SPEC-043 | AC-12 |
| SPEC-044 | AC-1, AC-4, AC-5, AC-7 |
| SPEC-045 | AC-2, AC-3, AC-4 |
| SPEC-046 | AC-2, AC-3 |
| SPEC-047 | (accessibility) |
| SPEC-050 | AC-1, AC-5 |
| SPEC-051 | (exports) |
| SPEC-060 | AC-1 through AC-12 |
| SPEC-070–072 | All ACs (test coverage) |

---

## 10. Open Questions / Risks

| ID | Risk | Severity | Decision Required |
|----|------|----------|-------------------|
| RQ-01 | `Business.idUser` may lack a DB index — `groupBy(['idUser', 'idCurrency'])` at scale | Medium | Check `prisma/schema.prisma` for `@@index([idUser])`; add migration if absent before performance testing |
| RQ-02 | `useTrm()` called twice (once in `UsdKpiPanel`, once in new panel) — two API fetches | Low | Decide: lift `useTrm()` to `DashboardShell` or accept duplicate fetch (both are acceptable; SPEC-050 R3 provides guidance) |
| RQ-03 | Recharts compatibility with React 19 (not officially documented) | Low | Run `npm install recharts` and verify — no known breaking changes; if issues arise, use SVG fallback |
| RQ-04 | AC-1 ordering ambiguity: "TL's own group first" — `levelCode` for a Team Leader is `TEAM_LEADER`, not an MS level, so TL self-node would NOT appear in the chart by SPEC-033 R3. The proposal says "5 groups — TL's own group first" implying TL is also in the chart. | Medium | Clarify: should TL's own node be included even if their `levelCode === 'TEAM_LEADER'`? If yes, SPEC-033 must be amended to include `TEAM_LEADER` in the MS set OR TL's own group is handled separately. Current spec excludes TL from the chart (only MS_SENIOR/MS_JUNIOR). |
| RQ-05 | `'use client'` boundary for `useMsBarChart` — the hook imports `useSession` from `next-auth/react` which requires the hook to run client-side. File MUST have `'use client'` directive. | Low | Already addressed in SPEC-030 R1. |

---

## 11. Architecture Compliance Checklist

- [x] Route handler calls service only — no direct Prisma in route (SPEC-020, SPEC-021)
- [x] Service returns domain data, never `ApiResponse` (SPEC-011 R6)
- [x] Hook uses `AsyncState<T>` discriminated union (SPEC-030 R2)
- [x] Component is pure render — no business logic (SPEC-040 R3)
- [x] All identifiers in English; user-facing strings in Spanish (SPEC-043 R2, SPEC-042 R2)
- [x] Soft delete: N/A — read-only feature
- [x] Audit log: N/A — read-only feature
- [x] `'use client'` on Recharts component (SPEC-040 R1, SPEC-060 R4)
- [x] Types co-located in feature `types/` folder (SPEC-001 R1, SPEC-002 R1)
- [x] Tests co-located in feature `__tests__/` folder (SPEC-070–072)
