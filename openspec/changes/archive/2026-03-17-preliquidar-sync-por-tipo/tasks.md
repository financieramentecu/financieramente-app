# Tasks: Preliquidar por Archivo en Módulo de Sincronización

## Phase 1: Foundation — Types & Mapping

- [x] 1.1 Add `fileType: 'POLIZA' | 'VOLUNTARIA' | string` and `idFileImport: number` to `CargaHistorial` interface in `src/features/load-file/types/load-file.types.ts`
- [x] 1.2 Update mapper in `src/features/load-file/hooks/use-file-history.ts` to populate `fileType` and `idFileImport` from the API response (`item.fileType`, `item.idFileImport`)
- [x] 1.3 Add `preliquidar(fileImportId: number, mes: string): Promise<ApiResponse<{ success: boolean; registrosProcesados: number; mensaje: string }>>` to `src/features/load-file/lib/load-file-api.ts` calling `POST /api/pre-liquidacion/procesar`

## Phase 2: Core Implementation

- [x] 2.1 Add `ALLOWED_ROLES = [UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA]` guard to `src/app/api/pre-liquidacion/procesar/route.ts` — return 403 `{ error: "Forbidden" }` for roles outside the list (place after existing auth/401 check)
- [x] 2.2 Add `obtenerComisionesPreliquidadas(fileId: number): Promise<RespuestaRegistrosLiquidacion | null>` to `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` — queries `SettlementCommission where status='PRE-SETTLED' AND idFileImport=fileId`
- [x] 2.3 Update `disponiblesParaPreliquidar` filter in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` to include files where `registrosPreliquidados > 0` (not just SYNCHRONIZED)
- [x] 2.4 Create `src/app/api/pre-liquidacion/pre-settled/[fileId]/route.ts` — GET handler with auth + ALLOWED_ROLES guard (include ANALISTA_SOPORTE); calls `obtenerComisionesPreliquidadas`; returns `ApiResponse<RespuestaRegistrosLiquidacion>`
- [x] 2.5 Create `src/features/pre-liquidacion/hooks/use-comisiones-preliquidadas.ts` — `useComisionesPreliquidadas(fileId)` using `AsyncState<T>` + `useCallback` + `useEffect`, fetches `GET /api/pre-liquidacion/pre-settled/[fileId]`

## Phase 3: Integration & UI Wiring

- [x] 3.1 Update `src/features/load-file/components/HistorialCargasTab.tsx`: add `preliquidarState: Record<string, AsyncState<null>>` keyed by `carga.id`; add role check via `useAuthSession` + `ROLE_PERMISSIONS[role].liquidaciones.preliquidacion`
- [x] 3.2 In `HistorialCargasTab.tsx`: render "Preliquidar" button per card — visible only when `sincronizados > 0 && estado === 'LOAD'` and user has permission; button disabled + spinner while `preliquidarState[id]` is `loading`
- [x] 3.3 In `HistorialCargasTab.tsx`: wire `ConfirmModal` on button click; on confirm call `loadFileApi.preliquidar(carga.idFileImport, mes)` deriving `mes` from `carga.createdAt`; on success call `refetch()` + success toast; on error show error toast and re-enable button
- [x] 3.4 Update `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx`: replace `useRegistrosLiquidacion` with `useComisionesPreliquidadas`; update table heading and empty-state copy to reflect PRE-SETTLED status; disable Liquidar/Rezagar action buttons (rows are PRE-SETTLED, not SYNCHRONIZED)
- [x] 3.5 Update `src/app/dashboard/pre-liquidacion/page.tsx`: remove "Sincronizados" stat card (grid 4→3 columns); change "Total Registros" to sum `registrosPreliquidados`; remove "Limpiar" filter button; update table title to "Archivos pendientes para validar la Pre-Liquidación"; remove `sincronizados` from `resumenFiltrado` computation; update client-side filter to match new data shape
- [x] 3.6 Update `src/app/dashboard/pre-liquidacion/components/ListaArchivosDisponibles.tsx`: "Cantidad de Registros" column renders `archivo.registrosPreliquidados ?? 0` instead of `archivo.cantidadRegistros`; "Ver Detalle" button condition updated to match new availability criteria

## Phase 4: Testing

- [x] 4.1 Unit test `use-file-history.ts` mapping: mock API response with `fileType` and `idFileImport`; assert both fields on resulting `CargaHistorial`
- [x] 4.2 Unit test `HistorialCargasTab`: render with `sincronizados > 0 && estado === 'LOAD'` + authorized role → button visible; render with `sincronizados === 0` → button absent; render with unauthorized role → button absent
- [x] 4.3 Unit test `procesar/route.ts`: mock `auth()` with `role = AGENTE`; expect 403 response; mock with `role = ADMIN`; expect handler to proceed (200 or mock service return)
- [x] 4.4 Unit test `obtenerComisionesPreliquidadas`: mock Prisma client; assert `where: { status: 'PRE-SETTLED', idFileImport: fileId }` is passed; assert empty array returned when no records found
- [x] 4.5 Integration test `GET /api/pre-liquidacion/pre-settled/[fileId]`: seed PRE-SETTLED fixture; assert response shape matches `RespuestaRegistrosLiquidacion`; assert 403 for unauthorized role
- [x] 4.6 Unit test `pre-liquidacion/page.tsx`: assert "Sincronizados" card absent; assert total uses `registrosPreliquidados`; assert "Limpiar" button absent
- [x] 4.7 Unit test `ListaArchivosDisponibles.tsx`: assert "Cantidad de Registros" cell renders `registrosPreliquidados` value

## Phase 5: Cleanup

- [x] 5.1 Update `openspec/changes/preliquidar-sync-por-tipo/state.yaml` to `status: apply_complete` and mark `apply: complete`
- [x] 5.2 Verify no dead imports or unused `AsyncState` variables remain in modified files; run `npm run type-check` and `npm run lint` with zero errors
