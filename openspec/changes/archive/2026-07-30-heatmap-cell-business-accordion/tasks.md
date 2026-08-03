# Tasks: Heatmap Cell Business Accordion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550-650 |
| 400-line budget risk | High (accepted via size-exception) |
| Chained PRs recommended | No (size-exception approved) |
| Delivery strategy | single PR, size-exception |
| Chain strategy | size-exception |

Decision needed before apply: No — resolved (size-exception)
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High (explicitly accepted, not split)

### Work Units (delivered together in one PR)

The 6 phases below remain the internal TDD sequencing and rollback reference, but all changes land in a single PR of ~550-650 lines instead of being split across chained PRs.

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary (within the single PR) |
|------|------|----------------------|-----------------|-------------------------------------------|
| 1 | Remove dead `GENERAL_LEVEL` scope bypass in heatmap + hierarchy-tree services | `npx vitest run src/features/production-dashboard/__tests__/services` | N/A (unit only, no live scenario needed) | Revert 2 service files + 3 test files, no UI/API contract touched |
| 2 | Filter mapper (`lib/`) + per-cell fetch hook (`hooks/`) with `AsyncState` | `npx vitest run src/features/production-dashboard/__tests__/lib src/features/production-dashboard/__tests__/hooks` | `npm run dev` + manual `GET /api/negocios` call w/ mapped params | Revert new `lib/` + `hooks/` + `types/` files independently of Unit 1 |
| 3 | Accordion UI (chevron, expansion state, detail row, components) + integration/reconciliation tests | `npx vitest run src/features/production-dashboard/__tests__/components` | `npm run dev` → expand a heatmap cell in `/dashboard` | Revert `HeatmapTablePanel.tsx` diff + new components independently of Unit 2 |

## Phase 1: Scope Fix (prerequisite, independent)

- [x] 1.1 RED: update `__tests__/services/heatmap.service.test.ts` — replace GENERAL_LEVEL full-scope case with "non-bypass role, any level code → subtree only"
- [x] 1.2 RED: update `__tests__/services/hierarchy-tree.service.test.ts` fixtures/assertions off `GENERAL_LEVEL` to real level codes with subtree-only expectation
- [x] 1.3 RED: update `__tests__/services/hierarchy-tree.route.test.ts` fixtures the same way
- [x] 1.4 GREEN: remove `levelCode === 'GENERAL_LEVEL'` branch from `resolveViewerScope` in `services/heatmap.service.ts` (~L103)
- [x] 1.5 GREEN: remove the same dead branch from `isFullTreeViewer` in `services/hierarchy-tree.service.ts`
- [x] 1.6 Verify: `npx vitest run src/features/production-dashboard/__tests__/services` all green, no other suite depends on the removed branch

## Phase 2: Filter Mapping (lib/)

- [x] 2.1 RED: `__tests__/lib/to-business-list-query-params.test.ts` — table-driven cases: `dateRange→createdFrom/createdTo` (never `dateFrom/dateTo`), `categoryIds→agentCategoryIds`, `plazos→terms`, `periodicidades` name→id via provided map, `companyIds/productIds/originIds` passthrough, `isInternacional` omitted, cell coords → `agentIds=[idUser]`+`companyIds=[idCompany]`
- [x] 2.2 GREEN: create `lib/to-business-list-query-params.ts` implementing `toBusinessListQueryParams()` per design Interfaces/Contracts
- [x] 2.3 Create `types/heatmap-cell-expansion.types.ts` — `CellExpansionKey`, `CellBusinessRowView`, `CellBusinessList`

## Phase 3: Per-Cell Fetch Hook (hooks/)

- [x] 3.1 RED: `__tests__/hooks/use-cell-businesses.test.ts` — page loop with `pageSize=100`, stops at `totalPages`, `MAX_PAGES=5` cap sets `isTruncated`, refetch on `appliedFilters` change without resetting expansion, error state, empty state (`renderHook` + mocked `fetch`)
- [x] 3.2 GREEN: create `hooks/use-cell-businesses.ts` — `AsyncState<CellBusinessList>`, calls `GET /api/negocios` via the Phase 2 mapper, cancellation flag for stale requests

## Phase 4: Accordion UI (components/) — depends on Phase 2 & 3

- [x] 4.1 RED: `__tests__/components/HeatmapCellBusinessRow.test.tsx` — renders company/product/contract/value+currency/status; `-` placeholder when value or product missing; "Ir a negocio" link has `target="_blank" rel="noopener noreferrer"` and correct href
- [x] 4.2 GREEN: create `components/HeatmapCellBusinessRow.tsx`
- [x] 4.3 RED: `__tests__/components/HeatmapCellBusinessList.test.tsx` — loading/empty/error states; progressive reveal 20-at-a-time with "Ver más"; counter resets on collapse; no `max-h`/`overflow-y` wrapper
- [x] 4.4 GREEN: create `components/HeatmapCellBusinessList.tsx`
- [x] 4.5 RED: `__tests__/components/HeatmapTablePanel.test.tsx` — chevron toggles chevron-right/chevron-down; clicking USD/NEG sub-cells does not toggle; multiple cells expand independently; `<tr colSpan>` appears right after the advisor row and pushes subsequent rows down; expansion Set survives a filter-change re-render (only refetch happens); full unmount/remount (reload) resets expansion
- [x] 4.6 GREEN: modify `components/HeatmapTablePanel.tsx` — add chevron in advisor cell, `useState<ReadonlySet<CellExpansionKey>>`, render detail `<tr colSpan={1 + companies*2}>` wiring `HeatmapCellBusinessList`

## Phase 5: Integration & Reconciliation Tests

- [x] 5.1 RED→GREEN: reconciliation test — shared fixture drives mocked heatmap cell (`NEG` count + USD/COP sums) and mocked `/api/negocios` response; assert expanded list count and per-currency sums equal the cell aggregate under identical filters
- [x] 5.2 RED→GREEN: scope test — non-bypass-role viewer expands a cell for an advisor outside their `resolveVisibleUserIds` subtree → list is empty, no leaked businesses (exercises Phase 1 fix end-to-end)
- [x] 5.3 Verify all new/modified suites together: `npx vitest run src/features/production-dashboard`

## Phase 6: Cleanup

- [x] 6.1 Confirm no `max-h`/`overflow-y`/modal/overlay markup was introduced anywhere in the accordion (CA4 compliance)
- [x] 6.2 Confirm `HeatmapCellBusinessRow`/`HeatmapCellBusinessList` are pure presentation (no `fetch`, no Prisma), mapping stays in `lib/`, fetching stays in `hooks/`

## Archive Closure Notes

**Post-Apply Reconciliation (recorded at archive time — 2026-07-30)**:

Five adjustments were made post-apply that are not fully reflected in this tasks.md artifact:

1. **Narrowed `status` type from `string` to `BusinessStatus`** (design.md Interface was updated before archive; implementation includes this strictness, spec.md implied it via "business status" requirement).
2. **`BusinessStatusBadge` component usage** — new import/usage in `HeatmapCellBusinessRow.tsx` for status rendering (post-apply discovery, not explicit in Phase 4 task decomposition).
3. **Company-by-company grouping restructure** — initial implementation showed company name per row; restructured to group header pattern with single company label per group (drives spec.md reconciliation in "Expanded Business List Content" requirement; test (p) added to cover the new scenario).
4. **Memoization fix for `periodicityIdByName`** — computed once, passed down (efficiency/correctness fix found during integration test).
5. **Sticky header on HeatmapTablePanel** — added CSS for sticky header to improve UX during expansion and scrolling (quality-of-life improvement, not spec-driven).

**Spec.md reconciliation** (2026-07-29 → 2026-07-30 during design correction):

The "Expanded Business List Content" requirement was rewritten to describe the group-header pattern (company name shown once in a group header, rows show only product/contract/value/status without repeating company). The spec previously suggested company on every row; the implementation correctly does grouping. The spec.md is now authoritative and aligned with the final code.

**Verification gap closed** (3rd pass, 2026-07-30):

Prior 2nd pass reported 1 CRITICAL: the new scenario "Businesses are grouped into per-company sections" lacked a runtime test. Test case (p) was added to `HeatmapTablePanel.test.tsx` to exercise this scenario (single advisor row with 2 companies, expand to verify 2 distinct group headers render with correct company names). Re-verification passed all 8 requirements / 14 scenarios / 1103 tests green.

No regressions: all 22 original tasks remain complete and aligned with code/tests.
