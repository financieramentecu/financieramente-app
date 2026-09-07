# Verification Report: leads-sync-historical-timestamps

**Mode**: Full artifacts (proposal + 3 delta specs + design + tasks)
**Verdict**: PASS

## Completeness

- tasks.md: 28/28 checkboxes marked complete, all verified against actual source (not just trusted).
- Implementation committed on `feature/leads-sync-historical-timestamps` (commit `6a2e8f3f`), single squashed commit, 24 files changed (+1771/-25).
- Delivery: single combined PR — user-confirmed `size:exception` over the recommended 3-slice chained split (Medium 400-line budget risk accepted explicitly).
- No Prisma migration file added (confirmed via commit diff and `prisma/migrations` history) — matches the FINAL locked scope (`createdAt`/`updatedAt`/`active` pre-existed on `Lead`; no `createdAtFromCrm` column exists anywhere).

## Requirements / Scenario Coverage

| Domain | Requirements | Scenarios | Status |
|---|---|---|---|
| leads-crm-sync | 5 | 15 | 5/5 implemented, 15/15 covered by passing tests |
| leads | 5 | 14 | 5/5 implemented, 14/14 covered by passing tests |
| admin | 1 | 2 | 1/1 implemented, 2/2 covered by passing tests |
| **Total** | **11** | **31** | **11/11, 31/31** |

### Domain: leads-crm-sync

- **Historical Timestamp Ingestion** — `crmSyncPayloadSchema` (`crm-sync.schema.ts`) uses `z.iso.datetime({ offset: true }).transform(...)` for `createdAt`/`updatedAt`, both `.optional()`. Confirmed via source read + `crm-sync.schema.test.ts` (11 tests, offset-aware accept, naive reject, `+0500` reject, absent→undefined).
- **createdAt Set Once on Create, Never Touched on Update (FINAL)** — read `lead-sync.service.ts` lines 101-120 directly: `createdAt: payload.createdAt ?? receivedAt` appears ONLY in the `create` object literal (line 111); the `update` object literal (lines 114-119) has no `createdAt` key at all — structurally impossible to touch on update, not merely commented. Matches the FINAL locked rule from Engram #94 exactly (no provenance flag, no `createdAtFromCrm`, no comparison/latch). Covered by `lead-sync.service.test.ts` (30 tests) including explicit "update ignores payload createdAt" case.
- **updatedAt Resolution on Every Sync** — both branches include `updatedAt: payload.updatedAt ?? receivedAt`, sharing the single `receivedAt` const. Verified in source and tests.
- **Sync Forces Revival of Soft-Deleted Leads** — `active: true` unconditional in both branches; `buildLeadUpsertData()` untouched (confirmed `git show 6a2e8f3f --stat -- .../build-lead-upsert-data.ts` returns empty diff, and its test file shows 9 tests, zero new cases per task A5.1).
- **Reactivation Audit on Revive Transition** — `wasInactive = existing?.active === false` captured pre-upsert (line 102, before the write destroys the evidence); `logAuditEvent({ action: AuditAction.LEAD_REACTIVATED, ... })` fires only `if (wasInactive)` (lines 173-179), placed after create/update — confirmed it cannot fire for a `create` since `existing` is null there and `wasInactive` is false. Tests confirm no-fire on already-active resync and on create.

### Domain: leads

- **Lead Deletion Eligibility Predicate** — `can-delete-lead.ts`: `return lead.idBusiness === null && lead.outcomeStatus === 'OPEN'` — exact match to spec. 8 passing tests (truth table).
- **Admin-Only Lead Soft Deletion** — `lead-admin.service.ts` `deleteLead()`: fresh `findUnique`, `canDeleteLead()` re-evaluated server-side, `prisma.lead.update({ data: { active: false } })` (never `.delete()`), `logAuditEvent(LEAD_DELETED)`. Route `DELETE` export maps `notFound`→404, other error→409, success→200. 6 service tests + 8 route tests passing.
- **Deletion Confirmation and Action Visibility** — `lead-detail-sheet.tsx` line 162: `{canDelete && (<AlertDialog>...)}` where `canDelete = isAdmin && canDeleteLead(lead)` (line 73) — confirmed structurally NOT RENDERED (no `disabled` prop path, whole `AlertDialog` block is conditionally absent from the tree), not merely disabled. `AlertDialogAction` fires `deleteLead(lead.idLead)` only on confirm click inside the dialog — request cannot fire before confirmation. 13 component tests passing.
- **Deleted Leads Disappear From Board/Detail/Conversion** — relies on pre-existing `buildLeadListWhere()` `{ active: true }` filter (out of scope, unchanged) + new soft-delete; integration test confirms board absence.
- **CRM Resync Revives a Soft-Deleted Lead** — integration test (`leads-full-flow.integration.test.ts`, extended, 5 tests) confirms delete→resync→board reappearance.

### Domain: admin

- **Lead Deletion in Admin Destructive Action Surface** — `requireRole([UserRole.ADMIN])` guard runs first in the `DELETE` handler (route.ts line 88), before any lookup — mirrors `admin/companies/[id]` pattern per design D5. 403/proceed-to-lookup covered by route tests.

## Design Coherence

- D1 (`z.iso.datetime({ offset: true })`) — implemented exactly as specified.
- D2/D2a (createdAt create-only, immutable) — implemented exactly; verified structurally (single object literal reference, no branch/conditional).
- D2b (`wasInactive` pre-upsert snapshot) — implemented exactly, correct ordering (before upsert call).
- D3 (predicate placement, pure, dependency-free) — implemented exactly.
- D4 (`lead-admin.service.ts` SRP-isolated) — implemented exactly, matches `ApiResponse<{idLead:number}> & {notFound?}` contract.
- D5 (`requireRole([UserRole.ADMIN])`) — implemented exactly, matches `admin/companies` template.
- No design deviations found.

## Test Evidence

**Command**: `npx vitest run src/features/leads src/app/api/leads`
**Exit code**: 0
**Result**: 31 test files passed (31), 229 tests passed (229), duration 5.49s.
Independently re-executed in this verification (not trusting the crashed apply-agent's self-report per Engram #98) — confirms Engram #98's numbers exactly.

**Command**: `npx tsc --noEmit -p .`
**Exit code**: 0 (clean, no output)

**Command**: `npx eslint src/features/leads src/app/api/leads src/features/auth/lib/audit-logger.ts`
**Exit code**: 0 (clean, no output)

**Command**: `grep -rn "lead.delete(" src/`
**Result**: one hit — a doc-comment in `lead-admin.service.ts` stating deletion is never physical. No executable `prisma.lead.delete()` call exists anywhere.

**Command**: `git show 6a2e8f3f --stat -- src/features/leads/lib/build-lead-upsert-data.ts`
**Result**: empty (file untouched).

**Migration check**: `git show 6a2e8f3f --name-only | grep -i migration` → none. `prisma/migrations` history unaffected by this commit.

## Issues

None found at CRITICAL or WARNING level.

**SUGGESTION**: The single-combined-PR delivery (vs. the recommended 3-slice chained split) is an accepted, explicit user exception to the review-workload guard (Medium 400-500 line risk) — noted for reviewer awareness at PR time, not a defect.

## Final Verdict

**PASS** — 11/11 requirements and 31/31 scenarios implemented and covered by passing runtime tests. `createdAt` immutability invariant verified structurally in source (not just tests): the `update` branch of `prisma.lead.upsert()` never references `createdAt` in any form. No physical deletes, no Prisma migration, `buildLeadUpsertData()` untouched. Delete button conditionally not rendered when ineligible/non-admin. `LEAD_REACTIVATED` fires only on `false→true` transition; `LEAD_DELETED` fires on successful soft-delete. Ready for `sdd-archive`.
