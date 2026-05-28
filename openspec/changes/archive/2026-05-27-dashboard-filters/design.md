# Design: Production dashboard report filter panel (dashboard-filters)

## Technical Approach

Mirror the proven `HierarchySelectionContext` pattern: `useReducer` + exported pure helpers (unit-tested), provider derives view values, `useDashboardFilters()` throws outside provider. The reducer holds **draft** (editing) and **applied** (last Aplicar) snapshots. KPI hooks read `appliedFilters` only. Catalog data reuses existing feature hooks (`useCompanies`, `useProducts`, `useClientOrigins`, `useCategories`) — no new route. Two contexts coexist as siblings at `DashboardPage`; category↔tree highlight is deferred (proposal Scenario 6), so flow stays one-directional and acyclic.

## File Changes

| File | Action | Responsibility (SRP) |
|------|--------|----------------------|
| `types/dashboard-filter.types.ts` | Create | `DashboardAppliedFilters`, `DashboardFilterDraft`, `FilterAction`, `MonthYear`, `ActiveBadge` |
| `components/DashboardFilterContext.tsx` | Create | reducer + provider + `useDashboardFilters` hook |
| `lib/build-default-filters.ts` | Create | `buildDefaultFilters(): DashboardFilterDraft` |
| `lib/derive-active-product-ids.ts` | Create | cascade pure fn |
| `lib/toggle-todas.ts` | Create | array toggle / clear-to-all helper |
| `lib/validate-date-range.ts` | Create | `start ≤ end` predicate |
| `lib/format-period-label.ts` | Create | date-fns label "Ene 2025 – Dic 2025" |
| `lib/derive-active-badges.ts` | Create | `getActiveBadges(applied): ActiveBadge[]` |
| `components/DashboardFilterPanel.tsx` | Create | layout: header, FilterRow×2, actions |
| `components/filters/MonthRangePicker.tsx` | Create | Popover + Select×4 (start/end month/year) |
| `components/filters/MultiSelectFilter.tsx` | Create | generic multiselect (Popover + ScrollArea + Checkbox + search) |
| `components/filters/SingleSelectFilter.tsx` | Create | Status / Plazo / Periodicidad |
| `components/filters/ActiveFilterBadges.tsx` | Create | renders `getActiveBadges` output |
| `__tests__/*` | Create | reducer, helpers, panel integration |
| `src/app/dashboard/page.tsx` | Modify | wrap `<DashboardFilterProvider>`, render panel |
| `HierarchySelectionContext.tsx` | Unchanged | — |

## Architecture Decisions

### ADR-1: Draft/Applied split inside one reducer
**Choice**: Single reducer holding `{ draft, applied }`. Edits mutate `draft`; `APPLY` copies `draft→applied` after validation; `CLEAR` resets both. **Alternatives**: (a) two reducers/contexts; (b) local `useState` in panel + applied context. **Rationale**: one source of truth, atomic transitions, KPI consumers depend only on `applied` (ISP). Avoids `resolvedX2`: effective product set lives in draft, computed once by the reducer.

### ADR-2: Generic `MultiSelectFilter`, separate single-selects
**Choice**: One generic multiselect for Category/Company/Product/Origin (uniform `{ id, label }[]`); thin per-filter single-selects. **Alternatives**: per-filter multiselects (duplication ×4) vs fully generic select. **Rationale**: the four multiselects share identical mechanics (search, ScrollArea, checkbox, "Todas" toggle); a generic component is justified abstraction, not over-engineering. Single-selects differ in option source/semantics, kept separate.

### ADR-3: Category↔tree integration — deferred, one-way contract
**Choice**: This slice emits `categoryIds[]` only. No write into `HierarchySelectionContext`. **Alternatives**: bidirectional sync now. **Rationale**: bidirectional contexts risk a cycle. Provider hierarchy (`HierarchySelectionProvider > DashboardFilterProvider`) means the future integration reads filter categories and dispatches DOWN into the tree via an effect at panel level — never the reverse. Limpiar is the only cross-context write: panel calls `hierarchy.dispatch({type:'SELECT_ALL'})` on CLEAR.

## Interfaces / Contracts

```ts
type MonthYear = { month: number; year: number }
type DashboardFilterDraft = {
  dateRange: { start: MonthYear; end: MonthYear }
  statuses: string[]; categoryIds: number[]; companyIds: number[]
  productIds: number[]; originIds: number[]
  plazos: number[]; periodicidades: string[]; isInternacional: boolean
}
type DashboardAppliedFilters = DashboardFilterDraft // applied snapshot
type FilterAction =
  | { type: 'SET_DATE_RANGE'; range: DashboardFilterDraft['dateRange'] }
  | { type: 'SET_STATUS'; statuses: string[] }
  | { type: 'TOGGLE_CATEGORY' | 'TOGGLE_COMPANY' | 'TOGGLE_PRODUCT' | 'TOGGLE_ORIGIN'; id: number }
  | { type: 'SET_TODAS'; field: 'categoryIds'|'companyIds'|'productIds'|'originIds'|'statuses'|'plazos'|'periodicidades' }
  | { type: 'SET_PLAZO'; plazos: number[] } | { type: 'SET_PERIODICIDAD'; periodicidades: string[] }
  | { type: 'SET_INTERNACIONAL'; value: boolean } | { type: 'APPLY' } | { type: 'CLEAR' }

// Cascade — computed ONCE in TOGGLE_COMPANY reducer branch:
function deriveActiveProductIds(
  selectedProductIds: number[], selectedCompanyIds: number[], allProducts: Product[]
): number[] // drops products whose idCompany ∉ selectedCompanyIds (empty companies = all kept)

type ActiveBadge = { key: string; label: string; field: FilterAction extends { field: infer F } ? F : string }
```

Provider exposes: `{ draft, appliedFilters, dispatch, isApplyEnabled, periodLabel, activeBadges }`. `isApplyEnabled = validateDateRange(draft.dateRange)`. `ActiveFilterBadges` calls `onClear` → `SET_TODAS`/default + (badge clear is draft-then-apply or applied-direct; clears act on applied).

## Component nature & validation

`DashboardFilterPanel` and all filter children are **Client Components** (`'use client'`) — they consume context, dispatch, and use Radix interactivity. `DashboardPage` stays a Server Component (auth + flag), renders the client panel. **Validation lives in `lib`** (`validateDateRange`), called by the provider to derive `isApplyEnabled` and by reducer to guard `APPLY` — never duplicated in components.

## Data Flow

    User edits ─dispatch─▶ reducer(draft)
    draft ─derive─▶ isApplyEnabled / periodLabel(draft)
    [Aplicar] APPLY: validate → draft→applied
    appliedFilters ─▶ ActiveFilterBadges + future use-dashboard-kpis
    [Limpiar] CLEAR → buildDefaultFilters + hierarchy.dispatch(SELECT_ALL)

Future `use-dashboard-kpis` reads `selectedUserIds` (hierarchy) + `appliedFilters`; final scope = `Business WHERE idUser IN selectedUserIds AND user.idCategory IN categoryIds (if non-empty) AND ...`. This slice guarantees shape + period label only.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | reducer (every action, APPLY guard, CLEAR), `deriveActiveProductIds`, `toggleTodas`, `validateDateRange`, `formatPeriodLabel`, `getActiveBadges` | Vitest table-driven, pure fns |
| Integration | `DashboardFilterPanel` render + edit→Aplicar→badge, Limpiar, start>end disables Aplicar, internacional label swap | Testing Library + provider wrapper |

Test files colocated in `production-dashboard/__tests__/`.

## Migration / Rollout
No migration. No new dependency (Radix + date-fns v4 already present). Renders under existing `production_dashboard` flag.

## Open Questions
- [x] Badge clear semantics: clear applied directly vs draft+auto-apply — resolved as clear applied + sync draft
