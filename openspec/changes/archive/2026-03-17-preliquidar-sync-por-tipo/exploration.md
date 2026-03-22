## Exploration: preliquidar-sync-por-tipo

### Feature Request Summary
"Como usuario quiero que en el módulo de sincronización el usuario administrador y Asistente Operativo de Gerencia puedan preliquidar todos los archivos sincronizados por tipo de archivo. Debe aparecer el botón 'preliquidar' y se lance el proceso de preliquidación de los registros sincronizados. Cuando el usuario ingrese a preliquidación, listar las comisiones en estado PRE-SETTED."

### Current State

#### Sync Module (Carga Archivos)
- **Page**: `/dashboard/carga-archivos` → `src/app/dashboard/carga-archivos/page.tsx`
- **Feature**: `src/features/load-file/`
- Two tabs: "Cargar archivo" (CargarArchivoTab) and "Historial de cargas" (HistorialCargasTab)
- File types: `POLIZA` and `VOLUNTARIA` (defined in `src/features/load-file/lib/file-types.ts`)
- `HistorialCargasTab` shows a list of all uploaded files with their status badges (COMPLETED, PRE-SETTLED, LOAD, ERROR, PROCESSING, PARCIAL, CANCELADO)
- Each file card shows: exitosos, errores, sincronizados, sinRegistro, rezagados
- Currently has: "Ver detalle" button (shows modal with RecordsByStatusView) and "Eliminar" button
- **NO "Preliquidar" button currently exists in this module**

#### Pre-liquidación Module
- **Page**: `/dashboard/pre-liquidacion` → `src/app/dashboard/pre-liquidacion/page.tsx`
- **Feature**: `src/features/pre-liquidacion/`
- The pre-liquidación page currently:
  - Fetches `FileImport` records with status='LOAD' that have SYNCHRONIZED or PRE-SETTLED commissions
  - Shows two tabs: "Pre-liquidar" (files with SYNCHRONIZED records) and "Histórico" (files with PRE-SETTLED records)
  - Each file in "Pre-liquidar" tab has a "Ver Detalle" button → navigates to `/dashboard/pre-liquidacion/[fileId]`
  - Detail page (`src/app/dashboard/pre-liquidacion/[fileId]/page.tsx`) lists SYNCHRONIZED records and allows per-record "Liquidar" or "Rezagar" actions
  - The `procesarPreLiquidacion` function is wired through `POST /api/pre-liquidacion/procesar` but NOT currently triggered from `ListaArchivosDisponibles` — the button there is "Ver Detalle" only

#### Pre-liquidación Service Key Functions
- `obtenerArchivosDisponiblesPreliquidacion()` — fetches LOAD files with SYNCHRONIZED/PRE-SETTLED records
- `procesarPreLiquidacion(fileImportId, rangoFecha)` — transitions SYNCHRONIZED → PRE-SETTLED, creates ComissionDistribution rows, sets preLiquidacionDate
- `liquidarRegistros(ids, userId, fileId)` — per-record: SYNCHRONIZED → SETTLED; updates FileImport to COMPLETED when none remain
- `rezagarRegistros(ids, userId)` — per-record: SYNCHRONIZED → LAG

#### Database Schema (relevant models)
- `FileImport.status`: 'PROCESSING' | 'LOAD' | 'COMPLETED' | 'ERROR' | 'CANCELLED' | 'PRE-SETTLED' | 'SETTLED'
- `FileImport.fileType`: 'POLIZA' | 'VOLUNTARIA'
- `SettlementCommission.status`: 'PENDING' | 'SYNCHRONIZED' | 'LAG' | 'PRE-SETTLED' | 'SETTLED'
- No `FileImport.status = 'PRE-SETTLED'` for a *fully* pre-liquidated file — `preLiquidacionDate` is set but status stays 'LOAD'

#### Roles & Permissions
- `UserRole.ADMIN` — has `cargas.cargaMasiva: true`, `liquidaciones.preliquidacion: true`
- `UserRole.ASISTENTE_GERENCIA_OPERATIVA` — has `cargas.cargaMasiva: true`, `liquidaciones.preliquidacion: true`
- `UserRole.ANALISTA_SOPORTE` — has `cargas.cargaMasiva: false`, `liquidaciones.preliquidacion: true`
- Both target roles already have `liquidaciones.preliquidacion: true`
- No `cargas.preliquidar` permission exists — would need to be added or reuse existing permission

#### Navigation
- "Carga Archivos" menu item is at `/dashboard/carga-archivos` — visible to ADMIN and ASISTENTE_GERENCIA_OPERATIVA (both have `cargas.cargaMasiva: true`)
- "Preliquidación" submenu under "Liquidaciones" → `/dashboard/pre-liquidacion`

#### API Routes (pre-liquidación)
- `GET /api/pre-liquidacion/archivos` — lists available files (no role check beyond auth)
- `POST /api/pre-liquidacion/procesar` — triggers full-file pre-liquidation (no role check beyond auth — only checks `session.user.id`)
- `GET /api/pre-liquidacion/registros/[fileId]` — role-checked: ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE
- `POST /api/pre-liquidacion/liquidar` — per-record liquidation
- `POST /api/pre-liquidacion/rezagar` — per-record rezagar
- `GET /api/pre-liquidacion/detalle/[fileId]` — file detail with calculations
- `GET /api/pre-liquidacion/resultados/[fileId]` — results
- `GET /api/pre-liquidacion/exportar/[fileId]` — export

#### Key Insight: Two Interpretations of the Feature Request
The feature request says TWO things:
1. **In the sync module**: Add a "Preliquidar" button per file (or per file type group) in HistorialCargasTab → trigger `procesarPreLiquidacion`
2. **In pre-liquidación page**: When entering, list commissions with status PRE-SETTLED (currently done partially — histórico tab shows files with PRE-SETTLED records, but the main listing needs confirmation)

The pre-liquidación page ALREADY lists PRE-SETTLED records in the "Histórico" tab. The gap is the "Preliquidar" button in the SYNC MODULE.

### Affected Areas
- `src/features/load-file/components/HistorialCargasTab.tsx` — needs "Preliquidar" button per file card (when `sincronizados > 0` and status is 'LOAD')
- `src/features/load-file/hooks/use-file-history.ts` — CargaHistorial type lacks fileType — needs to be added to support grouping by file type
- `src/features/load-file/lib/load-file-api.ts` — may need a preliquidar API call function
- `src/app/dashboard/pre-liquidacion/page.tsx` — potentially needs to show PRE-SETTLED commissions list more prominently
- `src/app/dashboard/pre-liquidacion/components/ListaArchivosDisponibles.tsx` — may need a "Preliquidar" button alongside "Ver Detalle"
- `src/app/api/pre-liquidacion/procesar/route.ts` — needs role check (currently only checks session, not role)
- `src/features/load-file/types/load-file.types.ts` — FileImportHistory type missing fileType in some contexts

### Missing Data in CargaHistorial
The `use-file-history.ts` hook maps history items but does NOT include:
- `fileType` (POLIZA/VOLUNTARIA) — needed to group by file type
- `idFileImport` as a number (stored as string `id`) — needed for API calls
- `sincronizados` is present, but the field `sincronizadoRecord` maps correctly

The `loadFileApi.getImportHistory` response `FileImportHistory` interface DOES include `fileType` and `idFileImport` — so it's available from the API, just not mapped to `CargaHistorial`.

### Approaches

#### Approach 1: Button in HistorialCargasTab (in the Sync Module)
Add a "Preliquidar" button to each file card in the Historial tab. Visible only when `sincronizados > 0` and `estado === 'LOAD'` and the current user has `preliquidacion` permission.

**Implementation steps:**
1. Add `fileType` and `idFileImport` (as number) to `CargaHistorial` interface and mapping in `use-file-history.ts`
2. Add `preliquidar(fileImportId, mes)` call to `load-file-api.ts` (reuse `/api/pre-liquidacion/procesar`)
3. Add button to each card in `HistorialCargasTab.tsx` with confirmation modal
4. Add permission check in the component using `useAuthSession` + `getRolePermissions`
5. Add role check to `POST /api/pre-liquidacion/procesar` route (ADMIN + ASISTENTE_GERENCIA_OPERATIVA)

- Pros: Directly in the sync workflow; user doesn't need to navigate to a different module
- Cons: Mixes liquidation concerns into the sync module; role-based button visibility needs careful implementation
- Effort: Medium

#### Approach 2: "Preliquidar" Button in Pre-liquidación Page
Add a "Preliquidar" button per file directly in `ListaArchivosDisponibles` (pre-liquidación page, "Pre-liquidar" tab) alongside "Ver Detalle". This allows the same preliquidation process but from the dedicated module.

- Pros: Keeps concerns separated; pre-liquidación is already the right module
- Cons: Doesn't match the feature request exactly (user wants it IN the sync module)
- Effort: Low

#### Approach 3: Both (Combined)
Add button in BOTH places:
- In `HistorialCargasTab` (sync module): "Preliquidar" button per file → triggers `procesarPreLiquidacion`
- In `ListaArchivosDisponibles` (pre-liquidación page): already has "Ver Detalle" → add "Preliquidar" button

- Pros: Covers all workflows
- Cons: Some duplication; more files to change
- Effort: Medium-High

#### Approach 4: Group by File Type in HistorialCargasTab (bulk preliquidar per type)
Add a section or header that groups files by `fileType` (POLIZA vs VOLUNTARIA) and provides a single "Preliquidar todos [POLIZA/VOLUNTARIA]" action that processes all LOAD files of that type.

- Pros: Matches "por tipo de archivo" literally
- Cons: Requires a new bulk API endpoint; more complex UX; existing `procesarPreLiquidacion` is per-file
- Effort: High

### Pre-liquidación Page: PRE-SETTLED Listings
The feature says "cuando el usuario ingrese a preliquidación, listar las comisiones en estado PRE-SETTED [sic: PRE-SETTLED]."

Currently:
- The pre-liquidación page **already shows** a "Histórico" tab with files that have PRE-SETTLED records
- The detail page (`/dashboard/pre-liquidacion/[fileId]`) shows SYNCHRONIZED records for the per-record liquidar/rezagar flow
- There is NO dedicated view that lists `SettlementCommission` records filtered by `status = 'PRE-SETTLED'` in a flat table

This suggests we may also need:
- A new tab or view in `/dashboard/pre-liquidacion` that lists PRE-SETTLED commission records (not just files)
- OR the existing "Histórico" tab already satisfies this if clicking a file opens a detail view showing PRE-SETTLED records

The `obtenerDetallePreLiquidacion` service fetches SYNCHRONIZED records, not PRE-SETTLED. A new query is needed for PRE-SETTLED records.

### Recommendation

**Approach 3 (Combined) + PRE-SETTLED listing enhancement:**

1. **In HistorialCargasTab (sync module)**: Add "Preliquidar" button per file card (when sincronizados > 0 and estado === 'LOAD'). Show only for ADMIN/ASISTENTE_GERENCIA_OPERATIVA. Clicking triggers `procesarPreLiquidacion` via existing API. This matches the user story exactly.

2. **In Pre-liquidación page**: When user enters the module, the existing "Histórico" tab already shows PRE-SETTLED files. Add a detail view that lists individual PRE-SETTLED commission records (new service function: query SettlementCommission where status='PRE-SETTLED' for a given fileId).

3. **Add role guard to `/api/pre-liquidacion/procesar`**: Currently only checks auth. Add ALLOWED_ROLES check for ADMIN + ASISTENTE_GERENCIA_OPERATIVA.

4. **Add fileType and idFileImport to CargaHistorial**: Minor type enhancement.

5. **Consider adding a new API**: `POST /api/pre-liquidacion/procesar-por-tipo` that accepts a `fileType` and month/year, then processes all matching LOAD files of that type in one call — this satisfies the "por tipo de archivo" language literally. But this is optional since the per-file approach also works.

### Risks
- The `procesarPreLiquidacion` function is NOT idempotent — calling it twice on the same file will attempt to process already-PRE-SETTLED records (they get filtered by `status: 'SYNCHRONIZED'` so it's safe, but may return "no registros"). Should handle gracefully.
- Bulk processing by file type could timeout on large datasets (50+ records per file × N files). A per-file approach with UI feedback is safer.
- The `POST /api/pre-liquidacion/procesar` route has no role guard — any authenticated user can call it. This is a security gap to fix.
- `CargaHistorial` type lacks `fileType` and numeric `idFileImport` — must be extended before the button can call the API.
- The feature says "por tipo de archivo" but the actual pre-liquidation is already per-file. The "tipo de archivo" grouping might just mean the button appears in context of the file's type (e.g., "Preliquidar POLIZA" vs "Preliquidar VOLUNTARIA") — not necessarily bulk by type.
- PRE-SETTLED commission listing: requires a new service function and possibly a new API route.

### Ready for Proposal
Yes — the codebase is well understood. All key patterns, types, services, roles, and API routes are identified. Ready for sdd-propose.

### Key Files
- `src/features/load-file/components/HistorialCargasTab.tsx` — primary UI change location
- `src/features/load-file/hooks/use-file-history.ts` — type extension needed
- `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` — core logic (procesarPreLiquidacion exists)
- `src/app/api/pre-liquidacion/procesar/route.ts` — needs role guard
- `src/app/dashboard/pre-liquidacion/page.tsx` — may need PRE-SETTLED listing
- `src/features/auth/lib/permissions.ts` — ROLE_PERMISSIONS (both target roles already have preliquidacion: true)
- `src/features/auth/lib/roles.ts` — UserRole.ADMIN + UserRole.ASISTENTE_GERENCIA_OPERATIVA
- `prisma/schema.prisma` — SettlementCommission.status includes PRE-SETTLED; FileImport.fileType is POLIZA/VOLUNTARIA
