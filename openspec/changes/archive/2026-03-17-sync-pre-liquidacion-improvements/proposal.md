# Proposal: sync-pre-liquidacion-improvements

## Intent

The preliquidación flow is incomplete: after executing preliquidación, `FileImport.status` stays `LOAD`, causing the "Preliquidar" button to remain visible, hiding PRE-SETTLED files from historial, and allowing new syncs into an already-preliquidated period. This set of 7 changes closes those gaps end-to-end.

## Scope

### In Scope

- **Change 1** — `procesarPreLiquidacion()` sets `FileImport.status = 'PRE-SETTLED'` after success.
- **Change 2** — "Preliquidar" button hidden for `PRE-SETTLED` files (automatic after Change 1 + filter fix).
- **Change 3** — `HistorialCargasTab`: show "IR a PRELIQUIDACIÓN" button (navigates to `/dashboard/pre-liquidacion`) instead of "Ver detalle" and "Preliquidar" for `PRE-SETTLED` files.
- **Change 4** — Add "Pre-liquidado" `<SelectItem value="PRE-SETTLED">` to the historial status filter.
- **Change 5** — Pre-liquidación module loads files with `PRE-SETTLED` `FileImport.status`; page tab filters updated.
- **Change 6** — `FileImportService.initiateImport()` blocks sync for a period that already has a `PRE-SETTLED` file import (same `fileType + month + year`, global scope). New `PeriodPreSettledError` class + 409 route handler.
- **Change 7** — Update `ConfirmModal` message in `HistorialCargasTab` to warn: "Una vez pre-liquidado, ya no se podrán agregar más comisiones para este período."
- Unit/integration tests updated for affected services, route handlers, and `HistorialCargasTab`.
- **Change 8** — All state on interface should be draw in Spanish, not in English. under the box is in English but on interface must be in Spanish

### Out of Scope

- Liquidación flow (SETTLED status) — not changed.
- New Prisma migrations — no schema changes; only service logic and UI.
- New UI components — all existing modal/button patterns reused.
- Partial-preliquidation per-file UX clarification — deferred.

## Approach

All changes are pure application-layer (no schema changes needed; existing `@@index([fileType, month, year, status])` is sufficient).

1. **Backend first** (Changes 1 & 6): fix `procesarPreLiquidacion()` to write `PRE-SETTLED` status, add `PeriodPreSettledError` guard in `initiateImport()`, expose new 409 in route.
2. **Service filter** (Changes 2 & 5): extend default status filters to include `PRE-SETTLED` in `listFileImports()` and `obtenerArchivosDisponiblesPreliquidacion()`.
3. **UI** (Changes 3, 4, 7): conditional button rendering, new select option, updated modal message — all localized to `HistorialCargasTab.tsx` and `pre-liquidacion/page.tsx`.

## Affected Areas

| Area                                                               | Impact   | Description                                                                                                                                      |
| ------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modified | `procesarPreLiquidacion()` adds `status: 'PRE-SETTLED'` to FileImport update; `obtenerArchivosDisponiblesPreliquidacion()` extends status filter |
| `src/features/load-file/services/file-import.service.ts`           | Modified | `listFileImports()` adds `'PRE-SETTLED'` to default IN filter; `initiateImport()` adds PRE-SETTLED guard + new `PeriodPreSettledError` class     |
| `src/features/load-file/components/HistorialCargasTab.tsx`         | Modified | Conditional "IR a PRELIQUIDACIÓN" button; "Pre-liquidado" select option; updated ConfirmModal message                                            |
| `src/app/api/carga-archivos/file-import/route.ts`                  | Modified | Catch `PeriodPreSettledError` → 409 response                                                                                                     |
| `src/app/dashboard/pre-liquidacion/page.tsx`                       | Modified | `archivosPendientes` / `archivosHistorico` filters updated for `PRE-SETTLED` status                                                              |
| `src/app/api/pre-liquidacion/procesar/__tests__/`                  | Modified | Add test: FileImport.status changes to `PRE-SETTLED` after successful preliquidación                                                             |
| `src/features/load-file/__tests__/HistorialCargasTab.test.tsx`     | Modified | New assertions for PRE-SETTLED button rendering and status filter                                                                                |
| `src/app/api/carga-archivos/file-import/__tests__/`                | Modified | Add test: 409 returned for PRE-SETTLED period; PRE-SETTLED appears in ALL filter                                                                 |

## Risks

| Risk                                                                                                                                                    | Likelihood | Mitigation                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Re-preliquidation guard breaks if status check order changes                                                                                            | Low        | `procesarPreLiquidacion()` already guards `status !== 'LOAD'`; PRE-SETTLED will correctly fail this check after Change 1                     |
| `initiateImport()` PRE-SETTLED check runs after COMPLETED check — a PRE-SETTLED file that later becomes COMPLETED is fine (COMPLETED check fires first) | Low        | Add PRE-SETTLED check before COMPLETED check to ensure correct ordering                                                                      |
| `listFileImports()` `ALL` filter now includes PRE-SETTLED — users may see unexpected entries                                                            | Low        | Expected behavior; badge styling for PRE-SETTLED already exists                                                                              |
| `archivosPendientes` / `archivosHistorico` filter change in pre-liquidacion page could hide files with partial preliquidation                           | Med        | Clarify filter logic with stakeholder; use commission-level filter (presence of SYNCHRONIZED commissions) as fallback                        |
| Frontend UX for blocked period shows generic "PERÍODO BLOQUEADO" title                                                                                  | Low        | Optionally detect `PeriodPreSettledError` message on frontend to display `'PERÍODO EN PRELIQUIDACIÓN'` title — low-risk cosmetic improvement |

## Rollback Plan

All changes are isolated to service logic and UI rendering:

1. Revert `procesarPreLiquidacion()` to not update `FileImport.status` → PRE-SETTLED files return to LOAD.
2. Revert `listFileImports()` default filter and `obtenerArchivosDisponiblesPreliquidacion()` status filter.
3. Revert `HistorialCargasTab.tsx` to original button conditions and modal message.
4. Revert `file-import/route.ts` to remove `PeriodPreSettledError` handler.
5. No database migration rollback required.

A single feature-branch revert via `git revert` covers all changes.

## Dependencies

- No new npm packages required.
- No Prisma schema changes — `PRE-SETTLED` status string already in use for `SettlementCommission`; applying the same value to `FileImport.status` is consistent with existing conventions.
- Existing `@@index([fileType, month, year, status])` on `FileImport` covers the new query in `initiateImport()`.

## Success Criteria

- [ ] After executing preliquidación, `FileImport.status` in DB is `'PRE-SETTLED'`.
- [ ] "Preliquidar" button is not visible for any `PRE-SETTLED` file in historial.
- [ ] Historial "ALL" filter shows PRE-SETTLED files; "Pre-liquidado" option works in status select.
- [ ] For `PRE-SETTLED` files in historial, only "IR a PRELIQUIDACIÓN" button renders (no "Ver detalle", no "Preliquidar").
- [ ] Attempting to sync a file for an already-PRE-SETTLED period returns a 409 error with clear message.
- [ ] Pre-liquidación module displays files/commissions with `PRE-SETTLED` FileImport status.
- [ ] ConfirmModal warns user that no more commissions can be added after pre-liquidación.
- [ ] All existing tests pass; new tests cover the 3 modified service methods and updated route handler.
