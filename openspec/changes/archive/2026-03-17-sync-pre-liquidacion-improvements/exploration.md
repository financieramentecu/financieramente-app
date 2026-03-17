# Exploration: sync-pre-liquidacion-improvements

## Summary of Requested Changes

1. When the user preliquida files → change `FileImport.status` to `PRE-SETTLED`.
2. The "Preliquidar" button must not show once file is `PRE-SETTLED` (prevents re-preliquidation).
3. In the historial de carga: keep showing the file with its status BUT without "Preliquidar" or "Ver detalle" buttons. Add "IR a PRELIQUIDACIÓN" button that navigates to `/dashboard/pre-liquidacion`.
4. In historial filters: add "Pre-liquidado" option to the status select.
5. In preliquidación module: load files with `PRE-SETTLED` FileImport status and commissions in `PRE-SETTLED` state.
6. **[NEW]** Block synchronization for a month/year that already has a PRE-SETTLED file import (of same fileType). Show a warning alert to the user.
7. **[NEW]** Show a confirmation modal before executing preliquidación from the HistorialCargasTab (warning: "no se podrán agregar más comisiones").
8. **[NEW]** in the historial de carga: the filters must load default month and yerar, delete search input.

---

## Data Model

**Prisma schema** (`prisma/schema.prisma`):

### FileImport model
```
model FileImport {
  idFileImport         Int
  fileType             String?   // 'POLIZA' | 'VOLUNTARIA'
  month                Int?
  year                 Int?
  status               String @db.VarChar(20)
  // Valid statuses:   'LOAD', 'PRE-SETTLED', 'SETTLED', 'COMPLETED'
  preLiquidacionDate   DateTime?
  ...
}
@@index([fileType, month, year, status])  // <-- composite index already exists!
```

### SettlementCommission model
```
status String @default("PENDING")
// Valid statuses: PENDING, SYNCHRONIZED, LAG, PRE-SETTLED, SETTLED
```

**Key observation**: The `FileImport.status` currently stays `LOAD` after `procesarPreLiquidacion()` completes. Only `preLiquidacionDate` is updated. The individual `SettlementCommission` records transition from `SYNCHRONIZED` → `PRE-SETTLED` during preliquidación. The `FileImport.status` only goes to `COMPLETED` when `liquidarRegistros()` finds no more `SYNCHRONIZED` records.

---

## Module: load-file (Sync / Historial de Cargas)

### Feature location
- `/src/features/load-file/`
- Components: `/src/features/load-file/components/`
  - `HistorialCargasTab.tsx` — main historial component
  - `CargarArchivoTab.tsx` — file upload tab
  - `RecordsByStatusView.tsx` — detail modal content
- Hooks: `/src/features/load-file/hooks/use-file-history.ts`
- Service client: `/src/features/load-file/lib/load-file-api.ts`
- Types: `/src/features/load-file/types/load-file.types.ts`
- Services: `/src/features/load-file/services/file-import.service.ts`

### Sync entry point (how synchronization starts)

1. **CargarArchivoTab.tsx** (`handleUpload()`, line ~201): user selects file, fileType, month, year and clicks "Cargar".
2. Calls `loadFileApi.initiateImport(fileType, month, year)` → `POST /api/carga-archivos/file-import`
3. Route calls `FileImportService.initiateImport({ fileType, month, year, idUser })` in `file-import.service.ts`
4. If a `COMPLETED` file exists for the same (fileType, month, year, idUser) → throws `PeriodCompletedError` → route returns 409 → frontend shows "PERÍODO BLOQUEADO" modal.
5. If a `LOAD` file exists → returns dedup (existing file, no new creation).
6. Otherwise creates a new `FileImport` with status `PROCESSING`.
7. Then `processBatch()` is called in chunks (50 records each) → `POST /api/carga-archivos/process-batch`.

### Current blocking guards in FileImportService.initiateImport
- Blocks if `COMPLETED` for same (fileType, month, year, idUser)
- Dedup if `LOAD` for same (fileType, month, year, idUser)
- **DOES NOT block if `PRE-SETTLED`** — this is the gap to fill for change #6.

### PRE-SETTLED block for sync (NEW requirement #6)

**Where**: `FileImportService.initiateImport()` in `/src/features/load-file/services/file-import.service.ts`

**Logic to add** (before the COMPLETED check or alongside it):
```ts
// Check for PRE-SETTLED import (pre-liquidation block guard)
// Note: PRE-SETTLED is per-fileType+month+year, NOT per-user (unlike COMPLETED)
// Because preliquidation is global, not per-user.
const preSettled = await prisma.fileImport.findFirst({
  where: { fileType, month, year, status: 'PRE-SETTLED' },
})
if (preSettled) {
  throw new PeriodPreSettledError(month, year)
}
```

**New error class** (in `file-import.service.ts`):
```ts
export class PeriodPreSettledError extends Error {
  constructor(public readonly month: number, public readonly year: number) {
    super(`El período ${month}/${year} ya fue pre-liquidado. No se pueden agregar más comisiones.`)
    this.name = 'PeriodPreSettledError'
  }
}
```

**Route** (`/src/app/api/carga-archivos/file-import/route.ts`):
- Add catch for `PeriodPreSettledError` → return 409 with specific error message.
- The frontend in `CargarArchivoTab.tsx` already shows `setErrorModalTitle('PERÍODO BLOQUEADO')` when `initiateResponse.error` is present — this will naturally display the pre-settled message as well.
- Optionally use a distinct modal title like `'PERÍODO EN PRELIQUIDACIÓN'` if the error message contains the right string, by checking the error message content on the frontend.

**Frontend display** (`CargarArchivoTab.tsx`, line ~268-274):
Currently: if `!initiateResponse.data` → shows `errorModalTitle('PERÍODO BLOQUEADO')`.
Can improve UX: check if the error specifically mentions "pre-liquidado" and show a more descriptive title. But the base blocking will work automatically since the error message is displayed.

**Index**: `FileImport` already has `@@index([fileType, month, year, status])` — the PRE-SETTLED lookup will be efficient.

**Scope note**: Unlike the COMPLETED block which is scoped to `idUser` (a user's file is COMPLETED for them), the PRE-SETTLED block should be **global** (not scoped by user) since preliquidation is a company-wide operation. Once preliquidated for a period, NO user should be able to sync more data for that period.

---

### Current behavior in HistorialCargasTab.tsx

**Preliquidar button condition** (line 495-511):
```tsx
{canPreliquidar &&
  carga.sincronizados > 0 &&
  carga.estado === 'LOAD' && (
    <Button ...>Preliquidar</Button>
  )}
```
Currently only shows for `estado === 'LOAD'`. After preliquidación, `FileImport.status` remains `LOAD` (not changed to `PRE-SETTLED`), so the button **continues showing** — this is a bug to fix.

**EXISTING confirmation modal** (lines 199-215):
```tsx
<ConfirmModal
  open={preliquidarModalOpen}
  onOpenChange={...}
  title="¿Confirmar pre-liquidación?"
  message={`Se procesarán los registros sincronizados del archivo para el período ${preliquidarTarget?.mes ?? ''}. Esta acción cambiará su estado a PRE-LIQUIDADO. Déspues de esta accion no va poder sincronizar más comisiones`}
  confirmText="Pre-liquidar"
  cancelText="Cancelar"
  onConfirm={handleConfirmPreliquidar}
  onCancel={...}
/>
```

**IMPORTANT DISCOVERY for change #7**: A confirmation modal for the Preliquidar action **already exists** in `HistorialCargasTab.tsx`! The `ConfirmModal` is already rendered and controlled by `preliquidarModalOpen` state. The `handlePreliquidarClick` handler already opens this modal before executing the preliquidación.

What the new requirement asks is to **update the message** in this existing modal to explicitly warn: "¿Está seguro de preliquidar? Ya no se podrán agregar más comisiones." The existing modal already has the right structure — only the `message` prop text needs updating.

**Confirmation modal update for change #7**:
- **File**: `src/features/load-file/components/HistorialCargasTab.tsx`, line 207
- **Current message**: `"Se procesarán los registros sincronizados del archivo para el período ${preliquidarTarget?.mes ?? ''}. Esta acción cambiará su estado a PRE-LIQUIDADO."`
- **New message**: `"Se procesarán los registros sincronizados del archivo para el período ${preliquidarTarget?.mes ?? ''}. Una vez pre-liquidado, ya no se podrán agregar más comisiones para este período."`
- No structural changes needed — only the text content.

**Ver detalle button** (line 483-494):
```tsx
<Button onClick={() => setDetailFileImportId(parseInt(carga.id, 10))}>
  <Eye /> Ver detalle
</Button>
```
Always shown for all entries. Needs to be hidden for `PRE-SETTLED` files (show "IR a PRELIQUIDACIÓN" instead).

**Status filter** (lines 270-279):
```tsx
<SelectItem value="ALL">Todos</SelectItem>
<SelectItem value="LOAD">Cargado</SelectItem>
<SelectItem value="COMPLETED">Completado</SelectItem>
```
Missing `PRE-SETTLED` option (needs "Pre-liquidado" label).

**Badge styling** (getEstadoBadgeStyle):
- `PRE-SETTLED` already has a style (same green as `COMPLETED`) — no change needed.

### Status filtering in FileImportService.listFileImports

**Critical observation** (`/src/features/load-file/services/file-import.service.ts`, lines 118-123):
```ts
if (status && status !== 'ALL') {
  where.status = status
} else if (!status || status === 'ALL') {
  where.status = { in: ['LOAD', 'COMPLETED'] }  // <-- PRE-SETTLED excluded from default!
}
```
When no filter is applied (ALL), `PRE-SETTLED` files are excluded! This must be updated to include `PRE-SETTLED` in the default `in` filter.

### preliquidar API call

`loadFileApi.preliquidar(idFileImport, mes)` → `POST /api/pre-liquidacion/procesar`

After successful preliquidación, `procesarPreLiquidacion()` (line 1003-1008) only updates `preLiquidacionDate` on `FileImport`, does NOT change `FileImport.status`. This is the root cause of all the issues.

---

## Module: pre-liquidacion

### Feature location
- `/src/features/pre-liquidacion/`
- Components: `BarraAccionesLiquidacion`, `ModalConfirmacion*`, `RegistrosLiquidacionTable`, `ModalVerNegocio`
- Hooks: `use-pre-liquidacion.ts`, `use-comisiones-preliquidadas.ts`, `use-liquidar-registros.ts`, `use-rezagar-registros.ts`, `use-registros-liquidacion.ts`, `use-resultados-pre-liquidacion.ts`, `use-exportar-pre-liquidacion.ts`
- Service: `/src/features/pre-liquidacion/services/pre-liquidacion.service.ts`
- Types: `/src/features/pre-liquidacion/types/types.ts`
- Lib: `pre-liquidacion-flow.ts`, `pre-liquidacion-schemas.ts`

### Pages
- `/src/app/dashboard/pre-liquidacion/page.tsx` — main page with two tabs: "Pre-liquidar" and "Histórico"
- `/src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` — detail page (PRE-SETTLED commissions)
- Components in `/src/app/dashboard/pre-liquidacion/components/`:
  - `ListaArchivosDisponibles.tsx`
  - `PanelResumenArchivos.tsx`
  - `ResultadosPreLiquidacion.tsx`
  - `ModalConfirmacionPreLiquidacion.tsx`
  - `ModalDetallePreLiquidacion.tsx`

### API Routes
```
GET  /api/pre-liquidacion/archivos         → obtenerArchivosDisponiblesPreliquidacion()
POST /api/pre-liquidacion/procesar         → procesarPreLiquidacion()
GET  /api/pre-liquidacion/pre-settled/[fileId] → obtenerComisionesPreliquidadas()
GET  /api/pre-liquidacion/registros/[fileId]   → obtenerRegistrosParaLiquidacion()
GET  /api/pre-liquidacion/detalle/[fileId]     → obtenerDetallePreLiquidacion()
POST /api/pre-liquidacion/liquidar         → liquidarRegistros()
POST /api/pre-liquidacion/rezagar          → rezagarRegistros()
GET  /api/pre-liquidacion/resultados/[fileId]
GET  /api/pre-liquidacion/exportar/[fileId]
```

### Current `obtenerArchivosDisponiblesPreliquidacion()` query

```ts
// Current WHERE clause in service:
where: {
  status: 'LOAD',              // <-- Only loads LOAD files
  settlementCommissions: {
    some: {
      status: { in: ['SYNCHRONIZED', 'PRE-SETTLED'] }
    }
  }
}
```

**For change #5**: After the fix, `FileImport.status` will be `PRE-SETTLED`. The service query needs to also include `status: 'PRE-SETTLED'` (or `{ in: ['LOAD', 'PRE-SETTLED'] }`).

### Pre-liquidación page filtering

In `PreLiquidacionPage` (`page.tsx`):
```ts
const archivosPendientes = archivos.filter(
  (a) => a.estado === 'LOAD' && (a.registrosPreliquidados ?? 0) > 0
)
const archivosHistorico = archivos.filter(
  (a) => a.estado === 'LOAD' && (a.registrosPreliquidados ?? 0) > 0
)
```

Both tabs use the same filter `estado === 'LOAD'`. After the fix, "Pre-liquidar" tab should filter for files that still have `SYNCHRONIZED` commissions (i.e., not fully preliquidated), while "Histórico" tab should show files with `estado === 'PRE-SETTLED'` or files already processed.

### `procesarPreLiquidacion()` guards (line 842)
```ts
if (fileImport.status !== 'LOAD') {
  return { success: false, ... }
}
```
This is the backend guard that prevents re-preliquidation. After change #1 (FileImport.status → PRE-SETTLED), a second call will correctly fail because status will not be 'LOAD'. This guard remains valid.

---

## Navigation

- Route: `/dashboard/pre-liquidacion`
- In `src/lib/navigation/menu-items.tsx` (line 57): `url: '/dashboard/pre-liquidacion'`

---

## Shared UI Patterns

### Modal patterns (from `src/features/shared/ui/modal.tsx`)
- `ConfirmModal` — two-button confirm/cancel dialog. Used in HistorialCargasTab for delete and preliquidar confirmations.
- `AlertModal` — single-button informational modal. Used in CargarArchivoTab for errors.
- Both wrap the shadcn/ui `Dialog` component.
- `ConfirmModal` already has `destructive` prop support for red confirm button.

### How confirmation modal is called for Preliquidar (already in place):
```tsx
// State:
const [preliquidarModalOpen, setPreliquidarModalOpen] = useState(false)
const [preliquidarTarget, setPreliquidarTarget] = useState<{...} | null>(null)

// Click handler opens modal:
const handlePreliquidarClick = (carga) => {
  // Computes mes from createdAt
  setPreliquidarTarget({ idFileImport, mes, id })
  setPreliquidarModalOpen(true)
}

// Modal:
<ConfirmModal
  open={preliquidarModalOpen}
  title="¿Confirmar pre-liquidación?"
  message="..."
  confirmText="Pre-liquidar"
  onConfirm={handleConfirmPreliquidar}
/>
```
The confirmation pattern is fully implemented. Only the message text needs updating.

---

## Impact Analysis Per Change

### Change 1: FileImport.status → PRE-SETTLED after preliquidación
- **Where**: `procesarPreLiquidacion()` in `/src/features/pre-liquidacion/services/pre-liquidacion.service.ts` (line 1003-1009)
- Currently only updates `preLiquidacionDate`. Add `status: 'PRE-SETTLED'` to the update.
- **Risk**: `procesarPreLiquidacion()` checks `if (fileImport.status !== 'LOAD')` (line 842) to block re-preliquidation. After status change, a second call would return the error message — this is correct behavior.
- **Side effect**: `FileImportService.initiateImport()` checks for COMPLETED and LOAD status dedup guards. PRE-SETTLED is not checked, but it would be a new upload — acceptable (now blocked by change #6).
- **Side effect**: `listFileImports()` default filter `{ in: ['LOAD', 'COMPLETED'] }` must add `'PRE-SETTLED'`.

### Change 2: Hide Preliquidar button for PRE-SETTLED
- **Where**: `HistorialCargasTab.tsx` condition `carga.estado === 'LOAD'`
- After Change 1, `carga.estado` will be `'PRE-SETTLED'` → button already hidden by condition.
- But must ensure `PRE-SETTLED` files appear in the historial list (requires fixing default filter in Change 1).

### Change 3: Replace "Ver detalle" + no "Preliquidar" with "IR a PRELIQUIDACIÓN" for PRE-SETTLED files
- **Where**: `HistorialCargasTab.tsx` buttons section (lines 482-521)
- Conditionally render: if `carga.estado === 'PRE-SETTLED'` → show "IR a PRELIQUIDACIÓN" button (navigates to `/dashboard/pre-liquidacion`), hide "Ver detalle" and "Preliquidar".
- Otherwise show current buttons.
- **Needs**: `useRouter` from `next/navigation` for navigation.

### Change 4: Add "Pre-liquidado" to status filter select
- **Where**: `HistorialCargasTab.tsx` status select (lines 276-279)
- Add `<SelectItem value="PRE-SETTLED">Pre-liquidado</SelectItem>`
- No backend change needed — the API already accepts any string as `status`.

### Change 5: Pre-liquidación module loads PRE-SETTLED files/commissions
- **Where**: `obtenerArchivosDisponiblesPreliquidacion()` in pre-liquidacion.service.ts
  - Change `where.status` from `'LOAD'` to `{ in: ['LOAD', 'PRE-SETTLED'] }`
- **Where**: `PreLiquidacionPage` filtering logic
  - `archivosPendientes` filter: files that still have SYNCHRONIZED commissions (or `estado === 'LOAD'`)
  - `archivosHistorico` filter: files with `estado === 'PRE-SETTLED'`
- **Where**: `obtenerDetallePreLiquidacion()` (service line 229): currently only fetches SYNCHRONIZED commissions. This is correct for the detail/pre-liquidation view (still-to-process records). No change needed here.
- `obtenerComisionesPreliquidadas()` already fetches PRE-SETTLED commissions — no change.

### Change 6 (NEW): Block sync for PRE-SETTLED period
- **Where**: `FileImportService.initiateImport()` in `src/features/load-file/services/file-import.service.ts`
- Add new check before/alongside COMPLETED check:
  ```ts
  const preSettled = await prisma.fileImport.findFirst({
    where: { fileType, month, year, status: 'PRE-SETTLED' },
    // NOTE: NOT scoped by idUser — preliquidation is global
  })
  if (preSettled) throw new PeriodPreSettledError(month, year)
  ```
- Add `PeriodPreSettledError` class to `file-import.service.ts`
- **Where**: `src/app/api/carga-archivos/file-import/route.ts`
  - Add `catch (error instanceof PeriodPreSettledError)` → return 409 with message
- **Frontend**: `CargarArchivoTab.tsx` already shows error modal on `initiateResponse.error`. The error message from `PeriodPreSettledError` will naturally appear in the existing "PERÍODO BLOQUEADO" modal. For better UX, consider checking the error message to set a distinct title like 'PERÍODO EN PRELIQUIDACIÓN'.
- **Index**: Already exists: `@@index([fileType, month, year, status])` — lookup will be efficient.
- **Scope**: PRE-SETTLED block must be global (not per-user) since preliquidation affects all users' data for that period/fileType.

### Change 7 (NEW): Confirmation modal for preliquidar (already exists, update message)
- **Discovery**: A `ConfirmModal` for the preliquidar action **already exists** in `HistorialCargasTab.tsx` (lines 199-215). The pattern is fully implemented — clicking "Preliquidar" already opens a confirmation dialog.
- **What's needed**: Only update the modal `message` prop text to include the warning about no more commissions being addable.
- **Where**: `HistorialCargasTab.tsx`, line 207 (message prop of ConfirmModal)
- **Current**: `"Se procesarán los registros sincronizados del archivo para el período ${preliquidarTarget?.mes ?? ''}. Esta acción cambiará su estado a PRE-LIQUIDADO."`
- **New**: `"Se procesarán los registros sincronizados del archivo para el período ${preliquidarTarget?.mes ?? ''}. Una vez pre-liquidado, ya no se podrán agregar más comisiones para este período."`
- No new components, no new state, no structural changes needed.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | `procesarPreLiquidacion()`: add `status: 'PRE-SETTLED'` to FileImport update; `obtenerArchivosDisponiblesPreliquidacion()`: extend status filter to include `PRE-SETTLED` |
| `src/features/load-file/services/file-import.service.ts` | `listFileImports()`: add `'PRE-SETTLED'` to default status filter; `initiateImport()`: add `PeriodPreSettledError` check; add `PeriodPreSettledError` class |
| `src/features/load-file/components/HistorialCargasTab.tsx` | (1) Add `PRE-SETTLED` to status badge styling note; (2) Conditionally show "IR a PRELIQUIDACIÓN" btn instead of "Ver detalle" + "Preliquidar" for PRE-SETTLED files; (3) Add "Pre-liquidado" option to status filter select; (4) Update ConfirmModal message to warn about no more commissions |
| `src/app/api/carga-archivos/file-import/route.ts` | Add catch for `PeriodPreSettledError` → 409 response |
| `src/app/dashboard/pre-liquidacion/page.tsx` | Update `archivosPendientes` and `archivosHistorico` filters for new `PRE-SETTLED` FileImport status |

### Optional / Secondary
| File | Change |
|------|--------|
| `src/app/api/pre-liquidacion/procesar/__tests__/route.test.ts` | Update tests to verify FileImport.status changes to PRE-SETTLED |
| `src/features/load-file/__tests__/HistorialCargasTab.test.tsx` | Update tests for new button behavior |
| `src/app/api/carga-archivos/file-import/__tests__/route.test.ts` | Update tests for PRE-SETTLED filter and new block guard |

---

## Risks & Edge Cases

1. **Re-preliquidation guard**: After status changes to `PRE-SETTLED`, `procesarPreLiquidacion()` will correctly reject re-calls (fails status !== LOAD check). However, test must confirm `PRE-SETTLED` is rejected, not just `LOAD`.

2. **initiateImport dedup order**: The new PRE-SETTLED check should be done BEFORE or alongside the COMPLETED check, since a PRE-SETTLED file may later become COMPLETED (via liquidar). Once COMPLETED, the COMPLETED check already blocks. The PRE-SETTLED check is an intermediate state that must also be blocked.

3. **Pre-liquidación page tab logic**: Currently both `archivosPendientes` and `archivosHistorico` share the same filter (`estado === 'LOAD'`). After the fix, the "Pre-liquidar" tab should show files with `SYNCHRONIZED` commissions still available (may still be LOAD files with partial preliquidation). The "Histórico" tab should show PRE-SETTLED files. Need to clarify if partial preliquidation (some SYNCHRONIZED, some PRE-SETTLED in same file) is possible.

4. **Badge display**: The `PRE-SETTLED` badge in `HistorialCargasTab.tsx` shows the raw DB string. A display label "Pre-liquidado" (in Spanish) would improve UX — low risk, UI only.

5. **`listFileImports()` default filter**: If both `status === 'ALL'` and a specific `status` filter are handled, PRE-SETTLED must be in the `ALL` group. Currently `ALL` only shows `LOAD` and `COMPLETED`. This is a data gap — PRE-SETTLED files are invisible in the historial until this is fixed.

6. **Global vs per-user PRE-SETTLED block**: The COMPLETED block in `initiateImport` is scoped per-user (`idUser`). The PRE-SETTLED block should be global (no `idUser` filter) because preliquidation affects everyone's commissions for that period and fileType. This is a semantic difference to ensure is understood during implementation.

7. **Frontend UX for blocked period (change #6)**: The existing error modal in `CargarArchivoTab.tsx` currently only has "PERÍODO BLOQUEADO" as the title when `initiateImport` fails. For PRE-SETTLED blocking, it would be better UX to show a warning-type alert (not error) since it's not a technical error but a business rule. Can use `setErrorModalTitle('PERÍODO EN PRELIQUIDACIÓN')` with the yellow warning icon by using `type="warning"` in AlertModal.

8. **Confirmation modal message (change #7)**: Already implemented — only the text needs updating. No risk of regression since the flow is identical. The warning about no more commissions addable is what was missing from the original message.
