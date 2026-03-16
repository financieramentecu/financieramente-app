# Proposal: Detalle de Pre-liquidación con Liquidar/Rezagar por Registro

## Intent

Users with roles `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, and `ANALISTA_SOPORTE` need a per-record detail view of pre-liquidation files so they can selectively settle or lag individual commission records rather than processing an entire file at once. Currently, the pre-liquidation flow only supports bulk processing — all SYNCHRONIZED records in a file move to PRE-SETTLED in one shot, with no per-record control.

This change introduces a new detail page at `/dashboard/pre-liquidacion/[fileId]` that lists SYNCHRONIZED `SettlementCommission` records for a given file, supports row-level checkbox selection, and exposes "Liquidar" (→ `SETTLED`) and "Rezagar" (→ `LAG`) bulk actions on the selection. It also surfaces a "Ver Negocio" row action with a full-screen business detail modal.

---

## Scope

### In Scope

**New detail page and table**
- Route `/dashboard/pre-liquidacion/[fileId]` — new Next.js page listing all `SYNCHRONIZED` `SettlementCommission` records for the given `FileImport`.
- Column sets differ by `fileType`:
  - **VOLUNTARIA**: Contrato, Nombre Asesor, Tipo, Monto, Base Comisión, Fecha Inicio, Fecha Fin, % Descuento, Rezagado, Fecha Sincronización.
  - **POLIZA**: Contrato, Nombre Asesor, Tipo Comisión, Monto, Base Comisión, % Descuento, % Clawback, Es Clawback, Rezagado, Fecha Sincronización, Fecha Rezagado.
- Per-row checkbox + select-all.
- Bulk action bar ("Liquidar" / "Rezagar") enabled only when ≥ 1 row is selected.
- Confirmation dialogs before executing either bulk action.
- "Ver Negocio" row action opening a full-screen modal (read-only; origin edit deferred to `permitir-edicion-origen-negocio-roles-admin`).
- "Ver Detalle" navigation button added to the existing pre-liquidación file list (`ListaArchivosDisponibles`).

**New service functions**
- `liquidarRegistros(ids: number[], userId: number, fileId: number)` — transitions selected SYNCHRONIZED records to `SETTLED` in a single Prisma transaction; marks `FileImport.status = COMPLETED` if 0 SYNCHRONIZED records remain.
- `rezagarRegistros(ids: number[], userId: number)` — transitions selected SYNCHRONIZED records to `LAG`, sets `lagDate = now()` and `isLag = true`, in a single transaction.

**New API endpoints**
- `POST /api/pre-liquidacion/liquidar` — body `{ ids: number[], fileId: number }`.
- `POST /api/pre-liquidacion/rezagar` — body `{ ids: number[] }`.

**Type and service extensions**
- Add `fileType: string` to `ArchivoDisponible` (type + service query).
- Extend `obtenerDetallePreLiquidacion` (or add a dedicated service function) to return the full field set required by the new columns: `syncDate`, `lagDate`, `startDate`, `endDate`, `clawbackPercentage`, `isClawback`.
- New type `RegistroLiquidacionDetalle` for the detail page records.

**Audit logging**
- Add `COMMISSION_SETTLED` and `COMMISSION_LAGGED` to the `AuditAction` enum in `src/features/auth/lib/audit-logger.ts`.
- Emit audit log after each successful `liquidarRegistros` / `rezagarRegistros` call.

**Permission fix**
- Grant `ANALISTA_SOPORTE` access to `liquidaciones.preliquidacion` in `src/features/auth/lib/permissions.ts` (currently `false`).

**Auto-complete file on full liquidation**
- When all SYNCHRONIZED records for a `FileImport` are liquidated, `liquidarRegistros` sets `FileImport.status = COMPLETED` inside the same transaction. This satisfies the existing spec requirement that blocks re-sync for COMPLETED periods (`FileImportService.initiateImport` guard).

### Out of Scope

- **Conditional origin editing in "Ver Negocio" modal** — this is handled by the parallel change `permitir-edicion-origen-negocio-roles-admin`. The `BusinessViewModal` opened from this page is read-only until that change is applied.
- **Server-side pagination** of the detail table — initial implementation fetches all SYNCHRONIZED records for the file.
- **Export** of the detail table — not required in this scope.
- **ClawbackBalance updates on liquidation** — these belong to the liquidation (liquidaciones) domain, not pre-liquidación. `liquidarRegistros` changes `SettlementCommission.status` to `SETTLED` and sets `FileImport.status = COMPLETED` when applicable; it does NOT create or update `ClawbackBalance` rows. That responsibility remains with the liquidaciones feature.
- **PRE-SETTLED → SETTLED transition** — the existing pre-liquidación flow (SYNCHRONIZED → PRE-SETTLED) is unchanged. This change adds a parallel direct path: SYNCHRONIZED → SETTLED.

---

## Approach

### Data layer

1. **`ArchivoDisponible`** — add `fileType` field to both the type definition and the `obtenerArchivosDisponiblesPreliquidacion` service query (include `fileImport.fileType`).
2. **New type `RegistroLiquidacionDetalle`** — flat interface mapping all needed `SettlementCommission` + `business.user` fields for the detail table.
3. **Reuse or extend `/api/pre-liquidacion/detalle/[fileId]`** — either extend the response shape or create a dedicated `/api/pre-liquidacion/registros/[fileId]` endpoint that returns `RegistroLiquidacionDetalle[]` filtered to `SYNCHRONIZED`. The existing detalle endpoint was designed for the confirmation step and may include extra distribution/summary data not needed here.
4. **`liquidarRegistros` service function** — `prisma.$transaction`: bulk `updateMany` on `SettlementCommission` where `idSettlementCommission IN ids AND status = 'SYNCHRONIZED'`; then count remaining SYNCHRONIZED records; if 0, update `FileImport.status = COMPLETED`.
5. **`rezagarRegistros` service function** — `prisma.$transaction`: bulk `updateMany` setting `status = 'LAG'`, `isLag = true`, `lagDate = new Date()` where `idSettlementCommission IN ids AND status = 'SYNCHRONIZED'`.

### API layer

- `POST /api/pre-liquidacion/liquidar` — auth + role check → validate body (Zod: `{ ids: number[], fileId: number }`) → call `liquidarRegistros` → emit audit log → return `ApiResponse<{ liquidated: number, fileCompleted: boolean }>`.
- `POST /api/pre-liquidacion/rezagar` — auth + role check → validate body (Zod: `{ ids: number[] }`) → call `rezagarRegistros` → emit audit log → return `ApiResponse<{ lagged: number }>`.
- Both routes accept roles: `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, `ANALISTA_SOPORTE`.

### UI layer

1. **`/dashboard/pre-liquidacion/[fileId]/page.tsx`** — client component; reads `fileId` from params; fetches registros via the detail endpoint; renders `RegistrosLiquidacionTable` + `BarraAccionesLiquidacion`.
2. **`RegistrosLiquidacionTable`** — DataTable with checkbox column; columns defined by `fileType`; "Ver Negocio" row action.
3. **`BarraAccionesLiquidacion`** — sticky bar showing count of selected rows + "Liquidar" and "Rezagar" buttons (disabled if 0 selected).
4. **`ModalConfirmacionLiquidar`** and **`ModalConfirmacionRezagar`** — use `ConfirmModal` pattern.
5. **`ModalVerNegocio`** — wraps `BusinessViewModal` with `size="full"` via the shared `Modal` component. Loads business via `useBusinessDetail(idBusiness)`.
6. **`ListaArchivosDisponibles`** — rename "Pre-liquidar" button to "Ver Detalle"; navigate to `/dashboard/pre-liquidacion/{fileId}` via `router.push`.
7. **New hooks**: `useRegistrosLiquidacion(fileId)` — fetches SYNCHRONIZED records; `useLiquidarRegistros()` and `useRezagarRegistros()` — manage `AsyncState<T>` for each action.

### Permissions

- Update `ROLE_PERMISSIONS['ANALISTA_SOPORTE']['liquidaciones']['preliquidacion']` to `true`.

---

## Affected Areas

| Area | Change Type | Description |
|---|---|---|
| `src/features/pre-liquidacion/types/types.ts` | Modified | Add `RegistroLiquidacionDetalle`, add `fileType` to `ArchivoDisponible` |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modified | Add `liquidarRegistros`, `rezagarRegistros`; extend detail query; add `fileType` to archive query |
| `src/app/api/pre-liquidacion/liquidar/route.ts` | New | POST endpoint for liquidating selected records |
| `src/app/api/pre-liquidacion/rezagar/route.ts` | New | POST endpoint for lagging selected records |
| `src/app/api/pre-liquidacion/detalle/[fileId]/route.ts` | Modified or extended | Return full field set for the new detail page (or new endpoint) |
| `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` | New | Detail page for per-record actions |
| `src/features/pre-liquidacion/components/RegistrosLiquidacionTable.tsx` | New | DataTable with checkbox selection, columns by fileType |
| `src/features/pre-liquidacion/components/BarraAccionesLiquidacion.tsx` | New | Bulk action bar |
| `src/features/pre-liquidacion/components/ModalConfirmacionLiquidar.tsx` | New | Confirmation modal for Liquidar |
| `src/features/pre-liquidacion/components/ModalConfirmacionRezagar.tsx` | New | Confirmation modal for Rezagar |
| `src/features/pre-liquidacion/components/ModalVerNegocio.tsx` | New | Full-screen business detail modal |
| `src/features/pre-liquidacion/hooks/use-registros-liquidacion.ts` | New | Fetch hook for SYNCHRONIZED records |
| `src/features/pre-liquidacion/hooks/use-liquidar-registros.ts` | New | Mutation hook for Liquidar action |
| `src/features/pre-liquidacion/hooks/use-rezagar-registros.ts` | New | Mutation hook for Rezagar action |
| `src/app/dashboard/pre-liquidacion/components/ListaArchivosDisponibles.tsx` | Modified | Replace "Pre-liquidar" with "Ver Detalle" navigation button |
| `src/features/auth/lib/audit-logger.ts` | Modified | Add `COMMISSION_SETTLED`, `COMMISSION_LAGGED` to `AuditAction` enum |
| `src/features/auth/lib/permissions.ts` | Modified | Set `ANALISTA_SOPORTE.liquidaciones.preliquidacion = true` |

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `SETTLED` transition has downstream effects not yet defined (ClawbackBalance, notifications) | Medium | Explicitly out-of-scope in this change; `liquidarRegistros` only updates status + sets FileImport.status=COMPLETED. Downstream ClawbackBalance update is deferred to the liquidaciones feature. |
| Parallel change `permitir-edicion-origen-negocio-roles-admin` conflicts with `ModalVerNegocio` | Low | "Ver Negocio" is read-only in this change. If origin-edit lands first, `ModalVerNegocio` can be extended; no conflict on merge. |
| `ANALISTA_SOPORTE` permission change may expose other pre-liquidación actions unintentionally | Low | Audit all pre-liquidación route handlers to ensure the role check covers only intended operations. |
| `fileType` not exposed in `ArchivoDisponible` — column set cannot be determined without it | High (if not fixed) | Explicitly in scope: add `fileType` to the service query and type. |
| Bulk `updateMany` on large record sets within a single transaction may hit DB timeout | Low | Acceptable for initial implementation; add chunking if needed in a follow-up. |
| `lagDate` / `syncDate` nullable fields — null rendered as empty string/dash | Low | Handle in column renderer with a safe fallback. |

---

## Dependencies

- Existing `BusinessViewModal` and `useBusinessDetail` hook (read-only, no changes needed).
- Existing `Modal` component with `size="full"` support.
- Existing `AsyncState<T>` type for hook state management.
- Existing `ConfirmModal` pattern for confirmation dialogs.
- Existing `logAuditEvent` utility in `src/features/auth/lib/audit-logger.ts`.
- Existing `auth()` + role check pattern in API routes.

---

## Success Criteria

- [ ] A user with `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, or `ANALISTA_SOPORTE` role can navigate to `/dashboard/pre-liquidacion/{fileId}` and see the SYNCHRONIZED records for that file.
- [ ] Columns rendered match the file's `fileType` (VOLUNTARIA vs POLIZA sets).
- [ ] Selecting rows and clicking "Liquidar" transitions those records to `SETTLED` after confirmation.
- [ ] Selecting rows and clicking "Rezagar" transitions those records to `LAG` after confirmation.
- [ ] When all records of a file are liquidated, `FileImport.status` becomes `COMPLETED`.
- [ ] Audit log entries are created for each Liquidar and Rezagar operation.
- [ ] "Ver Negocio" opens a full-screen read-only business modal.
- [ ] `ANALISTA_SOPORTE` can access the pre-liquidación section and the new detail page.
- [ ] The existing pre-liquidación bulk flow (SYNCHRONIZED → PRE-SETTLED) continues to work unchanged.
