# Verification Report — dashboard-filters

**Date**: 2026-05-27
**Verdict**: PASS WITH WARNINGS
**CRITICAL**: 0 | **WARNING**: 2 | **SUGGESTION**: 2

---

## Build Evidence

| Check | Result |
|---|---|
| `npm run test:unit -- src/features/production-dashboard/` | 19 files, 110 tests — ALL PASSED |
| `npm run type-check` | Clean — 0 errors |

---

## Spec Compliance Matrix

| Requirement | Status | Evidence |
|---|---|---|
| Applied Filter Contract shape | PASS | `types/dashboard-filter.types.ts` — all fields present |
| Two snapshots: draft / applied | PASS | Reducer holds `{ draft, applied }` |
| Initial state (Aplicar disabled) | PASS | Test: "has Aplicar button disabled on initial render" |
| Draft-to-Applied Transition (APPLY) | PASS | Reducer test: APPLY copies draft→applied |
| APPLY disabled when draft equals applied | PASS | `isDraftEqualToApplied` + `isApplyEnabled` |
| APPLY disabled when invalid date range | PASS | Reducer test: does NOT apply on invalid range |
| Date range filter | DOCUMENTED | Deviation #2: day Calendar, not MonthYear picker |
| Date validation inline error | PASS | Panel test: shows error when range invalid |
| Multiselect Todas/Todos semantics | PASS | MultiSelectFilter + reducer SET_TODAS tests |
| Product cascade from company | PASS | `deriveActiveProductIds` — 7 unit tests; reducer test verifies single invocation |
| Limpiar resets both snapshots | PASS | Reducer CLEAR test |
| Limpiar clears hierarchy selection | PASS | Panel test: hierarchyDispatch SELECT_ALL called |
| Active Filter Badges from appliedFilters | PASS | `getActiveBadges` — 6 unit tests |
| categoryIds in appliedFilters | PASS | Reducer + context emit categoryIds |
| Tree visual feedback from categoryIds | WARNING | W-1: prop exists, not wired in DashboardShell |
| Internacional toggle | DOCUMENTED | Deviation #1: removed per user approval |
| Panel layout: 8 filter controls | PASS | Panel test: all filter cells visible |
| Aplicar + Limpiar actions | PASS | Wired in DashboardFilterPanel |
| Both contexts at page level | PASS | DashboardShell: HierarchySelectionProvider > DashboardFilterProvider |
| useDashboardFilter() throws outside provider | PASS | Context test: throws descriptive error |
| No new API routes (original spec) | DOCUMENTED | Deviation #4: single catalogs endpoint approved |
| KPI consumer contract shape stable | PASS | Type check clean; shape locked |
| No `any` type | PASS | Type check: 0 errors |
| AsyncState<T> for async hooks | WARNING | W-2: use-dashboard-catalogs uses raw useState |
| No new npm dependencies | PASS | Only Shadcn Calendar (already present) |

---

## Issues

### WARNING

**W-1 — Category↔tree not wired at runtime**
- `HierarchyTreePanel` accepts `activeCategoryIds?: number[]` prop and correctly dims non-matching nodes (unit-tested).
- `DashboardShell` renders `<HierarchyTreePanel />` WITHOUT passing `appliedFilters.categoryIds`.
- At runtime, all nodes always appear at normal opacity regardless of category filter selection.
- Unit test 9.5 passes because it passes the prop directly — it does not verify the context wiring.
- Spec Requirement "Categoría Filter and Hierarchy Tree Visual Feedback" is partially unmet.
- Fix: In `DashboardShell.tsx`, read `appliedFilters.categoryIds` from `useDashboardFilter()` and pass to `<HierarchyTreePanel activeCategoryIds={appliedFilters.categoryIds} />`.

**W-2 — AsyncState<T> not used in use-dashboard-catalogs**
- `hooks/use-dashboard-catalogs.ts` manages state with a flat `useState<DashboardCatalogs>` object.
- Project architecture mandates `AsyncState<T>` discriminated union from `src/features/shared/types/async-state.types.ts`.
- Functional but inconsistent with every other async hook in the codebase.

### SUGGESTION

**S-1 — isDraftEqualToApplied uses positional array equality**
- Same items in different order return `false`, potentially enabling Aplicar when the semantic state hasn't changed.
- Acceptable for current UX (selections are append-ordered), but worth a comment.

**S-2 — InternacionalToggle.tsx is dead code**
- Component created (task 6.2) but removed from panel per approved deviation.
- Consider removing the file or adding a `// TODO: wire when internacional mode is enabled` comment.

---

## Task Completion

| Phase | Tasks | Status |
|---|---|---|
| 0 — Types | 0.1 | DONE |
| 1 — Pure Lib | 1.1–1.7 | DONE |
| 2 — Context | 2.1–2.3 | DONE |
| 3 — Catalog Hook | 3.1 | DONE (alternate approach, documented) |
| 4 — MonthRangePicker | 4.1 | DONE (day-level, documented) |
| 5 — MultiSelectFilter | 5.1 | DONE |
| 6 — Filters | 6.1, 6.2 | DONE (toggle unused per deviation) |
| 7 — Wire Panel | 7.1, 7.2 | DONE |
| 8 — Page Integration | 8.1 DONE; 8.2 PARTIAL | W-1 above |
| 9 — Tests | 9.1–9.3, 9.6 DONE; 9.4 DOCUMENTED; 9.5 PARTIAL | prop-level, not integration |

---

## Final Verdict: PASS WITH WARNINGS

All 110 tests pass. Type check clean. Zero CRITICAL issues. Two WARNING issues — W-1 (category→tree wiring gap) and W-2 (AsyncState convention). Both resolved before archive per user approval.
