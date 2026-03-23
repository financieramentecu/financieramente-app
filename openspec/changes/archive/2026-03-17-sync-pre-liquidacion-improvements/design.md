# Design: sync-pre-liquidacion-improvements

## Technical Approach

Pure application-layer changes only — no Prisma schema migrations. The root fix is adding `status: 'PRE-SETTLED'` to the `FileImport` update inside `procesarPreLiquidacion()`. Every downstream problem (button visibility, historial invisibility, missing filter option, unguarded re-sync) resolves from that single data-model correction plus targeted filter/guard additions.

Changes are grouped by layer:
1. **Service layer** — `procesarPreLiquidacion()` status write; `listFileImports()` default filter; `obtenerArchivosDisponiblesPreliquidacion()` status filter; new `PeriodPreSettledError` guard in `initiateImport()`.
2. **Route layer** — `file-import/route.ts` catches `PeriodPreSettledError` → 409.
3. **UI layer** — `HistorialCargasTab.tsx` conditional buttons + select option + modal text; `pre-liquidacion/page.tsx` tab filter logic; Change 8 (Spanish UI) implementation across both screens.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| PRE-SETTLED check scope in `initiateImport` | Global (no `idUser` filter) | Per-user like COMPLETED | Preliquidation is a company-wide operation; once preliquidated, NO user can add more data for that period+fileType |
| PRE-SETTLED check order | Before COMPLETED check | After | A PRE-SETTLED file may later transition to COMPLETED via liquidar; checking PRE-SETTLED first avoids missing the intermediate state |
| `PeriodPreSettledError` placement | Same file as `PeriodCompletedError` in `file-import.service.ts` | Separate file | Follows existing pattern; both are import-guard errors in the same service |
| `archivosPendientes` filter | `estado === 'LOAD' && sincronizados > 0` (unchanged) | Widen to include PRE-SETTLED | "Pre-liquidar" tab should show only files still having SYNCHRONIZED records; once fully PRE-SETTLED the file moves to Histórico |
| `archivosHistorico` filter | `estado === 'PRE-SETTLED'` | Keep same as archivosPendientes | After Change 1, fully-preliquidated files have status PRE-SETTLED; Histórico tab must show exactly those |
| `obtenerArchivosDisponiblesPreliquidacion` status filter | `{ in: ['LOAD', 'PRE-SETTLED'] }` | Only PRE-SETTLED | The service feeds BOTH tabs; files in LOAD with PRE-SETTLED commissions may still appear in "Pre-liquidar" tab |
| Navigation for "IR a PRELIQUIDACIÓN" | `useRouter().push('/dashboard/pre-liquidacion')` | `<Link>` | Consistent with existing imperative navigation pattern in the component; avoids adding an anchor inside a button |
| ConfirmModal message update | Text-only change to existing `message` prop | New modal instance | Modal infrastructure already exists; no structural change needed |
| Status localization in Badge | Map English constants to Spanish labels | Use database values | Change 8 requirement: interface must be 100% Spanish; DB values like `LOAD` must be mapped to `Cargado` |
| Column Headers localization | Update hardcoded English headers | - | Page `pre-liquidacion` currently shows `SYNCHRONIZED` in the historic table header; must be `SINCRONIZADOS` |

## Data Flow

### Change 1 — procesarPreLiquidacion (status write)

```
POST /api/pre-liquidacion/procesar
  └─ procesarPreLiquidacion(fileImportId, rangoFecha)
       ├─ guard: fileImport.status !== 'LOAD' → reject         [EXISTING]
       ├─ loop: SettlementCommission → status PRE-SETTLED       [EXISTING]
       └─ FileImport.update({ preLiquidacionDate, status: 'PRE-SETTLED' })  [NEW]
```

### Change 6 — initiateImport guard

```
POST /api/carga-archivos/file-import
  └─ FileImportService.initiateImport({ fileType, month, year, idUser })
       ├─ [NEW] findFirst PRE-SETTLED (global, no idUser) → throw PeriodPreSettledError → 409
       ├─ findFirst COMPLETED (per idUser) → throw PeriodCompletedError → 409  [EXISTING]
       ├─ findFirst LOAD (per idUser) → return dedup                           [EXISTING]
       └─ create PROCESSING                                                    [EXISTING]
```

### Changes 2, 3, 4 — HistorialCargasTab button logic

```
for each carga in historial:
  if carga.estado === 'PRE-SETTLED':
    → show "IR a PRELIQUIDACIÓN" button only
  else:
    → show "Ver detalle" button
    if canPreliquidar && sincronizados > 0 && estado === 'LOAD':
      → show "Preliquidar" button
  always → show "Eliminar" button
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | `procesarPreLiquidacion()`: add `status: 'PRE-SETTLED'` to `FileImport.update` (line ~1003). `obtenerArchivosDisponiblesPreliquidacion()`: change `status: 'LOAD'` to `status: { in: ['LOAD', 'PRE-SETTLED'] }` (line ~26). |
| `src/features/load-file/services/file-import.service.ts` | Modify | Add `PeriodPreSettledError` class after `PeriodCompletedError`. `initiateImport()`: add PRE-SETTLED check before COMPLETED check. `listFileImports()`: change default `{ in: ['LOAD', 'COMPLETED'] }` to `{ in: ['LOAD', 'COMPLETED', 'PRE-SETTLED'] }` (line ~122). |
| `src/app/api/carga-archivos/file-import/route.ts` | Modify | Import `PeriodPreSettledError`. Add catch block before `PeriodCompletedError` catch: `instanceof PeriodPreSettledError → 409`. |
| `src/features/load-file/components/HistorialCargasTab.tsx` | Modify | (1) Add `useRouter` import from `next/navigation`. (2) Replace unconditional "Ver detalle" + conditional "Preliquidar" with status-gated rendering. (3) Add `FILE_IMPORT_STATUS_LABELS` mapper. (4) Update status badge and filter Select to use the mapper (Spanish labels). (5) Update ConfirmModal `message` text. |
| `src/app/dashboard/pre-liquidacion/page.tsx` | Modify | (1) `archivosPendientes`: keep `estado === 'LOAD' && sincronizados > 0`. (2) `archivosHistorico`: change to `estado === 'PRE-SETTLED'`. (3) Localize table headers (e.g., `SYNCHRONIZED` -> `SINCRONIZADOS`). (4) Ensure all labels are in Spanish. |
| `src/app/api/pre-liquidacion/procesar/__tests__/route.test.ts` | Modify | Add test: after successful procesarPreLiquidacion, FileImport.status is `'PRE-SETTLED'`. |
| `src/features/load-file/__tests__/HistorialCargasTab.test.tsx` | Modify | Add tests: PRE-SETTLED file shows "IR a PRELIQUIDACIÓN" only; "Pre-liquidado" appears in status select. |
| `src/app/api/carga-archivos/file-import/__tests__/route.test.ts` | Modify | Add tests: PRE-SETTLED period returns 409; PRE-SETTLED appears when status filter is ALL. |

## Interfaces / Contracts

New error class (in `file-import.service.ts`):

```typescript
export class PeriodPreSettledError extends Error {
  constructor(
    public readonly month: number,
    public readonly year: number
  ) {
    super(`El período ${month}/${year} ya fue pre-liquidado. No se pueden agregar más comisiones.`)
    this.name = 'PeriodPreSettledError'
  }
}
```

Route 409 response (consistent with existing `PeriodCompletedError` pattern):

```typescript
if (error instanceof PeriodPreSettledError) {
  return NextResponse.json(
    { data: null, error: error.message } satisfies ApiResponse<null>,
    { status: 409 }
  )
}
```

No new API response shape changes — all endpoints continue to use `ApiResponse<T>`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `procesarPreLiquidacion()` sets FileImport status to `PRE-SETTLED` | Mock `prisma.fileImport.update`, assert `status: 'PRE-SETTLED'` in update data |
| Unit | `initiateImport()` throws `PeriodPreSettledError` for PRE-SETTLED period | Mock `prisma.fileImport.findFirst` returning PRE-SETTLED record, assert throw |
| Unit | `listFileImports()` includes PRE-SETTLED in ALL filter | Mock Prisma query, assert `where.status` includes `'PRE-SETTLED'` |
| Integration | `POST /api/carga-archivos/file-import` returns 409 for PRE-SETTLED period | Use existing route test pattern, seed PRE-SETTLED FileImport |
| Component | HistorialCargasTab shows "IR a PRELIQUIDACIÓN" for PRE-SETTLED entry | Render with mock PRE-SETTLED carga, assert button presence/absence |
| Component | "Pre-liquidado" option exists in status select | Query select content |

## Migration / Rollout

No migration required. All changes are application logic only. The `PRE-SETTLED` string value already exists as a valid `FileImport.status` in the codebase convention (used by `SettlementCommission`). The existing `@@index([fileType, month, year, status])` on `FileImport` covers the new PRE-SETTLED guard query in `initiateImport()` efficiently.

Rollout is safe to deploy as a single feature branch with no database migration step.

## Open Questions

- [ ] Partial-preliquidation scenario: if a file has some SYNCHRONIZED and some PRE-SETTLED commissions (partial preliquidation), should it appear in both "Pre-liquidar" and "Histórico" tabs or only "Pre-liquidar"? Current design keeps it in "Pre-liquidar" (`estado === 'LOAD'`) until fully preliquidated (FileImport.status flips to PRE-SETTLED). This is consistent but should be confirmed with stakeholder.
- [ ] Frontend UX for PRE-SETTLED-blocked sync: the existing `CargarArchivoTab.tsx` shows "PERÍODO BLOQUEADO" title for any 409. Should it show a different title (e.g., "PERÍODO EN PRELIQUIDACIÓN") for `PeriodPreSettledError`? The backend message distinguishes between them; frontend can optionally check message content to set a distinct title.
