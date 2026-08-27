# Proposal: Historical Lead Timestamps + Admin Lead Delete

> **Combined change — larger than usual.** Two independently valuable capabilities ship under one proposal per explicit user instruction. `sdd-tasks` MUST sub-section the plan (A vs B) and forecast chained/stacked PRs; a single PR will exceed the 400-line review budget.

## Intent

- **A — Historical timestamps**: a historical-leads migration must replay old CRM leads through `POST /api/leads/crm-sync`. Today every synced lead is stamped with receipt time, so migrated history collapses onto the import date and destroys date-range filtering and reporting.
- **B — Admin delete**: garbage/mis-synced leads pollute the Kanban board with no way to remove them. Admins need a safe, audited cleanup that never destroys data nor permanently burns the `externalCrmId` slot (a later real resync must revive the lead).

## Scope

### In Scope — A. Historical timestamps
- Optional `createdAt` / `updatedAt` on `crmSyncPayloadSchema`, ISO 8601 with explicit offset (naive strings rejected).
- `upsertLeadFromCrm()` resolves both once against a single `receivedAt = new Date()` fallback.
- `createdAt` written on `create` only — NEVER in the `update` branch (replay-safe immutability invariant). `updatedAt` written in both branches.
- `buildLeadUpsertData()` stays a pure contact-field merger; no create-only branching added to it.

### In Scope — B. Admin Lead delete
- New pure `canDeleteLead(lead)` → `idBusiness === null && outcomeStatus === 'OPEN'` (WON/LOST/ABANDONED block deletion). **Settled.**
- New `DELETE /api/leads/[id]`, gated by `requireRole([UserRole.ADMIN])`; 404 unknown, 409 ineligible, re-fetch and re-evaluate the guard server-side.
- Soft delete only: `prisma.lead.update({ data: { active: false } })`. `prisma.lead.delete()` is prohibited repo-wide.
- New `AuditAction.LEAD_DELETED` via `logAuditEvent()`.
- Revive-on-resync: `upsertLeadFromCrm()` sets `active: true` unconditionally in both upsert branches (in the service, not the builder). **Settled**: this revive emits a dedicated `AuditAction.LEAD_REACTIVATED` entry, logged only when the flip from `active: false` to `true` actually occurs.
- Admin-only "Eliminar lead" action in `LeadDetailSheet` using the shared `AlertDialog`, gated by role AND `canDeleteLead()`; role plumbing into `LeadsBoard` is net-new.

### Out of Scope
- Physical deletes anywhere; bulk/multi-select delete; undelete UI (revive only happens via CRM resync).
- Any new audit action for timestamp-only replays — confirmed at spec time: existing calls suffice, no dedicated action for `createdAt`/`updatedAt` replay.
- Prisma migrations (`createdAt`/`updatedAt`/`active` all already exist).
- Bogotá business-date helpers: these are real instants, exempt per `docs/DATE_HANDLING_CONVENTIONS.md`.
- Changes to `buildLeadListWhere()` — already filters `{ active: true }`.
- Backfilling already-imported leads.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `leads-crm-sync`: payload accepts optional `createdAt`/`updatedAt` with `now()` fallback and create-only `createdAt`; every sync forces `active: true`.
- `leads`: admin-only soft delete with eligibility guard, confirmation, and audit; deleted leads disappear from board/detail/conversion.
- `admin`: adds Lead deletion to the ADMIN-only destructive action surface.

## Approach

Both capabilities converge on `upsertLeadFromCrm()`, so they are implemented in one branch family but delivered as chained slices. Timestamps and `active: true` are resolved in the service; `buildLeadUpsertData()` is untouched. Delete follows the existing `admin/companies DELETE` / `deleteLeadFunnelColumn()` template: fetch → guard → soft-delete → audit, with a new `lead-admin.service.ts` for SRP.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/leads/types/crm-sync.schema.ts` | Modified | Optional offset-aware `createdAt`/`updatedAt` |
| `src/features/leads/services/lead-sync.service.ts` | Modified | Timestamp resolution + unconditional `active: true` |
| `src/features/leads/lib/can-delete-lead.ts` | New | Pure eligibility predicate |
| `src/features/leads/services/lead-admin.service.ts` | New | `deleteLead()` soft-delete + audit |
| `src/app/api/leads/[id]/route.ts` | Modified | New `DELETE` export (GET untouched) |
| `src/features/auth/lib/audit-logger.ts` | Modified | `LEAD_DELETED`, `LEAD_REACTIVATED` |
| `src/features/leads/components/lead-detail-sheet.tsx`, `leads-board.tsx` | Modified | Admin-gated delete + role plumbing |
| `src/features/leads/hooks/use-delete-lead.ts` | New | `AsyncState<T>`-based DELETE hook |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `createdAt` leaks into the `update` branch, mutating history on replay | Med | Explicit spec requirement + regression test asserting `createdAt` unchanged on resync |
| `z.coerce.date()` accepts garbage or offset-less strings | Med | Version-specific validation tests; reject naive strings explicitly |
| Combined change blows the 400-line review budget | High | Chained PRs: slice A (timestamps) → slice B1 (API/service/predicate) → slice B2 (UI) |
| Delete vs. concurrent resync race | Low | Accepted; fresh guard evaluation + unconditional `active: true` means no stuck state |
| Client/server eligibility drift | Low | Same `canDeleteLead()` on both sides; server is authoritative |

## Rollback Plan

Slices are independently revertible. A: revert the schema/service commit — payload fields become unknown-and-ignored, sync returns to `now()` semantics; no data migration needed. B: revert the `DELETE` export first (removes the capability instantly), then the UI and service commits. Any lead soft-deleted before rollback is restored by a CRM resync or a manual `active: true` update. No destructive schema change exists to undo.

## Dependencies

- CRM sends ISO 8601 timestamps with explicit offsets for the migration payloads.
- Prisma `^6.18.0` honors explicit values on `@updatedAt` fields (verified).

## Success Criteria

- [ ] A replayed historical lead persists the CRM's `createdAt`, and a second resync of the same `externalCrmId` leaves `createdAt` unchanged.
- [ ] A payload without timestamps still stores receipt-time values, unchanged from today.
- [ ] Non-admins receive 403 on `DELETE /api/leads/[id]`; ineligible leads receive 409.
- [ ] A deleted lead sets `active: false`, writes a `LEAD_DELETED` audit entry, and disappears from board, detail, and conversion.
- [ ] A CRM resync of a deleted lead restores it to the board and writes a `LEAD_REACTIVATED` audit entry.
- [ ] No `prisma.lead.delete()` exists anywhere in the diff.
