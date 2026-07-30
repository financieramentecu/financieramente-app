# Proposal: Heatmap Cell Business Accordion

## Intent

The "Producción por empresa (heatmap)" panel only shows aggregates (USD/COP totals and NEG count) per advisor × company. When a number looks wrong or interesting, the user must leave the dashboard and manually re-find the underlying businesses in the negocios list, losing the filter context. Dashboard users need to expand an advisor × company cell and see the exact businesses behind that aggregate, each linking to its registration form, so verification happens without leaving the dashboard.

## Scope

### In Scope

- Expandable accordion row per advisor × company cell in `HeatmapTablePanel`, rendered as a `colSpan` row that pushes subsequent rows down (no overlay, no internal scroll container).
- Dedicated expand/collapse icon at the start of each advisor (coach) cell as the single interaction point (chevron-right collapsed, chevron-down expanded). The value/count sub-cells are NOT clickable triggers.
- Per-row business fields: company, product, contract number, value + currency (USD/COP), business status. Missing value or product renders a hyphen `-`.
- "Ir a negocio" hyperlink per business to `/dashboard/negocios/{id}`, opening in a new tab.
- Collapse via the same icon; multiple cells may stay expanded simultaneously.
- Expansion survives dashboard filter changes: the expanded list refetches with the new filters, the accordion does not collapse.
- Lazy per-cell data fetch on expand, reusing `GET /api/negocios` with `agentIds` + `companyIds` plus forwarded dashboard filters.
- Loading, empty, and error states for the expanded region.

### Out of Scope

- New dedicated cell-businesses endpoint (decided: reuse `/api/negocios`).
- Single-open accordion semantics (decided: multi-open allowed).
- List virtualization, in-accordion pagination, sorting, or editing.
- Changes to heatmap aggregation math, filters panel, or the business detail page.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `production-dashboard`: heatmap cells gain an expand/collapse interaction that reveals the per-cell business list with navigation to business detail.

## Approach

Keep the heatmap aggregate payload unchanged. Add a client-side expansion state keyed by `{idUser}:{idCompany}` in `HeatmapTablePanel`, plus a new hook that fetches businesses on first expand from `GET /api/negocios` (filtered by `agentIds`/`companyIds` and the active `DashboardAppliedFilters`) using `AsyncState<T>`. Render an extra `<tr>` with `colSpan` after the advisor row, following the existing group-header row pattern. Accordion interaction follows the hand-rolled pattern in `AcordeonNegocioDistribucion.tsx` (no shadcn Accordion primitive exists). Presentation stays in `components/`, filter-to-query mapping in `lib/`, fetching in `hooks/`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/production-dashboard/components/HeatmapTablePanel.tsx` | Modified | Cell click target, expansion state, `colSpan` detail row |
| `src/features/production-dashboard/components/` | New | Expanded business list + row components |
| `src/features/production-dashboard/hooks/` | New | Per-cell business fetch hook (`AsyncState`) |
| `src/features/production-dashboard/lib/` | New | Map `DashboardAppliedFilters` → `/api/negocios` query params |
| `src/features/production-dashboard/types/` | Modified | Cell expansion + cell business row types |
| `src/app/api/negocios/route.ts` | Unchanged (verify) | Confirm existing params cover all dashboard filters |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Filter param mismatch between `DashboardAppliedFilters` (`dateRange`, `plazos`, `periodicidades`, `categoryIds`) and `businessListParamsSchema` (`dateFrom`/`dateTo`, no `categoryIds`) causes numbers that disagree with the aggregate | High | `design.md` resolves exact mapping and documents any filter that cannot be forwarded |
| DOM growth with many cells expanded and >20 businesses each (no virtualization in the codebase) | Medium | `design.md` decides mitigation: visible-count cap with "ver más" vs. accepting growth given real volumes |
| `/api/negocios` pagination defaults (`pageSize: 10`) silently truncate a cell's list | Medium | Explicit page size / fetch-all strategy defined in design |
| New-tab navigation has no precedent in internal dashboard links | Low | Use `next/link` with `target="_blank" rel="noopener noreferrer"`; keep it scoped to this list |
| Scope leaks between advisors via reused list endpoint | Low | `/api/negocios` already applies `resolveVisibleUserIds`; verify with tests |

## Rollback Plan

Feature is additive and isolated to `src/features/production-dashboard/`. Revert the change branch (or hide the expand affordance) to return the heatmap to read-only aggregates; no schema migration, no API contract change, no data backfill.

## Dependencies

- Existing `GET /api/negocios` filter/scope behavior must remain stable.
- `/dashboard/negocios/{id}` route remains the business detail destination.

## Success Criteria

- [ ] Expanding an advisor × company cell lists that cell's businesses with company, product, contract, value + currency, and status.
- [ ] Sum/count of the expanded list reconciles with the cell aggregate under the same active filters.
- [ ] Each row links to `/dashboard/negocios/{id}` in a new tab.
- [ ] Toggling the advisor-cell chevron restores the initial heatmap view; several cells can be open at once.
- [ ] Applying a dashboard filter while a cell is expanded keeps it expanded and refreshes its list.
- [ ] Expanded content grows the page (main page scroll), never an internal scrollbar.
- [ ] Unit/integration tests cover expand/collapse, filter forwarding, expansion persistence across filter changes, and empty/error states.

## Confirmed Product Decisions

1. **Reconciliation is a hard requirement.** The expanded list MUST reflect exactly the same business set behind the cell aggregate, under the same dashboard filters. Any dashboard filter not currently supported by `GET /api/negocios` is a gap to be resolved by the filter mapping in `design.md`, not an acceptable limitation.
2. **Expansion trigger is a dedicated icon.** A single expand/collapse icon at the start of each advisor (coach) cell toggles the accordion (chevron-right when collapsed, chevron-down when expanded). Neither the whole cell nor the USD/NEG value sub-cells act as triggers.
3. **Incomplete businesses are still listed.** A business with missing value or missing product data MUST appear in the list; the missing field renders a hyphen `-` (not "N/A" or any other placeholder text).
4. **Expansion survives filter changes.** Applying a dashboard filter while a cell is expanded MUST keep that cell expanded; only the inner business list refetches with the new filters. No URL or storage persistence was requested, so a full page reload resets expansion state; `design.md` MUST state this reset behavior explicitly in the interaction model.
5. **No additional permission gate.** Every role that can already view the heatmap can expand cells; visibility remains bounded by the existing `resolveVisibleUserIds` scope of `/api/negocios`.
