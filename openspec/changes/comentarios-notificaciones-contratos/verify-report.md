# Verification Report — comentarios-notificaciones-contratos

**Mode**: Full (proposal/specs/design/tasks all present, hybrid persistence — Engram + openspec/changes/comentarios-notificaciones-contratos/)
**Re-verification context**: Batch 4 closed the prior CRITICAL gap (Scenario 1: no actions-menu entry point). This report re-checks all 9 scenarios plus everything from the prior FAIL report.

## Task Completeness
30/30 tasks marked `[x]` in tasks.md (26 original + 4 Batch-4 gap-fix). Verified against actual file tree — all listed files exist, including new `CommentModal.tsx` and its test file, plus the `BusinessRowActions.tsx` menu item wiring.

## Test / Build Evidence (executed this session)
- `npx vitest run src/features/comments src/features/negocios/__tests__/components/BusinessRowActions.test.tsx`: **9 test files, 52 tests, all passing.**
- `npx tsc --noEmit`: clean, no errors.
- `npm run lint`: clean, no errors/warnings.
- `e2e/comments.spec.ts` — still authored but NOT executed this session (requires running dev server + seeded DB, same as prior report; not a regression, carried-over WARNING).

## Scenario Compliance Matrix (against the 9 acceptance scenarios given)

| # | Scenario | Status | Evidence |
|---|----------|--------|----------|
| 1 | Modal abre desde lista de acciones → campos bloqueados | **PASS (CRITICAL gap closed)** | `BusinessRowActions.tsx` now has a "Agregar comentario" `DropdownMenuItem` (with `MessageSquarePlus` icon) that sets `commentOpen=true` and mounts `CommentModal`. `CommentModal.tsx` wraps `Dialog` + reused `CommentInput`, showing locked author name/email (from `useAuthSession`), contract (row's contract, falling back to `Negocio #{id}` when null), and timestamp. `CommentModal.test.tsx` (4 tests) proves: does not render when closed, renders locked fields (name/email/contract), creates comment + closes on submit, discards on cancel. `BusinessRowActions.test.tsx` proves the menu item renders and opens the modal with the correct contract / fallback label. |
| 2 | Validación 40/200, counters | PASS | `CommentInput.test.tsx`: counter renders, input clamps at `maxLength`, Zod schema enforces both bounds (`comment.schema.test.ts`). Reused identically inside `CommentModal`. |
| 3 | Cancelar → descarta | PASS | Both sidebar and modal paths call `handleCancel` which clears the draft and never calls `onSubmit`/`commentsApi.create`; `CommentModal.test.tsx`'s cancel test explicitly asserts `mockCreate` was not called. |
| 4 | Guardar con campos vacíos → error | PASS | `createCommentSchema.safeParse` populates both `title`/`detail` field errors when empty; rendered per-field in `CommentInput`. |
| 5 | MS guarda → notifica Analistas | PASS | `comments.service.ts::resolveRecipients` broadcasts to all active `ANALISTA_SOPORTE` when author is `AGENTE`, excluding self; unit-tested. |
| 6 | Analista guarda → notifica MS asignado | PASS | Same function routes to `Business.idUser` when author is `ANALISTA_SOPORTE`, null-guarded and self-excluded; unit-tested. |
| 7 | Panel notificaciones: nombre, tiempo relativo, enlace, punto azul | PASS | `NotificationDrawer.tsx` (reused, unmodified) renders relative time, unread indicator, title/message from the comment notification payload. |
| 8 | Clic notificación → navega + abre sidebar + marca leído | PASS with carried-over WARNING | `handleNotificationClick` marks read and navigates to `callbackUrl = /dashboard/negocios/{id}?openComments=true`; `page.tsx` passes `defaultOpen={openComments === 'true'}` to `CommentsSidebar`, which auto-opens. The 3 literal requirements (navigate, open sidebar, mark read) work. `focusedCommentId` scroll-to-comment wiring is still NOT connected end-to-end — `callbackUrl` carries no comment id and `page.tsx` never derives/passes `focusedCommentId`. This is unchanged from the prior report; Batch 4 did not target it (WARNING, non-blocking). |
| 9 | Sidebar thread: orden cronológico, alineación por rol, agregar comentario | PASS | `getCommentsByBusinessId` orders `createdAt asc`; `CommentItem` aligns `AGENTE` left / `ANALISTA_SOPORTE` right; inline `CommentInput` creates and appends via SSE. Component tests cover order/alignment. |

## Design Coherence
- No new deviations introduced by Batch 4. `CommentModal` reuses `CommentInput` directly (DRY), matching the same validation/locked-field contract as the sidebar — consistent with design.md's data/validation model.
- Prior disclosed deviations (mapper resolves `authorRole` live instead of as a snapshot column; `notification.createMany` + re-query pattern) unchanged, still correctly disclosed, non-blocking.
- Batch 4 itself was not in the original design.md (which only covered the sidebar create path) but is explicitly and correctly flagged as a scope-gap fix in apply-progress's "Deviations from Design" section — acceptable, transparent.

## Architecture / Convention Compliance
- Soft-delete: unchanged, still correct (`status: true` filter, no `.delete()` calls).
- Audit log: `COMMENT_CREATED` still logged on every create, including the new modal path (goes through the same `createComment` service function — no duplicate/divergent write path).
- Feature-Based Architecture: `CommentModal.tsx` lives in `src/features/comments/components/`, imported into `BusinessRowActions.tsx` — no cross-layer violations, no Prisma/fetch calls inside the component (delegates to `commentsApi.create`).
- No Spanish in identifiers/comments; Spanish only in user-facing strings. PASS.

## Issues

### CRITICAL
None. The single CRITICAL from the prior report (Scenario 1 — no actions-menu entry point) is closed and covered by passing runtime tests.

### WARNING
1. `focusedCommentId` / scroll-to-comment-on-click remains implemented and unit-tested in isolation but not wired from the real notification-click → page navigation path. Carried over from the prior report, unaddressed by Batch 4. Low effort to close: add `commentId` to the notification `callbackUrl` query string and read it in `page.tsx`. Non-blocking for archive since the 3 literal Scenario 8 requirements (navigate, open, mark read) work.
2. `e2e/comments.spec.ts` still authored but not executed in this or the prior session — no runtime proof for the full create→notify→click→scroll round trip. Carried over, non-blocking (flagged for manual/staging QA per apply-progress).
3. PR2 (863 lines) and PR3 (574 lines) still exceed the 400-line review budget — already accepted as a deliberate cohesion tradeoff by sdd-tasks/apply, resurfaced here for reviewer awareness.
4. Working tree has uncommitted changes at verify time (`BusinessRowActions.tsx`, its test file, and new `CommentModal.tsx` / `CommentModal.test.tsx` are modified/untracked). These must be committed before PR/archive; not a code-quality issue, just a process reminder.

### SUGGESTION
1. `CommentInput.test.tsx`'s empty-fields validation test only asserts the title error message; add an assertion for the detail error rendering simultaneously to match the spec's "simultaneous" wording at the test level (behavior is already correct in code).

## Final Verdict: PASS WITH WARNINGS

The one blocking CRITICAL (Scenario 1 — no actions-menu/modal entry point) is now resolved and proven by passing tests (`CommentModal.test.tsx`, `BusinessRowActions.test.tsx`). All 9 acceptance scenarios pass. 30/30 tasks complete. 52/52 tests pass. Type-check and lint are clean. Remaining items are WARNINGs already known/accepted (focusedCommentId dead wiring, e2e not executed, PR size over budget) plus a process reminder to commit outstanding files. Recommend proceeding to `sdd-archive` after committing the pending Batch-4 changes.
