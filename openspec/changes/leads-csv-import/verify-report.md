# Verification Report: leads-csv-import

**Change**: `leads-csv-import` (branch `feat/import-leads`)
**Mode**: openspec (full artifact set: proposal, design incl. Amendment A, specs x2, tasks)
**Verdict**: **PASS**

## Completeness

- Tasks: 55/57 checked. Unchecked: 3.7 (Optional E2E — explicitly declined, full unit/integration coverage substitutes), 4.1/4.2 (archive-time only, correctly deferred). No core task pending.
- Full artifact set present: proposal.md, design.md (with Amendment A), specs/leads-csv-import/spec.md, specs/lead-funnel-columns/spec.md, tasks.md.

## Command Evidence

| Command | Result |
|---|---|
| `npm run test:unit` | 449 files / 3803 passed, 3 skipped (unrelated), 0 failed |
| `npm run test:integration` | 7 files / 49 passed, 0 failed |
| `npm run type-check` (`tsc --noEmit`) | exit 0, no errors |
| `npm run lint` | 0 errors, 4 pre-existing warnings unrelated to this feature |

## Spec Compliance Matrix — `leads-csv-import` (13 requirements / 28 scenarios)

| Requirement | Scenarios | Status | Evidence |
|---|---|---|---|
| CSV Template Download | 2/2 | COMPLIANT | `LEAD_CSV_HEADERS` (11, `propietario_nombre` last) in `lead-csv-template.ts`; `parseLeadCsvFile` rejects whole-file on header mismatch. Tests: `lead-csv-template.test.ts`, `parse-lead-csv-file.test.ts`, `csv-template.route.test.ts` — all pass. |
| Row-Level Import Tolerance | 1/1 | COMPLIANT | No `$transaction` wrapping in `lead-csv-import.service.ts`; per-row `for` loop with `continue` on rejection. Test: "imports valid rows and reports rejected ones without all-or-nothing rollback" — pass. |
| In-File Duplicate Detection | 1/1 | COMPLIANT | `seenExternalCrmIds` `Set` checked before any DB call. Test: "rejects the second occurrence of a duplicate id_externo_crm" — pass. |
| Strict estado Resolution (Fail Closed) | 2/2 | COMPLIANT | `parse-lead-outcome-status.ts` — `RECOGNIZED_TOKENS` fixed list, no default branch; rejection reason names raw value. Tests confirm "never returns OPEN as default" — pass. |
| Strict columna_funnel Resolution | 3/3 | COMPLIANT | `resolve-funnel-column-by-name.ts` — exact `Map` lookup, no trim/case-fold, no `normalizeFunnelStatusKey` import (grep-verified: zero references), no fallback column. Test explicitly asserts the module never imports `normalizeFunnelStatusKey` — pass. |
| fecha_creacion Validation | 2/2 | COMPLIANT | Zod schema requires offset-aware ISO string; naive `"2023-01-15"` rejected. Tests in `lead-csv-import.schema.test.ts` — pass. |
| Upsert With Partial Merge | 2/2 | COMPLIANT | Reuses `buildLeadUpsertData`'s omit-preserve; service test "updates telefono on re-import and preserves origen when omitted" — pass. |
| WON Outcome Status Lock Reported, Not Silent | 1/1 | COMPLIANT | `resolveOutcomeStatus` called only with pre-validated status; `locked` flag pushed to `wonLockedLeads`, row still counted as imported. Test "reports the WON lock without rejecting the row" — pass. |
| Owner Resolution Order — Email First, Exact Name Fallback | 5/5 | COMPLIANT | `resolveRowOwner()` in the service implements exactly the design's Amendment A order: email match wins outright; name consulted only when email is not a matched number; ambiguous/unmatched name never overrides `emailResolvedOwnerId` (preserves `undefined`=preserve / `null`=clear semantics). Verified by direct code read plus 8 passing service tests covering every branch (email-wins, empty-email+match, unmatched-email+name-match, ambiguous, partial-name-never-matches). |
| Ownerless Leads Report the Reason | 4/4 | COMPLIANT | All four `LeadCsvOwnerlessReason` values produced by distinguishable branches; both-empty-on-existing-owned-lead is the only case suppressed from the list (matches the spec's explicit carve-out). Tests cover all four reasons plus the preserve-silently case — pass. |
| Authorization (ADMIN + ASISTENTE_GERENCIA_OPERATIVA) | 3/3 | COMPLIANT | Both `csv-import/route.ts` and `csv-template/route.ts` independently check `ALLOWED_ROLES = [ADMIN, ASISTENTE_GERENCIA_OPERATIVA]`, return 401 (no session) / 403 (other role) / proceed otherwise. Route tests — pass. |
| Audit Logging With Real Importing User | 1/1 | COMPLIANT | `actor.email` (from `session.user.email`) passed to every `logAuditEvent` call; never `'crm-sync@system'`. Test asserts this explicitly — pass. |
| No All-or-Nothing Transaction | 1/1 | COMPLIANT | Same evidence as Row-Level Tolerance; no `prisma.$transaction` anywhere in the service. |

## Spec Compliance Matrix — `lead-funnel-columns` delta (1 requirement / 3 scenarios)

| Requirement | Scenarios | Status | Evidence |
|---|---|---|---|
| CSV Import Entry Point on the Funnel Columns Page | 3/3 | COMPLIANT | `page.tsx` mounts `<LeadCsvImportPanel />` unconditionally (server component performs no role gate on this page itself, matching the widened-authorization intent — the underlying API routes are the actual gate). Column CRUD table is unaffected. Panel renders rejected/ownerless/WON-locked sections distinctly. Tests: `lead-csv-import-panel.test.tsx` — pass. |

## Targeted Deep-Dive Findings (per verification brief)

1. **`resolveFunnelColumnByName` never uses `normalizeFunnelStatusKey` / never falls back to "Sin mapear"** — CONFIRMED by source read (`resolve-funnel-column-by-name.ts` has zero references to normalization or fallback columns) and by a dedicated test asserting the absence of that import.
2. **`unresolved → OPEN` branch of `resolveOutcomeStatus` is genuinely unreachable on the import path** — CONFIRMED structurally, not just by test assumption: the service only ever calls `resolveOutcomeStatus(outcomeStatusResult.value, existing?.outcomeStatus)`, and `outcomeStatusResult.value` is produced exclusively by `parseLeadOutcomeStatus`, whose return type is restricted to the 4 recognized tokens (rejected rows `continue` before reaching this call). `resolveOutcomeStatus`'s own `normalizeRaw` will always find a match for those 4 values, so `unresolved` is always computed `false` by construction, independent of any test's assumption.
3. **Owner resolution order (email → name → ownerless), name-miss never clears an existing owner** — CONFIRMED by code read of `resolveRowOwner()`: the `emailResolvedOwnerId` value (`undefined`=preserve, `null`=clear, `number`=matched) is preserved unchanged on every failed/ambiguous name branch; only a `matched` name result overrides it. This exactly matches the pseudocode in design.md Amendment A.
4. **`lead-sync.service.ts` is genuinely intact** — CONFIRMED: `git diff main...feat/import-leads -- src/features/leads/services/lead-sync.service.ts` shows a diff, but `git log --follow` on that file attributes it entirely to a separate, already-merged commit (`feat(leads): sync historical timestamps and admin lead delete`, via `develop`), predating and unrelated to this change. No `resolveOwnerByName` or CSV-import logic exists in that file (grep-confirmed), and a dedicated isolation test (`lead-sync.service.test.ts` — "the webhook path never references resolveOwnerByName") passes.
5. **Template has exactly 11 headers in the correct order** — CONFIRMED by direct read of `LEAD_CSV_HEADERS` in `lead-csv-template.ts`: `id_externo_crm, nombre, apellido, telefono, correo, columna_funnel, estado, fecha_creacion, origen, propietario_correo, propietario_nombre`.
6. **In-file duplicate `id_externo_crm` rejected correctly** — CONFIRMED: `seenExternalCrmIds` Set check runs before any DB call/upsert, first occurrence proceeds, later occurrences rejected with an explicit duplicate-in-file reason.
7. **Authorization applied on both new endpoints** — CONFIRMED: both routes independently define and check `ALLOWED_ROLES = [UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA]` with 401/403 handling.

## Issues

**CRITICAL**: None.

**WARNING**: None.

**SUGGESTION**:
1. When `propietario_nombre` is supplied but unmatched/ambiguous on a row whose existing lead already has an owner, the row is still added to `ownerlessLeads` (owner is correctly preserved, never cleared) even though the lead is not actually left without an owner. This is a direct, faithful implementation of design.md's Amendment A pseudocode (which reports the name-failure reason unconditionally, unlike the both-empty case which is explicitly suppressed when an owner is preserved) and is exercised by a passing test (`lead-csv-import.service.test.ts` — "a name typo never clears an existing owner"). It does not violate any spec requirement, but the admin-facing "ownerless" label is slightly misleading for this one sub-case; worth a UX note if raised in a future iteration, not a blocker for this change.

## Next Recommended

`sdd-archive` — all spec requirements verified compliant with passing runtime evidence; no CRITICAL or WARNING issues found. Archive-time tasks (CHANGELOG.md entry, package.json bump 1.34.1 → 1.35.0) remain correctly pending per tasks.md Phase 4.
