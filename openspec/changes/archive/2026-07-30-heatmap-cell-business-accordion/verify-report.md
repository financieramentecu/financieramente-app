```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:a4e7e823f2b0c959d0610f9affeb5f892ca5a865ad59c8df26a0631618edc81e
verdict: pass
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 14/14
test_command: npx vitest run src/features/production-dashboard src/features/negocios
test_exit_code: 0
test_output_hash: sha256:a4e7e823f2b0c959d0610f9affeb5f892ca5a865ad59c8df26a0631618edc81e
build_command: npx tsc --noEmit
build_exit_code: 0
build_output_hash: sha256:fdf0a2a824502fd2a3500588b97aacfa101e81643c2ae38a30a978b6663ef05b
```

## Verification Report (RE-VERIFICATION — 3rd pass, gap closed)

**Change**: heatmap-cell-business-accordion
**Version**: N/A
**Mode**: Strict TDD

### Context
This is the 3rd verify pass, run from scratch (no assumption carried from prior runs). Prior pass (2nd) found exactly 1 CRITICAL: the new spec scenario "Businesses are grouped into per-company sections" had no covering runtime test. Between that pass and this one, a new test was added: `HeatmapTablePanel.test.tsx`, test `(p) expanding an advisor row with businesses in 2 companies renders 2 distinct per-company group sections`.

### Deep inspection of test (p) fidelity
Read both the test and the production code it targets (`HeatmapTablePanel.tsx`):
- Fixture: single advisor row (`idUser: 1`) with `cellsByCompany` containing 2 entries — `idCompany 5` (`count: 2`) and `idCompany 6` (`count: 1`) — and 2 `companyColumns` with distinct names (`Empresa X`, `Empresa Y`).
- Production code (`HeatmapTablePanel.tsx:276-279`) computes `rowKeys` as one `CellExpansionKey` per company column where that advisor's `count > 0` — so both companies are included in this row's `rowKeys`.
- A single click on the row's one expand button (`aria-label` "Expandir negocios del asesor", matched via `getByRole('button', { name: /expandir/i })`) calls `toggleRow(rowKeys)` (line 302), which expands **all** keys in `rowKeys` together — confirming "single click on the icon" expands both companies under one advisor row, matching the scenario's GIVEN/WHEN.
- Render output (lines 329-356): for each key in `rowKeys` that is expanded, a `<div>` group header showing `companyName` (looked up by `idCompany`) renders once, immediately followed by `HeatmapCellBusinessList` scoped to that `idCompany`.
- Assertions verify both `cell-detail-1-5` and `cell-detail-1-6` (the mocked `HeatmapCellBusinessList`, isolating this test to the grouping/wiring layer only) AND both `Empresa X` and `Empresa Y` text nodes are present simultaneously — i.e., 2 distinct group sections with correct company names, at the same time, under one row.
- No text-collision risk: the table's column header renders `col.companyName.toUpperCase()` (`EMPRESA X`), so `screen.getByText('Empresa X')` (case-sensitive) uniquely resolves to the group header, not the column header.
- Verdict on fidelity: the test is a faithful, non-trivial runtime exercise of the scenario — it is not merely checking that code paths exist, it actually asserts the two-groups-simultaneously-visible behavior described in spec.md.

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 22 |
| Tasks complete | 22 |
| Tasks incomplete | 0 |

No regressions in the 22 tasks; all still map 1:1 to existing code/tests. The new test (p) is an addition on top of task 4.5's scope (HeatmapTablePanel test suite), consistent with the recommendation from the prior verify report.

### Build & Tests Execution (fresh run this session)
**Build**: PASSED — `npx tsc --noEmit`, full repo, exit 0, 0 errors.
**Lint**: PASSED — `npm run lint` (ESLint), full repo, exit 0, 0 errors/warnings.
**Tests**: PASSED — `npx vitest run src/features/production-dashboard src/features/negocios` → 131 test files, 1103 tests, all passing (1102 from prior pass + new test (p) = 1103).

### Spec Compliance Matrix (8 requirements / 14 scenarios)
| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Heatmap Cell Expansion Trigger | Toggle expands/collapses | `HeatmapTablePanel.test.tsx` (j) | COMPLIANT |
| Heatmap Cell Expansion Trigger | Multiple cells expand independently | `HeatmapTablePanel.test.tsx` (l) | COMPLIANT |
| Expanded Business List Content | Businesses are grouped into per-company sections | `HeatmapTablePanel.test.tsx` (p) — **NEW, closes prior gap** | COMPLIANT |
| Expanded Business List Content | Complete row renders all fields within its company group | `HeatmapCellBusinessRow.test.tsx` (a) | COMPLIANT |
| Expanded Business List Content | Missing value/product renders `-` | `HeatmapCellBusinessRow.test.tsx` (b)(c) | COMPLIANT |
| Reconciliation with Cell Aggregate | List matches aggregate count/sum | `cell-accordion-integration.test.ts` | COMPLIANT |
| Reconciliation with Cell Aggregate | List stays reconciled after filter change | `use-cell-businesses.test.ts` + `HeatmapTablePanel.test.tsx` (n) | COMPLIANT |
| Navigate to Business Detail | Link opens in new tab | `HeatmapCellBusinessRow.test.tsx` (d) | COMPLIANT |
| Expansion State Persistence | Filter keeps cell expanded | `HeatmapTablePanel.test.tsx` (n) | COMPLIANT |
| Expansion State Persistence | Page reload resets expansion | `HeatmapTablePanel.test.tsx` (o) | COMPLIANT |
| Layout Without Internal Scroll | Grows page scroll, pushes rows down | `HeatmapCellBusinessList.test.tsx` + `HeatmapTablePanel.test.tsx` (m) | COMPLIANT |
| Loading/Empty/Error States | Loading then empty | `HeatmapCellBusinessList.test.tsx` | COMPLIANT |
| Loading/Empty/Error States | Fetch failure shows error | `HeatmapCellBusinessList.test.tsx` | COMPLIANT |
| Scope Follows Visibility Rules | Respects existing role scope | `cell-accordion-integration.test.ts` + `heatmap.service.test.ts` | COMPLIANT |

**Compliance summary**: 14/14 scenarios compliant (100%). Prior gap fully closed.

### Correctness (Static + Runtime Evidence)
| Requirement | Status | Notes |
|---|---|---|
| Group header renders once per company, above its businesses | Implemented + tested | `HeatmapTablePanel.tsx:337-343`; runtime-proven by test (p) |
| Single expand icon toggles all of an advisor's company groups together | Implemented + tested | `toggleRow(rowKeys)` at line 302; runtime-proven by test (p) |
| Row no longer repeats company name | Implemented | `HeatmapCellBusinessRow.tsx` has no `companyName` field rendered |

### Coherence (Design)
Design.md decisions A-E remain followed (unchanged since prior verify).

### Issues Found

**CRITICAL**: None.

**WARNING** (carried over, still non-blocking, re-confirmed this session):
- `design.md`'s Interfaces/Contracts block still shows `CellBusinessRowView.status: string`; implementation uses the narrower `BusinessStatus`. Cosmetic drift only, not a defect (narrowing is a real improvement).
- `tasks.md` / `apply-progress` still do not record the 5 post-apply adjustments (BusinessStatus narrowing, BusinessStatusBadge usage, company-column-to-group-header restructuring, memoization fix, sticky header) nor the spec.md reconciliation nor this session's new test (p). Recommend a short addendum note in `apply-progress` for full traceability before archive (non-blocking).
- Pre-existing (not introduced by this change): React "missing key" warning on bare `<>` fragments wrapping `UsdCell`/`NegCell` in `HeatmapTablePanel.tsx`'s `companyColumns.map()` (~lines 322-327). Still present, out of scope for this change, unchanged since prior verify.

**SUGGESTION**: None new. (Prior suggestion — assert group header renders exactly once even for a single-business company — is a nice-to-have, not required for compliance; the "exactly once" wording is already implicitly satisfied since each `key` in `rowKeys` maps to exactly one `<div>` header via `.map()`.)

### TDD Compliance
| Check | Result |
|---|---|
| All 22 original tasks have tests | Yes |
| Fresh full-suite run green | Yes (1103/1103) |
| New spec scenario (grouping) has a RED/GREEN pair | Yes — test (p) added and passing |

### Verdict
**PASS**. All 8 requirements / 14 scenarios are now COMPLIANT with passing runtime tests (100%). Tests (1103/1103), typecheck, and lint are all green with fresh evidence from this session. All 22 tasks remain complete with no regressions. Remaining items are non-blocking WARNINGs (documentation drift in design.md/tasks.md/apply-progress, and a pre-existing unrelated React key warning) — none affect functional correctness or spec compliance. **Ready for `sdd-archive`.**
