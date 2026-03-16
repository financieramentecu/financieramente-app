# Design: Detalle de Pre-liquidación con Liquidar/Rezagar por Registro

## Architecture Overview

This change introduces a new detail page at `/dashboard/pre-liquidacion/[fileId]` with per-record bulk-action capabilities (Liquidar → SETTLED, Rezagar → LAG) on SYNCHRONIZED `SettlementCommission` records. It adds two new POST API endpoints, a new service query function, and extends the existing types. No schema migrations are required.

---

## Decision 1: New Detail Page — Routing and Component Split

**Route**: `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx`

**Pattern**: The page follows the existing project pattern for client-heavy pages (like `src/app/dashboard/pre-liquidacion/page.tsx`). Because all interactivity (checkboxes, row selection, modals) is client-side, the page itself is a Client Component with `'use client'`. No RSC/SSR handoff is needed here — all data is fetched via hooks.

```
/dashboard/pre-liquidacion/[fileId]/page.tsx   (Client Component, 'use client')
  ├── reads fileId from useParams()
  ├── calls useRegistrosLiquidacion(fileId)  → fetches SYNCHRONIZED records + file metadata
  └── renders:
       ├── <DetallePreLiquidacionHeader />   — filename, back button
       ├── <RegistrosLiquidacionTable />     — DataTable, columns by fileType
       └── <BarraAccionesLiquidacion />      — sticky bar, Liquidar/Rezagar buttons
```

The page accepts `fileId` as a route param via `useParams()` (not `props.params`) because it is a Client Component, consistent with React 19 / Next.js 15 app-router patterns.

---

## Decision 2: Table Column Strategy

**Component**: `src/features/pre-liquidacion/components/RegistrosLiquidacionTable.tsx`

The component receives a `fileType: string` prop (from the file metadata returned by the fetch hook). Column sets are defined by fileType; the **checkbox column is placed at the left** (first column) for quick selection. There is **no "Tipo" or "Tipo Comisión" column** in the table — the type is conveyed by a **section header** above the table.

**Section header**: The page (or table wrapper) shows a header by fileType:
- When `fileType === 'VOLUNTARIA'` → **"PRELIQUIDACIÓN VOLUNTARIA"**
- Otherwise (POLIZA, etc.) → **"PRELIQUIDACIÓN POLIZA"**

**VOLUNTARIA columns** (order): Checkbox | Contrato | Nombre Asesor | Monto | Base Comisión | Fecha Inicio | Fecha Fin | % Descuento | Rezagado | Fecha Sincronización | Acciones

**POLIZA columns** (order): Checkbox | Contrato | Nombre Asesor | Monto | Base Comisión | % Descuento | % Clawback | Es Clawback | Rezagado | Fecha Sincronización | Fecha Rezagado | Acciones

**Table implementation**: Use the project's existing plain HTML table pattern (as seen in `ListaArchivosDisponibles.tsx` and the Histórico section) rather than introducing TanStack Table. A native table with a checkbox column on the left is sufficient and consistent.

**Row key**: `idSettlementCommission` (unique per row).

**"Ver negocio" row action**: A **text button** (not an icon) labeled **"Ver negocio"** in the Acciones column that sets `selectedBusinessId` state and opens `ModalVerNegocio`.

---

## Decision 3: Bulk Actions State Management

**Component**: `src/features/pre-liquidacion/components/BarraAccionesLiquidacion.tsx`

State lives in the page component (`/dashboard/pre-liquidacion/[fileId]/page.tsx`) and is passed down as props:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
```

- **Select-all**: a checkbox in the table header toggles all visible row IDs.
- **Row checkbox**: toggles individual ID in the set.
- **Liquidar button**: disabled when `selectedIds.size === 0` or when `liquidarState.status === 'loading'`. On click → open `ModalConfirmacionLiquidar`.
- **Rezagar button**: disabled when `selectedIds.size === 0` or when `rezagarState.status === 'loading'`. On click → open `ModalConfirmacionRezagar`.
- After a successful action, clear `selectedIds` and call `refetch()` from `useRegistrosLiquidacion`.

**BarraAccionesLiquidacion** is a sticky bottom bar (or top action row, consistent with project style) that receives:

```typescript
interface BarraAccionesLiquidacionProps {
  selectedCount: number
  onLiquidar: () => void
  onRezagar: () => void
  isLiquidando: boolean
  isRezagando: boolean
}
```

---

## Decision 4: API Endpoints

### 4a. `GET /api/pre-liquidacion/registros/[fileId]` — NEW

A dedicated endpoint (separate from the existing `/detalle/[fileId]` which returns distribution/summary data for the confirmation step) to return SYNCHRONIZED records for the new detail page.

**File**: `src/app/api/pre-liquidacion/registros/[fileId]/route.ts`

**Response**: `ApiResponse<RespuestaRegistrosLiquidacion>`

```typescript
interface RespuestaRegistrosLiquidacion {
  archivo: {
    idFileImport: number
    nombreArchivo: string
    fileType: string
    usuarioCargo: string
    fechaCarga: string
    totalRegistros: number
    sincronizados: number
  }
  registros: RegistroLiquidacionDetalle[]
}
```

**Why a new endpoint**: The existing `/detalle/[fileId]` runs expensive distribution calculations (applying formulas per record). The new detail page does not need those calculated values — it needs raw field values (`syncDate`, `lagDate`, `startDate`, `endDate`, `clawbackPercentage`, `isClawback`) and a flat record shape optimized for the new table. Reusing the existing endpoint would require returning unnecessary data and complicating the existing confirmation flow.

**Auth**: same `auth()` check; role check: ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE.

---

### 4b. `POST /api/pre-liquidacion/liquidar` — NEW

**File**: `src/app/api/pre-liquidacion/liquidar/route.ts`

**Request body** (Zod validated):
```typescript
{ ids: number[], fileId: number }
```

**Response**: `ApiResponse<{ liquidated: number, fileCompleted: boolean }>`

**Flow**:
1. `auth()` + role check
2. Zod validate: `ids` is `z.array(z.number().int().positive()).min(1)`, `fileId` is `z.number().int().positive()`
3. Call `liquidarRegistros(ids, userId, fileId)`
4. `logAuditEvent({ userId, action: AuditAction.COMMISSION_SETTLED, details: JSON.stringify({ ids, fileId }) })` — fire-and-forget (`.catch(console.error)`)
5. Return `{ data: { liquidated, fileCompleted } }`

---

### 4c. `POST /api/pre-liquidacion/rezagar` — NEW

**File**: `src/app/api/pre-liquidacion/rezagar/route.ts`

**Request body** (Zod validated):
```typescript
{ ids: number[] }
```

**Response**: `ApiResponse<{ lagged: number }>`

**Flow**:
1. `auth()` + role check
2. Zod validate: `ids` is `z.array(z.number().int().positive()).min(1)`
3. Call `rezagarRegistros(ids, userId)`
4. `logAuditEvent({ userId, action: AuditAction.COMMISSION_LAGGED, details: JSON.stringify({ ids }) })` — fire-and-forget
5. Return `{ data: { lagged } }`

---

## Decision 5: Service Layer

**File**: `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` (extended)

### New function: `obtenerRegistrosParaLiquidacion(fileId: number)`

```typescript
export async function obtenerRegistrosParaLiquidacion(
  fileId: number
): Promise<RespuestaRegistrosLiquidacion | null>
```

Queries `FileImport` + `SettlementCommission` where `status = 'SYNCHRONIZED'`. Returns the flat `RegistroLiquidacionDetalle[]` with all columns needed by both VOLUNTARIA and POLIZA views. Includes `business.contract`, `business.user.name/lastName`, plus `syncDate`, `lagDate`, `startDate`, `endDate`, `clawbackPercentage`, `isClawback`, `descripcion` (= Tipo/Tipo Comisión), `commissionValue`, `baseCommission`, `discountPercentage`, `isLag`.

Also fetches `fileImport.fileType` to populate the archivo metadata.

---

### New function: `liquidarRegistros(ids, userId, fileId)`

```typescript
export async function liquidarRegistros(
  ids: number[],
  userId: number,
  fileId: number
): Promise<{ liquidated: number; fileCompleted: boolean }>
```

Wrapped in `prisma.$transaction`:

```
1. prisma.settlementCommission.updateMany({
     where: { idSettlementCommission: { in: ids }, status: 'SYNCHRONIZED' },
     data: { status: 'SETTLED', updatedAt: new Date() }
   })
2. const remaining = await tx.settlementCommission.count({
     where: { idFileImport: fileId, status: 'SYNCHRONIZED' }
   })
3. if (remaining === 0) {
     await tx.fileImport.update({
       where: { idFileImport: fileId },
       data: { status: 'COMPLETED', updatedAt: new Date() }
     })
   }
4. return { liquidated: result.count, fileCompleted: remaining === 0 }
```

**Important**: `updateMany` only transitions records that are still `SYNCHRONIZED`. Any IDs that are not in that status are silently skipped — this prevents double-liquidation. The returned `liquidated` count reflects actual transitions made.

---

### New function: `rezagarRegistros(ids, userId)`

```typescript
export async function rezagarRegistros(
  ids: number[],
  userId: number
): Promise<{ lagged: number }>
```

Wrapped in `prisma.$transaction`:

```
1. prisma.settlementCommission.updateMany({
     where: { idSettlementCommission: { in: ids }, status: 'SYNCHRONIZED' },
     data: { status: 'LAG', isLag: true, lagDate: new Date(), updatedAt: new Date() }
   })
2. return { lagged: result.count }
```

No `FileImport.status` update on rezagar — only full liquidation (0 SYNCHRONIZED remaining) triggers COMPLETED.

---

## Decision 6: FileImport Completion

Handled inside `liquidarRegistros` within the same transaction (see Decision 5). After the `updateMany`, the remaining SYNCHRONIZED count for the same `fileId` is queried. If it equals 0, `FileImport.status` is set to `'COMPLETED'`.

`'COMPLETED'` is an existing valid status per the schema comment (`'PROCESSING', 'LOAD', 'COMPLETED', 'ERROR', 'CANCELLED', 'PRE-SETTLED', 'SETTLED'`). This aligns with `FileImportService.initiateImport` guard that blocks re-sync for COMPLETED periods.

The `fileCompleted: boolean` flag in the API response allows the UI to show a toast notification ("Archivo completamente liquidado") and optionally navigate back to the file list.

---

## Decision 7: Ver Negocio Modal — Origen en label, Editar origen en footer, Select al editar

**Component**: `src/features/pre-liquidacion/components/ModalVerNegocio.tsx`

This is a thin wrapper around the existing `BusinessViewModal`. When opened from the pre-liquidación detail page, the modal shows **all information in labels** (read-only). The origin is shown as a **label** with the value configured for the business. Editing the origin follows the flow below (no navigation to the edit form).

**Flujo de edición de origen**:
1. **Al cargar**: El origen aparece en **label** (texto del origen configurado al negocio, p. ej. `business.clientOrigin.name`). En el **pie del modal** va el botón **Cerrar** y, **solo si el negocio está en estado EMITIDO**, al lado de Cerrar el botón **Editar origen**.
2. **Si el usuario da clic en Editar origen**: El label del origen se **reemplaza por un Select** para cambiar el origen. En el pie del modal aparecen **Guardar** y **Cerrar** (ya no se muestra Editar origen).
3. **Si el usuario elige otro origen y da Guardar**: Se persiste el cambio (`onSaveOrigin`), se hace refetch del negocio y se vuelve a la vista con el origen en label (y de nuevo el botón Editar origen junto a Cerrar si sigue EMITIDO).

**Resumen**:
- Vista inicial: origen en label; footer = `[Editar origen] [Cerrar]` (Editar origen solo si EMITIDO).
- Modo edición: origen en Select; footer = `[Guardar] [Cerrar]`. Guardar solo habilitado si cambió el valor.

**BusinessViewModal extension** (best practices):
- `allowEditOrigin?: boolean` — when true and `business.status === 'EMITIDO'`, show **"Editar origen"** in the **footer**, next to Cerrar. Clicking it sets edit mode: origin area shows **Select**; footer shows **Guardar** and **Cerrar**.
- `clientOriginsOptions?: { value: string; label: string }[]` — options for the Select (e.g. from `useClientOrigins`).
- `onSaveOrigin?: (businessId: number, idClientOrigin: number) => Promise<void>` — called when the user clicks Guardar. After success, parent refetches; modal exits edit mode and shows the updated origin in the label.
- **UX**: Load = label for origin + footer with Editar origen (if EMITIDO) and Cerrar. Edit mode = Select for origin + footer with Guardar and Cerrar. On save success, refetch and return to label view.

**ModalVerNegocio** fetches client origins (e.g. via `useClientOrigins`), passes `allowEditOrigin={true}`, `clientOriginsOptions`, and `onSaveOrigin`. After a successful save, it refetches the business detail.

**API contract**: The backend accepts updates of only `idClientOrigin` when the business status is EMITIDO (`PUT /api/negocios/[id]` with body `{ idClientOrigin: number }`).

---

## Decision 8: Permission Fix

**File**: `src/features/auth/lib/permissions.ts`

Change:
```typescript
[UserRole.ANALISTA_SOPORTE]: {
  ...
  liquidaciones: {
    preliquidacion: false,  // ← change to true
    liquidacion: false,
  },
```

To:
```typescript
  liquidaciones: {
    preliquidacion: true,   // ← FIXED
    liquidacion: false,
  },
```

**Impact audit**: The `preliquidacion` permission is checked in the menu items and any route guards for the pre-liquidación section. No other pre-liquidación actions are affected by this single boolean. The new API endpoints (`/liquidar`, `/rezagar`, `/registros/[fileId]`) have their own explicit role checks, so this permission fix enables navigation access without inadvertently granting access to other endpoints.

---

## Decision 9: ArchivoDisponible Type Extension

**File**: `src/features/pre-liquidacion/types/types.ts`

Add `fileType` to `ArchivoDisponible`:

```typescript
export interface ArchivoDisponible {
  readonly idFileImport: number
  nombreArchivo: string
  usuarioCargo: string
  readonly fechaCarga: string
  fechaPreLiquidacion?: string | null
  cantidadRegistros: number
  totalRegistros: number
  sincronizados: number
  rezagados: number
  estado: string
  registrosPreliquidados?: number
  fileType: string | null   // ← NEW: from FileImport.fileType
}
```

**Service update** in `obtenerArchivosDisponiblesPreliquidacion`: add `fileType: true` to the Prisma `select` block for `FileImport`, and map `fileType: archivo.fileType` in the return object.

**New type** `RegistroLiquidacionDetalle`:

```typescript
export interface RegistroLiquidacionDetalle {
  readonly idSettlementCommission: number
  readonly idBusiness: number | null
  contrato: string | null
  nombreAsesor: string
  tipo: string | null           // descripcion field
  monto: number                 // commissionValue
  baseComision: number          // baseCommission
  porcentajeDescuento: number   // discountPercentage
  porcentajeClawback: number    // clawbackPercentage (0 if null)
  esClawback: boolean           // isClawback
  esRezagado: boolean           // isLag
  fechaSincronizacion: string | null  // syncDate ISO string
  fechaRezagado: string | null        // lagDate ISO string
  fechaInicio: string | null          // startDate ISO string
  fechaFin: string | null             // endDate ISO string
}
```

---

## Decision 10: AuditAction Enum Extension

**File**: `src/features/auth/lib/audit-logger.ts`

Add two values to `AuditAction`:

```typescript
export enum AuditAction {
  // ...existing values...
  COMMISSION_SETTLED = 'COMMISSION_SETTLED',
  COMMISSION_LAGGED = 'COMMISSION_LAGGED',
}
```

The `AuditLog.action` column is `String @db.VarChar(50)` — no schema migration needed. The enum strings `'COMMISSION_SETTLED'` and `'COMMISSION_LAGGED'` (both 18 and 17 chars) fit within the 50-char limit.

---

## New Hooks

### `useRegistrosLiquidacion(fileId: number)`

**File**: `src/features/pre-liquidacion/hooks/use-registros-liquidacion.ts`

Uses `AsyncState<RespuestaRegistrosLiquidacion>` pattern consistent with `usePreLiquidacion`. Fetches `GET /api/pre-liquidacion/registros/{fileId}` on mount. Exposes `registros`, `archivo`, `isLoading`, `error`, `refetch`.

---

### `useLiquidarRegistros()`

**File**: `src/features/pre-liquidacion/hooks/use-liquidar-registros.ts`

```typescript
function useLiquidarRegistros(): {
  execute: (ids: number[], fileId: number) => Promise<{ liquidated: number, fileCompleted: boolean } | null>
  state: AsyncState<{ liquidated: number, fileCompleted: boolean }>
}
```

Uses a single `AsyncState` for status tracking. On call, transitions to `loading`, POSTs to `/api/pre-liquidacion/liquidar`, transitions to `success` or `error`.

---

### `useRezagarRegistros()`

**File**: `src/features/pre-liquidacion/hooks/use-rezagar-registros.ts`

Same pattern as `useLiquidarRegistros` but POSTs to `/api/pre-liquidacion/rezagar` with `{ ids }`.

---

## New Zod Schemas

**File**: `src/features/pre-liquidacion/lib/pre-liquidacion-schemas.ts` (extended)

```typescript
export const liquidarRegistrosSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Debe seleccionar al menos un registro'),
  fileId: z.number().int().positive(),
})

export const rezagarRegistrosSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Debe seleccionar al menos un registro'),
})

export type LiquidarRegistrosInput = z.infer<typeof liquidarRegistrosSchema>
export type RezagarRegistrosInput = z.infer<typeof rezagarRegistrosSchema>
```

---

## Confirmation Modals

Both confirmation modals reuse `ConfirmModal` from `src/features/shared/ui/modal.tsx`:

### `ModalConfirmacionLiquidar`
**File**: `src/features/pre-liquidacion/components/ModalConfirmacionLiquidar.tsx`

```typescript
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onConfirmar: () => void
  isConfirmando: boolean
}
```

Message: `"¿Liquidar {count} registro(s) seleccionado(s)? Esta acción los marcará como SETTLED."`

Uses `ConfirmModal` with `confirmText="Liquidar"` and `destructive={false}`.

---

### `ModalConfirmacionRezagar`
**File**: `src/features/pre-liquidacion/components/ModalConfirmacionRezagar.tsx`

Message: `"¿Rezagar {count} registro(s) seleccionado(s)? Se marcará la fecha de rezagado como hoy."`

Uses `ConfirmModal` with `confirmText="Rezagar"`.

---

## UI/UX y sistema de diseño (buenas prácticas + ui-ux-pro-max)

Esta sección documenta las decisiones de implementación de UI/UX para la página de detalle y sus componentes, combinando las buenas prácticas del proyecto, el sistema de diseño existente y las guías del skill `ui-ux-pro-max`. Refleja el estado **implementado** para referencia de futuros mantenedores.

---

### Feature-Based Architecture

Todos los componentes viven en `src/features/pre-liquidacion/` (components/, hooks/, types/, lib/). No se crean archivos en `src/components/`, `src/services/`, ni en la raíz. Los componentes UI compartidos se consumen desde `src/features/shared/ui/`.

---

### Tabla (`RegistrosLiquidacionTable`)

**Implementación**: Tabla HTML nativa. No se usa TanStack Table ni `DataTable` de shadcn para mantener consistencia con el patrón del proyecto (`ListaArchivosDisponibles`).

**Widths y layout**:
- Columna checkbox: `w-10` fijo (40px). No lleva texto de cabecera, solo el checkbox de select-all.
- Columnas de texto largo (Nombre Asesor, Contrato): ancho automático, el wrapper tiene `overflow-x-auto`.
- Padding uniforme: `py-3 px-4` en `<th>` y `<td>`.
- Cabeceras: `text-sm font-semibold text-foreground`, atributo `scope="col"` para accesibilidad.

**Sticky header**: El wrapper `overflow-x-auto` no tiene `max-h` en la implementación actual; si se requiere scroll vertical con header fijo, agregar `<thead className="sticky top-0 bg-background z-10">`.

**Row hover y zebra striping**:
- Hover state: `hover:bg-muted/50 transition-colors duration-150` aplicado al `<tr>`.
- Zebra striping: **no implementado** (no es patrón del proyecto para este contexto). Si se necesita, agregar `even:bg-muted/20` al `<tr>` de manera consistente con otras tablas.

**Checkbox de selección**:
- Cabecera: `<input type="checkbox" aria-label="Seleccionar todos" className="cursor-pointer rounded border-border" />` — toglea todos los IDs visibles.
- Fila: `<input type="checkbox" aria-label="Seleccionar registro {id}" className="cursor-pointer rounded border-border" />`.
- Estado intermedio (`indeterminate`): no implementado en la iteración actual. Para soporte completo de a11y, considerar el componente `Checkbox` de shadcn (`src/features/shared/ui/checkbox.tsx`) que soporta `checked="indeterminate"` via Radix.

**Columnas condicionales por `fileType`**:
- `VOLUNTARIA`: muestra Fecha Inicio, Fecha Fin; oculta % Clawback, Es Clawback, Fecha Rezagado.
- Otros (POLIZA): muestra % Clawback, Es Clawback, Fecha Rezagado; oculta Fecha Inicio, Fecha Fin.
- El `fileType` llega como prop desde la página; la tabla no hace fetch propio.

**Formato de fechas**: Se usa `isoString.split('T')[0]` para mostrar la parte de fecha. La convención preferida del proyecto es `new Date(isoString).toLocaleDateString('es-ES')` para formato legible (ej. `16/3/2026`). Ambas son aceptables; usar `toLocaleDateString('es-ES')` en futuras iteraciones para consistencia con el resto del dashboard.

**Formato de números**: `Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })` para montos. Porcentajes se multiplican por 100 y se añade `%`.

**Status chips/badges**: En la implementación actual, los valores booleanos (`esRezagado`, `esClawback`) se muestran como texto `"Sí"` / `"No"`. Para mayor claridad visual, pueden reemplazarse por el componente `Badge` de `src/features/shared/ui/badge.tsx`:

```tsx
// Badge semántico para estado Rezagado
{r.esRezagado
  ? <Badge variant="neutral">Rezagado</Badge>
  : <Badge variant="success">Activo</Badge>
}

// Variantes disponibles en badge.tsx:
// success   → bg-emerald-100 text-emerald-800  (estado positivo / SYNCHRONIZED)
// neutral   → bg-slate-200 text-slate-700      (estado neutro / LAG)
// destructive → bg-destructive text-destructive-foreground (SETTLED, error)
// outline   → border text-foreground           (sin relleno)
```

**Estado vacío**: Cuando `registros.length === 0` después de cargar, se debe mostrar `EmptyState` de `src/features/shared/ui/empty-state.tsx`:

```tsx
import { EmptyState } from '@/features/shared/ui/empty-state'
import { FileX } from 'lucide-react'

// Dentro del <tbody> o del wrapper de la tabla:
{registros.length === 0 && (
  <tr>
    <td colSpan={columnCount}>
      <EmptyState
        icon={<FileX className="h-8 w-8" />}
        title="Sin registros sincronizados"
        description="Este archivo no tiene registros en estado SYNCHRONIZED."
      />
    </td>
  </tr>
)}
```

---

### Estado de carga — Skeleton

La página actual muestra texto `"Cargando registros..."` durante `isLoading`. La práctica recomendada del proyecto es usar skeletons para evitar content jumping (reservar espacio visual):

```tsx
// Reemplazar el bloque isLoading en la página con:
import { TableRowsLoadingSkeleton } from '@/features/shared/ui/loading-skeletons'

{isLoading ? (
  <TableRowsLoadingSkeleton rows={5} />
) : (
  // contenido real
)}
```

`TableRowsLoadingSkeleton` está en `src/features/shared/ui/loading-skeletons.tsx` y replica la forma de la tabla (header + filas) sin contenido real. Esto respeta el principio `content-jumping` de ui-ux-pro-max (Priority 3 — Performance).

---

### Barra de acciones (`BarraAccionesLiquidacion`)

**Layout**: `sticky bottom-0 z-10` — barra pegada al fondo de la viewport.
- `border-t border-border bg-background` — continuidad visual con el contenido, sin oscurecer.
- Padding: `py-3 px-4` alineado con el padding de la tabla.

**Bulk toolbar que aparece cuando hay selección**: La barra está siempre visible pero su texto cambia:
- 0 seleccionados: `"Seleccione al menos un registro para liquidar o rezagar"` (en `text-muted-foreground`).
- N seleccionados: `"N registro(s) seleccionado(s)"`.
- Los botones están deshabilitados cuando `selectedCount === 0`.

**Botones de acción**:
- `Button` (variante `default`) → Liquidar. Spinner `Loader2` de Lucide cuando `isLiquidando`.
- `Button` (variante `outline`) → Rezagar. Spinner cuando `isRezagando`.
- `min-h-[44px]` en ambos para cumplir touch target ≥ 44px (ui-ux-pro-max Priority 2).
- `cursor-pointer` explícito en ambos.
- `disabled` = `selectedCount === 0 || isLiquidando || isRezagando`.

---

### Modales de confirmación (`ModalConfirmacionLiquidar` / `ModalConfirmacionRezagar`)

**Implementación actual**: Usan `ConfirmModal` de `src/features/shared/ui/modal.tsx`, que internamente es un Dialog de Radix. No usan `AlertDialog` directamente.

**Alternativa recomendada con AlertDialog** (para acciones destructivas o irreversibles):
El componente `AlertDialog` de `src/features/shared/ui/alert-dialog.tsx` es semánticamente más apropiado para confirmaciones de acciones con consecuencias, ya que usa el rol ARIA `alertdialog` y previene cierre accidental (no se cierra con click fuera). Úsalo cuando la acción sea irreversible:

```tsx
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/features/shared/ui/alert-dialog'

<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar Liquidar</AlertDialogTitle>
      <AlertDialogDescription>
        ¿Liquidar {count} registro(s) seleccionado(s)?
        Esta acción los marcará como SETTLED y no se puede deshacer.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={onConfirmar}
        disabled={isConfirmando}
        className="cursor-pointer"
      >
        {isConfirmando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Liquidar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Nota**: En la implementación actual, `ModalConfirmacionLiquidar` recibe `isConfirmando` como prop pero lo descarta (`_isConfirmando`). Si se migra a `AlertDialog`, conectar ese prop para deshabilitar el botón de confirmación y mostrar spinner.

---

### Modal "Ver Negocio" (`ModalVerNegocio`)

**Implementación**: Delega completamente en `BusinessViewModal` de `src/features/negocios/components/modals/`. El modal maneja internamente el focus trap y cierre con Escape (comportamiento nativo de Radix Dialog).

**Tamaño**: `size="lg"` (por defecto del `BusinessViewModal`). La propuesta mencionaba full-screen — no implementado en esta iteración.

**Edición de origen**: Implementada con `allowEditOrigin`, `clientOriginsOptions` y `onSaveOrigin`. El modal muestra el origen como label; si el negocio es EMITIDO, aparece el botón "Editar origen" en el footer.

**Toast notifications**: `ModalVerNegocio` usa `toast` de `sonner` para feedback de éxito/error al guardar el origen:

```tsx
toast.success('Origen actualizado')
toast.error('Error al actualizar origen', { description: response.error })
```

El `Toaster` de `src/features/shared/ui/sonner.tsx` ya está montado en el layout del dashboard. No es necesario montarlo nuevamente.

**Nota React 19**: `ModalVerNegocio` usa `useMemo` para derivar `clientOriginsOptions`. Con React Compiler activo, `useMemo` es redundante — el compilador memoiza automáticamente. En una refactorización futura, remover el `useMemo` y devolver el array derivado directamente en el render:

```tsx
// En lugar de useMemo:
const clientOriginsOptions =
  originsState.status === 'success' && originsState.data?.origins
    ? originsState.data.origins.map((o) => ({
        value: String(o.idClientOrigin),
        label: o.name,
      }))
    : []
```

---

### Toast notifications (feedback de éxito/error)

Todas las notificaciones usan `toast` de `sonner` importado directamente:

```tsx
import { toast } from 'sonner'

// Éxito tras liquidar
toast.success(`${result.liquidated} registro(s) liquidados correctamente`)

// Éxito tras rezagar
toast.success(`${result.lagged} registro(s) rezagados correctamente`)

// Archivo completamente liquidado
toast.success('Archivo completamente liquidado', {
  description: 'Todos los registros han sido procesados.',
})

// Error genérico
toast.error('Error al procesar', { description: errorMessage })
```

**Nota**: La implementación actual de los hooks (`useLiquidarRegistros`, `useRezagarRegistros`) y de la página no emite toasts — solo actualiza `AsyncState`. Agregar los toasts en los handlers de la página (`handleConfirmarLiquidar`, `handleConfirmarRezagar`) es la iteración recomendada.

---

### React 19 — Patrones aplicados

- No se usan `useMemo` / `useCallback` en `RegistrosLiquidacionTable` ni en `BarraAccionesLiquidacion` — React Compiler maneja la memoización automáticamente.
- `toggleAll` y `toggleOne` son funciones regulares definidas en el cuerpo del componente.
- La excepción documentada es `useMemo` en `ModalVerNegocio` (ver nota arriba) — candidato a eliminar en refactorización futura.
- `AsyncState<T>` de `src/features/shared/types/async-state.types.ts` en todos los hooks de mutación (`useLiquidarRegistros`, `useRezagarRegistros`) y de fetch (`useRegistrosLiquidacion`).

---

### Layout y responsive

- Wrapper de tabla: `<div className="overflow-x-auto">` — evita scroll horizontal no deseado en viewports estrechos.
- La barra de acciones es `sticky bottom-0` — queda visible aunque el usuario haga scroll en la tabla.
- Breakpoints a verificar: 375px, 768px, 1024px, 1440px.
- En 375px la tabla tendrá scroll horizontal — es comportamiento esperado dado el número de columnas.

---

### Tokens del tema

| Uso | Clase |
|-----|-------|
| Borde de tabla y separadores | `border-border` |
| Texto principal en celdas | `text-foreground text-sm` |
| Texto secundario (porcentajes, fechas) | `text-muted-foreground text-sm` |
| Row hover | `hover:bg-muted/50 transition-colors duration-150` |
| Barra de acciones bg | `bg-background` |
| Barra de acciones borde | `border-t border-border` |
| Badge éxito (SYNCHRONIZED) | `bg-emerald-100 text-emerald-800` (variant `success`) |
| Badge neutral (LAG / Rezagado) | `bg-slate-200 text-slate-700` (variant `neutral`) |
| Badge destructivo (SETTLED) | `bg-destructive text-destructive-foreground` |

---

### Aplicación por componente (resumen)

| Componente | Patrones aplicados | Gaps / mejoras pendientes |
|------------|--------------------|---------------------------|
| `RegistrosLiquidacionTable` | HTML nativa, `border-border`, `hover:bg-muted/50 duration-150`, checkbox con `aria-label`, `cursor-pointer`, `scope="col"`, `overflow-x-auto` | Checkbox `indeterminate`, `Badge` para booleanos, `toLocaleDateString('es-ES')`, `EmptyState` cuando vacío |
| `BarraAccionesLiquidacion` | `sticky bottom-0`, `min-h-[44px]`, `cursor-pointer`, spinner `Loader2`, `disabled` durante loading | Toast de éxito/error en handlers de página |
| `ModalConfirmacionLiquidar` / `ModalConfirmacionRezagar` | `ConfirmModal` (Dialog de Radix), mensaje descriptivo | Migrar a `AlertDialog` para acciones irreversibles; conectar `isConfirmando` al botón de confirmar |
| `ModalVerNegocio` | Radix Dialog, focus trap, Escape para cerrar, toast de sonner, `allowEditOrigin` | Remover `useMemo` (React Compiler); size "full-screen" como mejora futura |
| Página `[fileId]/page.tsx` | `useParams()` (Client Component), `AsyncState` vía hooks, estado de selección en `useState<Set<number>>`, error inline | Reemplazar `"Cargando registros..."` con `TableRowsLoadingSkeleton`; agregar toasts en handlers |
| Botón "Ver Detalle" en `ListaArchivosDisponibles` | `Button size="sm" variant="outline"`, icono `Eye` de Lucide, `cursor-pointer`, `router.push(...)` | — |

---

### Pre-entrega — Checklist UI/UX pro max

- [ ] Sin emojis como iconos (solo Lucide SVGs).
- [ ] `cursor-pointer` en todos los elementos clicables (checkboxes, botones, filas si aplica).
- [ ] Hover con `transition-colors duration-150` en filas de la tabla.
- [ ] Modo claro: contraste de texto ≥ 4.5:1 (`text-foreground` y `text-muted-foreground` en contextos no críticos).
- [ ] Focus visible para navegación por teclado (`focus-visible:ring-ring` del Button compartido).
- [ ] Touch targets ≥ 44px en botones de acción (`min-h-[44px]`).
- [ ] `prefers-reduced-motion`: no hay animaciones propias; el wrapper `overflow-x-auto` y los modales Radix respetan las preferencias del sistema.
- [ ] Responsive verificado en 375px, 768px, 1024px, 1440px.
- [ ] Barra de acciones no tapa contenido crítico (es `sticky bottom-0` con altura fija predecible).
- [ ] `EmptyState` cuando `registros.length === 0` (pendiente de implementar).
- [ ] Skeleton de carga en lugar de texto plano (pendiente de implementar en la página).

---

## ListaArchivosDisponibles Modification

**File**: `src/app/dashboard/pre-liquidacion/components/ListaArchivosDisponibles.tsx`

Add a "Ver Detalle" button alongside (or replacing) "Pre-liquidar" for files that have SYNCHRONIZED records:

```typescript
import { useRouter } from 'next/navigation'

// Inside the row's action cell:
<Button
  onClick={() => router.push(`/dashboard/pre-liquidacion/${archivo.idFileImport}`)}
  size="sm"
  variant="outline"
>
  <Eye className="h-4 w-4 mr-2" />
  Ver Detalle
</Button>
```

The existing "Pre-liquidar" button stays to preserve the PRE-SETTLED flow. The "Ver Detalle" button navigates to the new detail page.

---

## File Changes Table

| File | Change Type | Description |
|---|---|---|
| `src/features/pre-liquidacion/types/types.ts` | Modified | Add `fileType` to `ArchivoDisponible`; add `RegistroLiquidacionDetalle`; add `RespuestaRegistrosLiquidacion` |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modified | Add `obtenerRegistrosParaLiquidacion`, `liquidarRegistros`, `rezagarRegistros`; add `fileType` to archive query |
| `src/features/pre-liquidacion/lib/pre-liquidacion-schemas.ts` | Modified | Add `liquidarRegistrosSchema`, `rezagarRegistrosSchema` and inferred types |
| `src/features/auth/lib/audit-logger.ts` | Modified | Add `COMMISSION_SETTLED`, `COMMISSION_LAGGED` to `AuditAction` enum |
| `src/features/auth/lib/permissions.ts` | Modified | Set `ANALISTA_SOPORTE.liquidaciones.preliquidacion = true` |
| `src/app/api/pre-liquidacion/registros/[fileId]/route.ts` | New | GET endpoint returning SYNCHRONIZED records for detail page |
| `src/app/api/pre-liquidacion/liquidar/route.ts` | New | POST endpoint for Liquidar action |
| `src/app/api/pre-liquidacion/rezagar/route.ts` | New | POST endpoint for Rezagar action |
| `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` | New | Detail page — Client Component orchestrating table + action bar |
| `src/features/pre-liquidacion/components/RegistrosLiquidacionTable.tsx` | New | DataTable with checkbox, columns by fileType, Ver Negocio row action |
| `src/features/pre-liquidacion/components/BarraAccionesLiquidacion.tsx` | New | Action bar with Liquidar/Rezagar buttons and selected count |
| `src/features/pre-liquidacion/components/ModalConfirmacionLiquidar.tsx` | New | Confirmation modal for Liquidar |
| `src/features/pre-liquidacion/components/ModalConfirmacionRezagar.tsx` | New | Confirmation modal for Rezagar |
| `src/features/pre-liquidacion/components/ModalVerNegocio.tsx` | New | Wraps BusinessViewModal + useBusinessDetail |
| `src/features/pre-liquidacion/hooks/use-registros-liquidacion.ts` | New | Fetch hook for SYNCHRONIZED records |
| `src/features/pre-liquidacion/hooks/use-liquidar-registros.ts` | New | Mutation hook for Liquidar |
| `src/features/pre-liquidacion/hooks/use-rezagar-registros.ts` | New | Mutation hook for Rezagar |
| `src/app/dashboard/pre-liquidacion/components/ListaArchivosDisponibles.tsx` | Modified | Add "Ver Detalle" navigation button |

---

## Architecture Notes

### What is NOT changing
- `prisma/schema.prisma` — no migrations needed. `SettlementCommission.status` already includes `SETTLED`; `AuditLog.action` is a plain `String`; `FileImport.status` already has `COMPLETED`.
- Existing `/api/pre-liquidacion/detalle/[fileId]` — unchanged; still used by the confirmation step.
- Existing `procesarPreLiquidacion` service — unchanged; PRE-SETTLED flow unaffected.
- `BusinessViewModal` — used as-is (no modifications to shared component).

### Consistency with project patterns
- All hooks use `AsyncState<T>` discriminated union — no ad-hoc `isLoading/data/error` triples.
- All API routes return `ApiResponse<T>` shape.
- All API routes validate input with Zod before calling services.
- Services are the only layer that calls Prisma directly.
- Audit logging is fire-and-forget (`.catch(console.error)`) — does not block the response.
- Table uses project's existing plain HTML table pattern (no TanStack Table introduction).
- UI follows the design system and ui-ux-pro-max guidelines described in the **UI/UX y sistema de diseño** section: shared components, theme tokens, accessibility (focus, aria-label, contrast), touch targets, and pre-delivery checklist.

### Key risks and mitigations

| Risk | Mitigation |
|---|---|
| `fileCompleted: true` toast shown while user is still on page | Show toast + offer navigation back to list; do not auto-redirect |
| `ModalVerNegocio` uses `size="lg"` instead of full-screen | Acceptable for this change; full-screen upgrade tracked as follow-up |
| `ANALISTA_SOPORTE` permission change could affect menu visibility | Verify `preliquidacion` flag is also used to gate the sidebar menu item; confirm no unintended side effects |
| Bulk `updateMany` skips non-SYNCHRONIZED records silently | Return actual `liquidated` count so UI can show "X of Y records liquidated" if needed |
