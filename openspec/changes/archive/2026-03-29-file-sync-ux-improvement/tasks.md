# Tasks: file-sync-ux-improvement

## Phase 1: Foundation — Types & Interfaces

- [x] 1.1 In `src/features/load-file/services/file-import.service.ts`: change `status?: string` param to `status?: string[]`; build `{ in: status }` Prisma where clause.
- [x] 1.2 In `src/app/api/carga-archivos/file-import/route.ts`: update Zod schema to accept comma-separated `status` string; split by comma and pass `string[]` to service.

## Phase 2: API Client + Hook

- [x] 2.1 In `src/features/load-file/lib/load-file-api.ts`: rename param `status?: string` → `statuses?: string[]`; join with comma as `status` query param.
- [x] 2.2 In `src/features/load-file/hooks/use-file-history.ts`: rename `status?: string` → `statuses?: string[]`; serialize to stable string for `useEffect` dependency; pass to `loadFileApi`.

## Phase 3: New Sub-components

- [x] 3.1 Create `src/features/load-file/components/ui/FileStatusBadge.tsx`: map each `FileImportStatus` to distinct label + Tailwind color. Fix `LOAD` vs `PRE-SETTLED` visual collision (REQ-7, Bug #3).
- [x] 3.2 Create `src/features/load-file/components/FileImportCard.tsx`: render single file import row with props `carga`, `canDelete`, `canPreliquidar`, `isPreliquidarLoading`, `onDelete`, `onPreliquidar`, `onViewDetail`, `onGoToPreliquidacion`. Delete button rendered only when `canDelete=true`.

## Phase 4: Refactor HistorialCargasTab + Bug Fixes

- [x] 4.1 Add props `allowedStatuses: FileImportStatus[]`, `canDeleteFn?`, `emptyStateDescription?` to `src/features/load-file/components/HistorialCargasTab.tsx`.
- [x] 4.2 Remove status filter dropdown from `HistorialCargasTab`; keep name/month/year filters only (REQ-3).
- [x] 4.3 Replace inline card markup with `<FileImportCard>` and `<FileStatusBadge>` sub-components.
- [x] 4.4 Bug fix line 554: replace `window.location.assign(...)` with `router.push(...)` (Bug #1).
- [x] 4.5 Bug fix line 580–588: change Trash button from `text-red-400` to `text-red-600` (Bug #2).
- [x] 4.6 Fix copies: "IR a PRELIQUIDACIÓN" → "Ir a Pre-liquidación"; "Subir otro y volver al estado inicial" → "Cargar otro archivo" (Bug #4).
- [x] 4.7 Add empty state with descriptive message when list is empty (REQ-2 scenario, REQ-7).

## Phase 5: Page Wiring

- [x] 5.1 In `src/app/dashboard/carga-archivos/page.tsx`: rename tab "Historial de cargas" → "Archivos"; add new "Historial" tab.
- [x] 5.2 Pass `allowedStatuses={['LOAD','PRE-SETTLED']}` to "Archivos" instance and `allowedStatuses={['COMPLETED']}` to "Historial" instance; set `canDeleteFn` accordingly.

## Phase 6: Tests

- [x] 6.1 Unit test `FileStatusBadge`: assert distinct label and class for each status, including `LOAD` ≠ `PRE-SETTLED` (REQ-7 scenario).
- [x] 6.2 Unit test `FileImportCard`: `canDelete=false` hides delete button for `PRE-SETTLED` and `COMPLETED` (REQ-4 scenarios).
- [x] 6.3 Unit test `useFileHistory`: `statuses=['LOAD','PRE-SETTLED']` serializes to `status=LOAD,PRE-SETTLED` in fetch call.
- [x] 6.4 Unit test `listFileImports`: status array builds `{ in: [...] }` Prisma filter correctly.
- [x] 6.5 Integration test `GET /api/carga-archivos/file-import?status=LOAD,PRE-SETTLED`: returns only matching records (REQ-6 multi-status scenario).
- [x] 6.6 Integration test backward compat: `?status=COMPLETED` returns only COMPLETED records (REQ-6 single-value scenario).
