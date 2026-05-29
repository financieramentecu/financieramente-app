# Design: Dashboard TRM Auto-Consultation & USD Conversion Panel

## Technical Approach

Two additive BFF routes. A generic `trm` proxy at `src/app/api/trm/` isolates the external `co.dolarapi.com` dependency (server-enforced 5s timeout, CORS-free) and is reusable by any feature in the app. A dashboard-specific `kpis` route under `src/app/api/production-dashboard/` delegates to `production-kpi.service.ts`, which runs a single Prisma `groupBy` over `Business.idCurrency` and splits totals into foreign vs national via a pure `currency-classifier.ts` (DRY extraction from `negocios/stats/route.ts`). Conversion math is client-side (`nationalUsd = totalCop / trm`) so the auto/manual TRM value drives recalculation without re-querying. Hooks use the shared `AsyncState<T>` discriminated union. UI mounts a `UsdKpiPanel` inside the existing `DashboardShell` right column, reading `useHierarchySelection().selectedUserIds` and `useDashboardFilter().appliedFilters`. No schema changes, no edits to existing contexts or `CoachKpiCard`.

## Architecture Decisions

### Decision: Separate TRM and KPI routes (not one combined endpoint)
**Choice**: Two routes — `GET /api/trm` (generic, reusable) and `GET /api/production-dashboard/kpis` (dashboard-specific).
**Alternatives**: Single endpoint returning TRM + totals.
**Rationale**: SRP. TRM is volatile/external with its own failure mode (timeout, manual fallback); KPIs depend on hierarchy+filters and re-fetch on a different cadence. Coupling them would force a TRM re-fetch on every filter change and entangle two failure surfaces.

### Decision: Client-side conversion, service returns raw COP
**Choice**: Service returns `{ foreign.totalUsd, national.totalCop, total }`; hook computes `nationalUsd = totalCop / trm`.
**Alternatives**: Pass TRM into the KPI query and convert server-side.
**Rationale**: TRM (auto or manual) changes independently of the dataset. Client-side division avoids a network round-trip on every TRM edit and keeps the DB query pure/cacheable. Matches proposal's stated approach.

### Decision: Extract `currency-classifier.ts` as a pure function
**Choice**: `classifyCurrency(currency) → 'COP' | 'FOREIGN'`, reused by the new service. `stats/route.ts` may adopt it later (out of scope now).
**Alternatives**: Inline the heuristic again.
**Rationale**: DRY + testability. The symbol/name + id-fallback heuristic is the single brittle point (risk in proposal); centralizing it makes it unit-testable in isolation.

### Decision: New `UsdKpiCard`, do NOT reuse `CoachKpiCard`
**Choice**: Dedicated single-value card with optional legend/manual-source slot.
**Alternatives**: Reuse `CoachKpiCard` (dual Local/Extranjera layout).
**Rationale**: Interface Segregation. `CoachKpiCard` is built around COP+USD dual columns and `sinSoporte`; USD cards show one USD figure plus a TRM-traceability legend. Forcing the existing card would bloat its props and is explicitly out of scope.

### Decision: Empty hierarchy short-circuits in the hook, before fetch
**Choice**: `selectedUserIds.length === 0` → set success state with zeros, skip `/kpis` call.
**Alternatives**: Let the route handle empty userIds.
**Rationale**: Empty `IN ()` would otherwise return all businesses (proposal risk). Short-circuiting client-side also avoids a useless request.

### Decision: `use-trm` does NOT depend on filters/hierarchy
**Choice**: `use-trm` fetches once on mount; `use-production-kpis` re-fetches on `selectedUserIds`/`appliedFilters` change but NOT on `trm`.
**Rationale**: TRM is a global rate, independent of selection. Conversion happens at render from the latest `trm` value.

## Data Flow

    DashboardShell (HierarchySelection + DashboardFilter providers)
        │
        ├─ use-trm ──→ GET /api/trm ──→ co.dolarapi.com (5s AbortController)
        │     └─ success: trm value | failure: error → manual input → setManualTrm
        │
        └─ use-production-kpis(selectedUserIds, appliedFilters)
              │  (0 users → zeros, no fetch)
              └─→ GET /api/production-dashboard/kpis?userIds=&...filters
                     └─→ production-kpi.service ─ groupBy(idCurrency) ─ classifyCurrency
                            ↓ ProductionKpiResult (foreign.usd, national.cop)
        UsdKpiPanel: nationalUsd = national.totalCop / trm ; totalUsd = foreign.usd + nationalUsd

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/trm/route.ts` | Create | Generic BFF proxy, auth + 5s AbortController timeout — reusable by any feature |
| `src/app/api/production-dashboard/kpis/route.ts` | Create | Auth, parse userIds+filter query, delegate to service |
| `src/features/production-dashboard/lib/currency-classifier.ts` | Create | Pure `classifyCurrency` heuristic |
| `src/features/production-dashboard/services/production-kpi.service.ts` | Create | Prisma `groupBy(idCurrency)` aggregation + split |
| `src/features/production-dashboard/types/trm.types.ts` | Create | `TrmData`, `TrmApiResponse`, manual-state types |
| `src/features/production-dashboard/types/production-kpi.types.ts` | Create | `ProductionKpiResult`, query params type |
| `src/features/production-dashboard/hooks/use-trm.ts` | Create | `AsyncState<TrmData>` + `setManualTrm` |
| `src/features/production-dashboard/hooks/use-production-kpis.ts` | Create | `AsyncState<ProductionKpiResult>`, empty-short-circuit |
| `src/features/production-dashboard/components/TrmDisplay.tsx` | Create | Readonly display / error+manual input |
| `src/features/production-dashboard/components/UsdKpiCard.tsx` | Create | Single USD value card + legend slot |
| `src/features/production-dashboard/components/UsdKpiPanel.tsx` | Create | 3 cards + TrmDisplay, does conversion math |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modify | Mount `UsdKpiPanel` in right column |
| `src/features/production-dashboard/index.ts` | Modify | Export new public symbols |

## Interfaces / Contracts

```typescript
// trm.types.ts
interface TrmData { trm: number; fetchedAt: string; isManual: boolean }
// GET /api/trm → ApiResponse<{ trm: number; fetchedAt: string }>  (generic, reusable)

// production-kpi.types.ts
interface ForeignKpi { totalUsd: number; count: number }
interface NationalKpi { totalCop: number; count: number }
interface TotalKpi { totalUsd: number; count: number } // totalUsd raw=foreign only; national added client-side
interface ProductionKpiResult { foreign: ForeignKpi; national: NationalKpi; total: TotalKpi }
// GET /api/production-dashboard/kpis?userIds=1,2&dateFrom=&dateTo=&statuses=&categoryIds=&companyIds=&productIds=&originIds=&plazos=&periodicidades=
//   → ApiResponse<ProductionKpiResult>

// currency-classifier.ts (pure)
function classifyCurrency(c: { idCurrency: number; symbol: string; name: string }): 'COP' | 'FOREIGN'
```

`production-kpi.service.ts` reuses the hierarchy visibility rule from `stats/route.ts` (ADMIN unscoped; others scoped). `userIds` query narrows further. National `totalUsd` is computed in `UsdKpiPanel` from `national.totalCop / trm`; `total.totalUsd = foreign.totalUsd + nationalUsd`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `classifyCurrency` (COP/PESO/USD/DOLAR matches + id-1/2/other fallbacks) | Vitest table-driven |
| Unit | `production-kpi.service` split + Decimal→number coercion | Mock `prisma.business.groupBy` + `currency.findMany` |
| Unit | `use-trm` (auto success, timeout→error, `setManualTrm`→isManual) | `renderHook` + mocked `fetch` |
| Unit | `use-production-kpis` (0 users → zeros no-fetch; re-fetch on filter change) | `renderHook` + mocked `fetch` |
| Component | `TrmDisplay` (loading/readonly/error+manual), `UsdKpiPanel` conversion + `trm=null` → "—" | Testing Library |

Strict TDD: write each test before its unit.

## Migration / Rollout

No migration required. All work is additive (new routes/files + one `DashboardShell` mount line + barrel exports). Rollback = revert the feature commit.

## Open Questions

- [ ] None blocking. (TRM caching deliberately deferred per proposal.)
