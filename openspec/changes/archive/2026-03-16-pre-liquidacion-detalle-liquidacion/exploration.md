# Exploration: Detalle de Pre-liquidación con Liquidar/Rezagar por Registro

## Feature Summary

New page `/dashboard/pre-liquidacion/[file-id]` that shows all `SettlementCommission` records in `SYNCHRONIZED` state for a given file, allowing the user to:
- Select individual records (per-row checkbox, select-all)
- Bulk "Liquidar" (→ `SETTLED`) or "Rezagar" (→ `LAG`) selected records
- View a business detail modal (read + conditional origin edit)
- When all records of a file are liquidated, notify and remove from view

Roles: `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, `ANALISTA_SOPORTE`

---

## 1. Pre-Liquidación Domain

### Feature structure (`src/features/pre-liquidacion/`)

| Path | Purpose |
|---|---|
| `types/types.ts` | All domain types including `ArchivoDisponible`, `RegistroDetallePreLiquidacion`, `RespuestaDetallePreLiquidacion`, `PRE_LIQUIDACION_FLOW` |
| `services/pre-liquidacion.service.ts` | All DB access: `obtenerArchivosDisponiblesPreliquidacion`, `obtenerDetallePreLiquidacion`, `procesarPreLiquidacion`, `aplicarFormulas` |
| `lib/pre-liquidacion-flow.ts` | Pure `deriveFlow` function |
| `lib/pre-liquidacion-schemas.ts` | Zod schemas |
| `hooks/use-pre-liquidacion.ts` | Hook for archive list + process action |
| `hooks/use-resultados-pre-liquidacion.ts` | Hook for PRE-SETTLED results |
| `hooks/use-exportar-pre-liquidacion.ts` | Hook for export |

### Existing page (`src/app/dashboard/pre-liquidacion/page.tsx`)

- Client component with tabs: "Pre-liquidar" and "Histórico"
- "Pre-liquidar" tab shows `ListaArchivosDisponibles` → `onPreLiquidar` triggers confirmation modal → `procesarPreLiquidacion`
- **Current action "Pre-liquidar" processes the entire file** (bulk, all SYNCHRONIZED records)
- `ListaArchivosDisponibles` has a "Pre-liquidar" button per row — this must become "Liquidar" and navigate to `/dashboard/pre-liquidacion/{file-id}`

### Existing API routes (`src/app/api/pre-liquidacion/`)

| Route | Description |
|---|---|
| `GET /archivos` | Returns file list with SYNCHRONIZED+PRE-SETTLED counts |
| `GET /detalle/[fileId]` | Returns `RespuestaDetallePreLiquidacion` — registros, distribución, resumen |
| `POST /procesar` | Processes entire file (all SYNCHRONIZED → PRE-SETTLED) |
| `GET /resultados/[fileId]` | Returns paginated PRE-SETTLED results |
| `GET /exportar/[fileId]` | Exports PRE-SETTLED records |

**Key observation**: The existing `/detalle/[fileId]` already fetches `SYNCHRONIZED` records with full business/user/product data and computes commission distributions. This endpoint is the closest to what the new page needs, but it was designed for the **pre-liquidación confirmation step**, not for the new per-record liquidation workflow.

### Data gaps in `ArchivoDisponible`

- `fileType` (POLIZA / VOLUNTARIA) is **not** currently included in `ArchivoDisponible` type or the service mapping — it must be added to drive column differences on the new page.

---

## 2. SettlementCommission Model

From `prisma/schema.prisma` (line 380):

```
model SettlementCommission {
  idSettlementCommission Int
  idFileImport           Int
  idBusiness             Int?
  contract               String?
  descripcion            String?           // commission type description
  commissionValue        Decimal?
  baseCommission         Decimal?
  discountPercentage     Decimal?
  clawbackPercentage     Decimal?
  originCommission       String?           // 'CARTERA' | others
  commissionType         String            // 'VOLUNTARIA' | 'POLIZA'
  startDate              DateTime?
  endDate                DateTime?
  status                 String            // PENDING, SYNCHRONIZED, LAG, PRE-SETTLED, SETTLED
  isLag                  Boolean
  isClawback             Boolean
  lagDate                DateTime?
  syncDate               DateTime?
  ...relations: fileImport, business, comissionDistributions
}
```

**Status lifecycle (relevant transitions for this feature):**
- `SYNCHRONIZED` → `SETTLED` (Liquidar action — new, not yet implemented)
- `SYNCHRONIZED` → `LAG` (Rezagar action — new, not yet implemented)
- `SYNCHRONIZED` → `PRE-SETTLED` (existing pre-liquidación bulk process)

**Note**: There is currently NO `SETTLED` transition implemented. The status `SETTLED` is mentioned in schema comments but no service method exists for it. This is entirely new work.

**`FileImport.fileType`** — values: `'POLIZA'` | `'VOLUNTARIA'` (from `src/features/load-file/lib/file-types.ts`). This drives which columns to show in the new detail table.

---

## 3. Column Schema by File Type

Per the feature request:

### VOLUNTARIAS columns
`Contrato`, `Nombre Asesor`, `Tipo`, `Monto`, `Base Comisión`, `Fecha Inicio`, `Fecha Fin`, `% Descuento`, `Rezagado`, `Fecha Sincronización`

### POLIZAS columns
`Contrato`, `Nombre Asesor`, `Tipo`, `Monto`, `Base Comisión`, `% Descuento`, `% Clawback`, `Es Clawback`, `Tipo Comisión`, `Rezagado`, `Fecha Sincronización`, `Fecha Rezagado`

### Field mapping from `SettlementCommission`

| Column | Field |
|---|---|
| Contrato | `business.contract` or `sc.contract` |
| Nombre Asesor | `business.user.name + lastName` |
| Tipo / Tipo Comisión | `sc.descripcion` (= commission type text) |
| Monto | `sc.commissionValue` |
| Base Comisión | `sc.baseCommission` |
| Fecha Inicio | `sc.startDate` (VOLUNTARIAS only) |
| Fecha Fin | `sc.endDate` (VOLUNTARIAS only) |
| % Descuento | `sc.discountPercentage` |
| % Clawback | `sc.clawbackPercentage` (POLIZAS only) |
| Es Clawback | `sc.isClawback` (POLIZAS only) |
| Rezagado | `sc.isLag` |
| Fecha Sincronización | `sc.syncDate` |
| Fecha Rezagado | `sc.lagDate` (POLIZAS only) |

---

## 4. Business Form / Modal (Ver Negocio)

### Existing `BusinessViewModal`
- Location: `src/features/negocios/components/modals/BusinessViewModal.tsx`
- Read-only modal using `BusinessEntity` type
- Wraps `Modal` (size `lg`) from `src/features/shared/ui/modal.tsx`

### Existing `Modal` component
- `src/features/shared/ui/modal.tsx` — wraps Shadcn Dialog
- Sizes: `sm | md | lg | xl | full`
- For "full-screen" modal (as requested), use `size="full"` or wrap in a full-screen Dialog variant

### Business edit with origin
- The feature description says: "If `negocio.status === 'EMITIDO'`, enable the origin select for editing"
- Context from `openspec/changes/permitir-edicion-origen-negocio-roles-admin/proposal.md`:
  - Only `ADMINISTRADOR` and `ASISTENTE_GERENCIA_OPERATIVA` can edit origin
  - Backend blocks edit if any `ComissionDistribution` is in `LIQUIDADO` state
  - Frontend: `ClientInfoSection` conditionally enables `clientOrigin` select field
- The "Ver Negocio" action needs to either:
  - Open `BusinessViewModal` (read-only) for all users, OR
  - Open `EditBusinessFormContainer`-like modal for ADMIN/ASISTENTE when status is EMITIDO
- Most ergonomic approach: new `BusinessDetailModal` that is read-only by default, with optional edit for origin field when conditions are met. Reuses `BusinessViewModal` internals + `ClientInfoSection`.

### `useBusinessDetail` hook
- `src/features/negocios/hooks/use-business-detail.ts`
- Takes `id: number | null`, fetches via `businessService.getById(id)`
- Returns `{ business, isLoading, error, refetch }`
- Can be used directly in the row action handler to load business before opening modal

---

## 5. Audit Logging

### Current implementation
- `src/features/auth/lib/audit-logger.ts` — `logAuditEvent(params: AuditLogParams)`
- Calls `prisma.auditLog.create(...)` with fields: `idUser`, `idRole`, `action`, `email`, `ipAddress`, `userAgent`, `details`
- `AuditLog` model: `idAuditLog`, `idUser?`, `idRole?`, `action` (varchar 50), `email?`, `ipAddress?`, `userAgent?`, `details?`, `createdAt`

### Missing audit actions
The `AuditAction` enum does NOT have `COMMISSION_SETTLED`, `COMMISSION_LAGGED`, or similar. New enum values will need to be added:
- `SETTLEMENT_LIQUIDATED` (or `COMMISSION_SETTLED`)
- `SETTLEMENT_LAGGED` (or `COMMISSION_LAGGED`)

### Pattern in use
- API routes call `logAuditEvent` after successful DB mutations
- Fire-and-forget (errors caught with console.error, not thrown)
- `details` field: typically a stringified JSON or descriptive message

---

## 6. Roles & Permissions

### Role enum (`src/features/auth/lib/roles.ts`)
```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  ASISTENTE_GERENCIA_OPERATIVA = 'ASISTENTE_GERENCIA_OPERATIVA',
  ANALISTA_SOPORTE = 'ANALISTA_SOPORTE',
  ...
}
```

### Permission matrix (`src/features/auth/lib/permissions.ts`)
```
liquidaciones.preliquidacion:
  ADMIN:                     true
  ASISTENTE_GERENCIA_OPERATIVA: true
  ANALISTA_SOPORTE:          false  ← NOTE: currently false
  AGENTE:                    false
```

**Important discrepancy**: The feature request says `ANALISTA_SOPORTE` should have access, but `permissions.ts` currently has `liquidaciones.preliquidacion: false` for that role. The `ROLE_PERMISSIONS` for `ANALISTA_SOPORTE` will need updating OR a separate permission key (e.g., `liquidaciones.detalleLiquidacion`) should be added.

### Auth check pattern in API routes
```typescript
const session = await auth()
if (!session?.user) return 401
const userRole = session.user.role?.code
if (![UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA, UserRole.ANALISTA_SOPORTE].includes(userRole)) return 403
```

---

## 7. New Work Required

### A. New page: `/dashboard/pre-liquidacion/[fileId]/page.tsx`
- Server or client component (likely client given interactive table)
- URL: `/dashboard/pre-liquidacion/{file-id}`
- Reads `fileType` from file import to select column set
- Displays table of SYNCHRONIZED records

### B. New API endpoints needed

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/pre-liquidacion/liquidar` | Liquidate selected SettlementCommissions (SYNCHRONIZED → SETTLED) |
| `POST` | `/api/pre-liquidacion/rezagar` | Lag selected SettlementCommissions (SYNCHRONIZED → LAG) |

Or alternatively a single PATCH endpoint:
- `PATCH /api/pre-liquidacion/registros` with `{ ids: number[], action: 'LIQUIDAR' | 'REZAGAR' }`

The existing `/detalle/[fileId]` can be reused or extended to also return `fileType` and `syncDate`/`lagDate` fields.

### C. Service updates needed

**`obtenerDetallePreLiquidacion`** currently returns `RegistroDetallePreLiquidacion` which lacks:
- `syncDate` (needed for Fecha Sincronización column)
- `lagDate` (POLIZAS - Fecha Rezagado)
- `startDate` / `endDate` (VOLUNTARIAS)
- `clawbackPercentage` (POLIZAS)
- `isClawback` flag (POLIZAS)

New service functions:
- `liquidarRegistros(ids: number[], userId: number)` → updates SYNCHRONIZED → SETTLED, creates audit log
- `rezagarRegistros(ids: number[], userId: number)` → updates SYNCHRONIZED → LAG, sets `lagDate`, `isLag = true`, creates audit log
- `verificarArchivoCompleto(fileId: number)` → checks if 0 remaining SYNCHRONIZED records

**`ArchivoDisponible`** needs `fileType` field added.

### D. Type additions needed

```typescript
// New type for the detail page records
interface RegistroLiquidacionDetalle {
  idSettlementCommission: number
  idBusiness: number | null
  contrato: string | null
  nombreAsesor: string
  tipo: string | null        // descripcion
  monto: number | null       // commissionValue
  baseComision: number | null // baseCommission
  fechaInicio: string | null  // startDate (VOLUNTARIAS)
  fechaFin: string | null     // endDate (VOLUNTARIAS)
  pctDescuento: number | null // discountPercentage
  pctClawback: number | null  // clawbackPercentage (POLIZAS)
  esClawback: boolean         // isClawback (POLIZAS)
  tipoComision: string | null // descripcion again or commissionType
  rezagado: boolean           // isLag
  fechaSincronizacion: string | null // syncDate
  fechaRezagado: string | null       // lagDate (POLIZAS)
  estado: string
}
```

### E. UI components needed

1. **`/dashboard/pre-liquidacion/[fileId]/page.tsx`** — new route page
2. **`RegistrosLiquidacionTable`** — table with checkbox selection, chips, bulk action toolbar
3. **`BarraAccionesLiquidacion`** — bulk action bar (Liquidar/Rezagar buttons, disabled until ≥1 selected)
4. **`ModalConfirmacionLiquidar`** — "¿Desea liquidar XX negocio(s)...?"
5. **`ModalConfirmacionRezagar`** — rezagar confirm dialog
6. **`ModalVerNegocio`** — full-screen modal wrapping `BusinessViewModal` (or extended version with conditional origin edit)

### F. Permission update

Add `ANALISTA_SOPORTE` to `preliquidacion: true` in `ROLE_PERMISSIONS`, OR add a new `liquidaciones.verDetalle` sub-permission.

### G. Navigation update

`ListaArchivosDisponibles` "Pre-liquidar" button should become "Liquidar" and navigate to `/dashboard/pre-liquidacion/{fileId}` (via `router.push` or `<Link>`).

---

## 8. Shared Patterns to Follow

### `AsyncState<T>` pattern
- Use `src/features/shared/types/async-state.types.ts` for all async hooks
- Single discriminated state (`idle | loading | success | error`)

### API response
- All routes return `ApiResponse<T>` from `@/features/shared/types/api-response.types.ts`
- Pattern: `{ data: T }` on success, `{ data: null, error: string }` on error

### Modal
- Use `Modal` from `@/features/shared/ui/modal` (`size="full"` for full-screen business form)
- Use `ConfirmModal` for confirm dialogs

### Auth
- `auth()` from `@/lib/auth/nextauth`
- Role check pattern: compare `session.user.role?.code` to `UserRole` enum values

### Transactions
- Use `prisma.$transaction(async (tx) => { ... })` for multi-record mutations
- Prefer one transaction per action call (all selected IDs in one tx)

### Service layer
- Services own all Prisma calls
- API routes: auth check → role check → delegate to service → return `ApiResponse`
- No Prisma in route handlers

---

## 9. Key Risks and Unknowns

1. **No `SETTLED` transition exists yet** — `liquidarRegistros` is entirely new, including any downstream effects (ClawbackBalance update, email notifications, FileImport status change to `COMPLETED`)
2. **File completion logic** — when all SYNCHRONIZED records of a file are liquidated, the file should be removed from pre-liquidación view. This implies FileImport.status → `COMPLETED` (per the existing spec's Block Re-Sync requirement). Need to clarify if rezagar completes a file or only liquidar.
3. **`ANALISTA_SOPORTE` permission gap** — currently this role has `liquidaciones.preliquidacion: false` in the permissions matrix; the feature requires them to have access.
4. **Business detail modal for edit** — the origin-edit feature (`permitir-edicion-origen-negocio-roles-admin`) is in a separate change branch. The new modal should only enable origin editing if that change is already applied.
5. **`fileType` not in `ArchivoDisponible`** — needs to be added to the service and the type to drive column selection on the new page.
6. **Column schema: "Tipo" vs "Tipo Comisión"** — VOLUNTARIAS has "Tipo" and POLIZAS has "Tipo Comisión"; both map to `sc.descripcion`. Clarify if they are semantically the same field.
7. **`lagDate` / `syncDate` precision** — these fields are `DateTime?` in Prisma (nullable). Need to handle null gracefully in the UI.

---

## 10. File Reference Map

| File | Relevance |
|---|---|
| `src/features/pre-liquidacion/types/types.ts` | Extend with new RegistroLiquidacionDetalle type; add fileType to ArchivoDisponible |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Add `liquidarRegistros`, `rezagarRegistros`, `verificarArchivoCompleto`; extend `obtenerDetallePreLiquidacion` |
| `src/app/api/pre-liquidacion/detalle/[fileId]/route.ts` | May need extension or new endpoint for the liquidación page data |
| `src/app/api/pre-liquidacion/liquidar/route.ts` | New — POST endpoint |
| `src/app/api/pre-liquidacion/rezagar/route.ts` | New — POST endpoint |
| `src/app/dashboard/pre-liquidacion/page.tsx` | Modify "Pre-liquidar" button to navigate to new page |
| `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` | New page |
| `src/app/dashboard/pre-liquidacion/components/ListaArchivosDisponibles.tsx` | Modify action button |
| `src/features/auth/lib/audit-logger.ts` | Add `COMMISSION_SETTLED`, `COMMISSION_LAGGED` to `AuditAction` enum |
| `src/features/auth/lib/permissions.ts` | Update `ANALISTA_SOPORTE.liquidaciones.preliquidacion` to `true` |
| `src/features/negocios/components/modals/BusinessViewModal.tsx` | Reuse or extend for "Ver Negocio" |
| `src/features/shared/ui/modal.tsx` | Use `size="full"` for business detail modal |
| `prisma/schema.prisma` | No schema changes expected — SETTLED status already documented |
