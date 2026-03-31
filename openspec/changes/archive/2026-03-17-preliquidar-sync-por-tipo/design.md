# Design: Preliquidar por Archivo en Módulo de Sincronización

## Technical Approach

Extend `CargaHistorial` with two missing fields (`fileType`, `idFileImport: number`), add a role-gated "Preliquidar" button per file card in `HistorialCargasTab` that calls the existing `POST /api/pre-liquidacion/procesar` endpoint, harden that route with an `ALLOWED_ROLES` guard, and update the pre-liquidación detail page to list `PRE-SETTLED` commissions via a new service function + a new API route.

All changes follow existing patterns in the codebase: `AsyncState<T>` for hook state, `ApiResponse<T>` for route responses, Zod schemas for validation, `ALLOWED_ROLES` array + `session.user.role` check for route guards, and `usePreLiquidacion`-style hooks for async calls.

---

## Architecture Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Where to call `/api/pre-liquidacion/procesar` from the sync module | Add `preliquidar(fileImportId, mes)` to `load-file-api.ts` | Inline `fetch` in component | Consistent with existing pattern; `loadFileApi` is the single API client for the load-file feature |
| Deriving `mes` for the procesar call | Derive `YYYY-MM` from `carga.createdAt` (ISO string already on `CargaHistorial`) | Ask user to pick month; use today | File's own load date is the natural period; no UI needed; `createdAt` is already mapped |
| Button loading/error state in `HistorialCargasTab` | Local `Record<string, AsyncState<null>>` keyed by `carga.id` | A single loading flag | Multiple cards can coexist; per-card state prevents cross-card interference |
| Role guard in component | Read `session.user.role` via `useAuthSession`, check against `liquidaciones.preliquidacion` from `ROLE_PERMISSIONS` | Re-fetch permissions from API | Same pattern as `Header.tsx` + `MisNegociosPage.tsx`; zero extra fetch |
| PRE-SETTLED detail: new service function vs reuse existing | New `obtenerComisionesPreliquidadas(fileId)` in `pre-liquidacion.service.ts` | Modify `obtenerRegistrosParaLiquidacion` with a status param | The two queries have different shapes and consumers; separation keeps the service clean |
| New API route for PRE-SETTLED detail | `GET /api/pre-liquidacion/pre-settled/[fileId]` | Add `?status=PRE-SETTLED` param to `/registros/[fileId]` | Separate route keeps the existing route contract intact and maps to the new service unambiguously |
| Detail page hook | New `useComisionesPreliquidadas(fileId)` hook in `pre-liquidacion/hooks/` | Modify `useRegistrosLiquidacion` | Follows the one-hook-per-query pattern; existing hook still used for liquidar/rezagar flow |

---

## Data Flow

### Preliquidar button (sync module)

```
HistorialCargasTab
  → user clicks "Preliquidar" on card (sincronizados > 0 && estado === 'LOAD')
  → ConfirmModal opens
  → on confirm: loadFileApi.preliquidar(idFileImport, mes)
      → POST /api/pre-liquidacion/procesar { fileImportId, mes }
          → ALLOWED_ROLES guard (ADMIN | ASISTENTE_GERENCIA_OPERATIVA)
          → procesarPreLiquidacion(fileImportId, rangoFecha)
              → SettlementCommission SYNCHRONIZED → PRE-SETTLED
              → ComissionDistribution rows created
              → FileImport.preLiquidacionDate set
  → per-card state: loading → success/error
  → on success: refetch() → historial refreshes
```

### PRE-SETTLED detail page

```
/dashboard/pre-liquidacion/[fileId] page
  → useComisionesPreliquidadas(fileId)
      → GET /api/pre-liquidacion/pre-settled/[fileId]
          → ALLOWED_ROLES guard (ADMIN | ASISTENTE_GERENCIA_OPERATIVA | ANALISTA_SOPORTE)
          → obtenerComisionesPreliquidadas(fileId)
              → SettlementCommission where status='PRE-SETTLED' AND idFileImport=fileId
  → renders read-only table of PRE-SETTLED records
  → per-record Liquidar/Rezagar buttons remain but target SYNCHRONIZED status
    (rows are PRE-SETTLED, so these buttons will be disabled — no SYNCHRONIZED rows in this view)
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/load-file/hooks/use-file-history.ts` | Modify | Add `fileType` and `idFileImport: number` to `CargaHistorial`; map from `item.fileType` and `item.idFileImport` |
| `src/features/load-file/lib/load-file-api.ts` | Modify | Add `preliquidar(fileImportId: number, mes: string): Promise<ApiResponse<{ success: boolean; registrosProcesados: number; mensaje: string }>>` |
| `src/features/load-file/components/HistorialCargasTab.tsx` | Modify | Add per-card "Preliquidar" button + `ConfirmModal`; local per-card `preliquidarState` map; role check via `useAuthSession` + `ROLE_PERMISSIONS` |
| `src/app/api/pre-liquidacion/procesar/route.ts` | Modify | Add `ALLOWED_ROLES = [UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA]` guard after auth check (same pattern as `registros/[fileId]/route.ts`) |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | Add `obtenerComisionesPreliquidadas(fileId: number)` — queries `SettlementCommission` where `status = 'PRE-SETTLED'` and `idFileImport = fileId`; returns `RespuestaRegistrosLiquidacion` shape |
| `src/app/api/pre-liquidacion/pre-settled/[fileId]/route.ts` | Create | `GET` handler: auth + ALLOWED_ROLES guard; calls `obtenerComisionesPreliquidadas`; returns `ApiResponse<RespuestaRegistrosLiquidacion>` |
| `src/features/pre-liquidacion/hooks/use-comisiones-preliquidadas.ts` | Create | `useComisionesPreliquidadas(fileId)` — same `AsyncState<T>` + `useCallback` + `useEffect` pattern as `useRegistrosLiquidacion` but calls `/api/pre-liquidacion/pre-settled/[fileId]` |
| `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` | Modify | Import and use `useComisionesPreliquidadas` instead of (or alongside) `useRegistrosLiquidacion`; update heading and empty-state copy to reflect PRE-SETTLED context |
| `src/app/dashboard/pre-liquidacion/page.tsx` | Modify | Stats panel: "Total Registros" now sums `registrosPreliquidados`; "Sincronizados" card removed; "Limpiar" filter button removed; grid reduced to 3 columns. Table title changed to "Archivos pendientes para validar la Pre-Liquidación". Filter: only shows files with `registrosPreliquidados > 0` (PRE-SETTLED only, not SYNCHRONIZED). |
| `src/app/dashboard/pre-liquidacion/components/ListaArchivosDisponibles.tsx` | Modify | "Cantidad de Registros" column now renders `archivo.registrosPreliquidados ?? 0` instead of `archivo.cantidadRegistros`. |

---

## Interfaces / Contracts

```typescript
// Addition to CargaHistorial (use-file-history.ts)
interface CargaHistorial {
  // ... existing fields ...
  fileType: 'POLIZA' | 'VOLUNTARIA' | string
  idFileImport: number   // numeric (previously only string id)
}

// New API helper (load-file-api.ts)
preliquidar(
  fileImportId: number,
  mes: string   // 'YYYY-MM'
): Promise<ApiResponse<{ success: boolean; registrosProcesados: number; mensaje: string }>>

// New service function signature
obtenerComisionesPreliquidadas(fileId: number): Promise<RespuestaRegistrosLiquidacion | null>
// Returns same shape as obtenerRegistrosParaLiquidacion but queries status='PRE-SETTLED'
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `CargaHistorial` mapping includes `fileType` + `idFileImport` | Vitest: test `use-file-history` mapping with mock API response |
| Unit | Button visibility: only when `sincronizados > 0 && estado === 'LOAD'` and role has permission | Vitest + Testing Library: render with varying carga props and mock session |
| Unit | `procesar/route.ts` returns 403 for non-allowed roles | Vitest: mock `auth()` with role=AGENTE, expect 403 |
| Unit | `obtenerComisionesPreliquidadas` queries correct status | Vitest: mock prisma, assert `status: 'PRE-SETTLED'` in where clause |
| Integration | `POST /api/pre-liquidacion/procesar` rejects DEFAULT/AGENTE roles | Vitest integration: call route with unauthorized role mock |
| Integration | `GET /api/pre-liquidacion/pre-settled/[fileId]` returns PRE-SETTLED records | Vitest integration: seed DB fixture, assert response shape |

---

## Migration / Rollout

No database migrations required. No schema changes. The `preLiquidacionDate` and `status` fields on `FileImport` and the `status` field on `SettlementCommission` are already in the Prisma schema. Rollout is safe — all changes are additive or guarded by role checks.

---

## Open Questions

- [ ] Should the "Preliquidar" button label include the file type (e.g., "Preliquidar POLIZA") to distinguish the two types visually? Proposal says plain "Preliquidar" — confirm with UX.
- [ ] The detail page currently shows SYNCHRONIZED records for liquidar/rezagar. After this change, it will show PRE-SETTLED records where those actions are inapplicable. Should the page be split into two views (pre-settled read-only vs liquidar/rezagar SYNCHRONIZED view)? Current proposal keeps one page and hides/disables the action bar when all records are PRE-SETTLED.
