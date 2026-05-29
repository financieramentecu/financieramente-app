# Verify Report: Gráfica de dona "Origen del cliente"

## Change: origen-cliente-donut
## Mode: Strict TDD
## Verdict: PASS WITH WARNINGS

---

## Build Evidence
- `npm run type-check`: PASS — zero errors
- `npm run test:unit`: PASS — 2446 tests passed (3 skipped), 0 failures
- New tests contributed: 61+ across 6 new test files

---

## Task Completeness

| Phase | Tasks | Status |
|-------|-------|--------|
| 1 Foundation types + lib | 1.1, 1.2, 1.3 | COMPLETE |
| 2 Service | 2.1 | COMPLETE |
| 3 Route | 3.1 | COMPLETE |
| 4 Service/Route tests | 4.1–4.4 | COMPLETE |
| 5 Hook | 5.1 | COMPLETE |
| 6 UI Components | 6.1–6.4 | COMPLETE |
| 7 Hook/Component tests | 7.1–7.2 | COMPLETE |
| 8 Shell integration | 8.1 | COMPLETE |
| 9.1 type-check | CI | COMPLETE |
| 9.2 test:unit | CI | COMPLETE |
| 9.3 Manual smoke (Partner) | manual | PENDING |
| 9.4 Manual smoke (MS Junior) | manual | PENDING |

---

## Spec Compliance Matrix

| Requirement | Evidence | Status |
|---|---|---|
| Scope-Aware Initial Load | Hook reads selectedUserIds from HierarchySelectionContext; falls back to selfUserId for MS Junior | PASS |
| groupBy [idClientOrigin, idCurrency] | service: `by: ['idClientOrigin', 'idCurrency']` | PASS |
| ClientOrigin fetched WITHOUT status filter | service + test confirm no `status:` in findMany | PASS |
| Percentage calculation | aggregateOriginDonut: `Math.round((r.count / totalCount) * 1000) / 10` | PASS |
| Filter parity (both contexts) | Hook effect deps: [selectedUserIds, appliedFilters, selfUserId] | PASS |
| Color palette (stable hue per origin) | buildOriginPaletteMap sorts ascending by originId — stable | PASS |
| COP light / non-COP solid palette | resolveDonutColor uses COP_CURRENCY_ID=1 | PASS |
| Legend sorted descending by percentage | OriginDonutLegend: `[...slices].sort((a, b) => b.percentage - a.percentage)` | PASS |
| Legend empty → renders nothing | `if (slices.length === 0) return null` | PASS |
| Tooltip: USD segment shows USD only | For USD segments: shows count + percentage format | PASS |
| Tooltip: COP segment shows only count/percentage | For COP segments: shows count + percentage only | PASS |
| Empty state message "Sin negocios para los filtros aplicados" | OriginDonutChart: exact string present | PASS |
| Loading: skeleton shown | idle/loading → OriginDonutSkeleton with aria-busy="true" | PASS |
| Error: error state shown | error branch renders error card | PASS |
| Race condition via AbortController | cancelled flag + controller.abort() in useEffect cleanup | PASS |
| DashboardShell: Donut BETWEEN UsdKpiPanel and MsBarChartPanel | Shell code confirmed; shell-ordering.test covers this | PASS |
| Auth guard 401 on no session | route.ts checks `!session?.user` → 401 | PASS |
| Architecture: no Prisma in route | by-origin/route.ts imports only service, no prisma import | PASS |
| AsyncState pattern in hook | Returns `AsyncState<OriginDonutSlice[]>`, no separate isLoading/data/error | PASS |

---

## Issues

### WARNINGs (2)

**W1 — Manual smoke tests (9.3, 9.4) pending**
- Partner (MIA) and MS Junior load scenarios cannot be auto-verified. These are marked as manual in tasks and remain PENDING. Not a blocker for archive.

**W2 — Deviations from proposal noted in apply-progress**
- Tooltip logic was refined during implementation based on user feedback (count-based metric, no monetary conversion for COP segment)
- ADR-D3 clarifies the design choice: USD shows count/percentage, COP shows count/percentage (not a monetary conversion)

---

## Design Coherence

| Design Decision | Verified |
|---|---|
| ADR-D4: duplicate param helpers per-route | by-origin/route.ts has its own buildFiltersFromSearchParams | PASS |
| ADR-D5: cancelled flag + AbortController | Present in useOriginDonut | PASS |
| ADR-D6: trmRate in scope at insertion point | DashboardShell passes trmRate={trmRate} from useTrm to OriginDonutPanel | PASS |
| Container-presenter pattern | OriginDonutPanel (hook owner) → OriginDonutChart (pure renderer) | PASS |
| Services return domain data, not ApiResponse | getOriginDonutRaw returns OriginDonutRaw[], not ApiResponse | PASS |

---

## Final Verdict: PASS WITH WARNINGS
- 0 CRITICAL
- 2 WARNING
- 0 SUGGESTION

Ready for archive: YES (warnings are non-blocking; all code complete and tested; manual smokes are procedural)
