# Tasks: Historical Lead Timestamps + Admin Lead Delete

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | Slice A ~60-90 / Slice B1 ~180-220 / Slice B2 ~150-190 (total ~400-500) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Slice A) → PR 2 (Slice B1) → PR 3 (Slice B2) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| A | Historical `createdAt`/`updatedAt` + `active:true` revival + `LEAD_REACTIVATED` in sync | PR 1 | `npx vitest run src/features/leads/services/__tests__/lead-sync.service.test.ts src/features/leads/types/__tests__/crm-sync.schema.test.ts src/app/api/leads/crm-sync/__tests__/route.test.ts` | `npx vitest run src/features/leads/__tests__/leads-full-flow.integration.test.ts` | Revert schema+service commit; payload fields become unknown-and-ignored, sync returns to `now()` semantics |
| B1 | `canDeleteLead` + `lead-admin.service` + `DELETE /api/leads/[id]` + `LEAD_DELETED` | PR 2 | `npx vitest run src/features/leads/lib/__tests__/can-delete-lead.test.ts src/features/leads/services/__tests__/lead-admin.service.test.ts src/app/api/leads/[id]/__tests__/route.test.ts` | `npx vitest run src/features/leads/__tests__/leads-full-flow.integration.test.ts` | Revert the `DELETE` export first (removes capability instantly), then service/predicate commits |
| B2 | UI delete button/dialog + role plumbing + hook | PR 3 | `npx vitest run src/features/leads/components/__tests__/lead-detail-sheet.test.tsx src/features/leads/hooks/__tests__/use-delete-lead.test.ts` | Manual: admin viewer opens eligible lead, deletes, sheet closes and board refetches | Revert UI commit only; server DELETE endpoint (B1) stays intact and usable via other clients |

## Slice A — Historical Timestamps (PR 1)

### Phase A1: Schema

- [x] A1.1 RED: `src/features/leads/types/__tests__/crm-sync.schema.test.ts` — add cases: accept `Z`, accept `+05:00`; reject `2024-01-05T10:00:00` (naive), reject `+0500` (no colon), reject `2024-01-05`, reject epoch string; absent `createdAt`/`updatedAt` → `undefined`.
- [x] A1.2 GREEN: `src/features/leads/types/crm-sync.schema.ts` — add `createdAt: offsetAwareInstant.optional()`, `updatedAt: offsetAwareInstant.optional()` using `z.iso.datetime({ offset: true }).transform((v) => new Date(v))`.

### Phase A2: Service — createdAt immutability

- [x] A2.1 RED: `src/features/leads/services/__tests__/lead-sync.service.test.ts` — create w/o `createdAt` → `Lead.createdAt === receivedAt`; create w/ `createdAt` → stored value equals payload; update w/ a different `createdAt` in payload → stored `createdAt` unchanged; update w/o `createdAt` → unchanged (mirrors spec scenarios H1-H3).
- [x] A2.2 GREEN: `src/features/leads/services/lead-sync.service.ts` — add `const receivedAt = new Date()`; add `createdAt: payload.createdAt ?? receivedAt` to the `create` object literal only; do not touch the `update` object literal.

### Phase A3: Service — updatedAt on both branches

- [x] A3.1 RED: extend `lead-sync.service.test.ts` — `updatedAt` applied on create and on update per payload value; falls back to shared `receivedAt` when absent on either branch.
- [x] A3.2 GREEN: add `updatedAt: payload.updatedAt ?? receivedAt` to both `create` and `update` object literals, reusing the same `receivedAt` instant.

### Phase A4: Service — forced active revival + LEAD_REACTIVATED

- [x] A4.1 RED: extend `lead-sync.service.test.ts` — resync of `active:false` lead → `Lead.active === true`; resync of `active:true` lead → stays `true`; new create never emits `LEAD_REACTIVATED`.
- [x] A4.2 GREEN: add `active: true` to both `create` and `update` object literals; capture `const wasInactive = existing?.active === false` before the upsert call.
- [x] A4.3 Add `LEAD_REACTIVATED = 'LEAD_REACTIVATED'` to `AuditAction` enum in `src/features/auth/lib/audit-logger.ts` (appended to existing `LEAD_*` block).
- [x] A4.4 RED: extend `lead-sync.service.test.ts` — `logAuditEvent` called with `action: AuditAction.LEAD_REACTIVATED` only when `wasInactive` is true; not called on already-active resync or on create.
- [x] A4.5 GREEN: in `upsertLeadFromCrm()`, after the upsert call, add `if (wasInactive) { await logAuditEvent({ action: AuditAction.LEAD_REACTIVATED, email: 'crm-sync@system', details: ... }) }` alongside the existing post-upsert audit calls.

### Phase A5: Regression + integration

- [x] A5.1 Run `npx vitest run src/features/leads/lib/__tests__/build-lead-upsert-data.test.ts` unmodified — confirm it stays green with zero new cases (file is untouched; verifies no timestamp/`active` keys leaked into the builder).
- [x] A5.2 Extend `src/features/leads/__tests__/leads-full-flow.integration.test.ts` — CRM resync of a lead whose payload carries `createdAt` leaves the stored origin date unchanged.
- [x] A5.3 Run `npx vitest run src/app/api/leads/crm-sync/__tests__/route.test.ts` — confirm route-level tests still pass unmodified (schema change is additive/optional).

## Slice B1 — Admin Lead Delete: API + Service (PR 2, depends on A merged for shared enum block)

### Phase B1.1: Eligibility predicate

- [x] B1.1.1 RED: `src/features/leads/lib/__tests__/can-delete-lead.test.ts` — truth table: `idBusiness:null, outcomeStatus:'OPEN'` → true; `idBusiness` set → false for all 4 outcome statuses; `outcomeStatus` WON/LOST/ABANDONED with `idBusiness:null` → false.
- [x] B1.1.2 GREEN: create `src/features/leads/lib/can-delete-lead.ts` exporting `canDeleteLead(lead: { idBusiness: number | null; outcomeStatus: LeadOutcomeStatus }): boolean`.

### Phase B1.2: Audit action

- [x] B1.2.1 Add `LEAD_DELETED = 'LEAD_DELETED'` to `AuditAction` enum in `src/features/auth/lib/audit-logger.ts`.

### Phase B1.3: Service

- [x] B1.3.1 RED: create `src/features/leads/services/__tests__/lead-admin.service.test.ts` — 404 when lead not found; 409 when `canDeleteLead()` is false (converted and each terminal outcome status); success path calls `prisma.lead.update({ where: { idLead }, data: { active: false } })` and never `prisma.lead.delete()`; `logAuditEvent` called with `action: AuditAction.LEAD_DELETED`.
- [x] B1.3.2 GREEN: create `src/features/leads/services/lead-admin.service.ts` exporting `deleteLead(idLead: number)`: fresh `findUnique` by `idLead` → not-found result → `canDeleteLead()` guard → ineligible result → `prisma.lead.update({ data: { active: false } })` → `logAuditEvent(LEAD_DELETED)` → success result (interface per design: `ApiResponse<{ idLead: number }> & { notFound?: boolean }`).

### Phase B1.4: Route

- [x] B1.4.1 RED: create `src/app/api/leads/[id]/__tests__/route.test.ts` DELETE cases — 401 unauthenticated; 403 non-admin (role gate runs before lookup); 400 on NaN `id`; 404 unknown lead; 409 ineligible lead; 200 + `idLead` on success; confirm existing `GET` tests remain green.
- [x] B1.4.2 GREEN: add `DELETE` export to `src/app/api/leads/[id]/route.ts` — `requireRole([UserRole.ADMIN])` guard (mirrors `admin/companies/[id]` pattern) → parse/validate `id` → call `deleteLead()` → map `notFound` to 404, error-without-notFound to 409, `data` to 200; leave `GET` untouched.

### Phase B1.5: Integration

- [x] B1.5.1 Extend `src/features/leads/__tests__/leads-full-flow.integration.test.ts` — admin deletes eligible lead → lead absent from board response; CRM resync of the same `externalCrmId` afterward → lead reappears on board (cross-checks Slice A's `active:true` revival).

## Slice B2 — Admin Lead Delete: UI (PR 3, depends on B1 merged)

### Phase B2.1: Hook

- [x] B2.1.1 RED: create `src/features/leads/hooks/__tests__/use-delete-lead.test.ts` — idle → loading → success on 200 response; idle → loading → error on non-2xx/network failure; uses `AsyncState<{ idLead: number }>` from `src/features/shared/types/async-state.types.ts`.
- [x] B2.1.2 GREEN: create `src/features/leads/hooks/use-delete-lead.ts` — exposes a `deleteLead(idLead: number)` action wired to `DELETE /api/leads/[id]`, managing a single discriminated `AsyncState`.

### Phase B2.2: Detail sheet UI

- [x] B2.2.1 RED: extend `src/features/leads/components/__tests__/lead-detail-sheet.test.tsx` — "Eliminar lead" button hidden for non-admin; hidden for admin when `canDeleteLead(lead)` is false (e.g. WON); visible for admin when eligible; clicking opens `AlertDialog` confirmation; confirming triggers the delete flow and calls `onDeleted`; `DELETE` request not issued before confirmation.
- [x] B2.2.2 GREEN: modify `src/features/leads/components/lead-detail-sheet.tsx` — add `isAdmin?: boolean` (default `false`) and `onDeleted?: () => void` props to `LeadDetailSheetProps`; render "Eliminar lead" button + `AlertDialog` (from `src/features/shared/ui/alert-dialog.tsx`) in the footer only when `isAdmin && canDeleteLead(lead)`; on confirm, call `use-delete-lead`'s action and `onDeleted()` on success.

### Phase B2.3: Board role plumbing

- [x] B2.3.1 RED: extend `src/features/leads/components/__tests__/leads-board.test.tsx` (or equivalent board test) — admin session passes `isAdmin={true}` to `LeadDetailSheet`; non-admin/no-session passes `isAdmin={false}`; `onDeleted` closes the sheet and triggers `refetch()`.
- [x] B2.3.2 GREEN: modify `src/features/leads/components/leads-board.tsx` — add `useSession()` role read, derive `isAdmin` from the session role, pass `isAdmin` and an `onDeleted` callback (closes sheet + calls existing `refetch()` from `useLeadsBoard()`) into `LeadDetailSheet`.

## Key Learnings

1. `upsertLeadFromCrm()` in `lead-sync.service.ts` has exactly one `create` and one `update` object literal, so `createdAt` immutability is enforced structurally by simply never adding the key to the `update` literal.
2. `AuditAction` enum in `audit-logger.ts` already groups all `LEAD_*` actions contiguously, so `LEAD_REACTIVATED` and `LEAD_DELETED` append cleanly without reordering.
3. `admin/companies/[id]/route.ts` already uses `requireRole([UserRole.ADMIN])` before any lookup, giving Slice B1's `DELETE` handler a proven 401/403 template to copy exactly.
4. `LeadDetailSheet` currently has zero role awareness and `LeadsBoard` has zero session awareness, so Slice B2 introduces net-new `useSession()` plumbing rather than extending an existing prop.
5. `build-lead-upsert-data.ts` and its test file are structurally excluded from every slice — no task should modify them, confirmed by design's create/update rule living solely in the service.
