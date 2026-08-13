# Verification Report: negocios-filtro-novedades (COM-78)

**Date:** 2026-08-13  
**Verifier:** openspec-verify-change  
**Artifact store:** openspec  
**Branch / tree:** COM-78 (implementation in working tree)

## Verdict: **PASS WITH WARNINGS**

No critical gaps vs proposal / design / delta specs / tasks. Unit suite for this change is green (50/50). Minor warnings only (UI apply interaction test depth; product-copy confusion risk already noted in design).

### Summary Scorecard

| Dimension    | Status |
|--------------|--------|
| Completeness | 12/12 tasks complete; 4/4 delta requirements present in code |
| Correctness  | 4/4 requirements + 8/8 scenarios covered by impl and/or unit tests |
| Coherence    | Design decisions followed (sentinel, WHERE OR/AND, API parity, labels) |

---

## Issues by Priority

### CRITICAL

None.

### WARNING

1. **AdvancedFiltersSheet: no interaction test for Aplicar/Limpiar with Novedades**  
   - Spec scenario “empty selection / apply” and task 4.2 are implemented in `AdvancedFiltersSheet.tsx` (`onApply` / `onClear` append/delete `novedadStatuses`).  
   - UI test only asserts options render (`renders Novedades multiselect with expected options`). URL → WHERE parity is covered in `filter-flow.test.tsx` with **simulated** URL params, not by clicking MultiSelect + Aplicar.  
   - **Recommendation:** Optional follow-up — add a sheet test that selects e.g. Pendiente + Sin novedad, clicks Aplicar, and asserts `novedadStatuses` query params; and that Limpiar removes them. Not blocking archive.

2. **Product copy risk: “Cancelado” (novedad) vs Estado Cancelado**  
   - Called out in `design.md` Risks; label **Novedades** mitigates. No automated guard.  
   - **Recommendation:** Note in QA / PR description for manual smoke. Not a code defect.

### SUGGESTION

1. Radix `DialogContent` missing `Description` warnings appear in AdvancedFiltersSheet unit runs (pre-existing pattern). Harmless for COM-78.  
2. Working tree still uncommitted for COM-78 app + OpenSpec files — commit before archive/PR as usual. Do **not** bump version/CHANGELOG until archive.

---

## Completeness

### Tasks (`tasks.md`)

| ID | Task | Status |
|----|------|--------|
| 1.1 | `NOVEDAD_FILTER_*` / `NovedadFilterValue` | Done — `business-entity.types.ts` |
| 1.2 | `novedadStatuses` on filter types | Done — `business-api.types.ts`, schemas |
| 2.1 | Zod accept/reject | Done — `business-api.schemas.ts` + schema tests |
| 2.2 | WHERE OR / SIN_NOVEDAD / empty skip | Done — `build-business-list-where.ts` |
| 2.3 | Mapper + `countActiveDimensions` | Done |
| 3.1 | list / export / stats routes | Done |
| 3.2 | `use-businesses` + page URL wiring | Done |
| 4.1 | MultiSelect Novedades (CA1 options) | Done |
| 4.2 | Apply/clear URL + AND peers | Done |
| 5.1–5.3 | Unit / parity / sheet tests | Done |

**openspec apply progress:** 12/12 complete.

### Spec requirements

| Requirement | Evidence |
|-------------|----------|
| Advanced filter Novedades (COM-78) | `AdvancedFiltersSheet.tsx` `NOVEDAD_OPTIONS` + MultiSelect; independent of `statuses` |
| OR within dimension | `build-business-list-where.ts` `novedadStatus: { in: concrete }` |
| Sin novedad → null (+ OR mix) | `SIN_NOVEDAD` → `{ novedadStatus: null }`; mixed → `{ OR: [...] }` |
| AND with other filters + list/export/stats parity | Conditions pushed into shared `AND`; routes + `toBusinessListFilterInput` + stats service |

---

## Correctness — CA1–CA6 mapping

Artifacts reference CA1–CA6 without a numbered checklist; mapped from proposal/design + delta scenarios:

| CA | Intent | Impl | Tests | Gap |
|----|--------|------|-------|-----|
| **CA1** | MultiSelect Novedades; options Nueva / Sometido o Devolución / Declinado / Pendiente / Cancelado / Sin novedad; style like Estado | `NOVEDAD_OPTIONS` + same `MultiSelect` pattern as Estado | Sheet options test | None |
| **CA2** | Empty = Todos (no novedad criterion) | Empty/omitted skipped in WHERE; placeholder “Todas las novedades” | WHERE empty-array test; filter-flow | None (see WARNING 1 for UI apply) |
| **CA3** | Multi-select OR on concrete statuses | `in: concreteStatuses` | WHERE concrete + multi | None |
| **CA4** | Sin novedad → `novedadStatus IS NULL` | `SIN_NOVEDAD` sentinel | WHERE SIN_NOVEDAD-only | None |
| **CA5** | Sin novedad + concrete → OR | `{ OR: [in, null] }` | WHERE mixed OR | None |
| **CA6** | AND with other dimensions; list/export/stats same `novedadStatuses` | Shared builder; route/stats wiring; dimension count = 1 | AND combo test; list-export parity; filter-flow badge | None |

### Scenario coverage (delta spec)

| Scenario | Covered by |
|----------|------------|
| Novedades field visible with expected options | `AdvancedFiltersSheet.test.tsx` |
| Empty selection applies no novedad criterion | `build-business-list-where.test.ts` (empty array) |
| Single concrete status | WHERE `in` (incl. multi; single is subset) |
| Multiple concrete OR | WHERE `['NUEVA','PENDIENTE']` |
| Sin novedad alone | WHERE null |
| Sin novedad + concrete | WHERE OR mix |
| Novedad AND business status | WHERE combined statuses + novedadStatuses |
| List/export/stats parity | `list-export-filter-parity.test.ts` + filter-flow + stats uses `buildBusinessListWhere` |

---

## Coherence (design)

| Decision | Followed? |
|----------|-----------|
| Sentinel `SIN_NOVEDAD` (not separate boolean) | Yes |
| WHERE: concrete IN / null / OR / empty skip | Yes (`build-business-list-where.ts:105-124`) |
| API surface parity via shared schemas + mapper | Yes (list GET, export, stats) |
| Spanish labels per design table | Yes |
| Independence from Estado | Yes (separate form field / URL key) |
| Active dimension count = 1 for any non-empty `novedadStatuses` | Yes (`count-active-dimensions.ts:60`) |
| No DB migration / no version bump | Yes (out of verify scope) |

Pattern consistency: Feature-based layout under `src/features/negocios/`; routes delegate filtering through shared filter input / WHERE; Zod enum from `NOVEDAD_FILTER_VALUES`.

---

## Test results

Command:

```bash
npx vitest --config vitest.unit.config.ts --run \
  src/features/negocios/lib/__tests__/build-business-list-where.test.ts \
  src/features/negocios/lib/__tests__/business-api.schemas.test.ts \
  src/features/negocios/__tests__/list-export-filter-parity.test.ts \
  src/features/negocios/__tests__/filter-flow.test.tsx \
  src/features/negocios/components/__tests__/AdvancedFiltersSheet.test.tsx
```

| Metric | Result |
|--------|--------|
| Test files | 5 passed |
| Tests | **50 passed**, 0 failed |
| Duration | ~3.3s |

---

## Key implementation references

- `src/features/negocios/types/business-entity.types.ts` — `NOVEDAD_FILTER_SIN_NOVEDAD`, `NOVEDAD_FILTER_VALUES`
- `src/features/negocios/lib/build-business-list-where.ts` — OR/AND semantics
- `src/features/negocios/lib/business-api.schemas.ts` — `novedadStatuses` Zod
- `src/features/negocios/components/AdvancedFiltersSheet.tsx` — UI + URL apply/clear
- `src/app/api/negocios/route.ts`, `export/route.ts`, `stats/route.ts` — param wiring
- `src/features/negocios/hooks/use-businesses.ts`, `negocios-page-client.tsx` — client/URL

---

## Final assessment

No critical issues. **2 warning(s)** (optional UI interaction test; QA note for Cancelado label). Ready for archive after commit/PR hygiene; defer version/CHANGELOG to archive phase.

**Next recommended:** `sdd-archive` (after committing COM-78 + verify artifacts if desired), or address WARNING 1 optionally before archive.
