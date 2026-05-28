# Tasks: Dashboard Filter Panel (dashboard-filters)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700–950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Types + Lib + Context (Phases 0–2) → PR 2: Components + Wiring (Phases 3–7) → PR 3: Page Integration + Tests (Phases 8–9) |
| Delivery strategy | single-pr |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types, all lib pure fns, reducer + context | PR 1 | Base: feat/dashboard-filters. No UI, fully unit-tested. |
| 2 | All filter components + DashboardFilterPanel wiring | PR 2 | Base: PR 1 branch. UI renders, uses context. |
| 3 | Page integration, category→tree highlight, final tests | PR 3 | Base: PR 2 branch. Wires providers at page, integration tests. |

---

## Phase 0 — Types

- [x] 0.1 Create `src/features/production-dashboard/types/dashboard-filter.types.ts` — define `MonthYear`, `DashboardFilterDraft`, `DashboardAppliedFilters`, `ActiveBadge`, `FilterField`, `FilterAction` union (SET_DATE_RANGE | TOGGLE_CATEGORY | TOGGLE_COMPANY | TOGGLE_PRODUCT | TOGGLE_ORIGIN | SET_STATUS | SET_PLAZO | SET_PERIODICIDAD | SET_INTERNACIONAL | SET_TODAS | APPLY | CLEAR), `DashboardFilterState = { draft: DashboardFilterDraft; applied: DashboardAppliedFilters }`. No `any`. TDD: type-level tests via Vitest `expectTypeOf`.

## Phase 1 — Pure Lib Functions

- [x] 1.1 RED: failing test for `buildDefaultFilters()` → all arrays `[]`, `isInternacional: false`, `dateRange: {start:{month:1,year:currentYear}, end:{month:12,year:currentYear}}`. GREEN: implement. Files: `lib/build-default-filters.ts`, `__tests__/build-default-filters.test.ts`.
- [x] 1.2 RED: failing test for `isDateRangeValid(start: MonthYear, end: MonthYear): boolean` — start > end → false; equal → true; start < end → true. GREEN: implement. Files: `lib/validate-date-range.ts`, `__tests__/validate-date-range.test.ts`.
- [x] 1.3 RED: failing test for `deriveActiveProductIds(selectedProductIds, selectedCompanyIds, allProducts)` — empty companies keeps all; deselected company drops orphan products; `[]` stays `[]`. GREEN: implement. Files: `lib/derive-active-product-ids.ts`, `__tests__/derive-active-product-ids.test.ts`.
- [x] 1.4 RED: failing test for `toggleTodas<T>(current: T[], item: T): T[]` — `[]` + item → `[item]`; `[item]` + item → `[]`; `[other]` + item → `[other, item]`. GREEN: implement. Files: `lib/toggle-todas.ts`, `__tests__/toggle-todas.test.ts`.
- [x] 1.5 RED: failing test for `formatPeriodLabel(start: MonthYear, end: MonthYear): string` — same year: "Ene-Dic 2025"; cross-year: "Dic 2024-Mar 2026". Uses date-fns v4 `format`. GREEN: implement. Files: `lib/format-period-label.ts`, `__tests__/format-period-label.test.ts`.
- [x] 1.6 RED: failing test for `getActiveBadges(applied: DashboardAppliedFilters): ActiveBadge[]` — default state → `[]`; non-default dateRange → period badge; non-empty companyIds → company badge; each non-default field emits own badge. GREEN: implement. Files: `lib/derive-active-badges.ts`, `__tests__/derive-active-badges.test.ts`.
- [x] 1.7 RED: failing test for `isDraftEqualToApplied(draft, applied): boolean` — deep equality; mismatched arrays → false; mismatched flag → false; identical → true. GREEN: implement. Files: `lib/is-draft-equal-to-applied.ts`, `__tests__/is-draft-equal-to-applied.test.ts`.

## Phase 2 — DashboardFilterContext

- [x] 2.1 RED: failing reducer tests for every action: `SET_DATE_RANGE` mutates only `draft.dateRange`; `TOGGLE_COMPANY` calls `deriveActiveProductIds` once; `SET_TODAS` resets field to `[]`; `APPLY` copies draft→applied only when `isDateRangeValid` passes; `CLEAR` resets both snapshots. GREEN: implement reducer in `components/DashboardFilterContext.tsx`. Files: `components/DashboardFilterContext.tsx`, `__tests__/dashboard-filter-reducer.test.ts`.
- [x] 2.2 Implement `DashboardFilterProvider` in same file — exposes `{ draft, appliedFilters, dispatch, isApplyEnabled, periodLabel, activeBadges }`. `isApplyEnabled = !isDraftEqualToApplied(draft, applied) && isDateRangeValid(draft.dateRange.start, draft.dateRange.end)`. `periodLabel` and `activeBadges` derived from `appliedFilters` via lib fns.
- [x] 2.3 Implement `useDashboardFilter()` hook (same file) — throws descriptive error when called outside provider. Export all three from `components/DashboardFilterContext.tsx`.

## Phase 3 — Catalog Hook Composition

- [x] 3.1 RED: failing test composing four hooks — combined loading/error/data states; mocks `useCompanies`, `useProducts`, `useClientOrigins`, `useCategories`. GREEN: create `hooks/use-dashboard-catalogs.ts` — returns `{ companies, products, clientOrigins, categories, isLoading, isError }` using `AsyncState<T>`. Files: `hooks/use-dashboard-catalogs.ts`, `__tests__/use-dashboard-catalogs.test.ts`.

## Phase 4 — MonthRangePicker Component

- [x] 4.1 RED: render test — two Popover triggers (Desde / Hasta); month+year selection calls `onChange`; start > end shows error string. GREEN: implement `MonthRangePicker` (Radix `Popover` + two `Select`; month list Ene–Dic; year list currentYear-5 → currentYear+1). Props: `value: {start:MonthYear; end:MonthYear}`, `onChange: (v) => void`, `error?: string`. Files: `components/filters/MonthRangePicker.tsx`, `__tests__/month-range-picker.test.tsx`.

## Phase 5 — MultiSelectFilter Component

- [x] 5.1 RED: render test — trigger shows "Todas/Todos" when `value=[]`; opens with search + checkbox list; "Todas" clears all; specific item adds it; aria labels present. GREEN: implement `MultiSelectFilter<T extends {id:number; label:string}>` (Radix `Popover` + `Command` + Checkbox + `ScrollArea`). Props: `items`, `value: number[]`, `onChange`, `placeholder`, `todasLabel`. Files: `components/filters/MultiSelectFilter.tsx`, `__tests__/multi-select-filter.test.tsx`.

## Phase 6 — Single-Select Filter Components

- [x] 6.1 RED: render + selection test. GREEN: create `SingleSelectFilter` (Radix `Select`). Props: `options: {value:string; label:string}[]`, `value`, `onChange`, `placeholder`. Files: `components/filters/SingleSelectFilter.tsx`, `__tests__/single-select-filter.test.tsx`.
- [x] 6.2 RED: render + toggle test. GREEN: create `InternacionalToggle` (Shadcn `Switch` + label "Internacional"). Props: `checked: boolean`, `onChange: (v:boolean) => void`. Files: `components/filters/InternacionalToggle.tsx`, `__tests__/internacional-toggle.test.tsx`.

## Phase 7 — Wire DashboardFilterPanel to Context

- [x] 7.1 Create `components/filters/ActiveFilterBadges.tsx` — maps `activeBadges: ActiveBadge[]` to `Badge` + `X` icon. Pure presentational. File: `components/filters/ActiveFilterBadges.tsx`.
- [x] 7.2 Modify `components/DashboardFilterPanel.tsx` — replace all `FilterCell` placeholders with wired filter components; consume `useDashboardFilter()` for `draft`, `dispatch`, `isApplyEnabled`, `activeBadges`, `periodLabel`; connect Aplicar (`APPLY`) and Limpiar (`CLEAR` + `hierarchyDispatch(SELECT_ALL)` via `useHierarchySelection()`); render `InternacionalToggle` above grid; swap labels when `draft.isInternacional` true; render note paragraph for internacional; render `ActiveFilterBadges`. File: `components/DashboardFilterPanel.tsx`.

## Phase 8 — Context Integration at Dashboard Page

- [x] 8.1 Modify `src/app/dashboard/page.tsx` — import and add `DashboardFilterProvider` inside `HierarchySelectionProvider`, wrapping `DashboardFilterPanel` and future KPI children. Page remains Server Component; panel is `'use client'`. File: `src/app/dashboard/page.tsx`.
- [x] 8.2 Modify `components/HierarchyTreePanel.tsx` — accept new optional prop `highlightedCategoryIds?: number[]`; pass down to `HierarchyTreeNode.tsx`; apply dimming CSS class to nodes whose `idCategory` is not in the set (when set is non-empty). Read `appliedFilters.categoryIds` from `useDashboardFilter()` at panel level, pass down. Files: `components/HierarchyTreePanel.tsx`, `components/HierarchyTreeNode.tsx`.

## Phase 9 — Tests

- [x] 9.1 Integration test: `DashboardFilterPanel` with provider wrapper — 8 filter cells visible; Aplicar disabled initially; editing Compañía enables Aplicar; pressing Aplicar updates `activeBadges`. File: `__tests__/dashboard-filter-panel.test.tsx`.
- [x] 9.2 Integration test: Limpiar resets panel to defaults and calls hierarchy `SELECT_ALL`. File: `__tests__/dashboard-filter-panel.test.tsx`.
- [x] 9.3 Integration test: invalid date range (start after end) — error message visible, Aplicar disabled. File: `__tests__/dashboard-filter-panel.test.tsx`.
- [x] 9.4 Integration test: internacional toggle — labels swap to País/Moneda/Canal Internacional; note renders. File: `__tests__/dashboard-filter-panel.test.tsx`.
- [x] 9.5 Integration test: `categoryIds` in appliedFilters → matching nodes highlighted, non-matching nodes dimmed. File: `__tests__/hierarchy-tree-panel-category-highlight.test.tsx`.
- [x] 9.6 Integration test: `useDashboardFilter()` outside provider throws descriptive error. File: `__tests__/dashboard-filter-context.test.tsx`.
