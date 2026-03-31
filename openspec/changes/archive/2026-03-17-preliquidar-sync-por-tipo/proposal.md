# Proposal: Preliquidar por Archivo en Módulo de Sincronización

## Intent

Users (ADMIN and ASISTENTE_GERENCIA_OPERATIVA) need a "Preliquidar" button per file import card in the sync module (`HistorialCargasTab`). This button triggers the pre-liquidation process for that specific file — calculating commission distribution by `categoria` for its synchronized records. Additionally, the pre-liquidación detail page must list only commissions in `PRE-SETTLED` status (not SYNCHRONIZED).

Currently no such button exists in the sync module, and the detail page (`/dashboard/pre-liquidacion/[fileId]`) queries SYNCHRONIZED records instead of PRE-SETTLED ones.

## Scope

### In Scope
- Add "Preliquidar" button per file card in `HistorialCargasTab` (visible when `sincronizados > 0` and `estado === 'LOAD'`, role-gated)
- Button calls existing `POST /api/pre-liquidacion/procesar` endpoint
- Extend `CargaHistorial` type with `fileType` and numeric `idFileImport` to enable the API call
- Add role guard to `POST /api/pre-liquidacion/procesar` (ADMIN + ASISTENTE_GERENCIA_OPERATIVA)
- Change the pre-liquidación detail page (`/dashboard/pre-liquidacion/[fileId]`) to list `PRE-SETTLED` commissions (not SYNCHRONIZED)
- New service function to query `SettlementCommission` where `status = 'PRE-SETTLED'` for a given `fileId`

### Out of Scope
- Bulk "Preliquidar todos [tipo]" endpoint (no new bulk API route)
- Modifications to `liquidarRegistros` or `rezagarRegistros` flows
- New permissions — both target roles already have `liquidaciones.preliquidacion: true`

### UI Changes (pre-liquidación listing page)
- **Stats panel**: "Total Registros" card now shows the sum of `registrosPreliquidados` (PRE-SETTLED count) instead of `totalRegistros`. The "Sincronizados" stat card has been removed; the grid is now 3 columns (Total Archivos, Total Registros, Rezagados).
- **Table title**: changed from `"Archivos Pendientes de Pre-liquidar"` to `"Archivos pendientes para validar la Pre-Liquidación"`.
- **"Cantidad de Registros" column** in `ListaArchivosDisponibles`: now shows `registrosPreliquidados ?? 0` instead of `cantidadRegistros`.

## Approach

1. **Extend `CargaHistorial`** — add `fileType: 'POLIZA' | 'VOLUNTARIA'` and `idFileImport: number` to the interface in `load-file.types.ts` and update the mapping in `use-file-history.ts` (data is already returned by the API, just not mapped).

2. **Add preliquidar API helper** — add `preliquidar(fileImportId: number, mes: string)` to `load-file-api.ts` calling `POST /api/pre-liquidacion/procesar`.

3. **Add button in `HistorialCargasTab`** — per file card: show "Preliquidar" button when `sincronizados > 0 && estado === 'LOAD'`. Gate visibility by `liquidaciones.preliquidacion` permission using existing `useAuthSession` + `getRolePermissions`. On click: confirmation dialog → call API → refresh history → show success/error toast.

4. **Add role guard to `POST /api/pre-liquidacion/procesar`** — add `ALLOWED_ROLES = [UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA]` check, returning 403 if not matched.

5. **New service function `obtenerComisionesPreliquidadas(fileImportId)`** — queries `SettlementCommission` where `status = 'PRE-SETTLED'` and `fileImportId = X`.

6. **Update detail page** — `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` and its data-fetching hook use the new service function. The table shows PRE-SETTLED records; per-record "Liquidar" / "Rezagar" actions remain but are only applicable to SYNCHRONIZED records, so they can be hidden or disabled on PRE-SETTLED rows.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/load-file/types/load-file.types.ts` | Modified | Add `fileType`, `idFileImport: number` to `CargaHistorial` |
| `src/features/load-file/hooks/use-file-history.ts` | Modified | Map `fileType` and `idFileImport` from API response |
| `src/features/load-file/lib/load-file-api.ts` | Modified | Add `preliquidar(fileImportId, mes)` function |
| `src/features/load-file/components/HistorialCargasTab.tsx` | Modified | Add role-gated "Preliquidar" button per card with confirmation |
| `src/app/api/pre-liquidacion/procesar/route.ts` | Modified | Add ALLOWED_ROLES role guard |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modified | Add `obtenerComisionesPreliquidadas(fileImportId)` |
| `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` | Modified | Use new service to show PRE-SETTLED commissions |
| `src/features/pre-liquidacion/hooks/` | Modified | Update hook(s) that fetch detail records to call new service |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `procesarPreLiquidacion` called on file with no SYNCHRONIZED records returns empty result | Med | Handle gracefully with informative toast ("No hay registros sincronizados para preliquidar") |
| Duplicate processing if user clicks button twice quickly | Low | Disable button after first click; loading state guard |
| Detail page currently shows SYNCHRONIZED + action buttons — switching to PRE-SETTLED may confuse users | Med | Update column headers and empty state copy clearly |
| Role guard addition to `/procesar` may break existing callers | Low | Only ADMIN + ASISTENTE_GERENCIA_OPERATIVA call this; verify tests |

## Rollback Plan

- Revert `HistorialCargasTab.tsx` to remove the button (single file change, safe to revert)
- Revert role guard in `procesar/route.ts` (restores any-auth behavior)
- Revert detail page to SYNCHRONIZED query (service function addition is non-breaking; just stop calling it)
- No database migrations required — no schema changes

## Dependencies

- Existing `POST /api/pre-liquidacion/procesar` endpoint (already functional)
- `getRolePermissions` utility in `src/features/auth/lib/permissions.ts` (already available)
- Prisma `SettlementCommission` model with `status` field (already in schema)

## Success Criteria

- [ ] "Preliquidar" button appears on each file card in `HistorialCargasTab` when `sincronizados > 0` and `estado === 'LOAD'`
- [ ] Button is hidden for roles without `liquidaciones.preliquidacion: true`
- [ ] Clicking button shows confirmation dialog, then calls `/api/pre-liquidacion/procesar` and refreshes the list
- [ ] `POST /api/pre-liquidacion/procesar` returns 403 for unauthorized roles
- [ ] `/dashboard/pre-liquidacion/[fileId]` detail table lists only `PRE-SETTLED` commissions
- [ ] Unit tests cover: button visibility logic, role guard in API route, new service function
