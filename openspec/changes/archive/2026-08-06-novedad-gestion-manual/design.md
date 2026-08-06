# Design: Manual novedad status management

Consistent with `proposal.md` and the pending `specs/negocios/spec.md` delta (five-state lifecycle, no auto-resolution, privileged manage operation, owner+NUEVA UNMARK gate). Spec file not present at design time; requirements below are the design's normative reference.

## Technical Approach

Keep `Business.novedadStatus` as `VarChar(20)` — no Prisma migration. Widen the `BUSINESS_NOVEDAD_STATUS` const object to five keys, delete the auto-resolution branch from `PUT /api/negocios/[id]`, and add a dedicated `PATCH /api/negocios/[id]/manage-novedad` route whose Prisma access lives in a new feature service. `mark-novedad` keeps self-service MARK/UNMARK with a tightened UNMARK precondition. Legacy rows are normalized by an idempotent data script, not a migration.

## Architecture Decisions

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|---|
| D1 | Status vocabulary | `NUEVA`, `SOMETIDA_DEVOLUCION`, `DECLINADA`, `PENDIENTE`, `CANCELADA` in the existing const/type | Prisma enum; DB CHECK; `SOMETIDO_A_DEVOLUCION` | 19-char max fits `VarChar(20)`; 21 chars overflows. Const object matches `BUSINESS_STATUS` convention and needs no migration |
| D2 | Manual editor transport | New `PATCH .../manage-novedad` | Extend `mark-novedad` with a third action | SRP: different authz (role allowlist vs. authenticated), different schema, different audit action. Matches `cancel`/`fondear` one-route-per-action convention |
| D3 | Prisma placement | New `src/features/negocios/services/business-novedad.service.ts` | Prisma in the route (as `mark-novedad` does today) | CLAUDE.md forbids Prisma in handlers. Do not propagate the existing violation into new code; `mark-novedad` is not refactored in this change |
| D4 | Auto-resolution | Delete only the `becomesEmitido && PENDIENTE` novedad branch (route.ts ~443-446) and the `BUSINESS_NOVEDAD_RESOLVED` emission (~524-538) | Flag-guarded behaviour; leave audit emission | `becomesEmitido` still drives `dateIssued`/payment sync — surgical deletion keeps PUT tests green. `RESUELTA` disappears from the vocabulary, so the event is meaningless |
| D5 | `BUSINESS_NOVEDAD_RESOLVED` enum member | Keep in `AuditAction`, stop emitting | Remove the member | Historical `AuditLog` rows reference the string; removal breaks reads/reporting |
| D6 | UNMARK gate | Require `novedadStatus === 'NUEVA'` AND `business.idUser === currentUser.idUser` | Role allowlist; status-only gate | UNMARK is the Money Strategist's undo of their own MARK. Ownership pattern already used by `PUT`. Backoffice uses manage → `CANCELADA` |
| D7 | UNMARK timestamps | Null `novedadStatus` only; preserve `novedadMarkedAt`/`novedadResolvedAt` | Current behaviour (nulls `novedadMarkedAt`) | Preserves the first-marking forensic trail; timestamps are read-only history |
| D8 | Legacy data | Idempotent `prisma/seeds/backfill-novedad-status.ts` mapping `PENDIENTE`→`NUEVA` and `RESUELTA`→`NUEVA`, `--dry-run` + one batch audit entry | Prisma migration SQL | Data-only UPDATE; follows `reset-future-payments-to-sin-fondear.ts` (`backfillXxx` functions, chunked updates, `logMigrationAudit`) |
| D9 | Unknown status render | Neutral fallback chip when `STATUS_CONFIG[status]` misses | Throw / render nothing | Defends against an unrun backfill in production |
| D10 | `cancel` route | No change | Add a guard | Verified: `src/app/api/negocios/[id]/cancel/route.ts` contains zero `novedadStatus` references |

## Data Flow

    BusinessNovedadManageModal ──> useManageNovedad ──> PATCH /manage-novedad
              (4 options)                                      │
                                                    role guard (ADMIN|ANALISTA_SOPORTE)
                                                               │
                                              business-novedad.service.updateNovedadStatus
                                                               │
                                              Business.novedadStatus  +  AuditLog
                                                               │
                                       BusinessEntity ──> BusinessNovedadBadge (5 states)

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/negocios/types/business-entity.types.ts` | Modify | 5-key `BUSINESS_NOVEDAD_STATUS`; add `MANUAL_NOVEDAD_STATUSES` (4 keys, excludes `NUEVA`) |
| `src/app/api/negocios/[id]/route.ts` | Modify | Delete auto-resolve branch + `BUSINESS_NOVEDAD_RESOLVED` emission |
| `src/app/api/negocios/[id]/mark-novedad/route.ts` | Modify | MARK writes `NUEVA`; UNMARK requires `NUEVA` + ownership; keep timestamps |
| `src/app/api/negocios/[id]/manage-novedad/route.ts` | Create | HTTP-only: auth → role allowlist → Zod → service → audit |
| `src/features/negocios/services/business-novedad.service.ts` | Create | `getNovedadContext`, `updateNovedadStatus` (all Prisma) |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | `manageNovedadSchema` |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `BUSINESS_NOVEDAD_STATUS_CHANGED` |
| `src/features/negocios/components/modals/BusinessNovedadManageModal.tsx` | Create | Dialog per `BusinessCancelModal` shape |
| `src/features/negocios/hooks/use-manage-novedad.ts` | Create | `AsyncState<BusinessEntity>` |
| `src/features/negocios/components/ui/BusinessNovedadBadge.tsx` | Modify | 5-entry `STATUS_CONFIG` + neutral fallback |
| `src/features/negocios/components/ui/NovedadActionButton.tsx` | Modify | `PENDIENTE` → `NUEVA` in mark/unmark predicates |
| `src/app/dashboard/negocios/[id]/page.tsx`, `components/modals/BusinessViewModal.tsx` | Modify | Role-gated "Gestionar novedad" trigger + modal wiring |
| `prisma/seeds/backfill-novedad-status.ts` | Create | Idempotent legacy backfill |
| `prisma/ERD.md`, `openspec/specs/negocios/spec.md` | Modify | Document the five-state field |

## Interfaces / Contracts

```ts
export const BUSINESS_NOVEDAD_STATUS = {
  NUEVA: 'NUEVA',
  SOMETIDA_DEVOLUCION: 'SOMETIDA_DEVOLUCION',
  DECLINADA: 'DECLINADA',
  PENDIENTE: 'PENDIENTE',
  CANCELADA: 'CANCELADA',
} as const

export const manageNovedadSchema = z.object({
  novedadStatus: z.enum(['SOMETIDA_DEVOLUCION', 'DECLINADA', 'PENDIENTE', 'CANCELADA']),
})
```

`PATCH /api/negocios/[id]/manage-novedad` → `ApiResponse<BusinessEntity>`.
401 unauthenticated · 403 role not in `[ADMIN, ANALISTA_SOPORTE]` · 400 invalid id/body (incl. `NUEVA`) · 404 business missing or `novedadStatus === null` · 500 otherwise. No origin-state restriction: any of the 4 targets is reachable from any current status. Audit `BUSINESS_NOVEDAD_STATUS_CHANGED` with `userId`, `email`, `ipAddress`, `userAgent`, `details: { businessId, from, to }`.

## Testing Strategy (Strict TDD — RED first, per unit)

| Layer | What | Approach |
|---|---|---|
| Unit | `manageNovedadSchema` accepts the 4 manual values, rejects `NUEVA`/unknown | Vitest |
| Unit | `business-novedad.service` writes status, returns entity-shaped row | Vitest + mocked prisma |
| Unit | `BusinessNovedadBadge` renders 5 distinct label/colour/icon triples + neutral fallback for unknown | Testing Library |
| Unit | `useManageNovedad` idle→loading→success/error `AsyncState` | Vitest + mocked fetch |
| Unit | `BusinessNovedadManageModal` requires a selection, calls `onConfirm(status)`, resets on close | Testing Library |
| Integration | `manage-novedad` 401/403/400/404/200 matrix; audit called once with from→to | Route test, `createMockUserWithRole` pattern |
| Integration | `mark-novedad`: MARK→`NUEVA`; UNMARK 409 when not `NUEVA`; 403 non-owner; timestamps preserved | Route test |
| Integration | `PUT /api/negocios/[id]` VENTA_EFECTUADA→EMITIDO leaves `novedadStatus` untouched and emits no novedad audit, while `dateIssued`/payment sync still run | Existing PUT route tests extended |
| Unit | Backfill maps legacy `PENDIENTE`/`RESUELTA`→`NUEVA` and is a no-op on re-run | Vitest + mocked prisma |
| E2E | Analyst sets a status from detail view; agent sees no trigger | Playwright (optional slice) |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The only new boundary is an authenticated HTTP route; its authorization matrix is covered by the integration tests above.

## Migration / Rollout

No schema migration. Order: (1) merge code, (2) run `npx tsx prisma/seeds/backfill-novedad-status.ts --dry-run`, (3) run for real as a release step. The neutral badge fallback makes step order non-fatal. Rollback = revert branch; optional inverse backfill `NUEVA`→`RESUELTA` limited to EMITIDO businesses with no `BUSINESS_NOVEDAD_STATUS_CHANGED` audit row.

## Open Questions

- [ ] None blocking. `mark-novedad`'s existing direct-Prisma access is a known convention violation left untouched by design (D3).
