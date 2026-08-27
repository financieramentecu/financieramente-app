# Design: Historical Lead Timestamps + Admin Lead Delete

## Technical Approach

Both capabilities converge on `upsertLeadFromCrm()`. Timestamp resolution and `active` revival are computed **in the service** from its single existing pre-upsert read, never in `buildLeadUpsertData()` (which stays a pure contact-field merger). Delete is a new SRP-isolated `lead-admin.service.ts` + a `DELETE` export on the existing `[id]` route, following the `admin/companies DELETE` and `deleteLeadFunnelColumn()` templates. A single pure predicate is shared by server guard and client render gate.

## Scope (authoritative for this change)

Supersedes the proposal's Out of Scope list on **one** point only:

- **`AuditAction.LEAD_REACTIVATED`** — emitted on the revive-on-resync transition. The proposal deferred this to spec time; it is confirmed in scope.

Confirmed still out of scope, matching the proposal: **Prisma migrations** — `Lead.createdAt`, `Lead.updatedAt` and `Lead.active` all already exist (`prisma/schema.prisma`, `Lead` model), and no other field in this design is persisted, so `prisma/schema.prisma` and `prisma/ERD.md` are untouched. Also unchanged: physical deletes, bulk delete, undelete UI, backfilling already-imported leads, changes to `buildLeadListWhere()` or `buildLeadUpsertData()`, Bogotá business-date helpers (these are real instants), and any audit action for timestamp replays.

## Architecture Decisions

### D1 — Timestamp validator: `z.iso.datetime({ offset: true })`

| Option | Tradeoff | Decision |
|---|---|---|
| `z.iso.datetime({ offset: true })` → `.transform(v => new Date(v))` | Regex-verified; rejects naive strings | **Chosen** |
| `z.coerce.date()` + `.refine()` | Accepts `"2024-01-05"`, `"1700000000"`; refinement must re-parse the raw string, which coercion already discarded | Rejected |
| `z.string().datetime({ offset: true })` | Deprecated alias of the above in Zod 4 | Rejected (lint/migration debt) |

**Rationale (verified against pinned `zod@4.4.3`, `node_modules/zod/v4/core/regexes.js:82-92`)**: with `local` unset and `offset: true`, the accepted suffix set is exactly `Z | ±HH:MM`. Offset-less strings are rejected by construction. Note for the CRM contract: `+0500` (no colon) is **rejected**; n8n must emit `+05:00` or `Z`.

```ts
const offsetAwareInstant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
// createdAt: offsetAwareInstant.optional(),
// updatedAt: offsetAwareInstant.optional(),
```

`CrmSyncPayload` therefore carries `createdAt?: Date`, so `buildLeadUpsertData()` needs no signature change (it only iterates `OPTIONAL_STRING_FIELDS`).

### D2 — Timestamps and `active` resolve in `upsertLeadFromCrm()`

`buildLeadUpsertData()` has no create/update branch awareness; adding one would break its documented "dumb merger" contract and its existing unit tests. The service already reads `existing` once (`findUnique`, line 79) and owns both upsert branches, so it is the only place that can express a branch-specific rule.

### D2a — `createdAt` is create-only and immutable thereafter

| Option | Tradeoff | Decision |
|---|---|---|
| Write `createdAt` only in the `create` branch; the `update` branch never mentions it | Origin date is immutable after first insert; no drift is expressible | **Chosen** |
| Conditionally overwrite when the payload carries a value | A stale or wrong resync silently rewrites a confirmed origin date, with no comparison and no audit trace | Rejected |
| Persist a `createdAtFromCrm` provenance flag and allow exactly one correction | Guards the same risk, but costs a migration and hard-codes "the CRM confirmed it" as a permanent truth-source assumption | Rejected |

**Rationale**: the historical-migration path is a script under our control that guarantees a correct `createdAt` on each lead's **first** sync, so there is no legitimate later-correction case to serve. Removing update-path mutation entirely closes the silent-drift risk outright rather than mitigating it, and needs no persisted state — so it also carries no assumption about the CRM remaining the source of truth.

```ts
const receivedAt = new Date()
const wasInactive = existing?.active === false   // pre-upsert snapshot — see D2b

create: { ...upsertData, externalCrmId, idLeadFunnelColumn,
          active: true,
          createdAt: payload.createdAt ?? receivedAt,
          updatedAt: payload.updatedAt ?? receivedAt },
update: { ...upsertData, idLeadFunnelColumn,
          active: true,
          updatedAt: payload.updatedAt ?? receivedAt },
```

Immutability is structural: `createdAt` appears in exactly one object literal in the whole function. There is no branch, no conditional spread, and no read-compare-write — the `update` path has no way to reach the field.

**`updatedAt` follows a different rule and must not be conflated.** It is written on **both** branches: payload value when present, otherwise `receivedAt`. It is never conditionally omitted — an explicit value simply overrides the `@updatedAt` attribute (verified, Prisma `^6.18.0`). Both branches share the single `receivedAt` instant so a create never records `createdAt` and `updatedAt` microseconds apart.

### D2b — `wasInactive` must be read pre-upsert

`active` revival is independent of any timestamp logic and stays exactly as designed. The upsert destroys the evidence (`active: false` becomes `true`), so the flag is captured from the same `existing` snapshot already read at line 79, before the write:

```ts
if (wasInactive) {
  await logAuditEvent({
    action: AuditAction.LEAD_REACTIVATED,
    email: 'crm-sync@system',
    details: `Lead reactivado por resync CRM (externalCrmId: ${payload.externalCrmId})`,
  })
}
```

Placed after the upsert alongside the existing owner/outcome audit calls, matching the function's established shape. No audit action for timestamp handling — `LEAD_CREATED`/`LEAD_STATUS_CHANGED` already cover every sync.

### D3 — Eligibility predicate placement

`src/features/leads/lib/can-delete-lead.ts`, pure and dependency-free (mirrors `lead-outcome-status.ts`), so both runtimes import it:

```ts
export function canDeleteLead(lead: {
  idBusiness: number | null
  outcomeStatus: LeadOutcomeStatus
}): boolean {
  return lead.idBusiness === null && lead.outcomeStatus === 'OPEN'
}
```

- **Server (authoritative)**: `deleteLead()` re-fetches by `idLead` and evaluates it fresh → 409 on false.
- **Client (cosmetic)**: `LeadDetailSheet` renders the button only when `isAdmin && canDeleteLead(lead)`. Hidden, not disabled — the UI never surfaces a rejection reason, so the 409 message stays generic.

### D4 — `lead-admin.service.ts` over extending `lead-board.service.ts`

Board/detail reads and admin mutations are different reasons to change; `lead-funnel-column.service.ts` already isolates mutations this way. Returns `ApiResponse<{ idLead: number }>` plus a discriminator the route maps to 404 vs 409 (matching `deleteLeadFunnelColumn()`'s shape).

### D5 — `requireRole([UserRole.ADMIN])` for the DELETE gate

Shared and already used by `admin/companies`. Accepted wart: it returns `{ success: false, error }`, not `ApiResponse`, so the 401/403 bodies differ from this route's `GET`. Follow the existing pattern; do not fork a variant in this change.

## Data Flow

    n8n ──POST /crm-sync──→ crmSyncPayloadSchema ──→ upsertLeadFromCrm
                                                        │ findUnique → wasInactive?
                                                        ├─ create: createdAt + updatedAt + active
                                                        └─ update: updatedAt + active (never createdAt)
                                                        └──→ logAuditEvent(LEAD_REACTIVATED) if wasInactive

    LeadDetailSheet ──AlertDialog──→ useDeleteLead ──DELETE /api/leads/[id]──→ requireRole(ADMIN)
        │ (isAdmin && canDeleteLead)                          └──→ deleteLead(): fetch → canDeleteLead
        └──← onDeleted() → close sheet + board refetch()            → active:false → LEAD_DELETED

## File Changes

No schema or migration files. All `Lead` columns used here already exist.

| File | Action | Description |
|---|---|---|
| `src/features/leads/types/crm-sync.schema.ts` | Modify | Optional offset-aware `createdAt`/`updatedAt` → `Date` |
| `src/features/leads/services/lead-sync.service.ts` | Modify | Timestamp resolution, `active: true` both branches, `LEAD_REACTIVATED` |
| `src/features/leads/lib/can-delete-lead.ts` | Create | Pure eligibility predicate |
| `src/features/leads/services/lead-admin.service.ts` | Create | `deleteLead()` fetch → guard → soft delete → audit |
| `src/app/api/leads/[id]/route.ts` | Modify | New `DELETE` export; `GET` untouched |
| `src/features/auth/lib/audit-logger.ts` | Modify | `LEAD_REACTIVATED`, `LEAD_DELETED` (appended to the existing `LEAD_*` block, `ENTITY_ACTION` convention) |
| `src/features/leads/hooks/use-delete-lead.ts` | Create | `AsyncState<{ idLead: number }>` DELETE hook |
| `src/features/leads/components/lead-detail-sheet.tsx` | Modify | Admin-gated button + `AlertDialog`; new `isAdmin`/`onDeleted` props |
| `src/features/leads/components/leads-board.tsx` | Modify | `useSession()` role plumbing + `onDeleted` → close sheet + `refetch()` |

## Interfaces / Contracts

```ts
// lead-admin.service.ts
export async function deleteLead(
  idLead: number,
  auditContext?: AuditContext
): Promise<ApiResponse<{ idLead: number }> & { notFound?: boolean }>
// route maps: notFound → 404, error without notFound → 409, data → 200

// lead-detail-sheet.tsx
interface LeadDetailSheetProps {
  lead: LeadDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin?: boolean          // default false — non-admin callers unaffected
  onDeleted?: () => void     // board closes sheet + refetch
}
```

## Testing Strategy (Strict TDD — RED → GREEN per task)

| Layer | What | Approach |
|---|---|---|
| Unit | `canDeleteLead` | Truth table: OPEN+null→true; WON/LOST/ABANDONED→false; `idBusiness` set→false in all 4 outcomes |
| Unit | `crm-sync.schema` | Accept `Z` and `+05:00`; reject `2024-01-05T10:00:00`, `+0500`, `2024-01-05`, epoch string; absent→`undefined` |
| Unit | `build-lead-upsert-data` | Regression: unchanged output, no timestamp/`active` keys leak in |
| Service | `lead-sync.service` timestamps | `create` with payload timestamps → both stored; `create` without → both `receivedAt`; **`update` data never contains a `createdAt` key — asserted unconditionally, including on a resync whose payload *does* carry `createdAt`**; `updatedAt` written on both branches in all cases |
| Service | `lead-sync.service` revive | `active: true` in both branches; `LEAD_REACTIVATED` emitted only when `existing.active === false`, never on an already-active resync or a create |
| Service | `lead-admin.service` | 404 path, both 409 branches, soft delete calls `update` (never `delete`), `logAuditEvent` args |
| Route | `api/leads/[id]` DELETE | 401, 403 non-admin, 400 NaN id, 404, 409 ×2, 200; `GET` tests still green |
| Component | `lead-detail-sheet` | Button hidden for non-admin, hidden when ineligible, visible+confirm flow for eligible admin; `onDeleted` fires |
| Integration | `leads-full-flow` | delete → lead absent from board → CRM resync → lead back on board; a resync leaves the stored origin date intact whether or not its payload carries `createdAt` |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, or executable-file classification. Routing changes are limited to one authenticated Next.js route handler whose authorization is covered by the RBAC tests above.

## Migration / Rollout

**No migration.** `createdAt`, `updatedAt` and `active` already exist on `Lead`; this change adds no persisted field, so `prisma/schema.prisma` and `prisma/ERD.md` are untouched. No feature flag; slices ship as chained PRs and each is independently revertible.

**Task chaining boundary for `sdd-tasks`** (400-line budget risk: **Medium**, unchanged): dropping the conditional spread removes roughly one line of implementation and one test case — real simplification, but well inside the noise of a 400-line budget, so the forecast does not move. It stays Medium because slices B1 and B2 (new route, service, hook, dialog, and role plumbing) dominate the line count, and neither was touched by any of the `createdAt` revisions.

Slices:

- **A** — `crm-sync.schema` + `upsertLeadFromCrm` (create-only `createdAt`, both-branch `updatedAt`, *and* `active: true`/`LEAD_REACTIVATED`; all edit the same two object literals, so splitting them would rewrite the same lines twice) + the `LEAD_REACTIVATED` enum value.
- **B1** — `can-delete-lead` + `lead-admin.service` + `DELETE` route + `LEAD_DELETED` (server-complete, independently shippable).
- **B2** — `use-delete-lead` + sheet button/dialog + board role plumbing.

B2 depends on B1; A is independent of both and can merge first. Slice A is now small enough that a reviewer can hold the whole `upsertLeadFromCrm` diff in one pass.

## Open Questions

- [ ] None blocking. CRM/n8n must be told the offset format is `Z` or `±HH:MM` — `+0500` is rejected (D1).

Scope deltas against the proposal are resolved in the **Scope** section above, which is authoritative for `sdd-tasks`. Proposal reconciliation is tracked by the orchestrator, outside this design.
