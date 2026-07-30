# Design: Heatmap Cell Business Accordion

## Technical Approach

Keep `GET /api/production-dashboard/heatmap` and its aggregation untouched. Add a client-only expansion layer in `production-dashboard`: expansion state in `HeatmapTablePanel`, a pure filter→query mapper in `lib/`, a per-cell fetch hook in `hooks/` returning `AsyncState<T>`, and presentational components in `components/`. **No change to `/api/negocios`, `businessListParamsSchema`, `buildBusinessListWhere`, or any service** — the required params already exist (see Decision A).

## Architecture Decisions

### Decision A — Filter parity without touching `/api/negocios`

**Choice**: pure mapper `lib/to-business-list-query-params.ts` (`DashboardAppliedFilters` + `idUser` + `idCompany` → `URLSearchParams`, repeated keys per array). Verified equivalences against `buildProductionWhereClause` (heatmap) vs `buildBusinessListWhere` (list):

| Dashboard filter | Heatmap WHERE | `/api/negocios` param | Notes |
|---|---|---|---|
| `dateRange.start/end` | `createdAt` range | **`createdFrom`/`createdTo`** | `dateFrom`/`dateTo` map to `dateAnchored` — using them would break reconciliation |
| `statuses` | `status in` | `statuses` (repeated) | same values |
| `categoryIds` | `user.idCategory in` | **`agentCategoryIds`** | identical predicate |
| `plazos` | `term in` | **`terms`** | identical predicate |
| `periodicidades` (names) | `buyPeriodicity.name in` | **`periodicityIds`** | resolve names→ids via `useDashboardCatalogs().periodicidades` |
| `companyIds` / `productIds` / `originIds` | same paths | same names | identical predicate |
| `isInternacional` | not used | not sent | heatmap ignores it too |
| cell coordinates | — | `agentIds=[idUser]`, `companyIds=[idCompany]` | cell only exists if it already passed the company filter |

**Alternatives rejected**: extending `businessListParamsSchema` (params already exist — dead work, widens a shared contract); a new dedicated cell endpoint (out of scope per proposal).
**Rationale**: parity is a mapping problem, not a contract gap. Both date and periodicity mappings are non-obvious and are the actual reconciliation bugs the proposal feared.

### Decision B — Bounded page loop, not a single fixed page

**Choice**: `pageSize=100`, `sortBy=createdAt&sortOrder=desc`, sequential loop while `page < totalPages`, hard cap `MAX_PAGES = 5` (500 businesses/cell). On cap hit, keep the list and render an explicit truncation notice with `pagination.total`.
**Alternatives rejected**: single `pageSize=100` request (silently truncates → violates hard reconciliation); unbounded loop (unbounded requests/DOM).
**Rationale**: no cell volume is documented; a cell is one advisor × one company under filters, so >100 is unlikely. The loop is correct for real volumes and fails loudly instead of silently.

### Decision C — Progressive reveal, no internal scroll

**Choice**: render the first 20 rows of the already-fetched list; `Ver más` appends 20 more (client-side `useState` counter, reset on collapse). No `max-h`/`overflow-y`.
**Alternatives rejected**: virtualization (none in codebase); internal scroll container (CA4 forbids it); render-all (DOM blowup with multi-expansion).

### Decision D — Trigger scope and expansion state

**Choice**: state lives in `HeatmapTablePanel` as `useState<ReadonlySet<CellExpansionKey>>`, `CellExpansionKey = \`${idUser}:${idCompany}\``. The advisor-cell chevron (single per row, product decision #2) toggles **all** keys of that row whose cell `count > 0`; the detail `<tr colSpan>` renders one section per expanded cell (company column order), each with its own fetch and its own reconciliation footer. In-memory only — no URL, no `localStorage`; a full reload resets expansion. Keys exclude the filter snapshot, so `appliedFilters` changes only re-run each hook's `useEffect` (refetch in place, no collapse/unmount).
**Alternatives rejected**: one request per advisor row grouped client-side (fewer requests, but loses per-cell retry and per-cell reconciliation as a first-class unit).

### Decision E — Remove the dead `GENERAL_LEVEL` scope bypass (closes the scope asymmetry)

**Choice**: delete the `levelCode === 'GENERAL_LEVEL'` branch from `resolveViewerScope` (`services/heatmap.service.ts`, ~line 103), leaving the bypass driven **only** by `HIERARCHY_BYPASS_ROLES`. Heatmap visibility then matches `resolveVisibleUserIds` of `/api/negocios` (ADMIN / ASISTENTE_GERENCIA_OPERATIVA / ANALISTA_SOPORTE see everything; everyone else sees their `idUserLeader` subtree), which is the precondition for the hard reconciliation requirement.

**Verified live against the real database** (not the seed script): `level` currently holds `LEVEL_0`…`LEVEL_6`; **no row has `code = 'GENERAL_LEVEL'`**. The general/transversal level ("MIA") is `code = 'LEVEL_6'`, `beneficiaryMode = 'BENEFICIARIO_GENERAL'`. `'GENERAL_LEVEL'` exists only in `prisma/seeds/level.ts` as the *target* code of a rename migration (`oldCode: 'MIA'` → `code: 'GENERAL_LEVEL'`) that was never executed here.

**Business rule (confirmed)**: the general level is transversal for **commission calculation** only (it earns on every business), never for dashboard **visibility**.

**Risk today: zero** — the branch is unreachable because no real `Level.code` equals `'GENERAL_LEVEL'`. It is a preventive cleanup: if the seed rename ever runs, the branch would silently reactivate and re-introduce the scope asymmetry versus `/api/negocios`.

**Consistency across the three dead references to that string**:
- `services/hierarchy-tree.service.ts` → `isFullTreeViewer` has the same condition. **Recommendation: fix it in this same change.** It is the same feature (`production-dashboard/services/`) and it feeds the hierarchy tree that produces `selectedUserIds`, which bounds the heatmap query — leaving it would keep an alternative path to the same asymmetry.
- `src/features/negocios/lib/can-export-business-list.ts` → `EXPORT_LEVEL_CODES` also lists `'GENERAL_LEVEL'`. **Out of scope** (different feature, export authorization, not visibility). Flagged, not ignored: that allowlist looks like a pre-existing defect since it contains the dead code and no `LEVEL_6`, so MIA users may be unable to export. Track as a separate change.
- Existing tests asserting the removed behavior must be updated in this change: `__tests__/services/heatmap.service.test.ts` case *(b) GENERAL_LEVEL code returns all active users*, plus the `GENERAL_LEVEL` fixtures in `__tests__/services/hierarchy-tree.service.test.ts` / `hierarchy-tree.route.test.ts` if the tree fix is included. Replacement RED tests assert that a non-bypass role on any level code gets only its subtree.

**Alternatives rejected**: keep the branch and accept empty/partial expansions (violates product decision #1); widen `/api/negocios` visibility to match the heatmap (security regression — it would expose businesses outside the hierarchy subtree).

## Data Flow

    DashboardFilterContext ─appliedFilters─┐
    useDashboardCatalogs ─periodicidades─┐ │
                                         ▼ ▼
    HeatmapTablePanel ──expandedKeys──► HeatmapCellBusinessList (per key)
        (chevron toggles row keys)          │ useCellBusinesses(idUser, idCompany)
                                            ▼ toBusinessListQueryParams()
                                     GET /api/negocios?agentIds&companyIds&createdFrom…
                                            ▼
                                  BusinessEntity[] ─► HeatmapCellBusinessRow
                                                       (─ placeholders, Ir a negocio ↗)

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/production-dashboard/lib/to-business-list-query-params.ts` | Create | Pure mapper (Decision A), incl. periodicity name→id |
| `src/features/production-dashboard/hooks/use-cell-businesses.ts` | Create | Per-cell fetch, `AsyncState<CellBusinessList>`, page loop (Decision B), cancellation flag |
| `src/features/production-dashboard/components/HeatmapCellBusinessList.tsx` | Create | Detail section: loading/empty/error, `Ver más`, reconciliation footer |
| `src/features/production-dashboard/components/HeatmapCellBusinessRow.tsx` | Create | One business row; `-` placeholders; `next/link target="_blank" rel="noopener noreferrer"` |
| `src/features/production-dashboard/components/HeatmapTablePanel.tsx` | Modify | Chevron in advisor cell, expansion Set, `<tr colSpan={1 + companies*2}>` after the advisor row |
| `src/features/production-dashboard/types/heatmap-cell-expansion.types.ts` | Create | `CellExpansionKey`, `CellBusinessRowView`, `CellBusinessList` |
| `src/features/production-dashboard/services/heatmap.service.ts` | Modify | `resolveViewerScope` only — drop the dead `levelCode === 'GENERAL_LEVEL'` bypass (Decision E) |
| `src/features/production-dashboard/services/hierarchy-tree.service.ts` | Modify | `isFullTreeViewer` only — same dead-string removal, for scope consistency (Decision E) |
| `src/features/production-dashboard/__tests__/services/heatmap.service.test.ts` | Modify | Replace the `GENERAL_LEVEL` full-scope case with a subtree-only assertion |
| `src/features/production-dashboard/__tests__/services/hierarchy-tree.{service,route}.test.ts` | Modify | Update `GENERAL_LEVEL` fixtures to real level codes |
| `src/app/api/negocios/route.ts` | Unchanged | Verified: all needed params already supported |
| `src/features/negocios/lib/can-export-business-list.ts` | Unchanged (flagged) | `EXPORT_LEVEL_CODES` keeps the dead `'GENERAL_LEVEL'` and lacks `LEVEL_6` — separate change |

## Interfaces / Contracts

```ts
export type CellExpansionKey = `${number}:${number}`

export interface CellBusinessList {
  readonly businesses: readonly CellBusinessRowView[]
  readonly total: number
  readonly isTruncated: boolean
}

export interface CellBusinessRowView {
  readonly idBusiness: number
  readonly companyName: string
  readonly productName: string | null
  readonly contract: string | null
  readonly value: number | null
  readonly currencyName: string | null
  readonly status: BusinessStatus
}

export function toBusinessListQueryParams(input: {
  readonly filters: DashboardAppliedFilters
  readonly idUser: number
  readonly idCompany: number
  readonly periodicityIdByName: ReadonlyMap<string, number>
  readonly page: number
}): URLSearchParams
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `toBusinessListQueryParams`: `createdFrom/createdTo` (never `dateFrom`), `categoryIds→agentCategoryIds`, `plazos→terms`, periodicity name→id, `isInternacional` omitted, cell coordinates | Vitest pure-function table |
| Unit | `useCellBusinesses`: page loop, `MAX_PAGES` truncation, refetch on `appliedFilters` change without state loss, error/empty | `renderHook` + mocked `fetch` |
| Integration | Chevron expand/collapse, multi-row expansion, `Ver más`, `-` placeholders, new-tab link, no internal scroll wrapper | Testing Library on `HeatmapTablePanel` |
| Integration | Reconciliation: mocked heatmap cell vs mocked `/api/negocios` count/subtotals match under the same filters | shared fixture driving both mocks |
| Unit | `resolveViewerScope` / `isFullTreeViewer`: non-bypass role gets subtree only for every level code; bypass roles still get full scope | Vitest, replaces the removed `GENERAL_LEVEL` cases |

## Residual Risks

| Risk | Status | Mitigation |
|---|---|---|
| Scope asymmetry heatmap vs `/api/negocios` | **Closed** (Decision E) | Dead `GENERAL_LEVEL` bypass removed in `resolveViewerScope` + `isFullTreeViewer`; zero behavior change today |
| Cell volume above the 500-business cap | Open, non-blocking | Explicit truncation notice; volume not documented, assumption stated |
| Up to N parallel requests when a row expands (one per company with data, typically ≤5) | Accepted tradeoff | Buys per-cell retry and per-cell reconciliation |
| `EXPORT_LEVEL_CODES` contains dead `'GENERAL_LEVEL'` and no `LEVEL_6` | Out of scope, flagged | Separate change in `negocios` (export authorization, not visibility) |
| `/api/negocios/route.ts` calls Prisma directly (pre-existing CLAUDE.md violation) | Out of scope | Not touched by this change |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. New tab uses `rel="noopener noreferrer"`.

## Migration / Rollout

No migration. Additive, client-side only; revert the branch to restore aggregate-only heatmap.

## Open Questions

- [ ] `statuses` values are forwarded verbatim; a dashboard status outside `BUSINESS_STATUS_VALUES` yields a loud 400 rather than a silently dropped filter. Non-blocking — confirm during apply.

No blocking open questions remain: the scope asymmetry is resolved by Decision E.
