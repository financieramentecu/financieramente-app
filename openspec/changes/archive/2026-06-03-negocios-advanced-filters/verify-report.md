# Verify Report: negocios-advanced-filters

**Date**: 2026-06-03
**Verdict**: PASS WITH WARNINGS
**CRITICAL**: 0 | **WARNING**: 2 | **SUGGESTION**: 1

---

## Test Evidence

| Suite | Result |
|---|---|
| `npm run test:unit` | 296 files passed, 2647 tests passed (3 skipped), 0 failures |
| `npm run type-check` | 0 errors |

---

## Task Completion

All 29 tasks marked complete in engram apply-progress. State.yaml (S1) inconsistency noted.

---

## Spec Compliance Matrix

| Requirement | Status | Notes |
|---|---|---|
| REQ-1: Toolbar layout (search + Filtros + Export only) | PASS | Old props declared but not rendered |
| REQ-1: Amber badge (#F59E0B), hidden at zero | PASS | Verified in JSX |
| REQ-1: Export disabled during load | PASS | `disabled={isExportingExcel}` |
| REQ-2: Sheet side="right", controlled open | PASS | `useState(false)` |
| REQ-2: Closes on "Aplicar", stays open on "Limpiar" | PASS | Verified in onApply/onClear |
| REQ-2: Dismiss without apply leaves URL unchanged | PASS | RHF draft state |
| REQ-2: 10 filter dimensions | PASS | All 10 verified (incl. agentIds NEW) |
| REQ-2: Money Strategist loaded from /api/admin/users?role=AGENTE | PASS | useMoneyStrategists hook |
| REQ-3: Badge counts dimensions (not values) | PASS | countActiveDimensions — 11 possible |
| REQ-3: agentIds[] and agentCategoryIds[] count as dimensions | PASS | Lines 47-48 of count-active-dimensions.ts |
| REQ-4: POST /api/negocios/export uses same Zod schema | PASS | `negociosExportBodySchema = businessFilterParamsSchema` |
| REQ-4: Export parity test covers all params | WARNING (W2) | agentIds/agentCategoryIds missing from allParams |
| REQ-5: statuses[] → status.in | PASS + TESTED | |
| REQ-5: dateIssuedFrom/To → dateIssued gte/lte NOT NULL | PASS + TESTED | |
| REQ-5: createdFrom/To → createdAt gte/lte | PASS + TESTED | |
| REQ-5: hasSupports → supports.some/none | PASS + TESTED | |
| REQ-5: terms[] → term.in | PASS + TESTED | |
| REQ-5: periodicityIds[] → idBuyPeriodicity.in | PASS + TESTED | |
| REQ-5: agentCategoryIds[] → user.idCategory.in | PASS (no unit test) | W2 |
| REQ-5: agentIds[] → idUser.in (NEW) | PASS (no unit test) | W2 |
| REQ-6: GET /api/periodicities returns {id,name}[] ordered by name | PASS | |
| REQ-6: GET /api/negocios/terms returns distinct terms | PASS | |
| REQ-6: Auth guard on both endpoints (401 unauthenticated) | PASS | |

---

## Additional Work (post-apply)

| Item | Status |
|---|---|
| Cancel FONDEADO → [ELIMINADO] prefix for allowed roles | PASS |
| BusinessEntity.observations exposed | PASS |
| "Ver como" gated by impersonation_select flag | PASS |
| MultiSelect scroll: flex:1, minHeight:0, overflowY:auto | PASS |
| Sheet closes on "Aplicar" | PASS |
| hasSupports params reach businessService.getAll | PASS |

---

## Issues

### WARNING W1 — Dead props in BusinessTableSection
**File**: `src/features/negocios/components/BusinessTableSection.tsx`

Props `listStatus`, `onListStatusChange`, `agentName`, `onAgentNameChange`, `fundDateFrom`, `fundDateTo`, `onFundDateFromChange`, `onFundDateToChange`, `fundDateRangeActive` remain in the props interface and are destructured, but none of them render anything in the JSX. `LIST_STATUS_FILTER_ALL` and `LIST_STATUS_OPTIONS` are also dead constants. Callers that still pass these props silently do nothing. Spec is met — the toolbar only renders search + AdvancedFiltersSheet + Export — but the dead interface is misleading.

**Impact**: No functional regression. Confusing interface.

### WARNING W2 — agentIds/agentCategoryIds not covered by parity or WHERE unit tests
**Files**: `src/features/negocios/__tests__/list-export-filter-parity.test.ts`, `src/features/negocios/lib/__tests__/build-business-list-where.test.ts`

The extended parity test `allParams` object (line 100) does not include `agentIds` or `agentCategoryIds`. The WHERE test suite has no cases for `{ idUser: { in: agentIds } }` or `{ user: { idCategory: { in: agentCategoryIds } } }`. Implementation is correct but spec scenario coverage is incomplete for these two dimensions.

**Impact**: If a regression is introduced in the agentIds or agentCategoryIds WHERE branch, no test will catch it.

### SUGGESTION S1 — state.yaml out of sync
**File**: `openspec/changes/negocios-advanced-filters/state.yaml`

`apply_progress.tasks_completed` shows 28/29 and `phases_completed` lists only [1–7]. Engram apply-progress confirms all 29 tasks done including Phase 8. Update before archiving.

---

## Design Coherence

| Decision | Code | Status |
|---|---|---|
| URL searchParams as SSOT | negocios-page-client reads from useSearchParams | PASS |
| RHF draft, commit on Aplicar | AdvancedFiltersSheet useForm + onApply | PASS |
| Single schema (businessFilterParamsSchema) | list and export both import the same schema | PASS |
| Sheet SRP — BusinessTableSection only renders trigger | Sheet content inside AdvancedFiltersSheet | PASS |
| Periodicity endpoint authed {id,name}[] | GET /api/periodicities with auth() guard | PASS |
| Term options from distinct Business.term | GET /api/negocios/terms with distinct query | PASS |
| hasSupports null → undefined in Zod preprocess | businessFilterParamsSchema preprocess | PASS |
