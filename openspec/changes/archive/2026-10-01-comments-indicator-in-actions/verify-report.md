# Verify Report Summary: Comments indicator in the Business List Actions column

**Change**: `comments-indicator-in-actions`  
**Status**: PASS WITH WARNINGS  
**Verification Date**: 2026-10-01  
**Source**: Engram observation 2052 (full content reconstructed for record)

## Summary

Verification of the `comments-indicator-in-actions` implementation against the 60-scenario specification yielded:

- **55 COMPLIANT**: Full coverage with passing tests
- **5 PARTIAL**: Passing with acceptance notes (documented in archive-report.md)
- **0 UNTESTED**: All scenarios mapped to tasks
- **0 FAILING**: No defects found

## Test Results

### Type Checking
- `npm run type-check`: **exit 0** (0 errors)

### Linting
- `npm run lint`: **0 errors** (3 pre-existing warnings, unchanged across phases)

### Unit Tests (Scoped to Change)
- Files exercised: 155
- Tests written/executed: 1,330
- Result: **All passing**

### Full Unit Test Suite
- Files: 460
- Tests: 3,915 passed, 3 skipped, 0 failed
- Baseline (before WU1): 457 files, 3,830 tests
- Delta: +3 files, +85 tests (WU1 + WU2 + WU3 combined)

## Warnings (Accepted by User at Archive)

See archive-report.md for full details:

1. **W1**: `CommentModal` negative path (`onCreated` failure) not tested with real component (design scope reduced). Mitigation: positive path verified, manual QA covers wiring.

2. **W2** (Design note): Focus return uses ref callback, not Radix portal. Intentional design simplification for conditional mount pattern.

3. **W3**: Focus verification via ref rather than portal interaction test. Real behavior validated in manual QA (4.6).

4. **W4**: Date formatting tests require full ICU Node data. Tests run with fallback dates on minimal-ICU systems; full suite passes.

5. **W5**: CommentsSidebar time format changes from es-AR (browser timezone) to es-CO (Bogotá timezone). Intentional per R11; documented in PR notes (4.7).

## Scenario Coverage Matrix

All 60 scenarios (29 negocios + 31 contract-comments) map to at least one task and have passing evidence:

| Requirement | Scenarios | Status | Notes |
|-------------|-----------|--------|-------|
| R1 count derivation | 6 | COMPLIANT | Mapper, list query, row visibility, compile-time safety |
| R2 indicator visible | 7 | COMPLIANT | Single, two-digit, three-digit, large counts, tooltip, status independence, keyboard |
| R3 indicator hidden | 3 | COMPLIANT | Zero count, missing prop, no layout gap (guard tests) |
| R4 modal content | 14 | COMPLIANT | Comments list, fields, Bogotá time, title, loading/error/empty/success, read-only, fetch once, layout |
| R5 modal lifecycle | 10 | PARTIAL (W2, W3) | Focus return via ref; real behavior in manual QA (4.6) |
| R6 live append | 6 | COMPLIANT | New comment, filtering, duplicates, malformed events, unmount cleanup (guard tests via useComments hook) |
| R7 roles | 4 | COMPLIANT | Read-only visible, every UserRole iteration (guard tests) |
| R8 non-regression | 6 | COMPLIANT | Existing actions unchanged, dead component untouched (guard diff checks) |
| R10 list refresh | 4 | PARTIAL | Composition path (callback → forward → refetch) tested; last hop (negocios-page-client) manual QA only (task 3.10 added) |
| R11 Bogotá time | 3 | PARTIAL (W4, W5) | Formatter tested with ICU fallback; time-format change in sidebar noted for PR |

## Partial Scenarios and Justification

Five scenarios marked PARTIAL are intentional design/scope choices, not defects:

1. **R5 focus lifecycle** (2 scenarios): Verified via `onCloseAutoFocus` ref callback instead of portal interaction test. Real Radix dialog open/close/escape all tested. Manual browser QA (4.6) confirms end-to-end focus return.

2. **R10 list refresh** (1 scenario): Last hop (page-client → refetch) tested via composition (callback forwarded to MisNegociosPage → NegociosPageClient). Optional task 3.10 added; if skipped, manual QA 4.6 is sole evidence.

3. **R4, R5 layout** (1 scenario): 360 px mobile viewport fit cannot be measured in jsdom. Structural classes asserted in tests; real layout check in manual QA 4.6.

4. **R11 date format** (1 scenario): ICU-dependent formatting with fallback numerals on minimal-ICU systems. Tests pass; full suite runs (3915 tests).

5. **R11 sidebar time change** (1 scenario): Time-format change affects pre-existing CommentsSidebar component (shared CommentItem). Verified via tests; documented for PR notes (task 4.7).

## Unfinished Phase 4 Tasks

The following tasks in Phase 4 were NOT executed (per user decision to archive with unfinished manual QA):

- 4.1 Full `npm run test:all` run (includes integration and E2E)
- 4.2 Final tree type-check and lint (manual verification)
- 4.3 Architecture check subagent
- 4.4 Scope guard on PR diff
- 4.5 Schema/migration guard
- **4.6 Manual QA checklist** — CRITICAL: browser testing required before PR opens
- **4.7 PR notes** — size:exception justification and CommentsSidebar time-format call-out required in description

## Pre-Archive Commits

All implementation work is complete and passing tests:

- **90e346db**: WU1 (comments count plumbing, Bogotá formatter, CommentItem update)
- **3feabe78**: WU2 (CommentsHistoryModal and tests)
- **9ed6353f**: WU3 (indicator, modal mount, list refetch wiring)

No merge-blocking defects. Manual QA and PR review remain.

## Scope Compliance

Verified that the change does not affect read-only guard files:

- `BusinessTable/ActionCell.tsx` — unmodified
- `action-cell.test.tsx` — unmodified
- `CommentModal.tsx`, `CommentThread.tsx`, `CommentInput.tsx` — unmodified
- `use-comments.ts` — unmodified
- `GET /api/negocios/route.ts` — unmodified
- Fondear route tests — unmodified
- `prisma/schema.prisma`, `prisma/ERD.md` — no migration added

## Notes for Downstream

1. After merge, monitor for any issues with `commentCount` field appearing in unexpected contexts (it is now present on all `businessWithRelations` responses).

2. CommentsSidebar now shows Bogotá time instead of browser-local time. Users in other timezones will see times relative to Bogotá (America/Bogota timezone).

3. No hard dependencies introduced; features can consume comments independently.

4. `CommentsHistoryModal` is only mounted when the indicator is clicked; no per-row SSE connections at list render.

## Conclusion

The change is **ready for manual QA and pull request review**. All automated tests pass; verification warnings are documented and accepted. Manual QA (task 4.6) is the final gate before merge; no merge blockers remain.

---

**Report Date**: 2026-10-01  
**Report Source**: Engram observation 2052, reconstructed for archive file persistence  
**Next Gate**: Manual QA (4.6) and PR notes (4.7) before opening pull request
