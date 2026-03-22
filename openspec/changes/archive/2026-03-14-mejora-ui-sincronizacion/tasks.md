# Tasks: Mejora UI Sincronización

## Phase 1: Improvement 1 — Local Counter Accumulation (CargarArchivoTab)

- [x] 1.1 In `src/features/load-file/components/CargarArchivoTab.tsx`, locate the `setProcessingProgress` initializer block (line ~283) and confirm it already resets `sincronizado: 0`, `rezagado: 0`, `error: 0` — add a comment marking it as the session reset point.
- [x] 1.2 In `CargarArchivoTab.tsx`, inside the batch `for` loop, replace the existing `setProcessingProgress` call (which only updates `current`) with a functional updater that also accumulates `batchSummary.sincronizado`, `batchSummary.rezagado`, and `batchSummary.error` from `processResponse.data.summary` into `prev.sincronizado`, `prev.rezagado`, and `prev.error`.
- [x] 1.3 In `CargarArchivoTab.tsx`, inside the `pollProgress` setInterval callback, remove the three lines that write `sincronizado`, `rezagado`, and `error` from `fileImportData.sincronizadoRecord`, `fileImportData.rezagadoRecord`, and `fileImportData.errorRecord` into `setProcessingProgress`. Retain only the terminal status detection logic (`COMPLETED / CANCELADO / LOAD / ERROR` → `clearInterval`).
- [x] 1.4 Verify `src/features/load-file/components/ProcessingProgress.tsx` props signature is unchanged (`current`, `total`, `sincronizado`, `rezagado`, `error`, `onCancel`) — no edits needed if confirmed.

## Phase 2: Improvement 2 — Service & API Layer (Server-Side Filters)

- [x] 2.1 In `src/features/load-file/services/file-import.service.ts`, add `Prisma` namespace import: `import { Prisma } from '@prisma/client'`.
- [x] 2.2 In `file-import.service.ts`, extend the `listFileImports` params type to include `month?: number`, `year?: number`, `status?: string`, `search?: string`.
- [x] 2.3 In `file-import.service.ts`, replace the inline `where: isAdmin ? undefined : { idUser: userId }` with a mutable `Prisma.FileImportWhereInput` object; conditionally assign `where.month`, `where.year`, `where.status` (skip when `'ALL'`), and `where.nameFile = { contains: search, mode: 'insensitive' }` only when each param is defined and non-empty.
- [x] 2.4 In `src/app/api/carga-archivos/file-import/route.ts`, change the `GET()` signature from `GET()` to `GET(request: NextRequest)`.
- [x] 2.5 In `route.ts`, add a `getFileImportQuerySchema` Zod schema: `page` (coerce int ≥1, default 1), `limit` (coerce int 1–200, default 100), `month` (coerce int 1–12, optional), `year` (coerce int 2020–2100, optional), `status` (string optional), `search` (string optional).
- [x] 2.6 In `route.ts` GET handler, parse `request.nextUrl.searchParams` with `getFileImportQuerySchema.safeParse(Object.fromEntries(...))`; return 400 if validation fails.
- [x] 2.7 In `route.ts` GET handler, pass validated `month`, `year`, `status`, `search` to `FileImportService.listFileImports({ userId, isAdmin, month, year, status, search })`.
- [x] 2.8 In `src/features/load-file/lib/load-file-api.ts`, add an optional `filters?: { month?: number; year?: number; status?: string; search?: string }` third param to `getImportHistory` (before the existing `config?` param — shift `config?` to fourth position).
- [x] 2.9 In `load-file-api.ts`, replace the hardcoded query string in `getImportHistory` with `URLSearchParams` construction: always set `page` and `limit`; conditionally `set('month', ...)`, `set('year', ...)`, `set('status', ...)` (skip `'ALL'`), `set('search', ...)` from `filters` when non-null/non-empty.

## Phase 3: Improvement 2 — Hook & Component Layer

- [x] 3.1 In `src/features/load-file/hooks/use-file-history.ts`, add import: `import type { AsyncState } from '@/features/shared/types/async-state.types'`.
- [x] 3.2 In `use-file-history.ts`, add the `FileHistoryParams` interface: `{ month?: number; year?: number; status?: string; search?: string }`.
- [x] 3.3 In `use-file-history.ts`, replace the three `useState` declarations (`historial`, `isLoading`, `error`) with a single `useState<AsyncState<CargaHistorial[]>>` initialized to `{ status: 'idle', data: undefined, error: '' }`.
- [x] 3.4 In `use-file-history.ts`, update `fetchHistorial` to accept `params: FileHistoryParams`: set state to `{ status: 'loading', ... }` at start; on success set `{ status: 'success', data: formattedData, error: '' }`; on catch set `{ status: 'error', data: undefined, error: message }`.
- [x] 3.5 In `use-file-history.ts`, update the `useCallback` for `fetchHistorial` to include `params` in its dependency array (or restructure using `useCallback` that accepts params inline).
- [x] 3.6 In `use-file-history.ts`, update the `deleteItem` callback: replace `setHistorial(prev => ...)` with a functional update against the `AsyncState` — when `state.status === 'success'`, set `{ ...state, data: state.data.filter(...) }`.
- [x] 3.7 In `use-file-history.ts`, export derived values from the return object: `historial: state.status === 'success' ? state.data : []`, `isLoading: state.status === 'loading'`, `error: state.status === 'error' ? state.error : null` — preserving the existing destructuring contract for `HistorialCargasTab`.
- [x] 3.8 In `use-file-history.ts`, update the hook signature to `useFileHistory(params: FileHistoryParams = {})` and pass `params` to `loadFileApi.getImportHistory(1, 100, params)`.
- [x] 3.9 In `src/features/load-file/components/HistorialCargasTab.tsx`, remove the `Calendar` import from `lucide-react` (no longer used once date pickers are removed).
- [x] 3.10 In `HistorialCargasTab.tsx`, replace `const [dateStart, setDateStart] = useState('')` and `const [dateEnd, setDateEnd] = useState('')` with `const [mesFilter, setMesFilter] = useState<string>('ALL')` and `const [anioFilter, setAnioFilter] = useState<string>('ALL')`.
- [x] 3.11 In `HistorialCargasTab.tsx`, add a `useDeferredValue` or `useRef`-based 200ms debounce for `searchTerm` — create a `debouncedSearch` value that lags `searchTerm` by 200ms before being passed to `useFileHistory`.
- [x] 3.12 In `HistorialCargasTab.tsx`, update the `useFileHistory` call to pass `{ month: mesFilter !== 'ALL' ? Number(mesFilter) : undefined, year: anioFilter !== 'ALL' ? Number(anioFilter) : undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined, search: debouncedSearch || undefined }`.
- [x] 3.13 In `HistorialCargasTab.tsx`, remove the `filteredHistorial` `useMemo` and the `filteredHistorial` variable entirely; replace all JSX references to `filteredHistorial` with `historial` directly.
- [x] 3.14 In `HistorialCargasTab.tsx`, remove `useMemo` from the React import if it is no longer used after step 3.13.
- [x] 3.15 In `HistorialCargasTab.tsx`, replace the "Desde" date-picker `<div>` block with a `<Select>` for MES: label "Mes", value `mesFilter`, onValueChange `setMesFilter`; options: `<SelectItem value="ALL">Todos</SelectItem>` followed by items 1–12 using `SPANISH_MONTH_NAMES` from `CargarArchivoTab.tsx` (import or redeclare the map locally).
- [x] 3.16 In `HistorialCargasTab.tsx`, replace the "Hasta" date-picker `<div>` block with a `<Select>` for AÑO: label "Año", value `anioFilter`, onValueChange `setAnioFilter`; options: `<SelectItem value="ALL">Todos</SelectItem>` followed by a dynamic range computed as `Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)` where `currentYear = new Date().getFullYear()`.
- [x] 3.17 In `HistorialCargasTab.tsx`, update `handleClearFilters` to reset `mesFilter` to `'ALL'` and `anioFilter` to `'ALL'` instead of `dateStart`/`dateEnd` to `''`.
- [x] 3.18 In `HistorialCargasTab.tsx`, update the "Limpiar filtros" conditional visibility expression: replace `dateStart || dateEnd` with `mesFilter !== 'ALL' || anioFilter !== 'ALL'` in the boolean check for showing the clear button.

## Phase 4: Tests & Verification

- [x] 4.1 Create `src/features/load-file/__tests__/CargarArchivoTab.accumulation.test.tsx`: mock `loadFileApi.processBatch` to return `{ data: { summary: { sincronizado: 3, rezagado: 1, error: 0 } } }` for each of 2 batches; assert that `ProcessingProgress` receives `sincronizado=6`, `rezagado=2`, `error=0` after both batches; assert counters reset to 0 when a new sync session starts (second `handleUpload` call).
- [x] 4.2 Create `src/features/load-file/__tests__/use-file-history.test.ts`: using `renderHook` + `waitFor`, test the full `AsyncState` lifecycle — initial state is `idle`; transitions to `loading` when `fetchHistorial` is called; resolves to `success` with `data: CargaHistorial[]` when `getImportHistory` resolves; resolves to `error` with `error: string` when `getImportHistory` rejects; assert `historial`, `isLoading`, and `error` derived values match expected outcomes per state.
- [x] 4.3 Create `src/features/load-file/__tests__/use-file-history.params.test.ts`: assert that when `useFileHistory({ month: 3, year: 2026, status: 'COMPLETED', search: 'foo' })` is rendered, `loadFileApi.getImportHistory` is called with a `filters` argument containing `{ month: 3, year: 2026, status: 'COMPLETED', search: 'foo' }`; assert re-render with different params triggers a new `getImportHistory` call.
- [x] 4.4 Create `src/features/load-file/__tests__/file-import.service.test.ts` (or add to existing): mock `prisma.fileImport.findMany`; call `listFileImports({ userId: 1, isAdmin: false, month: 3 })` and assert `where` contains `{ idUser: 1, month: 3 }` but NOT `year` or `status`; call with `{ userId: 1, isAdmin: true, year: 2026, status: 'COMPLETED', search: 'test' }` and assert `where` contains `{ year: 2026, status: 'COMPLETED', nameFile: { contains: 'test', mode: 'insensitive' } }` but NOT `idUser`.
- [x] 4.5 Create `src/app/api/carga-archivos/file-import/__tests__/route.test.ts` (or add to existing): call the GET route with `month=13` and assert 400 response; call with `month=3&year=2026` and assert 200 with service called with `{ month: 3, year: 2026 }`; call without any filter params and assert service is called without `month`/`year` keys.
- [x] 4.6 Run `npm run type-check` and resolve any TypeScript errors introduced by the changes (especially the `AsyncState` migration in `use-file-history.ts` and the `Prisma.FileImportWhereInput` construction in `file-import.service.ts`).
- [x] 4.7 Run `npm run lint` and fix any lint warnings/errors in the 6 modified files.
- [x] 4.8 Run `npm run test:unit` — all existing tests must pass; new tests in 4.1–4.5 must pass.
