# Design: file-sync-ux-improvement

## Technical Approach

Parametrize the existing monolithic `HistorialCargasTab` with `allowedStatuses` and `canDelete` props, then render two instances from `page.tsx` — one for in-process files (`LOAD`, `PRE-SETTLED`) and one for completed files (`COMPLETED`). Extract three sub-components (`FileStatusBadge`, `FileImportCard`, `FileFilterBar`) to reduce the 630-line monolith and enable reuse. Extend the API → hook → service chain to accept comma-separated multi-status filtering, keeping backward compatibility with single-status usage.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Multi-status filter | (A) Two separate fetches; (B) Comma-separated param | **B** | Single request, backward compatible with existing single-status usage; service already uses `{ in: [] }` in Prisma |
| Tab separation | (A) Extract two new components; (B) Parametrize existing | **B** | Reuses all existing modal, badge, and action logic; lower risk of regression |
| Delete guard | (A) Backend only; (B) Frontend only; (C) Both | **C** | Frontend hides button for non-`LOAD` states; backend already validates `INVALID_STATUS` on DELETE route |
| Sub-component extraction | (A) Inline refactor; (B) Separate files | **B** | `FileImportCard` and `FileStatusBadge` are reused by both tab instances |
| Filter panel | Remove status filter dropdown | Status filter removed from both tabs; only name/month/year | Business rule: context is already scoped by tab |

## Data Flow

```
page.tsx
├── CargarArchivoTab          (no changes)
├── HistorialCargasTab        allowedStatuses=['LOAD','PRE-SETTLED'] canDelete=(estado==='LOAD')
│   └── useFileHistory        statuses=['LOAD','PRE-SETTLED']
│       └── loadFileApi       status=LOAD,PRE-SETTLED  (comma-joined)
│           └── GET /api/carga-archivos/file-import?status=LOAD,PRE-SETTLED
│               └── FileImportService.listFileImports({ status: ['LOAD','PRE-SETTLED'] })
│                   └── prisma.fileImport.findMany({ where: { status: { in: [...] } } })
└── HistorialCargasTab        allowedStatuses=['COMPLETED'] canDelete=false
    └── useFileHistory        statuses=['COMPLETED']
        └── ... same chain with status=COMPLETED
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/load-file/components/ui/FileStatusBadge.tsx` | **Create** | Maps `FileImportStatus` → badge color/label. Fixes LOAD/PRE-SETTLED visual collision. |
| `src/features/load-file/components/FileImportCard.tsx` | **Create** | Card for a single file import item. Props: `carga`, `canDelete`, `canPreliquidar`, `onDelete`, `onPreliquidar`, `onViewDetail`, `onGoToPreliquidacion`. |
| `src/features/load-file/components/HistorialCargasTab.tsx` | **Modify** | Add props `allowedStatuses`, `canDeleteFn`; remove status filter; use `FileImportCard` and `FileFilterBar`; fix `router.push`, `text-red-600`, copies. |
| `src/features/load-file/hooks/use-file-history.ts` | **Modify** | Change `status?: string` → `statuses?: string[]`; serialize as `statuses.join(',')`. |
| `src/features/load-file/lib/load-file-api.ts` | **Modify** | `getImportHistory`: accept `statuses?: string[]`; join with comma for query param. |
| `src/app/api/carga-archivos/file-import/route.ts` | **Modify** | Zod schema: `status: z.string().optional()` → split by comma → pass string[] to service. |
| `src/features/load-file/services/file-import.service.ts` | **Modify** | `listFileImports`: accept `status?: string[]`; build `{ in: status }` Prisma filter. |
| `src/app/dashboard/carga-archivos/page.tsx` | **Modify** | Add "Historial" tab; rename "Historial de cargas" → "Archivos"; pass `allowedStatuses` per instance. |

## Interfaces / Contracts

```ts
// FileStatusBadge
type FileImportStatus = 'LOAD' | 'PRE-SETTLED' | 'COMPLETED' | 'ERROR' | 'PROCESSING' | 'PARCIAL' | 'CANCELADO'
interface FileStatusBadgeProps {
  status: FileImportStatus
  className?: string
}

// FileImportCard
interface FileImportCardProps {
  carga: CargaHistorial
  canDelete: boolean                   // true ONLY when carga.estado === 'LOAD'
  canPreliquidar: boolean              // true when LOAD + sincronizados > 0
  isPreliquidarLoading: boolean
  onDelete: (id: string) => void
  onPreliquidar: (carga: CargaHistorial) => void
  onViewDetail: (id: number) => void
  onGoToPreliquidacion?: (idFileImport: number) => void
}

// HistorialCargasTab (new props)
interface HistorialCargasTabProps {
  allowedStatuses: FileImportStatus[]
  canDeleteFn?: (carga: CargaHistorial) => boolean  // default: (c) => c.estado === 'LOAD'
  emptyStateDescription?: string
}

// useFileHistory (extended)
interface FileHistoryParams {
  month?: number
  year?: number
  statuses?: string[]    // replaces status?: string
  search?: string
}

// API route query schema (extended)
// status param: comma-separated string → split → passed as string[] to service
// Example: ?status=LOAD,PRE-SETTLED → ['LOAD', 'PRE-SETTLED']
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `FileStatusBadge` renders correct label/color per status | Vitest + Testing Library |
| Unit | `FileImportCard` hides delete button when `canDelete=false` | Vitest + Testing Library |
| Unit | `useFileHistory` serializes `statuses[]` as comma string | Vitest mock fetch |
| Unit | `listFileImports` builds `{ in: [] }` from status array | Vitest mock Prisma |
| Integration | GET `/api/carga-archivos/file-import?status=LOAD,PRE-SETTLED` returns only matching records | Vitest + test DB |
| Integration | DELETE fails for PRE-SETTLED and COMPLETED items (backend guard) | Vitest + test DB |

## Migration / Rollout

No data migrations required. API change is backward compatible (single `status=LOAD` still works). Frontend-only tab split — no feature flags needed. Deploy as a single PR.

## Open Questions

- [ ] Should "Archivos" tab show a badge/counter in the tab label (e.g., "Archivos (3)") to indicate how many files need action? Not in scope per proposal — confirm with stakeholder.
- [ ] Should `FileImportCard` show "Ver detalle" for `PRE-SETTLED` items? Exploration noted this is possible (modal supports it) but was deferred. Confirm scope before implementation.
