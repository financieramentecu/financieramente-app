# Design: Business "Novedad" flag for Venta Efectuada

## Technical Approach

Three nullable scalar columns on `Business`, a dedicated action endpoint for mark/unmark, and a conditional write inside the existing PUT transaction for auto-resolution. Presentation reuses the `STATUS_CONFIG` record pattern. No new service layer, no new table.

The field flows through the existing pipeline unchanged: Prisma `Business` → `prismaBusinessToEntity` → `BusinessEntity` → `mapBusinessToTableRow` → `Business` (table row). Both mapper hops must be extended; the second one is not listed in the proposal and is the main discovery of this phase.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Persistence shape | 3 nullable scalars on `Business` (`novedadStatus VarChar(20)`, `novedadMarkedAt`, `novedadResolvedAt`) | Dedicated `BusinessNovedad` 1:N table; native PG enum | No history requirement (out of scope); a 1:N join costs extra selects on a paginated list. Enum lives in TS only, matching the existing `status String? @db.VarChar(20)` convention — avoids a migration-coupled DB enum. |
| Write path | New `PATCH /api/negocios/[id]/mark-novedad` with `{ action: 'MARK' \| 'UNMARK' }` | Reuse generic `PUT /api/negocios/[id]`; two separate routes | The generic PUT already carries heavy derivation logic; adding novedad there would hide preconditions. One route with an explicit action keeps both transitions and their guards in one auditable place, mirroring `cancel/route.ts`. |
| Authorization | Authenticated session only, no role allowlist | Copy `CANCEL_ALLOWED_ROLES` | Product decision: any role that sees the business may flag it. Explicitly documented in the route so a future reader does not read the omission as a bug. |
| Auto-resolution site | Inside the existing `prisma.$transaction` in `PUT /api/negocios/[id]`, in the same `tx.business.update` call | Post-transaction second update; Prisma middleware; DB trigger | `becomesEmitido` is already derived at line ~405 and the update is already transactional. Folding the resolution into the same `updateData` object makes it atomic at zero extra round-trips and zero new failure modes. |
| PUT refactor | Leave the inline PUT logic as-is | Extract to `business-novedad.service.ts` | Pre-existing debt explicitly out of scope. Extracting would balloon the diff and the review surface without changing behavior. |
| Async state in hook | `useMarkNovedad` returns `AsyncState<BusinessEntity>` | Three `useState` flags | Mandatory project rule (`src/features/shared/types/async-state.types.ts`); matches `use-update-funded-date.ts`. |
| Precondition failure code | `409 Conflict` | `400 Bad Request` (as `cancel/route.ts` uses) | The body is valid; the resource state is not. `aportes/[index]/date-anchored/route.ts` already uses 409 for exactly this case; `400` stays reserved for malformed input/id. |

## Data Flow

Mark / unmark:

    BusinessRowActions (dropdown)         ─┐
    BusinessViewModal / detail page (btn) ─┴──→ useMarkNovedad ──→ PATCH /mark-novedad
                                                    (AsyncState)          │
                                                                          ├─ auth + user lookup
                                                                          ├─ Zod parse { action }
                                                                          ├─ precondition check
                                                                          ├─ business.update
                                                                          └─ logAuditEvent
                                                                                │
    caller ←── BusinessEntity ←────────────────────────────────────────────────┘  (refetch)

Auto-resolution inside the existing PUT transaction:

    becomesEmitido === true
      AND existingBusiness.novedadStatus === 'PENDIENTE'
              │
              ├─ updateData.novedadStatus   = 'RESUELTA'
              └─ updateData.novedadResolvedAt = new Date()
              (same tx.business.update — no extra query)
                        │
        after tx commits ──→ logAuditEvent(BUSINESS_NOVEDAD_RESOLVED)

`logAuditEvent` stays **outside** the transaction (it swallows its own errors and must never abort the business update) — same placement as the existing post-transaction audit calls.

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | 3 nullable fields on `Business` + `@map` snake_case names |
| `prisma/migrations/*/migration.sql` | Create | Additive `ALTER TABLE business ADD COLUMN` ×3 |
| `prisma/ERD.md` | Modify | Add the 3 fields to the `Business` entity block |
| `src/features/negocios/types/business-entity.types.ts` | Modify | `BUSINESS_NOVEDAD_STATUS` const + `BusinessNovedadStatus` type + 3 fields on `BusinessEntity` |
| `src/features/negocios/mappers/business-entity.mapper.ts` | Modify | Map the 3 Prisma fields (dates → ISO string \| null) |
| `src/features/negocios/types/business.types.ts` | Modify | **Not in proposal** — add `novedadStatus` to the table-row `Business` |
| `src/features/negocios/lib/map-business-to-table-row.ts` | Modify | **Not in proposal** — carry `novedadStatus` into the table row |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | `markNovedadSchema` |
| `src/app/api/negocios/[id]/mark-novedad/route.ts` | Create | PATCH handler |
| `src/app/api/negocios/[id]/route.ts` | Modify | Conditional novedad resolution inside the existing transaction + audit event |
| `src/features/negocios/hooks/use-mark-novedad.ts` | Create | `AsyncState<BusinessEntity>` mutation hook |
| `src/features/negocios/components/ui/BusinessNovedadBadge.tsx` | Create | Badge, `STATUS_CONFIG` pattern, renders `null` when status is null |
| `src/features/negocios/components/BusinessRowActions.tsx` | Modify | 2 gated `DropdownMenuItem`s + `novedadStatus` prop |
| `src/features/negocios/components/BusinessTableSection.tsx` | Modify | "Novedad" status column after "Estado" + "Fecha de Novedad" date column alongside `dateIssued`/`dateAnchored`/`date` (renders `novedadMarkedAt` via `formatDateBogota()`) + labels in `BUSINESS_COLUMN_LABELS` + pass `novedadStatus` to row actions |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modify | Wire mark/unmark handlers + refetch |
| `src/features/negocios/components/modals/BusinessViewModal.tsx` | Modify | Render badge + `novedadMarkedAt` (via `formatDateBogota()`) next to `BusinessStatusBadge`, plus a Mark/Unmark novedad button wired to `useMarkNovedad` |
| `src/app/dashboard/negocios/[id]/page.tsx` | Modify | Render badge + `novedadMarkedAt` (via `formatDateBogota()`) next to `BusinessStatusBadge`, plus a Mark/Unmark novedad button wired to `useMarkNovedad` |
| `src/features/auth/lib/audit-logger.ts` | Modify | 3 new `AuditAction` values |
| `src/features/negocios/hooks/use-business-export.ts` | Modify | Include "Novedad" (empty/"Pendiente"/"Resuelta") and "Fecha de Novedad" columns in the Excel export; update export snapshot test |

Detail view: **both** consume `BusinessEntity` and both already render `BusinessStatusBadge`, so both get the novedad badge. `status-presentation-parity.test.tsx` guards consistency across those surfaces and must be extended, not bypassed. `BusinessTable/ActionCell.tsx` stays untouched.

## Interfaces / Contracts

```typescript
// business-entity.types.ts
export const BUSINESS_NOVEDAD_STATUS = {
  PENDIENTE: 'PENDIENTE',
  RESUELTA: 'RESUELTA',
} as const
export type BusinessNovedadStatus =
  (typeof BUSINESS_NOVEDAD_STATUS)[keyof typeof BUSINESS_NOVEDAD_STATUS]

// BusinessEntity additions
novedadStatus: BusinessNovedadStatus | null
novedadMarkedAt: string | null    // ISO
novedadResolvedAt: string | null  // ISO
```

```typescript
// business-api.schemas.ts
export const markNovedadSchema = z.object({
  action: z.enum(['MARK', 'UNMARK']),
})
```

`PATCH /api/negocios/{id}/mark-novedad` → `ApiResponse<BusinessEntity>`

| Case | Status | Body |
|---|---|---|
| Success | 200 | `{ data: BusinessEntity }` |
| No session | 401 | `{ data: null, error: 'No autorizado' }` |
| Invalid id / body | 400 | `{ data: null, error: <zod message> }` |
| Business or user not found | 404 | `{ data: null, error: 'Negocio no encontrado' }` |
| `MARK` while status ≠ `VENTA_EFECTUADA` or `novedadStatus !== null` | 409 | precondition message |
| `UNMARK` while `novedadStatus !== 'PENDIENTE'` | 409 | precondition message |

State transitions (the only legal ones):

    null ──MARK──→ PENDIENTE ──UNMARK──→ null
                       │
                       └──becomesEmitido──→ RESUELTA   (terminal)

`RESUELTA` is terminal: no unmark, no re-mark, no reopen.

Write shapes:

```typescript
// MARK   { novedadStatus: 'PENDIENTE', novedadMarkedAt: new Date() }
// UNMARK { novedadStatus: null, novedadMarkedAt: null }   // novedadResolvedAt untouched (already null)
// AUTO   { novedadStatus: 'RESUELTA', novedadResolvedAt: new Date() }  // novedadMarkedAt preserved
```

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit | `prismaBusinessToEntity` and `mapBusinessToTableRow` carry the 3 fields; `BusinessNovedadBadge` renders orange/neutral/nothing | Vitest, colocated, extend existing mapper + badge tests and `mock-business.ts` fixture |
| Unit | `BusinessRowActions` item visibility across the 4 gate combinations | Testing Library, extend `BusinessRowActions.test.tsx` |
| Integration | `mark-novedad` route: 401/400/404/409/200 for both actions + audit call assertions | Vitest with mocked `prisma`, mirroring `cancel.route.test.ts` |
| Integration | PUT auto-resolution: `PENDIENTE` → `RESUELTA` when `becomesEmitido`; untouched when `novedadStatus` is null or already `RESUELTA`; single `business.update` call | Extend `business-id.route.test.ts` |
| E2E | Mark → badge visible in list → emit → badge flips to Resuelta | Playwright, optional if integration coverage holds |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The new HTTP route is an ordinary authenticated Next.js handler covered by the existing session + Zod validation pattern; its authorization posture is captured as an explicit architecture decision above.

## Migration / Rollout

Single additive migration, three nullable columns, no backfill and no default. Existing rows read as `novedadStatus = null`, which renders as an empty cell — the exact pre-change behavior. Deploy order: migration first, then application code. Rollback: reverting the application code alone is safe; the orphan columns are inert because nothing else branches on them.

## Open Questions

- [x] Should the "Novedad" column be excluded from the Excel export (`use-business-export.ts`)? Resolved: **included**. Same label/value rendering as the list column (empty / "Pendiente" / "Resuelta"); the export snapshot test must be updated as part of tasks, not skipped.
- [x] Timestamp display: resolved. `novedadResolvedAt` is **not** shown anywhere in the UI — it is redundant with `dateIssued` ("Fecha de Emisión"), since resolution only ever happens at the same moment the business transitions to `EMITIDO`. It stays a stored field for audit purposes only. `novedadMarkedAt` **is** shown: a new "Fecha de Novedad" date column is added alongside the other date columns (`dateIssued`, `dateAnchored`, `date`) in `BUSINESS_COLUMN_LABELS`, formatted with `formatDateBogota()` per the project's date-handling convention.
