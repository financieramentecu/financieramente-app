# Verification: crm-create-pipeline-lead

## Result

No blocking correctness, security, accessibility or architecture finding was identified in the reviewed change. The five requirements and their scenarios have implementation evidence and focused coverage. This review does not authorize deployment or merging into `develop`.

| Dimension | Evidence |
| --- | --- |
| Completeness | Schema, session-authenticated POST, creation service, write-scoped advisor lookup, dialog, board refresh, API reference and tests implemented. |
| Correctness | Server rejects forged/cross-branch owners; broad read visibility does not widen write scope. Active owner and initial stage are checked before creation; repeated contacts create distinct leads linked to every active document/email/phone match without modifying existing leads. |
| Atomicity | Serializable Prisma transaction includes lead, origin pivot, automatic relation links, initial stage history and manual ownership/origin history. The real creator is used for history and creation audit. |
| Accessibility | Shared dialog and selector, labeled fields, alert errors, disabled pending controls and input preservation. |
| Architecture | Feature-based placement, Zod at the input boundary, persistence in services, HTTP orchestration in routes, shared `AsyncState` hook, colocated tests; no migration or dependency added. |

## Requirement mapping

- **Create a native pipeline lead:** `create-lead.schema.ts`, `create-lead.service.ts`, `create-lead-dialog.tsx`; schema/service/dialog tests cover valid and invalid contact data, `NUEVO_LEAD`, `OPEN`, and no external CRM identifier.
- **Assign by write authority:** `POST /api/leads` uses the existing CRM management guard and `canAssignWithinScope`; `/api/crm/advisors?assignable=true` uses `manageableUserIds`. Route tests cover self, leader, administrator, forged owner, cross-branch read grants and guard denials. Service/dialog tests cover inactive owners and read-only roles.
- **Persist Propio origin atomically:** service resolves and links the origin inside its transaction, stores manual history and audits the actual creator. Tests cover successful linkage, unavailable owner/stage/origin and failure propagation without a success audit.
- **Preserve and relate existing contacts:** matching uses `findMany` with `active: true` and an OR over nonempty document/email/phone, escaping case-insensitive email matching. All returned IDs receive an `AUTO` relation from the new lead inside the same transaction. Existing lead data and owners are never updated. No-match creation skips link writes. Link failure propagates without a success audit.
- **Show relations on both leads:** the existing timeline reader selects active `LeadLink` rows where either endpoint matches the opened lead, then maps the correct incoming/related side. Automatic-relation metadata describes contact matching without claiming a shared owner. Existing record access and assignment guards are unchanged.
- **Recover from submission failure:** dialog tests cover server rejection, network error, retained input, pending submit disabling and prevented closure while saving; existing board/hook tests pass after integration.

## Checks

- Final amended regression run passed 139 files / 894 tests, covering the lead feature, lead API routes, advisor route and CRM actor guard.
- Final `tsc --noEmit --extendedDiagnostics` completed with exit 0. Live-generated Next.js validators exposed an optional advisor request parameter; it now uses the required `Request` signature. The advisor route test and lint passed after that correction. Timeline/service tests passed (16 tests) after simplifying a typed Prisma test mock.
- Before the repeated-contact amendment, broader parent regression validation passed 139 test files / 888 tests covering `src/features/leads`, `src/app/api/leads`, `src/app/api/crm/advisors` and `src/lib/auth/__tests__/require-crm-actor.test.ts`; TypeScript and touched-file ESLint passed. The independent seven-file focused run also passed. These counts apply to the earlier implementation, not the amendment.
- Amendment review confirmed all-match OR selection, escaped email equality, transaction-local automatic links, unchanged existing owners, both-endpoint timeline selection and truthful automatic-relation metadata. New tests cover multiple matches, no matches, empty fields, escaped email, relation-write failure and timelines from the new lead and both existing leads.
- Amendment focused validation passed three files / 27 tests (`create-lead.service`, `lead-timeline.service`, `describe-timeline-entry`), touched-file ESLint and diff checks. Broader regression and final TypeScript validation are recorded by the parent after this review.
- Source review included connected CRM guard, write/read visibility, hierarchy-advisor service, origin resolver/pivot, person matching, audit logger and database model.
- Current branch verified as `feature/crm-create-pipeline-lead`. No commits, merges or pushes were performed by this review.

## Limits

The persistence tests mock Prisma. Transaction rollback and concurrent repeated-contact creation were inspected at the transaction boundary, not exercised against live PostgreSQL. No authenticated browser or QA environment was used; no full repository suite, production build or deployment was run by this review. The OpenSpec CLI is unavailable, so artifact verification was performed directly from the installed skill and repository files.

The design was aligned with the requested optional advisor selection: administrators/leaders may retain the explicit self-assignment default. Active-user eligibility preserves the existing advisor service semantics; this change does not introduce a new role classification.
