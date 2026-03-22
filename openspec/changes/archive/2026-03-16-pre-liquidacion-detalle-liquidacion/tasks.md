# Tasks: Detalle de Pre-liquidación con Liquidar/Rezagar por Registro

## Phase 1: Foundation (types, schemas, auth)

- [x] 1.1 In `src/features/pre-liquidacion/types/types.ts`: add `fileType: string | null` to `ArchivoDisponible`; add interfaces `RegistroLiquidacionDetalle` and `RespuestaRegistrosLiquidacion` (archivo + registros) per design Decision 9.
- [x] 1.2 In `src/features/pre-liquidacion/lib/pre-liquidacion-schemas.ts`: add `liquidarRegistrosSchema` (ids array min 1, fileId positive int) and `rezagarRegistrosSchema` (ids array min 1); export inferred types `LiquidarRegistrosInput` and `RezagarRegistrosInput`.
- [x] 1.3 In `src/features/auth/lib/audit-logger.ts`: add `COMMISSION_SETTLED` and `COMMISSION_LAGGED` to the `AuditAction` enum (Decision 10).
- [x] 1.4 In `src/features/auth/lib/permissions.ts`: set `ROLE_PERMISSIONS['ANALISTA_SOPORTE']['liquidaciones']['preliquidacion']` to `true` (Decision 8).

## Phase 2: Service layer (pre-liquidacion.service.ts)

- [x] 2.1 In `obtenerArchivosDisponiblesPreliquidacion`: include `fileType: true` in the FileImport select and map `fileType: archivo.fileType` in the returned objects so the file list exposes fileType (spec: fileType for column set).
- [x] 2.2 Add `obtenerRegistrosParaLiquidacion(fileId: number)` in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`: query FileImport + SettlementCommission where status = 'SYNCHRONIZED'; return `RespuestaRegistrosLiquidacion` with flat `RegistroLiquidacionDetalle[]` (contrato, nombreAsesor, tipo, monto, baseComision, syncDate, lagDate, startDate, endDate, clawbackPercentage, isClawback, etc.) and archivo metadata including fileType (Decision 5).
- [x] 2.3 Add `liquidarRegistros(ids, userId, fileId)` in the same service: single `prisma.$transaction` — updateMany SettlementCommission to SETTLED where id in ids and status SYNCHRONIZED; count remaining SYNCHRONIZED for fileId; if 0, update FileImport.status to COMPLETED; return `{ liquidated, fileCompleted }` (spec: User liquidates selected records; File completes when last SYNCHRONIZED; Non-SYNCHRONIZED ids skipped).
- [x] 2.4 Add `rezagarRegistros(ids, userId)` in the same service: single `prisma.$transaction` — updateMany SettlementCommission to LAG, isLag true, lagDate now() where id in ids and status SYNCHRONIZED; return `{ lagged }` (spec: User rezaga selected records; Rezagar does not complete the file).

## Phase 3: API routes

- [x] 3.1 Create `src/app/api/pre-liquidacion/registros/[fileId]/route.ts`: GET handler — auth + role check (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE); call `obtenerRegistrosParaLiquidacion(fileId)`; return `ApiResponse<RespuestaRegistrosLiquidacion>` (spec: Client requests registros; File with no SYNCHRONIZED returns empty list with archivo metadata).
- [x] 3.2 Create `src/app/api/pre-liquidacion/liquidar/route.ts`: POST handler — auth + role check; validate body with `liquidarRegistrosSchema`; call `liquidarRegistros(ids, userId, fileId)`; fire-and-forget `logAuditEvent(COMMISSION_SETTLED, { ids, fileId })`; return `ApiResponse<{ liquidated, fileCompleted }>` (spec: Audit log created after Liquidar).
- [x] 3.3 Create `src/app/api/pre-liquidacion/rezagar/route.ts`: POST handler — auth + role check; validate body with `rezagarRegistrosSchema`; call `rezagarRegistros(ids, userId)`; fire-and-forget `logAuditEvent(COMMISSION_LAGGED, { ids })`; return `ApiResponse<{ lagged }>` (spec: Audit log created after Rezagar).
- [x] 3.4 In `src/features/negocios/lib/business-api.schemas.ts` and `PUT /api/negocios/[id]`: extend `updateBusinessSchema` with optional `idClientOrigin` (z.number().int().positive()); when body contains only `idClientOrigin` and business status is EMITIDO, allow update of `idClientOrigin` only; validate origin exists and is active (design Decision 7; spec: Edit client origin from Ver Negocio modal when EMITIDO).

## Phase 4: Hooks

- [x] 4.1 Create `src/features/pre-liquidacion/hooks/use-registros-liquidacion.ts`: hook `useRegistrosLiquidacion(fileId)` that fetches GET `/api/pre-liquidacion/registros/{fileId}`; use `AsyncState<RespuestaRegistrosLiquidacion>`; expose registros, archivo, isLoading, error, refetch.
- [x] 4.2 Create `src/features/pre-liquidacion/hooks/use-liquidar-registros.ts`: hook with `AsyncState<{ liquidated, fileCompleted }>`; `execute(ids, fileId)` POSTs to `/api/pre-liquidacion/liquidar` and returns result or null on error.
- [x] 4.3 Create `src/features/pre-liquidacion/hooks/use-rezagar-registros.ts`: hook with `AsyncState<{ lagged }>`; `execute(ids)` POSTs to `/api/pre-liquidacion/rezagar` and returns result or null on error.

## Phase 5: UI components (feature)

- [x] 5.1 Create `src/features/pre-liquidacion/components/RegistrosLiquidacionTable.tsx`: receive `registros`, `fileType`, `selectedIds`, `onSelectionChange`, `onVerNegocio(idBusiness)`; render native HTML table with **checkbox column as the first (leftmost) column** (select-all in header), columns by fileType (VOLUNTARIA vs POLIZA per design Decision 2) **without** Tipo/Tipo Comisión column, row key idSettlementCommission; "Ver negocio" text button in Acciones column with aria-label; use design tokens (border-border, hover:bg-muted/50, text-sm). Page or wrapper SHALL render section header above table by fileType: "PRELIQUIDACIÓN VOLUNTARIA" when fileType === 'VOLUNTARIA', "PRELIQUIDACIÓN POLIZA" otherwise.
- [x] 5.2 Create `src/features/pre-liquidacion/components/BarraAccionesLiquidacion.tsx`: props `selectedCount`, `onLiquidar`, `onRezagar`, `isLiquidando`, `isRezagando`; sticky bar with selected count and Liquidar/Rezagar buttons (disabled when selectedCount === 0 or loading); buttons use shared Button, cursor-pointer, loading state feedback (spec: bulk action bar enabled only when ≥ 1 selected).
- [x] 5.3 Create `src/features/pre-liquidacion/components/ModalConfirmacionLiquidar.tsx`: use shared `ConfirmModal`; props open, onOpenChange, count, onConfirmar, isConfirmando; message "¿Liquidar {count} registro(s) seleccionado(s)? Esta acción los marcará como SETTLED."; confirmText="Liquidar".
- [x] 5.4 Create `src/features/pre-liquidacion/components/ModalConfirmacionRezagar.tsx`: use shared `ConfirmModal`; props open, onOpenChange, count, onConfirmar, isConfirmando; message "¿Rezagar {count} registro(s) seleccionado(s)? Se marcará la fecha de rezagado como hoy."; confirmText="Rezagar".
- [x] 5.5 In `src/features/negocios/components/modals/BusinessViewModal.tsx`: extend with `allowEditOrigin?`, `clientOriginsOptions?`, `onSaveOrigin?`. When allowEditOrigin and business.status === EMITIDO: show origin as **label** on load; footer shows **"Editar origen"** next to **"Cerrar"**. On "Editar origen" click: replace origin with **Select** (options from clientOriginsOptions), footer shows **Guardar** and **Cerrar**; Guardar enabled only when selected value changed; on Guardar call onSaveOrigin(businessId, idClientOrigin) then exit edit mode (spec: Edit client origin from Ver Negocio modal when EMITIDO).
- [x] 5.6 Create `src/features/pre-liquidacion/components/ModalVerNegocio.tsx`: props `idBusiness`, `open`, `onOpenChange`; use `useBusinessDetail(idBusiness)` and `useClientOrigins({ page: 1, pageSize: 100, status: 'active' })`; map origins to `clientOriginsOptions`; render `BusinessViewModal` with `allowEditOrigin`, `clientOriginsOptions`, `onSaveOrigin` that calls `businessService.update(id, { idClientOrigin })`, then refetch and toast success/error (design Decision 7).

## Phase 6: Page and navigation

- [x] 6.1 Create `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx`: Client Component ('use client'); read fileId from useParams(); use useRegistrosLiquidacion(fileId), useLiquidarRegistros(), useRezagarRegistros(); state `selectedIds: Set<number>`; render DetallePreLiquidacionHeader (filename, back link), RegistrosLiquidacionTable, BarraAccionesLiquidacion; on Liquidar/Rezagar open confirmation modal; on confirm call execute then clear selectedIds and refetch (Decision 1, 3).
- [x] 6.2 Create header component for detail page (e.g. inline or `DetallePreLiquidacionHeader`): show filename from archivo, back button to `/dashboard/pre-liquidacion`.
- [x] 6.3 In `src/app/dashboard/pre-liquidacion/components/ListaArchivosDisponibles.tsx`: add "Ver Detalle" button (Eye icon, size sm, variant outline) that calls `router.push(\`/dashboard/pre-liquidacion/${archivo.idFileImport}\`)`; keep existing "Pre-liquidar" button (spec: User navigates from file list to detail).

## Phase 7: Testing and verification

- [x] 7.1 Unit tests: service `obtenerRegistrosParaLiquidacion` returns only SYNCHRONIZED records and correct archivo.fileType; `liquidarRegistros` updates only SYNCHRONIZED ids, sets FileImport COMPLETED when 0 remain; `rezagarRegistros` updates only SYNCHRONIZED ids and does not set FileImport COMPLETED (spec scenarios: File with no SYNCHRONIZED; User liquidates; File completes when last liquidated; File not completed when some remain; Non-SYNCHRONIZED ids skipped; User rezaga; Rezagar does not complete file).
- [x] 7.2 API tests or integration: GET registros returns 403 for unauthorized role; POST liquidar/rezagar validate body and return 403 for wrong role (spec: Unauthorized role cannot call new endpoints); GET registros returns correct shape for ANALISTA_SOPORTE (spec: ANALISTA_SOPORTE can access).
- [x] 7.3 Manual or E2E: navigate from file list to detail; select rows and Liquidar with confirmation; select rows and Rezagar with confirmation; Ver Negocio opens modal; column set switches by fileType (VOLUNTARIA vs POLIZA); checkbox is first column; section header shows PRELIQUIDACIÓN VOLUNTARIA/POLIZA; for EMITIDO business modal shows origin as label and "Editar origen" in footer; click Editar origen shows Select and Guardar/Cerrar; save updates origin and returns to label view; when all records liquidated, fileCompleted true and optional toast/navigation (success criteria from proposal). **Done**: Added `manual-e2e-checklist.md` in this change folder; E2E for detail page can be added in follow-up.

## Phase 8: Cleanup (optional)

- [x] 8.1 Verify no dead code; ensure all new files are colocated under `src/features/pre-liquidacion/` and follow project structure; run type-check and lint.
