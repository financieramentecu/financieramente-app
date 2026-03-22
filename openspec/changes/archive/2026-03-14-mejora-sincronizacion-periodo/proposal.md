# Proposal: Mejora Sincronización por Período

## Intent

The current file synchronization process lacks period awareness: there is no concept of a "month/year" attached to a file import, which means multiple syncs can coexist for the same period, a user can accidentally re-sync a period that has already been liquidated, error recovery is invisible (there is no way to know whether a previously-errored row was corrected in a subsequent sync), and commissions do not record when they were synchronized (making audit trails incomplete).

This change introduces **period-level control** to the sync process: each file import is scoped to a specific type + month + year, duplicates are deduplicated instead of creating ghost imports, completed periods are blocked from re-sync, file names are standardized, resolved errors are tracked, and commissions gain a `fechaSincronizacion` timestamp for traceability.

## Scope

### In Scope

1. **Period fields on FileImport**: Add `month` (Int) and `year` (Int) to the `FileImport` Prisma model via migration.
2. **UI period selector**: Add month/year selector to `CargarArchivoTab.tsx` with smart defaults (month = current − 1, year = current).
3. **Deduplication on upload**: When a `FileImport` with `status = LOAD` already exists for the same `fileType + month + year`, associate new commissions to the existing import instead of creating a new one.
4. **Block completed periods**: If a `FileImport` with `status = COMPLETED` exists for the selected `fileType + month + year`, reject the sync with the message "El período {month}/{year} ya fue liquidado".
5. **Standardized file name**: The `nameFile` field on `FileImport` MUST be generated as `SINCRONIZACION-{TIPO}-{MES}-{AÑO}` (e.g. `SINCRONIZACION-POLIZA-FEBRERO-2026`), not the original uploaded filename.
6. **Error resolution tracking**: Add `resolved: Boolean` (default `false`) and `resolvedAt: DateTime?` to `FileImportError`. When a re-sync processes a row that previously had an error for the same contract/period and the row now succeeds, mark the old `FileImportError` as resolved.
7. **Sync date on commissions**: Add `syncDate: DateTime?` (nullable) to `SettlementCommission`. Fill it when a commission transitions to `SYNCHRONIZED` status. LAG records remain `null`.
8. **Counter updates on re-sync**: When re-syncing against an existing `LOAD` import, the counters on `FileImport` MUST be updated atomically:
   - `successRecord` (synchronized): increment by the number of newly synchronized records.
   - `errorRecord`: decrement by the number of errors that were resolved in this sync pass.
   - `rezagadoRecord` (lag): increment by any new LAG records produced in this sync pass.
   - `totalRecord`: increment by the total number of rows processed in this sync pass.

### Out of Scope

- Retroactive backfill of `mes`/`año` on existing `FileImport` rows (data migration strategy is deferred).
- UI display of `fechaSincronizacion` in tables/reports (deferred to a future reporting change).
- Changing the pre-liquidación or liquidación flows beyond what is needed to enforce the period block.
- Multi-period batch imports (one file = one period remains the constraint).

## Approach

The change is additive at the database layer (new nullable columns + migration) and behavioral at the service/API layer. The recommended order:

1. **Schema migration**: Add `month`, `year` to `FileImport`; `resolved`, `resolvedAt` to `FileImportError`; `syncDate` to `SettlementCommission`.
2. **File naming utility**: Create `src/features/load-file/lib/file-naming.ts` with a pure function `generateSyncFileName(fileType, month, year): string` that produces the standardized name.
3. **POST /api/carga-archivos/file-import**: Before creating, look up an existing `LOAD` import for same type+month+year (dedup) or a `COMPLETED` import (block). Pass `month` and `year` from the request body.
4. **process-batch.service.ts**: On successful commission save, stamp `syncDate = now()`. On successful re-processing of a previously-errored contract, resolve the matching `FileImportError` record. After processing the full batch, apply counter deltas atomically to `FileImport` (increment `successRecord`, decrement `errorRecord` by resolved count, increment `rezagadoRecord`, increment `totalRecord`).
5. **CargarArchivoTab.tsx**: Add controlled month/year selectors. Send `month` and `year` to the API. Show blocked-period error to the user.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `month`, `year` to `FileImport`; `resolved`, `resolvedAt` to `FileImportError`; `syncDate` to `SettlementCommission` |
| `prisma/migrations/` | New | Migration file for the schema changes |
| `src/app/api/carga-archivos/file-import/route.ts` | Modified | Accept `mes`/`año` in request body; dedup logic; block completed periods; use standardized name |
| `src/features/load-file/services/process-batch.service.ts` | Modified | Stamp `syncDate` on SYNCHRONIZED commissions; resolve prior `FileImportError` on re-sync success; update counters atomically after each batch |
| `src/features/load-file/components/CargarArchivoTab.tsx` | Modified | Add month/year selectors with smart defaults; handle blocked-period error |
| `src/features/load-file/lib/file-naming.ts` | New | Pure utility: `generateSyncFileName(fileType, mes, año)` |
| `src/features/load-file/services/processors/voluntaria.processor.ts` | Modified | Pass `syncDate` when saving SYNCHRONIZED records |
| `src/features/load-file/services/processors/poliza.processor.ts` | Modified | Pass `syncDate` when saving SYNCHRONIZED records |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing `FileImport` rows have no `month`/`year` (null) — pre-liquidación queries that filter by period may miss them | Med | Make fields nullable in DB; pre-liquidación filtering remains by `status`; add a one-time backfill script (out of scope but documented) |
| Dedup logic accidentally merges imports from different users or tenants | Low | Dedup query MUST include tenant/organization scope in the WHERE clause |
| Re-sync of a partially-loaded period resolves errors from a *different* prior import for the same period | Low | Error resolution MUST match by `idFileImport` of the deduplicated (reused) import, not just by contract |
| `syncDate` set on LAG records if processor logic is not guarded | Med | Add explicit guard: only stamp when computed status is `SYNCHRONIZED`, never for LAG |
| Counter drift on re-sync if batch fails mid-way | Med | Counter delta updates MUST be inside the same DB transaction as the commission saves; on failure, counters roll back |
| UI month/year defaults lead user to accidentally target the wrong period | Low | Show a confirmation summary ("Syncing: POLIZA / FEBRERO 2026") before submitting |

## Rollback Plan

1. Revert the Prisma schema changes and run `prisma migrate down` (or apply a reverse migration that drops `mes`, `año`, `resolved`, `resolvedAt`, `fechaSincronizacion`).
2. Revert the API route, service, and UI changes via git revert on the relevant commits.
3. The new columns are nullable/have defaults, so rollback will not corrupt existing data — rows will simply return to the previous state without the new fields.
4. `file-naming.ts` is a new file with no dependents outside this feature — it can be deleted without side effects.

## Dependencies

- `prisma migrate dev` must be run against the development database before testing.
- No external service dependencies. All changes are internal to the `load-file` feature and the `FileImport`/`SettlementCommission`/`FileImportError` Prisma models.

## Success Criteria

- [ ] `FileImport` records created after this change have `month` and `year` populated.
- [ ] Uploading a file for a period with an existing `LOAD` import reuses that import (no duplicate `FileImport` row created).
- [ ] Attempting to sync a period with `status = COMPLETED` returns an error message "El período {month}/{year} ya fue liquidado" and no new import is created.
- [ ] `nameFile` on new `FileImport` records matches the pattern `SINCRONIZACION-{TIPO}-{MES}-{AÑO}`.
- [ ] `SettlementCommission.syncDate` is populated for `SYNCHRONIZED` commissions and `null` for LAG commissions.
- [ ] `FileImportError.resolved = true` and `resolvedAt` is set when a previously-errored contract syncs successfully in a subsequent upload for the same period.
- [ ] On re-sync, `FileImport.successRecord` increments by new synchronized count, `errorRecord` decrements by resolved error count, and `rezagadoRecord` increments by new LAG count — all within the same DB transaction.
- [ ] Unit tests cover: `generateSyncFileName`, dedup lookup, block-completed guard, error resolution logic, `syncDate` stamping, and counter delta updates.
- [ ] E2E: full sync flow (new period → dedup period → block completed period) works end-to-end without regression on existing sync behavior.
