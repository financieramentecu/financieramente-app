# Design: Mejora UI Sincronización

## Technical Approach

Two independent UI/API-layer improvements applied to the `load-file` feature with no database schema changes:

1. **Improvement 1 — Local counter accumulation**: Remove the coupling between the poll loop and the `sincronizado/rezagado/error` counters in `processingProgress` state. After each `processBatch()` call, extract `processResponse.data.summary` and add its values to running local accumulators. The `pollProgress` setInterval continues to fire only to detect terminal status transitions (COMPLETED / LOAD / ERROR / CANCELADO) and stop itself — it no longer writes counter values.

2. **Improvement 2 — Period-based history filters (server-side)**: Replace the two `<input type="date">` controls (`dateStart` / `dateEnd`) in `HistorialCargasTab.tsx` with Shadcn `<Select>` components for MES (1–12) and AÑO (2020–2030). Filter state ownership moves to the component; `useFileHistory` becomes a dumb fetch hook accepting params. Filtering executes server-side via new Zod-validated query params propagated through the full stack: component → hook → API client → route handler → service → Prisma `where`.

Both improvements are strictly additive with no breaking API contract changes.

---

## Architecture Decisions

### Decision 1: Counter accumulation from batch response, not polling

**Choice**: After each successful `processBatch()` call, accumulate `processResponse.data.summary.sincronizado`, `.rezagado`, and `.error` into local state using a functional updater (`setProcessingProgress(prev => ...)`). Reset accumulators to zero when a new sync session starts (before `pollProgress()` is called).

**Alternatives considered**:
- Keeping the polling-based counter update (current behavior) — rejected because polling reads cumulative DB values that include prior sync sessions.
- Fetching a separate "session counter" endpoint per batch — rejected as over-engineering; `ProcessBatchSummary` already provides per-batch deltas.

**Rationale**: `ProcessBatchSummary` fields (`sincronizado`, `rezagado`, `noSincronizado`, `error`) are already computed by the batch endpoint and returned in the response. Accumulating them locally gives exact per-session totals with zero extra API calls and no race conditions with the poll interval.

---

### Decision 2: Polling loop responsibility narrowed to status detection only

**Choice**: The `pollProgress` setInterval callback must no longer call `setProcessingProgress` with counter values. It reads `fileImportData.status` and clears the interval when a terminal status is observed. All `setProcessingProgress` calls related to `sincronizado/rezagado/error` are removed from the polling callback.

**Alternatives considered**:
- Keeping polling for counters AND adding accumulation (redundant dual-path) — rejected; creates inconsistency when the two sources diverge.
- Removing polling entirely and deriving completion from batch-loop end — rejected because the batch loop may finish while the backend is still writing; polling ensures we catch the final `LOAD`/`ERROR`/`COMPLETED` transition.

**Rationale**: Clear single responsibility: batch loop owns counter accumulation; polling loop owns terminal status detection.

---

### Decision 3: Filter state owned by component, hook is stateless

**Choice**: `mesFilter` (string `'ALL' | '1'...'12'`) and `anioFilter` (string `'ALL' | year`) live as `useState` in `HistorialCargasTab`. They are passed to `useFileHistory(params)` as optional numbers. The hook does not internally manage filter state.

**Alternatives considered**:
- Storing `mes`/`anio` inside `useFileHistory` as state — rejected because it makes the hook opinionated and harder to reuse from other contexts.
- Using a single `filters` object passed to the hook — considered valid but adds indirection. Individual params match the current pattern of the codebase (e.g. `getImportHistory(page, pageSize)`).

**Rationale**: Keeps the hook as a pure async fetch abstraction. The component knows what filters the user has selected; passing them as params makes the data flow explicit and testable.

---

### Decision 4: Migrate `useFileHistory` to `AsyncState<CargaHistorial[]>`

**Choice**: Replace the three separate `useState` calls (`historial`, `isLoading`, `error`) with a single `useState<AsyncState<CargaHistorial[]>>` initialized to `{ status: 'idle', data: undefined, error: '' }`. Use discriminated union transitions: `loading` → `success` | `error`.

**Alternatives considered**:
- Keeping three separate states — rejected because it violates the project architecture rule ("Hooks with async calls MUST use `AsyncState<T>`").
- Using a reducer — valid but the existing pattern in the project uses inline `setState` transitions without a reducer; follow the existing pattern.

**Rationale**: Mandatory per `CLAUDE.md` architecture rules. Also eliminates impossible states (e.g. `isLoading=true` AND `error !== null`). The component already destructures `{ historial, isLoading, error }` — the hook return will expose these as derived values from the `AsyncState`.

---

### Decision 5: Query param names — `month` and `year` (not `mes`/`anio`)

**Choice**: The GET route accepts `month` and `year` as query param names. The Zod schema uses `z.coerce.number().int()`. The API client appends `month=N&year=N`. The component-level state variables use Spanish names (`mesFilter`, `anioFilter`) for UI clarity but the wire protocol uses English.

**Alternatives considered**:
- Using `mes`/`anio` in the query string (Spanish) — rejected to maintain consistency with the Prisma model field names (`month`, `year`) and the existing POST body convention already established in `createFileImportSchema`.

**Rationale**: Prisma model fields are `month` and `year`. The route handler already uses `month`/`year` for POST. Consistency eliminates a translation layer in the service.

---

### Decision 6: `listFileImports` dynamic WHERE construction

**Choice**: Add optional `month?: number`, `year?: number`, `status?: string`, `search?: string` to `listFileImports` params. Build a Prisma `where` object conditionally:

```typescript
const where: Prisma.FileImportWhereInput = isAdmin ? {} : { idUser: userId }
if (month !== undefined) where.month = month
if (year !== undefined) where.year = year
if (status && status !== 'ALL') where.status = status
if (search) where.nameFile = { contains: search, mode: 'insensitive' }
```

**Alternatives considered**:
- Spreading `...params` directly into Prisma `where` — rejected because `isAdmin` still controls the `idUser` filter and the two concerns must not be conflated.
- Separate service methods for filtered vs unfiltered — rejected as unnecessary duplication.

**Rationale**: The current `where: isAdmin ? undefined : { idUser: userId }` pattern is extended naturally. The `search` filter targets `nameFile` using Prisma's case-insensitive `contains` as the proposal specifies.

---

## Data Flow

### Improvement 1: Counter accumulation during sync

```
handleUpload()
  │
  ├── setProcessingProgress({ current: 0, total: N, sincronizado: 0, rezagado: 0, error: 0 })
  │
  ├── pollProgress(fileImportId)  ←── starts setInterval(1000ms)
  │      │
  │      └── on each tick: check status only
  │             if terminal → clearInterval
  │             NOT setting sincronizado/rezagado/error
  │
  └── for each batch (BATCH_SIZE=50):
         │
         ├── processBatch({ fileImportId, records, ... })
         │      └── returns ProcessBatchResponse { summary: { sincronizado, rezagado, error, ... } }
         │
         ├── setProcessingProgress(prev => ({
         │       ...prev,
         │       current: processedCount,
         │       sincronizado: prev.sincronizado + summary.sincronizado,   ← NEW
         │       rezagado: prev.rezagado + summary.rezagado,               ← NEW
         │       error: prev.error + summary.error                         ← NEW
         │   }))
         │
         └── [loop ends]

  ProcessingProgress component reads:
    current, total → progress bar
    sincronizado, rezagado, error → counter cards  (now session-local, not cumulative DB)
```

### Improvement 2: Period filter data flow

```
HistorialCargasTab (component owns filter state)
  │
  ├── mesFilter: 'ALL' | '1'...'12'   (useState)
  ├── anioFilter: 'ALL' | '2020'...'2030'  (useState)
  ├── searchTerm: string              (useState — unchanged)
  ├── statusFilter: string            (useState — unchanged)
  │
  └── useFileHistory({ month, year, status, search })
         │   (derived from component state — 'ALL' becomes undefined)
         │
         └── loadFileApi.getImportHistory(page, pageSize, { month, year, status, search })
                │
                └── GET /api/carga-archivos/file-import
                       ?page=1&limit=100&month=3&year=2026&status=COMPLETED&search=foo
                       │
                       ├── auth() check
                       ├── Zod parse searchParams
                       │     month: z.coerce.number().int().min(1).max(12).optional()
                       │     year:  z.coerce.number().int().min(2020).max(2100).optional()
                       │     status: z.string().optional()
                       │     search: z.string().optional()
                       │
                       └── FileImportService.listFileImports({ userId, isAdmin, month, year, status, search })
                              │
                              └── prisma.fileImport.findMany({
                                    where: {
                                      ...(isAdmin ? {} : { idUser: userId }),
                                      ...(month !== undefined ? { month } : {}),
                                      ...(year !== undefined ? { year } : {}),
                                      ...(status && status !== 'ALL' ? { status } : {}),
                                      ...(search ? { nameFile: { contains: search, mode: 'insensitive' } } : {})
                                    },
                                    orderBy: { createdAt: 'desc' },
                                    include: { user: { select: { name, lastName } } }
                                  })
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/load-file/components/CargarArchivoTab.tsx` | Modify | Remove counter writes from `pollProgress` callback; add accumulation of `summary.sincronizado`, `.rezagado`, `.error` per batch inside the batch loop |
| `src/features/load-file/components/HistorialCargasTab.tsx` | Modify | Replace `dateStart`/`dateEnd` state and date-picker inputs with `mesFilter`/`anioFilter` `<Select>` components; pass filter params to `useFileHistory`; update `filteredHistorial` `useMemo` to drop date-range logic; update `handleClearFilters`; remove `Calendar` icon import if unused |
| `src/features/load-file/hooks/use-file-history.ts` | Modify | Accept `params: { month?: number; year?: number; status?: string; search?: string }` argument; migrate internal state from 3x `useState` to single `AsyncState<CargaHistorial[]>`; update `fetchHistorial` transitions; include params in `useCallback` dependency array; expose derived `historial`, `isLoading`, `error` from `AsyncState` in return value for backward-compatible destructuring |
| `src/features/load-file/lib/load-file-api.ts` | Modify | Extend `getImportHistory` signature: add optional `filters?: { month?: number; year?: number; status?: string; search?: string }` third param; append non-undefined values to the URL query string via `URLSearchParams` |
| `src/app/api/carga-archivos/file-import/route.ts` | Modify | Update `GET` handler signature to `GET(request: NextRequest)`; add `getFileImportQuerySchema` Zod schema; parse `request.nextUrl.searchParams`; pass validated `month`, `year`, `status`, `search` to `FileImportService.listFileImports` |
| `src/features/load-file/services/file-import.service.ts` | Modify | Extend `listFileImports` params to include `month?: number; year?: number; status?: string; search?: string`; build dynamic Prisma `where` using spread pattern; add `Prisma` namespace import for `FileImportWhereInput` type |

---

## Interfaces / Contracts

### `useFileHistory` — new signature

```typescript
// New params type
interface FileHistoryParams {
  month?: number   // 1–12, undefined = no filter
  year?: number    // 2020–2100, undefined = no filter
  status?: string  // e.g. 'COMPLETED', undefined = no filter
  search?: string  // substring match on nameFile, undefined = no filter
}

// Updated hook signature
export function useFileHistory(params: FileHistoryParams = {}): {
  historial: CargaHistorial[]   // derived: state.status === 'success' ? state.data : []
  isLoading: boolean             // derived: state.status === 'loading'
  error: string | null           // derived: state.status === 'error' ? state.error : null
  refetch: () => void
  deleteItem: (id: string) => Promise<boolean>
}
```

### `loadFileApi.getImportHistory` — new signature

```typescript
getImportHistory: async (
  page: number,
  pageSize: number = 10,
  filters?: {
    month?: number
    year?: number
    status?: string
    search?: string
  },
  config?: { signal?: AbortSignal }
): Promise<ApiResponse<PaginatedData<FileImportHistory>>>
```

URL construction:
```typescript
const params = new URLSearchParams()
params.set('page', String(page))
params.set('limit', String(pageSize))
if (filters?.month != null) params.set('month', String(filters.month))
if (filters?.year != null) params.set('year', String(filters.year))
if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status)
if (filters?.search) params.set('search', filters.search)
```

### GET route — new Zod schema

```typescript
const getFileImportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  status: z.string().optional(),
  search: z.string().optional(),
})
```

### `FileImportService.listFileImports` — extended params

```typescript
static async listFileImports(params: {
  userId: number
  isAdmin: boolean
  month?: number
  year?: number
  status?: string
  search?: string
}): Promise<FileImportHistory[]>
```

Prisma `where` construction:

```typescript
const where: Prisma.FileImportWhereInput = isAdmin ? {} : { idUser: userId }
if (month !== undefined) where.month = month
if (year !== undefined) where.year = year
if (status && status !== 'ALL') where.status = status
if (search) where.nameFile = { contains: search, mode: 'insensitive' }
```

### `CargarArchivoTab` — batch loop change (key lines)

```typescript
// After successful processBatch call, inside the batch loop:
const batchSummary = processResponse.data.summary
processedCount += recordsBatch.length

setProcessingProgress((prev) =>
  prev
    ? {
        ...prev,
        current: processedCount,
        sincronizado: prev.sincronizado + batchSummary.sincronizado,
        rezagado: prev.rezagado + batchSummary.rezagado,
        error: prev.error + batchSummary.error,
      }
    : null
)

// pollProgress callback: remove these lines entirely:
// setProcessingProgress((prev) => {
//   if (!prev) return null
//   return {
//     ...prev,
//     sincronizado: fileImportData.sincronizadoRecord || 0,  // REMOVE
//     rezagado: fileImportData.rezagadoRecord || 0,          // REMOVE
//     error: fileImportData.errorRecord || 0,                // REMOVE
//   }
// })
```

### `HistorialCargasTab` — filter state changes

```typescript
// Remove:
const [dateStart, setDateStart] = useState('')
const [dateEnd, setDateEnd] = useState('')

// Add:
const [mesFilter, setMesFilter] = useState<string>('ALL')
const [anioFilter, setAnioFilter] = useState<string>('ALL')

// useFileHistory call becomes:
const { historial, isLoading, error, refetch, deleteItem } = useFileHistory({
  month: mesFilter !== 'ALL' ? Number(mesFilter) : undefined,
  year: anioFilter !== 'ALL' ? Number(anioFilter) : undefined,
  status: statusFilter !== 'ALL' ? statusFilter : undefined,
  search: searchTerm || undefined,
})

// filteredHistorial useMemo: remove date-range filter block.
// Since filtering is now server-side for period/status/search,
// the useMemo can be simplified or removed entirely — historial already contains filtered results.
// Keep useMemo only if any remaining client-side transforms are needed.
```

Note: When period/status/search filtering is moved server-side, `filteredHistorial` and the `useMemo` can be dropped entirely — the component renders `historial` directly. This eliminates the double-filtering risk.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useFileHistory` AsyncState transitions: idle → loading → success / error | `renderHook` + `waitFor`; mock `loadFileApi.getImportHistory` |
| Unit | `useFileHistory` params forwarded to API client | Assert `getImportHistory` called with correct `filters` object when params change |
| Unit | `CargarArchivoTab` counter accumulation | Mock `processBatch` returning known summary values; assert `ProcessingProgress` receives cumulative totals after N batches |
| Unit | `FileImportService.listFileImports` WHERE clause | Mock `prisma.fileImport.findMany`; assert `where` contains `month`/`year`/`status`/`nameFile` only when params are provided |
| Integration | `GET /api/carga-archivos/file-import` Zod validation | Call with `month=13` → expect 400; `month=3&year=2026` → expect 200 |
| Integration | `GET /api/carga-archivos/file-import` filter delegation | Mock service; assert service called with validated params |
| E2E | Historial filter: select MES=3, AÑO=2026 → list updates | Playwright; seed DB with records in different periods |
| E2E | Sync counters: verify counters increment per batch, not cumulative | Playwright; slow-network simulation or mock API |

---

## Migration / Rollout

No migration required. No database schema changes. Both improvements are purely UI and thin API-layer:

- All Prisma `where` additions are additive (optional filters — default behaviour when not passed is identical to current).
- The GET handler change is backward-compatible: existing callers without `month`/`year` params will continue to receive all records.
- The `useFileHistory` `AsyncState` migration does not change the hook's return shape (`historial`, `isLoading`, `error`, `refetch`, `deleteItem`) — `HistorialCargasTab` destructuring is unchanged.

**Rollback**: git revert of the 6 affected files. No data consequences.

---

## Open Questions

All resolved:

- [x] **`filteredHistorial` useMemo**: **Remove entirely.** All filtering is server-side; component renders `historial` directly.
- [x] **AÑO selector range**: **Computed dynamically** — centered on current year (e.g. currentYear - 2 to currentYear + 2).
- [x] **Search debounce**: **200ms** before updating `useFileHistory` params.
- [x] **`noSincronizado`**: Out of scope — `ProcessingProgress.tsx` does not display it.
