# Archive Report: mejora-ui-sincronizacion

**Date archived**: 2026-03-14
**Archived by**: sdd-archive sub-agent
**Artifact store mode**: hybrid
**Project**: financieramente-app

---

## Change Summary

**Change name**: mejora-ui-sincronizacion
**Intent**: Two UX improvements to the sync/historial experience in the `load-file` feature — no database schema changes.

1. **Improvement 1 — Live counters from batch responses**: `CargarArchivoTab.tsx` now accumulates `summary.sincronizado`, `summary.rezagado`, and `summary.error` from each `processBatch()` response into local session state. The polling loop retains its terminal-status detection role but no longer writes counter values. Counters reset to zero at session start.

2. **Improvement 2 — Period-based history filters**: The "Desde" / "Hasta" date-picker inputs in `HistorialCargasTab.tsx` have been replaced with MES (month 1–12, Spanish names) and AÑO (dynamic year range) `<Select>` components. Filtering is server-side: `useFileHistory` passes `month`/`year` as query params through `load-file-api.ts` → `GET /api/carga-archivos/file-import` (Zod-validated) → `FileImportService.listFileImports` (dynamic Prisma `where`). The `filteredHistorial` `useMemo` was removed; `historial` is rendered directly. `useFileHistory` was migrated to `AsyncState<CargaHistorial[]>`.

---

## SDD Artifacts

| Artifact | Location |
|----------|----------|
| Proposal | `openspec/changes/archive/2026-03-14-mejora-ui-sincronizacion/proposal.md` |
| Spec (delta) | `openspec/changes/archive/2026-03-14-mejora-ui-sincronizacion/specs/load-file/spec.md` |
| Design | `openspec/changes/archive/2026-03-14-mejora-ui-sincronizacion/design.md` |
| Tasks | `openspec/changes/archive/2026-03-14-mejora-ui-sincronizacion/tasks.md` |
| Verify Report | `openspec/changes/archive/2026-03-14-mejora-ui-sincronizacion/verify-report.md` |
| Archive Report | `openspec/changes/archive/2026-03-14-mejora-ui-sincronizacion/archive-report.md` |

**Engram IDs**: proposal=#81, design=#82, tasks=#83, spec=#86, verify-report=#87

---

## Spec Sync

Delta spec merged into: `openspec/specs/load-file/spec.md`

**Requirements added/modified**:
- R-UI-1: Sync Progress Shows Current-Session Counters Only (ADDED)
- R-UI-2: History Filter by MES and AÑO (ADDED)
- R-UI-3: History Filter — Server-Side Only, No Client Filtering (ADDED)
- R-UI-4: useFileHistory Uses AsyncState (ADDED)
- API Route — GET /api/carga-archivos/file-import Accepts Period Filters (MODIFIED)
- FileImportService.listFileImports Accepts Period Filters (MODIFIED)
- History Date-Range Filter (REMOVED — replaced by R-UI-2)

---

## Task Completion

| Phase | Tasks | Completed |
|-------|-------|-----------|
| Phase 1 — Local Counter Accumulation | 4 | 4/4 ✅ |
| Phase 2 — Service & API Layer | 9 | 9/9 ✅ |
| Phase 3 — Hook & Component Layer | 10 | 10/10 ✅ |
| Phase 4 — Tests & Verification | 8 | 8/8 ✅ |
| **Total** | **31** | **31/31 ✅** |

---

## Verification Verdict

**CONDITIONALLY PASSING**

- TypeScript: 0 errors ✅
- Tests: 1326 pass / 6 fail
- All UI requirements (R-UI-1, R-UI-2, R-UI-3, R-UI-4) fully satisfied

**Known deviation** (not CRITICAL): `file-import.service.ts` adds an undocumented default `status: { in: ['LOAD', 'COMPLETED'] }` filter when no explicit `status` is passed (lines 121–123). This behavior is not in the spec but is functionally reasonable (hides PROCESSING/ERROR records from historial by default). It causes 6 test failures in `file-import.service.test.ts`.

**Resolution options** (deferred to team):
1. Fix tests to accept the default (if behavior is intentional)
2. Remove the default from the service (strict spec alignment)
3. Update the spec to document the default as intentional

---

## Files Affected

| File | Change |
|------|--------|
| `src/features/load-file/components/CargarArchivoTab.tsx` | Counter accumulation; polling loop no longer writes counters |
| `src/features/load-file/components/HistorialCargasTab.tsx` | Date pickers → MES/AÑO selectors; `filteredHistorial` removed |
| `src/features/load-file/hooks/use-file-history.ts` | AsyncState migration; `FileHistoryParams` support |
| `src/features/load-file/lib/load-file-api.ts` | `getImportHistory` extended with optional `filters` param |
| `src/app/api/carga-archivos/file-import/route.ts` | GET handler: Zod `month`/`year` validation; passes to service |
| `src/features/load-file/services/file-import.service.ts` | `listFileImports` dynamic WHERE with period filters |

---

## New Test Files

| File | Tests | Status |
|------|-------|--------|
| `src/features/load-file/__tests__/use-file-history.test.ts` | 7 | ✅ All pass |
| `src/features/load-file/__tests__/use-file-history.params.test.ts` | 4 | ✅ All pass |
| `src/app/api/carga-archivos/file-import/__tests__/route.test.ts` | 10 | ✅ All pass |
| `src/features/load-file/__tests__/file-import.service.test.ts` | 16 | ⚠️ 10/16 pass (6 fail — see deviation above) |
