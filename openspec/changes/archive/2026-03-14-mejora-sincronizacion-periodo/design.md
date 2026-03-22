# Design: Mejora Sincronización por Período

## Technical Approach

Additive schema migration + service-layer refactor following the project's Feature-Based Architecture. The existing `file-import/route.ts` calls Prisma directly — this change introduces `file-import.service.ts` to encapsulate all DB access, aligning the feature with the project rule: **API routes must never call Prisma; all DB access goes through feature services**.

New nullable columns (`month`, `year` on `FileImport`; `resolved`, `resolvedAt` on `FileImportError`; `syncDate` on `SettlementCommission`) preserve backward compatibility with existing rows. Deduplication and period-blocking logic live in `file-import.service.ts`. Counter deltas for re-sync are accumulated per-batch and written via Prisma's `{ increment }` / `{ decrement }` operators inside the same `fileImport.update` call in `process-batch.service.ts`. Error resolution matching is done in the processors using `idFileImport + contract` as the composite key. A pure `file-naming.ts` utility produces the standardized `nameFile`.

---

## Architecture Decisions

### Decision: Dedup Logic Location — Service Layer (not API Route)

**Choice**: New `file-import.service.ts` in `src/features/load-file/services/`

**Alternatives considered**:
- Keep the logic in the API route handler (as the current code does with `prisma.fileImport.create`)
- Inside `process-batch.service.ts` at the time batches are processed

**Rationale**: The project's architecture rule is explicit: **API routes must never call Prisma directly — all DB access goes through feature services** (see `CLAUDE.md` and `src/app/api/CLAUDE.md`). The existing route already violates this rule by calling `prisma.fileImport.create` and `prisma.fileImport.findMany` directly. This change introduces `file-import.service.ts` to:
1. Fix the existing violation (move `create` and `findMany` to the service).
2. Add the new dedup lookup and period-block guard in the correct layer.
3. Keep the route as HTTP-only: auth → Zod validation → service call → response shaping.

`process-batch.service.ts` is not the right place for the guard because the guard runs before any batch is dispatched — it belongs at import initiation time.

---

### Decision: Counter Update Strategy — Increment vs. Recalculate

**Choice**: Prisma `{ increment: delta }` / `{ decrement: delta }` inside the existing `fileImport.update` call at the end of each batch in `process-batch.service.ts`

**Alternatives considered**:
- `$executeRaw` with `SET errorRecord = errorRecord - $1`
- Re-reading all commissions and recalculating totals from scratch after each batch

**Rationale**: `process-batch.service.ts` already uses `{ increment: N }` for all counters on every batch loop. Extending this pattern with a `resolvedErrorsDelta` accumulator per batch (decremented from `errorRecord`, like `errorRecord: { decrement: resolvedErrorsBatch }`) is a zero-friction change. The Prisma increment/decrement operators are atomic at the row level and consistent with the codebase's existing approach. `$executeRaw` would introduce raw SQL, breaking the project's ORM-only convention.

---

### Decision: Error Resolution Matching Key — `idFileImport + contract` vs. `rowNumber`

**Choice**: Match `FileImportError` by `idFileImport + contract`

**Alternatives considered**:
- Match by `rowNumber` alone
- Match by `rowNumber + contract`

**Rationale**: Row order is not guaranteed between re-syncs (a user may reorder rows in the Excel, skip rows, or the file structure may differ slightly). `contract` is the business identifier and is already stored on `FileImportError.contract`. Since deduplication reuses the same `idFileImport` for a period's LOAD import, matching on `idFileImport + contract` is both stable and scoped to the correct period. Rows without a contract (format errors) cannot be resolved by contract match — they remain unresolved until the import is deleted.

---

### Decision: `syncDate` Guard for LAG Records

**Choice**: Explicit `if (status === 'SYNCHRONIZED') { syncDate = new Date() }` guard in each processor's `createSync` private method

**Alternatives considered**:
- A post-process step in `process-batch.service.ts` that updates `syncDate` based on returned status
- A DB trigger

**Rationale**: Each processor (`PolizaProcessor`, `VoluntariaProcessor`) already has a private `createSync()` method that constructs the `settlementCommission.create` data object. Adding `syncDate: new Date()` there is the minimal, localized change. It avoids a second UPDATE round-trip per record. LAG records are created in `createLag()` (Voluntaria) and in the no-business branch (both processors) — those code paths never call `createSync`, so LAG safety is structural, not just a guard comment.

---

### Decision: Spanish Month Name Lookup — Constant Map vs. date-fns Locale

**Choice**: A `SPANISH_MONTHS` constant map in `file-naming.ts`

**Alternatives considered**:
- `date-fns/locale/es` with `format(date, 'MMMM', { locale: es })`
- `Intl.DateTimeFormat` with `'es'` locale

**Rationale**: The project has no existing `date-fns` locale usage. Importing an i18n locale for 12 strings adds bundle weight and a transient dependency. `Intl.DateTimeFormat` output format varies by runtime environment (Node version, OS locale). A 12-entry constant map (`{ 1: 'ENERO', 2: 'FEBRERO', ... }`) is deterministic, zero-dependency, trivially testable, and readable. This matches the project's preference for pure utility functions.

---

### Decision: Period Selector Default — `currentMonth - 1`

**Choice**: Defaults computed at component mount via `new Date()` — `month = currentMonth - 1` (with wraparound for January → December of prior year), `year = currentYear`

**Alternatives considered**:
- Always default to current month
- No defaults (force user selection)

**Rationale**: The proposal specifies month = current − 1 because synchronization files are typically for the *previous* month. January requires year rollback (month = 12, year = current − 1). The state is initialized from `useState` with a computed default, not derived on every render, avoiding stale-closure issues in React 19. The component remains fully controlled (user can override any default).

---

## Data Flow

### New Sync (first upload for a period)

```
User selects: fileType=POLIZA, month=2, year=2026
                      │
      CargarArchivoTab → loadFileApi.initiateImport(fileName, fileType, month, year)
                      │
      POST /api/carga-archivos/file-import
        ├─ auth() + Zod validation (fileType, month, year)
        └─ FileImportService.initiateImport({ fileType, month, year, idUser })
             ├─ Check COMPLETED import? → YES → throw PeriodCompletedError → route returns 409
             ├─ Check LOAD import?      → YES → return { created: false, fileImport } (dedup)
             └─ NO existing             → prisma.fileImport.create({
                                        nameFile: generateSyncFileName('POLIZA', 2, 2026),
                                        month: 2, year: 2026, status: 'PROCESSING'
                                     })
                      │
      CargarArchivoTab → loadFileApi.processBatch(...)  [batches of 50]
                      │
      process-batch.service.ts
        └─ for each record:
             processor.process(record, headers, fileImportId, snapshots, auditContext)
               ├─ SYNCHRONIZED → createSync(..., syncDate: new Date())
               │                 check FileImportError by idFileImport+contract → resolve if found
               ├─ LAG          → createLag(...) [no syncDate]
               └─ ERROR        → createFileImportError(...)
             accumulate: sincronizadoBatch, rezagadoBatch, errorBatch, resolvedErrorsBatch
        └─ prisma.fileImport.update({
               totalRecord:      { increment: batch.length },
               sincronizadoRecord: { increment: sincronizadoBatch + recoveredLagsBatch },
               rezagadoRecord:   { increment: rezagadoBatch },
               errorRecord:      { increment: errorBatch, decrement: resolvedErrorsBatch },
               successRecord:    { increment: sincronizadoBatch + rezagadoBatch + noSincronizadoBatch },
               status:           'LOAD' | 'ERROR'
           })
```

### Re-Sync (second upload for same period — dedup path)

```
User uploads again for POLIZA / month=2 / year=2026
                      │
      POST /api/carga-archivos/file-import
        └─ FileImportService.initiateImport() → LOAD import exists → { created: false, fileImport } (same idFileImport)
                      │
      processBatch proceeds with SAME fileImportId
        └─ For each record where contract had a prior FileImportError:
             processor.process() succeeds → SYNCHRONIZED
             ├─ createSync(..., syncDate: new Date())
             ├─ resolve prior FileImportError:
             │    prisma.fileImportError.updateMany({
             │      where: { idFileImport, contract, resolved: false },
             │      data:  { resolved: true, resolvedAt: new Date() }
             │    })
             └─ resolvedErrorsBatch++
        └─ fileImport.update({ errorRecord: { decrement: resolvedErrorsBatch }, ... })
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `month Int?`, `year Int?` to `FileImport`; add `resolved Boolean @default(false)`, `resolvedAt DateTime?` to `FileImportError`; add `syncDate DateTime? @map("sync_date")` to `SettlementCommission` |
| `prisma/migrations/YYYYMMDD_add_period_sync_fields/migration.sql` | Create | Prisma-generated migration: ALTER TABLE add nullable columns |
| `src/features/load-file/lib/file-naming.ts` | Create | Pure utility: `generateSyncFileName(fileType, month, year): string` with `SPANISH_MONTHS` constant map |
| `src/features/load-file/services/file-import.service.ts` | **Create** | **New service** — all DB access for FileImport: `initiateImport(params)` (dedup + block guard + create), `listFileImports(userId, isAdmin)`. Fixes architectural violation in existing route. |
| `src/app/api/carga-archivos/file-import/route.ts` | Modify | **Remove all Prisma calls.** Route becomes HTTP-only: auth → Zod validation → `FileImportService` call → response shaping. Add Zod schema for `month` (1–12 Int) and `year` (4-digit Int). |
| `src/features/load-file/lib/load-file-api.ts` | Modify | Update `initiateImport` signature to include `month: number, year: number` in the POST body |
| `src/features/load-file/components/CargarArchivoTab.tsx` | Modify | Add `selectedMonth` / `selectedYear` state (use `AsyncState<T>` pattern for blocked-period error); send to `initiateImport`; handle 409 blocked-period error |
| `src/features/load-file/services/process-batch.service.ts` | Modify | Add `resolvedErrorsBatch` accumulators; apply `errorRecord: { decrement: resolvedErrors }` in update; pass resolved-error bookkeeping to processors via result |
| `src/features/load-file/services/processors/voluntaria.processor.ts` | Modify | Add `syncDate: new Date()` to `createSync` data; add `resolveErrors(tx, fileImportId, contract)` call on successful sync; return `resolvedErrors: number` in `ProcessorResult` |
| `src/features/load-file/services/processors/poliza.processor.ts` | Modify | Same as Voluntaria: `syncDate` in `createSync`; error resolution on success; return `resolvedErrors` |
| `src/features/load-file/services/processors/processor.interface.ts` | Modify | Add `resolvedErrors: number` to `ProcessorResult` interface |
| `src/features/load-file/types/load-file.types.ts` | Modify | Add `month?: number`, `year?: number` to `FileImportHistory` |
| `src/features/load-file/__tests__/file-naming.test.ts` | Create | Unit tests for `generateSyncFileName` |
| `src/features/load-file/__tests__/file-import.service.test.ts` | Create | Unit tests: dedup lookup, block-completed guard, `initiateImport` success/error paths |
| `src/features/load-file/__tests__/process-batch.service.test.ts` | Modify | Add tests: error resolution logic, `resolvedErrors` counter, `syncDate` stamping, counter delta with decrement |

---

## Interfaces / Contracts

### `file-naming.ts`

```typescript
// src/features/load-file/lib/file-naming.ts

const SPANISH_MONTHS: Readonly<Record<number, string>> = {
  1:  'ENERO',
  2:  'FEBRERO',
  3:  'MARZO',
  4:  'ABRIL',
  5:  'MAYO',
  6:  'JUNIO',
  7:  'JULIO',
  8:  'AGOSTO',
  9:  'SEPTIEMBRE',
  10: 'OCTUBRE',
  11: 'NOVIEMBRE',
  12: 'DICIEMBRE',
} as const

/**
 * Generates the standardized FileImport name.
 * Example: generateSyncFileName('POLIZA', 2, 2026) → 'SINCRONIZACION-POLIZA-FEBRERO-2026'
 */
export function generateSyncFileName(
  fileType: string,
  month: number,
  year: number
): string {
  const monthName = SPANISH_MONTHS[month]
  if (!monthName) throw new Error(`Invalid month: ${month}`)
  return `SINCRONIZACION-${fileType.toUpperCase()}-${monthName}-${year}`
}
```

---

### Updated `ProcessorResult` interface

```typescript
// src/features/load-file/services/processors/processor.interface.ts
export interface ProcessorResult {
  status: 'SYNCHRONIZED' | 'LAG' | 'ERROR'
  isLag: boolean
  idBusiness: number | null
  recoveredLag: boolean
  errorReason?: string
  resolvedErrors: number  // NEW: number of FileImportErrors resolved in this record's processing
}
```

---

### Prisma schema additions (delta)

```prisma
// FileImport
model FileImport {
  // ... existing fields ...
  month  Int? @map("month")   // NEW: sync period month (1–12)
  year   Int? @map("year")    // NEW: sync period year (e.g. 2026)
  // ...
  @@index([fileType, month, year, status])  // NEW: compound index for dedup lookups
}

// FileImportError
model FileImportError {
  // ... existing fields ...
  resolved   Boolean   @default(false) @map("resolved")  // NEW
  resolvedAt DateTime? @map("resolved_at")                // NEW
}

// SettlementCommission
model SettlementCommission {
  // ... existing fields ...
  syncDate DateTime? @map("sync_date")  // NEW: set when status = SYNCHRONIZED, null for LAG
}
```

---

### `file-import.service.ts` (new — service contract)

```typescript
// src/features/load-file/services/file-import.service.ts

export type InitiateImportResult =
  | { created: true;  fileImport: FileImport }
  | { created: false; fileImport: FileImport }   // dedup: reusing existing LOAD import

export class FileImportService {
  /** Dedup + block guard + create. Never called from the route directly with Prisma. */
  static async initiateImport(params: {
    fileType: FileType
    month: number
    year: number
    idUser: number
  }): Promise<InitiateImportResult>

  /** List file imports scoped by user or all (admin). Replaces direct Prisma call in GET route. */
  static async listFileImports(params: {
    userId: number
    isAdmin: boolean
  }): Promise<FileImportHistory[]>
}
```

---

### API route POST body — Zod validation (updated contract)

```typescript
// src/app/api/carga-archivos/file-import/route.ts

const createFileImportSchema = z.object({
  fileType: z.enum(['POLIZA', 'VOLUNTARIA']),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
})

// Route delegates entirely to service — no Prisma imports in the route file

// Success response (201 — new import created)
// Success response (200 — existing LOAD import reused, dedup)
// Error response (409 — period already COMPLETED)
// { data: null, error: "El período {month}/{year} ya fue liquidado" }
```

---

### UI state additions in `CargarArchivoTab.tsx`

```typescript
// Computed smart defaults at mount
function getDefaultPeriod(): { month: number; year: number } {
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // 1-based
  if (currentMonth === 1) {
    return { month: 12, year: now.getFullYear() - 1 }
  }
  return { month: currentMonth - 1, year: now.getFullYear() }
}

// New controlled state
const [selectedMonth, setSelectedMonth] = useState<number>(() => getDefaultPeriod().month)
const [selectedYear, setSelectedYear]   = useState<number>(() => getDefaultPeriod().year)
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `generateSyncFileName` — all 12 months, edge cases (invalid month throws) | Vitest, pure function |
| Unit | Dedup lookup in POST route — returns existing `LOAD` import when found | Mock Prisma, assert no `create` called |
| Unit | Block-completed guard in POST route — returns 409 with correct message | Mock Prisma, assert response status + body |
| Unit | `resolvedErrors` accumulator in `process-batch.service.ts` — `errorRecord` decremented correctly | Mock processors returning `resolvedErrors: 1` |
| Unit | `syncDate` set in `createSync` (Voluntaria + Poliza processors) — LAG paths do not set `syncDate` | Mock Prisma `tx.settlementCommission.create`, assert data |
| Unit | Error resolution in processors — `fileImportError.updateMany` called with correct `where` clause when contract matches | Mock `tx.fileImportError.updateMany` |
| Unit | Smart period defaults in `CargarArchivoTab` — January wraps to December/prior year | `getDefaultPeriod()` pure function extraction, Vitest |
| Integration | Full batch flow with re-sync: first sync creates errors, second sync resolves them | Real Prisma against test DB or Prisma mock chain |
| E2E | New period → dedup period → block completed period — full browser flow without regression | Playwright, mock API responses for blocked-period path |

---

## Migration / Rollout

### Step 1: Run Prisma Migration

```bash
npx prisma migrate dev --name add_period_sync_fields
```

This generates and applies a migration that:
- Adds `month INT` (nullable) and `year INT` (nullable) to `file_import`
- Adds compound index `(file_type, month, year, status)` on `file_import`
- Adds `resolved BOOLEAN DEFAULT FALSE` and `resolved_at TIMESTAMPTZ` (nullable) to `file_import_error`
- Adds `sync_date TIMESTAMPTZ` (nullable) to `settlement_commission`

All columns are nullable/have defaults → zero-downtime migration; existing rows are not affected.

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Deploy Code

All changes are backward-compatible. The existing import flow continues to work for rows without `month`/`year`.

### Step 4: Existing Data

Existing `FileImport` rows will have `month = null` and `year = null`. These rows are excluded from dedup lookups (dedup query requires both fields to be non-null). No backfill is needed for current functionality; a backfill script can be created separately if historical period data is needed.

---

## Open Questions

- [ ] Dedup scope: should the `initiateImport` query filter by `idUser` (per-user dedup) or be global? The `FileImport` model has no org/tenant field. Use `idUser` as the scope boundary until multi-tenancy is addressed.
- [ ] HTTP status for dedup: `200` (reusing) vs `201` (new). The client (`CargarArchivoTab`) currently only checks for `error` in the response — the `created: boolean` field in `InitiateImportResult` lets the route choose the status code. Confirm whether the UI should show a distinct "reusing existing import" message.
- [ ] Counter safety: should `errorRecord` be clamped to `Math.max(0, ...)` in the service before calling `{ decrement }` to avoid negative values if resolution counting has a bug?
