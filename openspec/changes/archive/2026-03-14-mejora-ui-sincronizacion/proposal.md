# Proposal: Mejora UI Sincronización

## Intent

Two distinct UX problems degrade the sync experience for users:

1. **Stale progress counters during sync**: While a file is being processed batch-by-batch, the "Sincronizados / Rezagados / Errores" counters in `ProcessingProgress.tsx` are populated via polling `FileImport.sincronizadoRecord` et al. — cumulative fields that aggregate across *all* prior syncs of the same `FileImport`. When a user re-uploads or observes mid-sync, the numbers include leftover data from previous batches of the same import, producing confusing mixed counts. The counters should reflect only the work done in the *current sync session* by accumulating `summary` values returned per-batch from `processBatch()`.

2. **Date-picker filters misaligned with period model**: The Historial tab's "Desde" / "Hasta" filters use calendar date pickers (`<input type="date">`). The underlying data model uses `month` + `year` (integer period fields on `FileImport`, introduced in the prior sync change). Users searching for files by period cannot easily express "show me everything from March 2026" with date pickers that work on `createdAt`. The filters must be replaced with MES (month 1–12, Spanish name) and AÑO (year number) selectors that map to the `month`/`year` fields already on the model.

Both problems are purely UI/API-layer changes — no database schema changes are required.

## Scope

### In Scope

- **Improvement 1 — Live counters from batch responses**: Update `CargarArchivoTab.tsx` to accumulate `summary.sincronizado`, `summary.rezagado`, and `summary.error` returned by each `processBatch()` call into local state, so that `ProcessingProgress.tsx` shows per-session incremental totals. The polling loop is retained only to detect completion status; it no longer drives the counter values.

- **Improvement 3 — Period-based history filters**: Replace the "Desde" (date picker) and "Hasta" (date picker) inputs in `HistorialCargasTab.tsx` with two new selectors:
  - **MES**: `<select>` with options 1–12 (Spanish month names, consistent with `SPANISH_MONTH_NAMES` already defined in `CargarArchivoTab.tsx`).
  - **AÑO**: `<select>` with numeric year options (e.g. 2020–2030, same range as the upload form).
  - Filter logic moves server-side: `use-file-history.ts` passes `mes` and `anio` as query params to `GET /api/carga-archivos/file-import`; the route handler validates them with Zod; `FileImportService.listFileImports` accepts and applies them as optional filters on the `month` and `year` fields.

### Out of Scope

- **History section data accuracy** (Improvement 2): Already correct — consolidated data from `FileImport` fields is the source of truth for the historial cards. Explicitly out of scope; no changes needed there.
- Pagination of the history list.
- Any changes to the batch processing API or business logic.
- Database schema changes.
- Unit/integration test additions beyond what the apply phase decides to include.

## Approach

### Improvement 1: Local accumulation of batch counters

`CargarArchivoTab.tsx` currently updates only `processingProgress.current` after each batch and relies on polling to update `sincronizado`, `rezagado`, and `error`. The fix is straightforward:

After each `loadFileApi.processBatch()` succeeds, extract `processResponse.data.summary` and add its `sincronizado`, `rezagado`, and `error` values into the local `processingProgress` state — replacing the polling-based counter update entirely. The `pollProgress` function continues running in parallel to detect the terminal `status` (COMPLETED / LOAD / ERROR / CANCELADO) and stop itself; it no longer writes to the counters.

No API changes are needed because `ProcessBatchResponse.summary` already exposes `sincronizado`, `rezagado`, `noSincronizado`, and `error` (see `ProcessBatchSummary` in `load-file.types.ts`).

### Improvement 3: Period-based server-side filtering

**UI layer (`HistorialCargasTab.tsx`)**:
- Remove `dateStart` / `dateEnd` state and the date-picker inputs.
- Add `mesFilter` (string `'ALL'` | `'1'`–`'12'`) and `anioFilter` (string `'ALL'` | year) state.
- Replace the two `<input type="date">` with `<Select>` components matching the existing Shadcn/UI `Select` already used for the status filter.
- Pass `mesFilter` and `anioFilter` to `useFileHistory` (the hook now accepts params).
- The client-side `filteredHistorial` computed with `useMemo` drops the date-range logic; filtering by period is done server-side.

**Hook (`use-file-history.ts`)**:
- Accept `{ mes?: number; anio?: number }` params.
- Pass them as query params when calling `loadFileApi.getImportHistory(...)`.
- Re-fetch when params change (dependency in `useCallback`/`useEffect`).
- The hook currently uses three separate `useState` calls (`historial`, `isLoading`, `error`). To comply with architecture rules it MUST be migrated to a single `AsyncState<CargaHistorial[]>` discriminated union from `src/features/shared/types/async-state.types.ts`.

**API client (`load-file-api.ts`)**:
- Extend `getImportHistory` signature to accept optional `mes` and `anio` params.
- Append them to the query string when provided.

**API route (`GET /api/carga-archivos/file-import`)**:
- Add Zod validation for optional `mes` (coerce to int, min 1, max 12) and `anio` (coerce to int, min 2020, max 2100) query params.
- Pass validated values to `FileImportService.listFileImports`.
- API route MUST NOT call Prisma directly — delegates to service as already established.

**Service (`FileImportService.listFileImports`)**:
- Accept optional `month?: number` and `year?: number` in params.
- Add them to the Prisma `where` clause when present.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/load-file/components/CargarArchivoTab.tsx` | Modified | Accumulate `processBatch` summary into local counters; remove polling counter writes |
| `src/features/load-file/components/ProcessingProgress.tsx` | None / minor | Props unchanged; parent drives correct values after this fix |
| `src/features/load-file/components/HistorialCargasTab.tsx` | Modified | Replace date pickers with MES/AÑO selectors; pass filter params to hook |
| `src/features/load-file/hooks/use-file-history.ts` | Modified | Accept period params; migrate to `AsyncState<T>`; pass params to API client |
| `src/features/load-file/lib/load-file-api.ts` | Modified | Extend `getImportHistory` to accept and forward `mes`/`anio` query params |
| `src/app/api/carga-archivos/file-import/route.ts` | Modified | Validate `mes`/`anio` query params with Zod; pass to service |
| `src/features/load-file/services/file-import.service.ts` | Modified | `listFileImports` accepts optional `month`/`year` filters; applies to Prisma `where` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Batch counter accumulation diverges from DB state if a batch partially fails | Low | The final `getImportProgress` fetch at end-of-sync already corrects `processingResult` from DB; counters during sync are best-effort visual feedback only |
| Removing date-picker breaks existing users who relied on `createdAt` filtering | Low | The previous date filter was misaligned with the domain model and not spec-driven; period-based filtering is the correct semantic; `createdAt` can be added back separately if a user request arises |
| `use-file-history` AsyncState migration introduces regression | Low | Migration follows the same pattern used by other hooks in the project; existing behaviour is covered by the `fetchHistorial` callback already tested manually |
| Zod coercion of query params returns `NaN` if client sends garbage | Low | `z.coerce.number().int().min(1).max(12)` will fail validation and route returns 400 |
| Year range hardcoded 2020–2030 becomes stale | Low | Range can be easily extended; use computed range (current year ± N) in the selector if preferred |

## Rollback Plan

All changes are UI and thin API-layer only, with no database migrations:

1. Revert `CargarArchivoTab.tsx` — restore polling-based counter updates (remove the accumulation lines added to the batch loop).
2. Revert `HistorialCargasTab.tsx` — restore date-picker inputs and original `filteredHistorial` `useMemo` logic.
3. Revert `use-file-history.ts` — remove `mes`/`anio` params and undo `AsyncState` migration (or keep migration, revert only the params).
4. Revert `load-file-api.ts` — remove `mes`/`anio` from `getImportHistory` signature.
5. Revert `file-import/route.ts` GET handler — remove `mes`/`anio` query param validation.
6. Revert `file-import.service.ts` — remove optional `month`/`year` from `listFileImports`.

Because there are no schema migrations, rollback is a clean git revert with no data consequences.

## Dependencies

- `src/features/shared/types/async-state.types.ts` must exist (it does — referenced by existing hooks in the project).
- `ProcessBatchSummary` fields `sincronizado`, `rezagado`, `error` must be populated by the API batch endpoint (they are, per `load-file.types.ts`).
- `FileImport` model must have `month` and `year` integer fields (confirmed — introduced in the previous sync change and present in `FileImportHistory` type).

## Success Criteria

- [ ] During a file sync, the Sincronizados / Rezagados / Errores counters in `ProcessingProgress.tsx` increment in real time with each batch response, starting at 0 for the current session — even if the same `FileImport` was previously partially synced.
- [ ] The polling loop continues to detect terminal status without affecting the counter display.
- [ ] The Historial tab shows a MES selector (1–12 with Spanish names) and an AÑO selector instead of date pickers.
- [ ] Selecting MES=3, AÑO=2026 returns only file imports with `month=3` and `year=2026` from the server.
- [ ] Selecting MES=ALL or AÑO=ALL removes the respective filter.
- [ ] `GET /api/carga-archivos/file-import?mes=3&anio=2026` returns 400 for out-of-range values (e.g. `mes=13`).
- [ ] `use-file-history` uses a single `AsyncState<CargaHistorial[]>` discriminated state — no separate `isLoading`/`error`/`historial` triple.
- [ ] No Prisma calls exist in the route handler — all data access goes through `FileImportService`.
