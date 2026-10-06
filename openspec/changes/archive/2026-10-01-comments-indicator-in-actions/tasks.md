# Tasks: Comments indicator in the Business List Actions column

> Change: `comments-indicator-in-actions`
> Branch: `feat/comments-indicator-in-business-list`
> Status: DRAFTED, awaiting the user's validation before apply
> Inputs: `proposal.md`, `specs/negocios/spec.md` (R1-R3, R7, R8, R10), `specs/contract-comments/spec.md` (R4-R6, R11), `design.md` (Decisions 1-8, D1-D7), `state.yaml` decisions (a)-(e), OQ1-OQ4.
> Mode: Strict TDD (Vitest + Testing Library). Every implementation task is preceded by its failing-test (RED) task. Cycle per behavior: RED -> GREEN -> REFACTOR.
> Artifact language: English. Spanish appears only in quoted UI strings.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~738 (WU1 ~202, WU2 ~280, WU3 ~256), ~763 if optional task 3.10 is kept |
| 400-line budget risk | High (about 1.85x the budget) |
| Chained PRs recommended | No (the forecast is High, but the user rejected chained PRs in OQ3) |
| Suggested split | Single PR with the `size:exception` label and three work-unit commits (WU1 -> WU2 -> WU3), each independently green |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Notes on the guard lines:
- `Decision needed before apply: Yes`: the `single-pr` strategy requires the `size:exception` label to be confirmed before apply. The user already chose it (OQ3). The maintainer approval of the label is still outstanding and is required before merge.
- `Chained PRs recommended: No`: a High forecast normally recommends chained PRs, but each slice is under 400 lines and the user explicitly decided on a single PR (OQ3). This is a recorded user decision, not an omission.

### Authored changed-lines forecast per work unit (additions + deletions, approximate)

| Unit | Production code and docs | Tests and fixtures | Subtotal | Share of 400 budget |
|------|-------------------------:|-------------------:|---------:|--------------------:|
| WU1 count plumbing, Bogotá formatter, `CommentItem` | ~45 | ~157 | ~202 | 0.51x |
| WU2 `CommentsHistoryModal` | ~80 | ~200 | ~280 | 0.70x |
| WU3 indicator, wiring, list refresh | ~58 | ~198 | ~256 | 0.64x |
| **Total (design forecast)** | **~183** | **~555** | **~738** | **1.85x** |
| Optional task 3.10 (page-client refetch test, not in the design forecast) | 0 | ~25 | ~25 | |
| **Total with 3.10** | | | **~763** | **1.91x** |

### Size exception justification (for the PR description)

- About 75% of the diff is tests and fixtures. The count comes from roughly 60 validated scenarios (29 negocios, 31 contract-comments); each needs a RED test under Strict TDD.
- The production code is about 183 lines across 12 files, with no new endpoint, no schema change, and no migration.
- The change cannot be reduced without dropping validated scenarios; trimming tests to fit the budget was explicitly not proposed (design, "Budget forecast").
- The work is split into three autonomous commits, each under 400 lines and each green on its own (tests, `npm run type-check`, `npm run lint`), so a reviewer can review commit by commit. Rollback is `git revert` of the commits in reverse order (WU3, then WU2, then WU1).
- The `size:exception` label needs maintainer approval before merge.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| WU1 | `GET /api/negocios` entities carry `commentCount`; `CommentItem` shows Bogotá date and time via the shared `formatDateTimeBogota` | Commit 1 of the single PR | `npm run test:unit -- src/features/negocios/__tests__/mappers src/features/negocios/__tests__/lib/map-business-to-table-row.test.ts src/app/api/negocios/__tests__/business-list.route.test.ts src/features/shared/__tests__/lib/format-date.test.ts src/features/comments/__tests__/CommentItem.test.tsx src/features/comments/__tests__/CommentsSidebar.test.tsx` | N/A as a runtime scenario (no UI is added). Manual spot check: `GET /api/negocios` JSON in `npm run dev` shows `commentCount` on each entity, and the detail-page comments sidebar shows Bogotá time | Revert commit 1. The additive `commentCount` field is ignored by clients. `CommentItem` returns to browser-local time |
| WU2 | Read-only `CommentsHistoryModal`, fully tested, not wired anywhere yet | Commit 2 of the single PR | `npm run test:unit -- src/features/comments/__tests__/CommentsHistoryModal.test.tsx` | N/A as a runtime scenario (the component is not mounted by any screen until WU3). Real Radix dialog and a fake `EventSource` in the tests | Revert commit 2. Nothing imports the component yet, so the revert is isolated |
| WU3 | Indicator in `BusinessRowActions`, modal mount, list refresh after "Agregar comentario" | Commit 3 of the single PR | `npm run test:unit -- src/features/negocios/__tests__/components/BusinessRowActions.test.tsx src/features/negocios/components/__tests__/BusinessTableSection.comments.test.tsx` | Manual QA in `npm run dev` (checklist in task 4.6): indicator on a business with comments, modal open/close, add a comment and see the count refresh | Revert commit 3. The list returns to its current look and the history modal becomes unused |

## Conventions applied to every task

- Strict TDD evidence: for each RED task record the observed failing run (command and failing test names) before starting its GREEN task; for each GREEN task record the passing run. Tests that are characterization or guard tests (green on arrival by design) are labeled "guard" and must say so in the evidence.
- Coding rules from `CLAUDE.md`: English identifiers, comments, file names, and test descriptions; Spanish only in quoted UI strings; React 19 patterns (no `useMemo`/`useCallback`); strict TypeScript (no `any`); colocated tests.
- A backticked path on a checkbox line is an edit target. Paths that a task only reads carry `(read-only)`.
- Commit messages follow Conventional Commits and carry NO `Co-Authored-By` line and no AI attribution.
- Not applicable to this change (stated so nobody adds work): soft-delete and `AuditLog` rules (no data mutation is added; comment creation already logs `COMMENT_CREATED`), `prisma/ERD.md` (see task 0.2), `CHANGELOG.md` and `package.json` (archive time only, see task 4.8).

## Phase 0: Baseline and guards

- [x] 0.1 Record the baseline before any edit (no file is changed)
  - Covers: evidence for "known environmental failures" (not a requirement).
  - Do: confirm the branch is `feat/comments-indicator-in-business-list`; run `npm run type-check`, `npm run lint`, and `npm run test:unit`; write down any pre-existing failures so they are never attributed to this change.
  - Verify: the three commands run; failures (if any) are listed in the apply progress notes.
  - EVIDENCE: branch confirmed. `npm run type-check` exit 0. `npm run lint` exit 0 (0 errors, 3 pre-existing warnings, e.g. `use-production-kpis.ts` exhaustive-deps). `npm run test:unit`: 457 files passed, 3830 tests passed, 3 skipped, 0 failures. No pre-existing failures.
- [x] 0.2 Guard: schema and ERD are not part of this change (no file is changed)
  - Covers: R1 ("no schema change, no migration"), CLAUDE.md ERD rule.
  - Statement: `prisma/ERD.md` and `prisma/schema.prisma` are NOT affected. The count is a filtered `_count` relation over the existing `Comment` model (`status Boolean`, index `[businessId, createdAt]`); there is no new model, field, FK, or enum, so the ERD rule is not triggered.
  - Verify (also re-checked in 4.5): `prisma/schema.prisma` (read-only) and `prisma/ERD.md` (read-only) have no diff.
- [x] 0.3 Guard: dead code and out-of-scope files must not be touched (no file is changed)
  - Covers: R8 scenario "Dead component untouched".
  - Files that MUST stay unmodified for the whole change: `src/features/negocios/components/BusinessTable/ActionCell.tsx` (read-only), `src/features/negocios/__tests__/components/action-cell.test.tsx` (read-only), `src/features/comments/components/CommentModal.tsx` (read-only), `src/features/comments/components/CommentThread.tsx` (read-only), `src/features/comments/components/CommentInput.tsx` (read-only), `src/features/comments/hooks/use-comments.ts` (read-only), `src/app/api/negocios/route.ts` (read-only), and the three fondear route tests (read-only, design D1): `src/app/api/negocios/[id]/fondear/__tests__/route.test.ts`, `src/app/api/negocios/[id]/fondear-aportes/__tests__/route.test.ts`, `src/features/negocios/__tests__/api/fondear-aportes.route.test.ts` (all read-only).
  - Verify: re-run the diff check in tasks 1.13, 2.8, 3.13 and 4.5 (`git diff --stat` over those paths must be empty).

## Phase 1 (WU1): Count plumbing, shared Bogotá formatter, `CommentItem`

Commit 1. Covers R1, R11 and the Bogotá part of R4. No UI is added.

- [x] 1.1 RED: mapper exposes `commentCount`
  - Files: `src/features/negocios/__tests__/fixtures/mock-prisma-business.ts`, `src/features/negocios/__tests__/mappers/business-entity.mapper.test.ts`
  - Covers: R1 scenarios "Mapper exposes the active comment count", "Business without comments maps to zero".
  - RED test: add `comments: 0` to the `_count` of the `mock-prisma-business.ts` fixture (line ~38) and to the three inline `_count` overrides in the mapper test (lines ~214, 228, 242). Add two tests: `_count.comments = 12` -> `prismaBusinessToEntity(...).commentCount === 12`; `_count.comments = 0` -> `commentCount === 0` and `typeof commentCount === 'number'`.
  - Verify RED: `npm run test:unit -- src/features/negocios/__tests__/mappers/business-entity.mapper.test.ts` fails on the two new tests (`commentCount` is `undefined`).
  - EVIDENCE: RED observed (`npm run test:unit -- ...business-entity.mapper.test.ts`): 2 new tests failed (`expected undefined to be 12`, `expected undefined to be +0`); fixture and 3 inline `_count` overrides updated.
- [x] 1.2 RED: list query selects only active comments
  - File: `src/app/api/negocios/__tests__/business-list.route.test.ts`
  - Covers: R1 scenario "Only active comments are counted" (query part).
  - RED test: reuse the existing `prisma.business.findMany` mock and assert it is called with `include: expect.objectContaining({ _count: { select: expect.objectContaining({ comments: { where: { status: true } } }) } })`. Add a short comment cross-referencing `buildBusinessListWhere` and `negocios-list-hierarchy.test.ts` for "Count respects existing list visibility" (no new scoping is added).
  - Verify RED: `npm run test:unit -- src/app/api/negocios/__tests__/business-list.route.test.ts` fails on the new assertion.
  - EVIDENCE: RED observed (`...business-list.route.test.ts`): new test failed (findMany include `_count.select` lacked `comments`). Guard comment about `buildBusinessListWhere` added in the test.
- [x] 1.3 GREEN: add the filtered comments count to `businessWithRelations`
  - File: `src/features/negocios/types/business-prisma.types.ts`
  - Covers: R1 (Decision 1).
  - Change: add `comments: { where: { status: true } }` to `_count.select`, next to `supports: { where: { status: true } }`. `PrismaBusinessWithRelations` then infers `_count.comments: number`.
  - Verify GREEN: the 1.2 test passes (`npm run test:unit -- src/app/api/negocios/__tests__/business-list.route.test.ts`).
  - EVIDENCE: GREEN: `business-list.route.test.ts` passed (with 1.4 run together: 2 files, 53 tests passed).
- [x] 1.4 GREEN: `commentCount` on `BusinessEntity` and in the mapper
  - Files: `src/features/negocios/types/business-entity.types.ts`, `src/features/negocios/mappers/business-entity.mapper.ts`
  - Covers: R1 (Decision 2).
  - Change: add `/** Number of active (status = true) comments on this business */ commentCount: number` to `BusinessEntity`; map `commentCount: prisma._count.comments` in `prismaBusinessToEntity`.
  - Verify GREEN: the 1.1 tests pass (`npm run test:unit -- src/features/negocios/__tests__/mappers/business-entity.mapper.test.ts`).
  - EVIDENCE: GREEN: `business-entity.mapper.test.ts` passed (2 files, 53 tests passed, 0 failed).
- [x] 1.5 RED: table-row mapper propagates the count and exports the placeholder constant
  - File: `src/features/negocios/__tests__/lib/map-business-to-table-row.test.ts`
  - Covers: R1 scenario "Count reaches the Actions column" (mapper part); design Decision 7 (named placeholder).
  - RED test: add `commentCount: 0` to the `createBusinessEntity` builder. Add: an entity with `commentCount = 145` maps to a row with `commentCount === 145`; `EMPTY_CONTRACT_PLACEHOLDER` is exported and equals `'-'`; an entity with a null or empty contract maps to `row.contract === EMPTY_CONTRACT_PLACEHOLDER`.
  - Verify RED: `npm run test:unit -- src/features/negocios/__tests__/lib/map-business-to-table-row.test.ts` fails (`commentCount` undefined; constant import is `undefined`).
  - EVIDENCE: RED observed (`map-business-to-table-row.test.ts`): 4 failed / 6 passed (`expected undefined to be 145`, `EMPTY_CONTRACT_PLACEHOLDER` undefined, 2 empty-contract cases).
- [x] 1.6 GREEN: `commentCount` on the table-row `Business` and in `mapBusinessToTableRow`
  - Files: `src/features/negocios/types/business.types.ts`, `src/features/negocios/lib/map-business-to-table-row.ts`
  - Covers: R1 (Decisions 2 and 7).
  - Change: add `commentCount: number` to the table-row `Business`; in the mapper add `commentCount: b.commentCount`, `export const EMPTY_CONTRACT_PLACEHOLDER = '-'` and `contract: b.contract || EMPTY_CONTRACT_PLACEHOLDER`.
  - Verify GREEN: the 1.5 tests pass (`npm run test:unit -- src/features/negocios/__tests__/lib/map-business-to-table-row.test.ts`).
  - EVIDENCE: GREEN: `map-business-to-table-row.test.ts` 10/10 passed.
- [x] 1.7 Compile-time RED then GREEN: update every non-cast fixture that builds `BusinessEntity` or the table-row `Business`
  - Files: `src/features/negocios/__tests__/fixtures/mock-business.ts`, `src/features/shared/__tests__/fixtures/mockBusinessData.tsx`, `src/features/negocios/components/__tests__/BusinessTableSection.novedad.test.tsx`, `src/features/negocios/components/__tests__/BusinessTableSection.date-anchored.test.tsx`, `src/app/dashboard/negocios/__tests__/negocios-page-client.fondear-confirmation.test.tsx`
  - Covers: R1 (compile-time safety, Decision 2 fallout list; also used by `src/stories/DataTable.stories.tsx` through `mockBusinessData.tsx`).
  - RED: run `npm run type-check` and confirm it now reports missing `commentCount` in exactly these literals.
  - GREEN: add `commentCount: 0` to the two builders in `mock-business.ts` (entity around line 85, table row around line 210), the six `Business` literals in `mockBusinessData.tsx`, `buildBusiness` in the two `BusinessTableSection.*.test.tsx` files, and `createBusinessRow` in the fondear-confirmation test.
  - Do not touch: objects cast with `as BusinessEntity` or `as unknown as BusinessEntity`, mocks of `prismaBusinessToEntity`, `create-business.ts`, `ActionCell.tsx`, `action-cell.test.tsx`, and the three fondear route tests (design D1).
  - Verify GREEN: `npm run type-check` passes; `npm run test:unit -- src/features/negocios/components/__tests__/BusinessTableSection.novedad.test.tsx src/features/negocios/components/__tests__/BusinessTableSection.date-anchored.test.tsx src/app/dashboard/negocios/__tests__/negocios-page-client.fondear-confirmation.test.tsx` passes.
  - EVIDENCE: compile-time RED observed (`npm run type-check`): 11 TS2741/TS2322 errors in 5 files. After adding `commentCount: 0`: type-check 0 errors; `BusinessTableSection.novedad`, `.date-anchored`, `negocios-page-client.fondear-confirmation` tests: 3 files, 14 tests passed.
- [x] 1.8 RED: `formatDateTimeBogota` unit tests (new file)
  - File: `src/features/shared/__tests__/lib/format-date.test.ts`
  - Covers: R11, R4 scenario "Date and time are shown in Bogotá time".
  - RED test: with `vi.stubEnv('TZ', 'UTC')` and, in a second case, `'Asia/Tokyo'` (restore with `vi.unstubAllEnvs()`), `formatDateTimeBogota('2026-09-30T02:30:00Z')` normalized (replace U+00A0 and U+202F with a plain space) matches `/29 sept?\.? 2026/` and `/9:30\s?p\.\s?m\./`; a `Date` input gives the same result; `null`, `undefined`, `''`, and an invalid string return `'—'`; `formatDateBogota` output is unchanged for one ISO sample and one date-only sample (guard, green on arrival). If the file already exists, append instead of overwriting.
  - Verify RED: `npm run test:unit -- src/features/shared/__tests__/lib/format-date.test.ts` fails because `formatDateTimeBogota` is not exported.
  - EVIDENCE: RED observed (`format-date.test.ts`, new file): 7 failed (`formatDateTimeBogota is not a function`), 2 guard tests (`formatDateBogota`) green on arrival. Deviation: guard expectations are `29/09/2026` and `30/09/2026` (observed es-CO "medium" output with this ICU), and the date regex tolerates both `29/09/2026` and `29 sept 2026`.
- [x] 1.9 GREEN: add `formatDateTimeBogota` to the shared date module
  - File: `src/features/shared/lib/format-date.ts`
  - Covers: R11 (Decision 5).
  - Change: add the exported function exactly as specified in design Decision 5 (`es-CO`, `dateStyle: 'medium'`, `timeStyle: 'short'`, `timeZone: BOGOTA_TZ`, `'—'` for empty or invalid input) with its doc comment. Do not change `formatDateBogota`.
  - Verify GREEN: the 1.8 tests pass (`npm run test:unit -- src/features/shared/__tests__/lib/format-date.test.ts`).
  - EVIDENCE: GREEN: `format-date.test.ts` 9/9 passed (first GREEN run failed 2 cases on the `29 sept 2026` regex; the date part renders as `29/09/2026, 9:30 p. m.` on this runtime, so the regex was widened, implementation unchanged).
- [x] 1.10 RED: `CommentItem` and `CommentsSidebar` show Bogotá date and time
  - Files: `src/features/comments/__tests__/CommentItem.test.tsx`, `src/features/comments/__tests__/CommentsSidebar.test.tsx`
  - Covers: R11 scenarios "`CommentItem` shows Bogotá date and time regardless of browser timezone", "Detail-page sidebar shows Bogotá time", "Other `CommentItem` content is unchanged".
  - RED test (`CommentItem`): with `createdAt = 2026-09-30T02:30:00Z`, assert the Bogotá date and time (same normalization and regexes as 1.8) under `TZ=UTC` and under `TZ=Asia/Tokyo`. Add one guard test (green on arrival): a detail with a URL and line breaks still renders author, role label, title, link, and line breaks. The existing 5 tests do not assert the date text and stay as they are.
  - RED test (`CommentsSidebar`): with a comment of the same `createdAt` in a UTC runtime, the sidebar shows the Bogotá date and time; the existing loading, error, empty, and success tests stay unchanged (non-regression).
  - Verify RED: `npm run test:unit -- src/features/comments/__tests__/CommentItem.test.tsx src/features/comments/__tests__/CommentsSidebar.test.tsx` fails on the new Bogotá assertions only.
  - EVIDENCE: RED observed (`CommentItem.test.tsx`, `CommentsSidebar.test.tsx`): 3 failed (UTC, Asia/Tokyo, sidebar) / 12 passed; the URL and line-break guard test was green on arrival.
- [x] 1.11 GREEN: `CommentItem` uses the shared formatter
  - File: `src/features/comments/components/CommentItem.tsx`
  - Covers: R11 (Decision 5).
  - Change: delete the local `formatCommentDate` (`es-AR`, no timezone), import `formatDateTimeBogota` from `@/features/shared/lib/format-date`, and render `{formatDateTimeBogota(comment.createdAt)}`. No other markup or behavior changes.
  - Verify GREEN: the 1.10 tests pass (`npm run test:unit -- src/features/comments/__tests__/CommentItem.test.tsx src/features/comments/__tests__/CommentsSidebar.test.tsx`).
  - EVIDENCE: GREEN: `src/features/comments` 10 files, 61 tests passed.
- [x] 1.12 Docs: record the new helper in the date conventions guide
  - File: `docs/DATE_HANDLING_CONVENTIONS.md`
  - Covers: R11 (project "Date Handling" rule).
  - Change: add a row for `formatDateTimeBogota` in "La convención" and a row for `CommentItem.tsx` (migrated) in "Estado de migración".
  - Verify: read back both rows; `npm run lint` is not applicable to the markdown file.
  - EVIDENCE: `docs/DATE_HANDLING_CONVENTIONS.md`: added the `formatDateTimeBogota` convention row, updated the `format-date.ts` migration row, added the `CommentItem.tsx` migrated row.
- [x] 1.13 REFACTOR and WU1 gate
  - Files: none expected (only fix what the gate reveals in files already listed above).
  - Do: remove duplication or dead imports introduced in WU1; then run the gate: `npm run test:unit -- src/features/negocios src/features/shared src/features/comments src/app/api/negocios src/app/dashboard/negocios` (includes `negocios-list-hierarchy.test.ts` and the three `BusinessTableSection*` tests that mock `@/features/shared/lib/format-date` with only `formatDateBogota`, per Decision 5 note), `npm run type-check`, `npm run lint`.
  - Guard: `git diff --stat` over the paths listed in task 0.3 is empty.
  - Verify: all commands green (or only the failures recorded in 0.1).
  - EVIDENCE: REFACTOR: nothing to remove (local `formatCommentDate` already deleted, no dead imports). Gate: `npm run test:unit -- src/features/negocios src/features/shared src/features/comments src/app/api/negocios src/app/dashboard/negocios`: 153 files, 1265 tests passed; `npm run type-check` 0 errors; `npm run lint` 0 errors, 3 pre-existing warnings; `git diff --stat` on the task 0.3 read-only paths and `prisma/`: empty.
- [x] 1.14 Commit WU1 (forecast ~202 changed lines; authored, excluding generated files)
  - Stage everything from tasks 1.1-1.13.
  - Message: `feat(comments-indicator): add commentCount to business list and Bogota date-time formatter` with the body: `Select active comments in the business list _count, expose commentCount on BusinessEntity and the table-row model, add formatDateTimeBogota and use it in CommentItem. CommentsSidebar also shows Bogota time because it shares CommentItem.` No `Co-Authored-By`, no AI attribution.
  - Verify: `git show --stat HEAD` shows only the planned files and about 200 changed lines; record the commit hash in the apply progress notes.
  - EVIDENCE: commit `90e346db` (20 files, +263/-20), no openspec/ or docs/leads/ staged, no attribution trailer; the repo pre-commit hook (lint + type-check) passed.
## Phase 2 (WU2): Read-only `CommentsHistoryModal`

Commit 2. Covers R4, R5 (modal-level scenarios), R6 (modal-level scenarios). Depends on WU1 (`CommentItem` formatter). Not wired into any screen yet.

Test setup notes for 2.1, 2.3, 2.5: use the real Radix `Dialog` (do not mock it, so focus and Esc are real); mock `../lib/comments-api` (`list`); copy `FakeEventSource` from `src/features/comments/__tests__/use-comments.test.ts` (read-only); normalize U+00A0 and U+202F before asserting times.

- [x] 2.1 RED: modal content and data states (R4)
  - File: `src/features/comments/__tests__/CommentsHistoryModal.test.tsx` (new)
  - Covers: R4 scenarios "Modal lists all comments, oldest first", "Comment fields are displayed", "Date and time are shown in Bogotá time", "Title uses the contract number", "Title without contract", "Loading state", "Error state", "Retry after error", "Empty state", "Modal is read-only", "Data is requested only on open" (fetch exactly once on mount), "Long content does not break the layout".
  - RED test: render `<CommentsHistoryModal businessId={10} contract="CT-2026-0042" open onClose={fn} />`. Assertions: title `Comentarios — CT-2026-0042`; with `contract={null}` and `contract=""` the title is exactly `Comentarios` (no dash, no id); loading shows `Cargando comentarios…` and no entries or empty message; error shows the error text and a `Reintentar` button, retry goes loading -> two comments; `[]` shows `Todavía no hay comentarios en este contrato.`; three comments (T1 < T2 < T3) render in that order with author "Ana Pérez", role label, title "Falta soporte", detail "Se solicita comprobante del pago", and the Bogotá time; no `textbox`, no `Guardar`, no edit or delete control; `commentsApi.list` called once with `10`; a 200-character unbroken detail has the `break-words` class; structural classes `max-h-[85vh]`, `overflow-y-auto`, `min-h-0` are present (the 360 px layout cannot be measured in jsdom, see task 4.6).
  - Verify RED: `npm run test:unit -- src/features/comments/__tests__/CommentsHistoryModal.test.tsx` fails (module not found / component missing).
  - EVIDENCE: RED observed: suite failed to load (`Failed to resolve import "../components/CommentsHistoryModal"`), 0 tests ran. 14 tests written for R4 (order, fields, Bogota time under UTC and Asia/Tokyo, title with contract, title for null and empty contract, loading, error, retry, empty, read-only, fetch once, break-words, structural classes).
- [x] 2.2 GREEN: create `CommentsHistoryModal` with the four data states
  - File: `src/features/comments/components/CommentsHistoryModal.tsx` (new)
  - Covers: R4 (Decision 3).
  - Change: implement the props `{ businessId: number; contract: string | null; open: boolean; onClose: () => void; returnFocusRef?: React.RefObject<HTMLElement | null> }`; `const { state, refetch } = useComments(businessId)`; `Dialog` from `@/features/shared/ui/dialog` with `onOpenChange={(next) => { if (!next) onClose() }}`; `DialogContent className="sm:max-w-lg flex max-h-[85vh] flex-col overflow-hidden"`; title `Comentarios — {contract}` when `contract` is a non-empty string and `Comentarios` otherwise; body `<div className="min-h-0 flex-1 overflow-y-auto">` switching on `state.status` (`idle`/`loading` -> `Cargando comentarios…`; `error` -> destructive text plus `Reintentar` calling `refetch()`; `success` -> `<CommentThread comments={state.data} />`); footer `DialogClose` button `Cerrar`. No `CommentInput`, no `createComment`. Leave `returnFocusRef` unused until 2.4.
  - Verify GREEN: the 2.1 tests pass.
  - EVIDENCE: GREEN: `CommentsHistoryModal.test.tsx` 14/14 passed. First GREEN run had 1 failure caused by the test (not the component): `break-words` sits on the detail paragraph, not on the inner `LinkifiedText` element, so the assertion was changed to `.closest('p')`. Implementation adds `aria-describedby={undefined}` on `DialogContent` to avoid the Radix missing-description warning (same primitive as `CommentModal`, no visual effect).
- [x] 2.3 RED: modal lifecycle, focus, and resource release (R5, modal-level)
  - File: `src/features/comments/__tests__/CommentsHistoryModal.test.tsx`
  - Covers: R5 scenarios "Opens on click" (role `dialog`, accessible name equals the title), "Closes with the close control", "Closes with Esc", "Closes with outside click", "Focus management", "Resources released on close", "Reopening fetches fresh data".
  - RED test: a small harness component holds an external trigger button, a `useRef`, and `open` state, and renders `<CommentsHistoryModal ... returnFocusRef={ref} />` only while open (as `BusinessRowActions` will). Assert: `getByRole('dialog', { name: 'Comentarios — CT-2026-0042' })`; `Cerrar` calls `onClose` and the harness unmounts the dialog; `userEvent.keyboard('{Escape}')` closes; `pointerDown` on the overlay element closes; focus is inside the dialog after open; after close `await waitFor(() => expect(trigger).toHaveFocus())` (D6, Decision 4); the fake `EventSource` `close` is called on unmount; opening again after a close calls `commentsApi.list` a second time and shows a new comment.
  - Verify RED: the focus-return test fails (Radix default does not focus a trigger without `DialogTrigger`); Esc, overlay, and `Cerrar` may already pass because of Radix and are labeled guard tests in the evidence.
  - EVIDENCE: RED observed (`CommentsHistoryModal.test.tsx`): 9 new tests, 2 failed (`returns focus to the trigger after closing with the Cerrar control` and `... with the Escape key`: `expect(trigger).toHaveFocus()` timed out after ~1 s), 21/23 passed overall. Guard tests (green on arrival because Radix already provides the behavior): opens as dialog named by the title, Cerrar closes, Escape closes, overlay click closes, focus moves into the dialog on open, EventSource `close` called on unmount, reopening fetches again and shows the new comment. The harness mounts the dialog conditionally with an external trigger and `returnFocusRef`, as `BusinessRowActions` will.
- [x] 2.4 GREEN: explicit focus return through `onCloseAutoFocus`
  - File: `src/features/comments/components/CommentsHistoryModal.tsx`
  - Covers: R5 "Focus management" (Decision 4).
  - Change: `DialogContent onCloseAutoFocus={(event) => { if (returnFocusRef?.current) { event.preventDefault(); returnFocusRef.current.focus() } }}`.
  - Verify GREEN: `npm run test:unit -- src/features/comments/__tests__/CommentsHistoryModal.test.tsx` passes, including the 2.3 tests. If the conditional-mount focus return does not fire, apply the documented fallback (design Risk 2) and record it.
  - EVIDENCE: GREEN: `CommentsHistoryModal.test.tsx` 23/23 passed. The primary path works: `onCloseAutoFocus` with `preventDefault()` plus `returnFocusRef.current.focus()` returns focus on conditional unmount for both Cerrar and Escape, so the Risk 2 fallback was NOT needed.
- [x] 2.5 RED (guard) tests: live append while open (R6, modal-level)
  - File: `src/features/comments/__tests__/CommentsHistoryModal.test.tsx`
  - Covers: R6 scenarios "New comment for the same business is appended", "Event for another business is ignored", "Duplicate event is ignored", "Malformed event does not break the modal", "No live updates after closing". The scenario "Row badge is not live-updated" is covered in task 3.3.
  - Test: with the modal open for business 10 showing two comments, emit `comment-added` with `businessId = 10` and a new id (three comments, new one last); `businessId = 11` (unchanged); duplicate id `c1` (listed once); invalid JSON (unchanged, modal still works); after unmounting, emitting an event causes no state update and no `console.error` (spy).
  - Expected evidence: these behaviors come from the existing `useComments` hook, so the tests are expected to be green on arrival (guard tests). If any fails, treat it as a real defect in the modal composition and fix it in 2.2's file, not in `use-comments.ts` (read-only).
  - Verify: `npm run test:unit -- src/features/comments/__tests__/CommentsHistoryModal.test.tsx` passes.
  - EVIDENCE: guard tests, green on arrival as expected (no RED; behavior comes from the existing `useComments` hook): `CommentsHistoryModal.test.tsx` 28/28 passed (5 new: append same business at the end, ignore another business, no duplicate id, malformed JSON keeps list and a later valid event still appends, no state update and no `console.error` after unmount with `EventSource.close` called). No fix to the modal or the hook was needed.
- [x] 2.6 REFACTOR: share the `FakeEventSource` test helper only if both test files need it
  - Files: `src/features/comments/__tests__/fixtures/fake-event-source.ts` (new, only if extracted), `src/features/comments/__tests__/CommentsHistoryModal.test.tsx`
  - Do: if the copy of `FakeEventSource` in the new test is identical to the one in `use-comments.test.ts`, extract it into the fixture file and import it from the new test only. Do NOT edit `use-comments.test.ts` (keeps the diff small); if extraction would need that, keep the local copy and skip this task.
  - Verify: the modal test file still passes.
  - EVIDENCE: SKIPPED by the task's own condition, no fixture file created. The copy in the new test is NOT identical to the one in `use-comments.test.ts` (it adds `emitRaw` for the malformed-JSON guard test), and extracting a shared fixture would require editing `use-comments.test.ts` (read-only scope) to avoid duplicating the class. The local copy is kept; the modal test file still passes (28/28).
- [x] 2.7 REFACTOR and WU2 gate
  - Files: none expected (fix only what the gate reveals in files already listed above).
  - Do: re-read `CommentsHistoryModal.tsx` for SRP (one component, about 80 lines, no business logic beyond the `AsyncState` switch); run `npm run test:unit -- src/features/comments`, `npm run type-check`, `npm run lint`.
  - Verify: all green (or only failures recorded in 0.1).
  - EVIDENCE: REFACTOR: nothing to change (`CommentsHistoryModal.tsx` is 90 lines, one component, only the `AsyncState` switch and the title conditional, no derived value computed twice). Gate: `npm run test:unit -- src/features/comments`: 11 files, 89 tests passed; `npm run type-check` 0 errors; `npm run lint` 0 errors, the same 3 pre-existing warnings as the 0.1 baseline.
- [x] 2.8 Guard check and commit WU2 (forecast ~280 changed lines)
  - Guard: `git diff --stat` over the paths in task 0.3 is empty (especially `CommentModal.tsx`, `CommentThread.tsx`, `use-comments.ts`, `CommentInput.tsx`).
  - Message: `feat(comments): add read-only comments history modal` with the body: `Add CommentsHistoryModal composed from useComments and CommentThread with loading, error, empty and success states, explicit focus return, and live append through the existing SSE subscription. Not wired into the business list yet.` No `Co-Authored-By`, no AI attribution.
  - Verify: `git show --stat HEAD` lists only the modal, its test, and the optional fixture (about 280 changed lines); record the hash.
  - EVIDENCE: guard `git diff --stat` over the 0.3 read-only paths and `prisma/` was empty. Commit `3feabe78d7804ab7ec41e4479e5d6173b0009b8d`; `git show --stat` lists only `CommentsHistoryModal.tsx` (+90) and `CommentsHistoryModal.test.tsx` (+473), 563 insertions total (above the ~280 forecast because of the test file; covered by `size:exception`). No attribution trailers. Pre-commit hook (lint + type-check) passed.

## Phase 3 (WU3): Indicator, modal mount, list refresh

Commit 3. Covers R2, R3, R7, R8, R10 and the badge-not-live part of R5/R6. Depends on WU1 (`commentCount`, `EMPTY_CONTRACT_PLACEHOLDER`) and WU2 (`CommentsHistoryModal`).

Test setup notes for 3.1, 3.3, 3.5, 3.6: in `BusinessRowActions.test.tsx` mock `@/features/comments/components/CommentsHistoryModal` (renders `data-testid="comments-history-modal"`, exposes the received `contract` and a close button that calls `onClose`); extend the existing `CommentModal` mock to render buttons that call `onCreated` and `onClose`; mock `ViewComprobantesSheet` for the one-dialog scenario if it is not already isolated.

- [x] 3.1 RED: indicator visible and hidden (R2, R3)
  - File: `src/features/negocios/__tests__/components/BusinessRowActions.test.tsx`
  - Covers: R2 scenarios "Single comment", "Two-digit count", "Three-digit count is shown exactly", "Very large count is still exact", "Tooltip", "Indicator is independent of business status", "Keyboard operability"; R3 scenarios "Zero comments renders nothing", "Missing count is treated as zero", "No layout gap".
  - RED test: `commentCount` 1, 12, 145, 1000 -> button named `Ver comentarios (N)` with visible text exactly `N` (no cap) next to the icon; hover/focus shows the tooltip `Ver comentarios`; one row per status (VENTA_EFECTUADA, EMITIDO, FONDEADO, LIQUIDADO, CANCELADO) with `commentCount = 2` shows `2`; tab to the indicator and Enter or Space opens the (mocked) history modal. Hidden cases (guard tests, green on arrival): `commentCount = 0` and missing prop render no control matching `Ver comentarios`, no counter `0`, no error; the actions group at `commentCount = 0` has the same children count as with the prop omitted (no wrapper, spacer, or empty tooltip trigger).
  - Verify RED: `npm run test:unit -- src/features/negocios/__tests__/components/BusinessRowActions.test.tsx` fails on the visible-indicator cases; hidden cases pass.
  - EVIDENCE: RED 12 failed / 35 passed of 47 (hidden cases zero/undefined/no-wrapper green on arrival, as guards). Keyboard test needs the modal mount, so it went green at 3.4.
- [x] 3.2 GREEN: render the indicator in the actions group
  - File: `src/features/negocios/components/BusinessRowActions.tsx`
  - Covers: R2, R3 (Decision 8).
  - Change: add `commentCount?: number` to `BusinessRowActionsProps`; `const showCommentsIndicator = Number.isInteger(commentCount) && (commentCount ?? 0) > 0`; inside the `inline-flex items-center gap-1` group, after "Ver comprobantes" and before the "Más acciones" dropdown, render `Tooltip` + `TooltipTrigger asChild` + a ghost `Button size="sm" className="h-8 shrink-0 gap-1 px-2"` with `aria-label={\`Ver comentarios (${commentCount})\`}`, a lucide `MessageSquare` icon (`h-4 w-4 text-muted-foreground`, `aria-hidden`) and `<span className="text-xs font-medium tabular-nums">{commentCount}</span>`, and `TooltipContent` `Ver comentarios`. No `isReadOnly`, `userRole`, or status gate. Clicking sets `historyOpen` state (the mount is added in 3.4).
  - Verify GREEN: the 3.1 tests pass.
  - EVIDENCE: GREEN 46/47 passed; the remaining keyboard test depends on the 3.4 mount (expected).
- [x] 3.3 RED: history modal mount, contract mapping, independence (R4 title input, R5, R6, R8)
  - File: `src/features/negocios/__tests__/components/BusinessRowActions.test.tsx`
  - Covers: R5 scenarios "Not mounted while closed", "Opens on click", "Independent rows"; R6 scenario "Row badge is not live-updated"; R10 scenario "Comments from other users do not update the badge"; R8 scenario "Only one dialog at a time per row"; the contract input of R4 "Title uses the contract number" / "Title without contract" (Decision 7).
  - RED test: closed -> `queryByTestId('comments-history-modal')` is null and no `EventSource` is constructed; click -> the mock is mounted with `businessId` and `returnFocusRef` set; row contract `'-'` or `null` reaches the history modal as `contract: null`, a real contract (for example `CT-2026-0042`) reaches it unchanged, while the "Agregar comentario" dialog still receives its existing label (`'-'` stays `'-'`); two rendered rows, opening row A mounts only A's modal; while the modal is open, the badge text stays unchanged when no refetch occurs; close the history modal, then open "Ver comprobantes" -> only the sheet is mounted.
  - Verify RED: `npm run test:unit -- src/features/negocios/__tests__/components/BusinessRowActions.test.tsx` fails on the mount, mapping, and focus-ref tests.
  - EVIDENCE: RED 9 failed / 48 passed of 57 (mount, contract mapping, focus ref, independence).
- [x] 3.4 GREEN: mount the history modal, focus ref, contract mapping
  - File: `src/features/negocios/components/BusinessRowActions.tsx`
  - Covers: R4 (contract input), R5 (conditional mount, Decision 4), Decision 7.
  - Change: `const historyTriggerRef = useRef<HTMLButtonElement>(null)` placed on the indicator `Button`; `const [historyOpen, setHistoryOpen] = useState(false)`; import `EMPTY_CONTRACT_PLACEHOLDER` from `../lib/map-business-to-table-row`; `const historyContract = contract === EMPTY_CONTRACT_PLACEHOLDER ? null : contract`; render `{historyOpen && <CommentsHistoryModal businessId={businessId} contract={historyContract} open={historyOpen} onClose={() => setHistoryOpen(false)} returnFocusRef={historyTriggerRef} />}` as a sibling of the other modals. Do not change `commentContract` or the `CommentModal` mount.
  - Verify GREEN: the 3.3 tests pass and the 3.1 tests stay green.
  - EVIDENCE: GREEN 57/57 (3.1 keyboard test now passes too).
- [x] 3.5 Guard tests: roles and non-regression of existing actions (R7, R8)
  - File: `src/features/negocios/__tests__/components/BusinessRowActions.test.tsx`
  - Covers: R7 scenarios "Read-only role sees the indicator", "Read-only role can open the history", "Privileged role" (ADMIN, ANALISTA_SOPORTE, AGENTE), "Role is not provided"; R8 scenarios "Existing actions unchanged with indicator present", "Existing actions unchanged with indicator absent".
  - Test: CONSULTOR with `commentCount = 7` sees `Ver comentarios (7)`, can open the (mocked) modal, and still has no "Agregar comentario" item; iterate over every real `UserRole` value (ADMIN, DEFAULT, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE, AGENTE, CONSULTOR) and `userRole` undefined: the indicator is present; with `commentCount = 5` "Subir comprobante", "Ver comprobantes", the dropdown, and its items keep their accessible names and handlers; with `commentCount = 0` the rendered controls equal the pre-change output.
  - Expected evidence: green on arrival because the implementation intentionally has no role or status gate (guard tests). If any fails, fix the gate in `BusinessRowActions.tsx` rather than weakening the test.
  - Verify: `npm run test:unit -- src/features/negocios/__tests__/components/BusinessRowActions.test.tsx` passes.
  - EVIDENCE: guard tests, green on arrival (no role or status gate). One setup defect fixed in the test, not production: the real UploadComprobanteModal aria-hid sibling controls, so UploadComprobanteModal and ViewComprobantesSheet are mocked.
- [x] 3.6 RED: `onCommentCreated` fires only after a successful creation (R10, R8)
  - File: `src/features/negocios/__tests__/components/BusinessRowActions.test.tsx`
  - Covers: R10 scenarios "Count refreshes after creating a comment" (callback part), "First comment makes the indicator appear" (callback part), "Failed or dismissed creation does not refetch"; R8 scenario "Add-comment flow still works".
  - RED test: select "Agregar comentario" -> the `CommentModal` mock opens with its unchanged title/label; trigger the mock's `onCreated` -> `onCommentCreated` is called exactly once; trigger the mock's `onClose` (Cancel or dismiss) -> `onCommentCreated` is not called; the create dialog is not merged with the history modal.
  - Verify RED: `npm run test:unit -- src/features/negocios/__tests__/components/BusinessRowActions.test.tsx` fails because `onCreated` is not forwarded.
  - EVIDENCE: RED 1 real failure (onCommentCreated exactly once); 3 guard cases green on arrival (dismissed, unchanged label, not merged with history).
- [x] 3.7 GREEN: forward `onCommentCreated` to `CommentModal.onCreated`
  - File: `src/features/negocios/components/BusinessRowActions.tsx`
  - Covers: R10 (Decision 6).
  - Change: add `/** Called after a comment is created from "Agregar comentario" (list refetch) */ onCommentCreated?: () => void` to the props and pass `onCreated={onCommentCreated}` to the existing `CommentModal`. `CommentModal` itself is unchanged (it already calls `onCreated?.()` only after `commentsApi.create` resolves).
  - Verify GREEN: the 3.6 tests pass.
  - EVIDENCE: GREEN 64/64 in BusinessRowActions.test.tsx.
- [x] 3.8 RED: `BusinessTableSection` passes the count and forwards `onCommentCreated` (new test file)
  - File: `src/features/negocios/components/__tests__/BusinessTableSection.comments.test.tsx` (new)
  - Covers: R1 scenarios "Count reaches the Actions column" (table part) and "The count is part of the list query, with no extra requests"; R10 forwarding; R4 scenario "Data is requested only on open" (no request at list render).
  - RED test: real `DataTable` (as in `BusinessTableSection.novedad.test.tsx`), `vi.mock('../BusinessRowActions')` capturing props, `vi.mock` of `@/features/shared/lib/format-date` as in the sibling tests. A row with `commentCount = 145` -> `BusinessRowActions` receives `commentCount === 145`; the `onCommentCreated` passed to the section is received unchanged; rendering several rows calls `commentsApi.list` zero times and constructs no `EventSource`.
  - Verify RED: `npm run test:unit -- src/features/negocios/components/__tests__/BusinessTableSection.comments.test.tsx` fails (`commentCount` and `onCommentCreated` are not passed yet).
  - EVIDENCE: RED 2 failed (commentCount, onCommentCreated), 2 guards green (contract '-', no list call or EventSource at render).
- [x] 3.9 GREEN: wire the new props through `BusinessTableSection`
  - File: `src/features/negocios/components/BusinessTableSection.tsx`
  - Covers: R1, R10 (Decisions 2 and 6).
  - Change: add `onCommentCreated?: () => void` to `BusinessTableSectionProps`; pass `commentCount={row.commentCount}` and `onCommentCreated={onCommentCreated}` to `BusinessRowActions`. Keep `contract={row.contract ?? null}` unchanged (Decision 7).
  - Verify GREEN: the 3.8 tests pass and the existing `BusinessTableSection.*.test.tsx` tests stay green.
  - EVIDENCE: GREEN, src/features/negocios/components/__tests__ 5 files / 29 tests passed.
- [x] 3.10 RED (recommended; not in the design forecast, about +25 lines): page client refetches after a comment is created
  - File: `src/app/dashboard/negocios/__tests__/negocios-page-client.fondear-confirmation.test.tsx`
  - Covers: R10 scenarios "Count refreshes after creating a comment" and "First comment makes the indicator appear" (the last hop: `negocios-page-client.tsx` -> `useBusinesses().refetch`).
  - RED test: following the file's existing mocks, capture the `onCommentCreated` prop that `NegociosPageClient` passes down (through `MisNegociosPage`) and assert that calling it invokes the mocked `refetch` with `true` and does NOT call `refetchStats`. If this file's mocking makes the assertion impractical, record the reason in the apply notes and rely on 3.6, 3.8 and the manual QA in 4.6; the coverage matrix then marks the last hop as manual-only.
  - Verify RED: `npm run test:unit -- src/app/dashboard/negocios/__tests__/negocios-page-client.fondear-confirmation.test.tsx` fails on the new test.
  - EVIDENCE: RED 1 failed / 7 passed of 8 (refetch called 0 times). The existing MisNegociosPage mock was extended with an onCommentCreated trigger button.
- [x] 3.11 GREEN: pass `onCommentCreated` from the page client through `MisNegociosPage`
  - Files: `src/features/negocios/components/MisNegociosPage.tsx`, `src/app/dashboard/negocios/negocios-page-client.tsx`
  - Covers: R10 (Decision 6, D5).
  - Change: `MisNegociosPage.tsx` adds `onCommentCreated?: () => void` to `MisNegociosPageProps`, destructures it, and passes it to `BusinessTableSection` (pass-through only). `negocios-page-client.tsx` passes `onCommentCreated={() => { void refetch(true) }}` (background refetch, like the other row callbacks; no `refetchStats`).
  - Verify GREEN: the 3.10 test passes (or, if 3.10 was skipped, `npm run type-check` passes and the existing page-client tests stay green).
  - EVIDENCE: GREEN 8/8 in negocios-page-client.fondear-confirmation.test.tsx; refetch(true) called once, refetchStats not called.
- [x] 3.12 REFACTOR and WU3 gate
  - Files: none expected (fix only what the gate reveals in files already listed above).
  - Do: re-read `BusinessRowActions.tsx` for SRP and for any derived value computed twice; confirm `showCommentsIndicator` and `historyContract` are computed once; run `npm run test:unit -- src/features/negocios src/app/dashboard/negocios src/features/comments`, `npm run type-check`, `npm run lint`.
  - Verify: all green (or only failures recorded in 0.1).
  - EVIDENCE: `npm run test:unit -- src/features/negocios src/app/dashboard/negocios src/features/comments src/app/api/negocios`: 131 files, 1155 tests passed; type-check 0 errors; lint 0 errors, 3 pre-existing warnings (files untouched). REFACTOR: moved historyTriggerRef and showCommentsIndicator after the useState block; each derived value is computed once. Full `npm run test:unit`: 460 files, 3915 passed, 3 skipped, 0 failures (baseline 457 / 3830 / 3).
- [x] 3.13 Guard check and commit WU3 (forecast ~256 changed lines, ~281 with 3.10)
  - Guard: `git diff --stat` over the paths in task 0.3 is empty, in particular `src/features/negocios/components/BusinessTable/ActionCell.tsx` (read-only) and `src/features/negocios/__tests__/components/action-cell.test.tsx` (read-only) (R8 "Dead component untouched").
  - Message: `feat(negocios): show comments indicator and history modal in business list actions` with the body: `Render a message icon with the exact active comment count in BusinessRowActions (hidden at zero, visible to every role), open the read-only history modal on click, and refetch the list after a comment is created through Agregar comentario.` No `Co-Authored-By`, no AI attribution.
  - Verify: `git show --stat HEAD` lists only the planned files; record the hash.
  - EVIDENCE: `git diff --stat` over the 0.3 read-only paths, src/app/api/negocios, src/features/negocios/__tests__/api and prisma/ was empty. Commit `9ed6353f15486da1faaaf19e67ac56b0a99d907a`; 7 files, 543 insertions, 4 deletions (forecast ~281; covered by size:exception, test files are 489 of the lines). No attribution trailers. Pre-commit hook (lint + type-check) passed. openspec/ and docs/leads/ not staged.

## Phase 4: Final verification, PR preparation, archive reminder

- [ ] 4.1 Full unit test run
  - Command: `npm run test:unit`. Run `npm run test:integration` too if it exercises the list route (check `package.json`; record the decision). Before opening the PR the project rule is `npm run test:all && npm run lint`; if `test:all` includes Playwright and the environment is unavailable, record it as skipped with the reason instead of claiming a pass.
  - Verify: no new failures versus the baseline in 0.1.
- [ ] 4.2 Type-check and lint on the final tree
  - Commands: `npm run type-check`, `npm run lint`.
  - Verify: both clean; every fixture from Decision 2 compiles.
- [ ] 4.3 Architecture check
  - Do: run the `architecture-enforcer` subagent (project rule for changes in `src/features/`) over the new and modified files. Expected: no Prisma in routes beyond the pre-existing one, `comments` does not import from `negocios` (dependency goes `negocios` -> `comments`), no root-level `utils/` or `services/`.
  - Verify: no violations reported, or each reported item is triaged in the notes.
- [ ] 4.4 Scope guard on the final diff
  - Do: confirm over the whole branch diff (`git diff --stat develop...HEAD` or the PR base): no change to `src/features/negocios/components/BusinessTable/ActionCell.tsx` (read-only), `src/features/negocios/__tests__/components/action-cell.test.tsx` (read-only), `CommentModal.tsx` (read-only), `CommentInput.tsx` (read-only), `use-comments.ts` (read-only), `src/app/api/negocios/route.ts` (read-only), the three fondear route tests (read-only), `CHANGELOG.md` (read-only), and `package.json` (read-only).
  - Verify: the diff lists only the files planned in design "File Changes" (plus the optional fixture from 2.6 and the test from 3.10).
- [ ] 4.5 Schema guard
  - Do: confirm `prisma/schema.prisma` (read-only) and `prisma/ERD.md` (read-only) have no diff and no migration folder was added under `prisma/migrations/`.
  - Verify: empty diff on `prisma/`.
- [ ] 4.6 Manual QA checklist (run in `npm run dev`; record results in the PR)
  - Covers: scenarios that jsdom cannot prove (R2 "Three-digit count" layout, R5 "Scrolls when the list is long", mobile layout, real focus behavior).
  - Checklist:
    - [ ] A business with 1, 12, 145 comments shows the icon with the exact count; a business with 0 comments shows nothing and its other actions are unchanged.
    - [ ] A 3 or 4 digit count (seed 145 or 1000 if possible) does not clip, wrap, or push the neighboring buttons; all stay clickable.
    - [ ] Click the indicator: the dialog opens titled "Comentarios — {contract}"; for a business without contract the title is just "Comentarios".
    - [ ] Comments appear oldest first with author, role, title, detail, and Bogotá date and time (also check with the browser or OS timezone set to a non-Bogotá zone).
    - [ ] Mobile 360 x 640 (browser devtools): the dialog fits the viewport, the list scrolls inside it (try 100 comments), no horizontal scroll, a long unbroken detail wraps.
    - [ ] Focus: after opening, focus is inside the dialog; Tab stays in the dialog; after "Cerrar", Esc, and an overlay click, focus returns to the indicator that opened it.
    - [ ] Open the modal while a second browser session adds a comment on that business: it appears at the end live; the row badge does not change until the list refetches.
    - [ ] Network tab: loading the list makes no `/comments` request; opening one modal makes exactly one request for that business; closing it closes the SSE connection.
    - [ ] "Agregar comentario" still opens the create dialog with its current title; after saving, the list refetches and the row count increases by one (and a row with 0 comments gets the indicator with "1"); cancelling does not refetch.
    - [ ] Read-only role (CONSULTOR): the indicator is visible and opens the history; "Agregar comentario" is not offered.
    - [ ] Detail page comments sidebar still loads, and its timestamps now read in Bogotá time.
- [ ] 4.7 PR description notes
  - Content to include: the three work-unit commits with their line counts; the `size:exception` justification (see the forecast section above) and a request for maintainer approval of the label; an explicit call-out that the detail-page `CommentsSidebar` also changes its time format (browser-local `es-AR` to Bogotá `es-CO`) because it shares `CommentItem` (R11, decision (d)); the additive `commentCount` field on every `businessWithRelations` response (list, detail, mutations) and the extra correlated count subquery on those queries (Decision 1, design Risk 8); a statement that there is no schema change, migration, or new endpoint; the manual QA results from 4.6; and the pre-existing, unchanged observation that `GET /api/negocios/[id]/comments` checks only the session (not part of this change). Use the project `.github/pull_request_template.md` and the `commit-messages` skill conventions.
  - Verify: the PR description contains every item above.
- [ ] 4.8 Archive-time reminder (do NOT do this now; it happens when the change is archived)
  - At archive, per the project "Release Management" rule: add a `## [X.Y.Z] - YYYY-MM-DD` entry at the top of `CHANGELOG.md` with `### Agregado` (indicator with exact comment count in the business list actions, read-only comments history modal, list refresh after adding a comment), `### Mejorado` (comment date and time now shown in Bogotá time, also in the detail-page sidebar) and `### Técnico` (filtered `_count.comments` in `businessWithRelations`, `commentCount` on `BusinessEntity` and the table row, `formatDateTimeBogota`, `CommentsHistoryModal`, `onCommentCreated` wiring, no migration), with Spanish UI copy and English technical details; and bump `package.json` by a MINOR version (new feature, backward compatible: current `1.X.0` -> `1.(X+1).0`). Do not edit `CHANGELOG.md` or `package.json` before archiving.

## Coverage matrix (requirement -> tasks)

| Req | Scenarios (count) | RED test tasks | GREEN / implementation tasks | Notes |
|-----|-------------------|----------------|------------------------------|-------|
| R1 count derivation | 6 | 1.1 (mapper 12, zero), 1.2 (status filter in query), 1.5 (row mapper 145), 3.8 (reaches `BusinessRowActions`, no extra requests), 1.7 (compile fallout) | 1.3, 1.4, 1.6, 1.7, 3.9 | "Count respects existing list visibility": no new test, covered by the existing `buildBusinessListWhere` and `negocios-list-hierarchy.test.ts` tests re-run in the 1.13 gate (the count adds no scoping) |
| R2 indicator visible | 7 | 3.1 | 3.2 | Three-digit and 1000 layout (no clipping) is only partly provable in jsdom: exact text and `shrink-0`/width classes in 3.1, visual check in 4.6 |
| R3 indicator hidden | 3 | 3.1 (guard tests) | 3.2 | Hidden cases pass on arrival by design |
| R4 modal content and states | 14 | 2.1, 3.3 (contract input, no request at render), 3.8 | 2.2, 3.4, 3.9 | "Long content" asserts `break-words`; "Data requested only on open" split across 2.1 (once on mount), 3.3 and 3.8 (nothing at render) |
| R5 modal lifecycle | 10 | 2.3, 3.3 ("Not mounted", "Opens on click", "Independent rows"), 2.1 (structural scroll classes) | 2.2, 2.4, 3.4 | "Scrolls when the list is long" and the 360 px fit are only structurally asserted; real check in 4.6 |
| R6 live append | 6 | 2.5 (5 modal scenarios, guard tests), 3.3 ("Row badge is not live-updated") | existing `useComments` hook (read-only), 3.4 | 2.5 is green on arrival because the behavior already exists in the hook |
| R7 roles | 4 | 3.5 (guard tests) | 3.2 (no gate by design) | Iterates over every real `UserRole` (AGENTE, not COACH, per OQ4) |
| R8 non-regression | 6 | 3.5 (existing actions with and without indicator), 3.6 ("Add-comment flow still works"), 3.3 ("Only one dialog at a time") | 3.2, 3.4, 3.7 | "Dead component untouched": guard tasks 0.3, 1.13, 2.8, 3.13, 4.4 (no test, diff check) |
| R10 list refresh | 4 | 3.6 (callback after create, not on cancel), 3.8 (forwarding), 3.10 (page-client refetch, recommended), 3.3 ("other users do not update the badge") | 3.7, 3.9, 3.11 | "Count refreshes" and "First comment makes the indicator appear" are proven by composition (3.6 + 3.8 + 3.10) plus manual QA 4.6; see the flagged gap below |
| R11 shared `CommentItem` Bogotá time | 3 | 1.8 (formatter), 1.10 (`CommentItem`, `CommentsSidebar`, other content) | 1.9, 1.11, 1.12 | Sidebar scenario also re-checked in 4.6 |
| Decision (a)-(e), OQ1-OQ4 | n/a | covered through R10, R2, R4, R11, R1, R7 above | | OQ2 (create-dialog scenario dropped): no task touches `CommentInput.tsx` (guard 0.3) |

All 60 scenarios (29 negocios + 31 contract-comments) map to at least one task. Scenarios flagged as not fully provable by an automated test, and why:

1. R2 "Three-digit count is shown exactly" / "Very large count is still exact": the layout claim ("not truncated, neighbors clickable") cannot be measured in jsdom. Automated: exact text, accessible name, and layout classes. Manual: 4.6.
2. R5 "Scrolls when the list is long" (360 x 640 px, no horizontal overflow): jsdom has no layout engine. Automated: structural classes (`max-h-[85vh]`, `overflow-y-auto`, `min-h-0`, `break-words`) in 2.1. Manual: 4.6.
3. R10 "Count refreshes after creating a comment" and "First comment makes the indicator appear": there is no single test spanning `CommentModal` -> `refetch` -> badge. They are proven by composition (3.6 callback, 3.8 forwarding, 3.10 page-client refetch). The design test table has no row for the last hop (`negocios-page-client.tsx`, `MisNegociosPage.tsx`); task 3.10 closes it for about +25 lines and may be dropped if the existing page-client test cannot host it (then manual QA 4.6 is the only proof for that hop).
4. R1 "Count respects existing list visibility": intentionally has no new test (already covered upstream; the change adds no scoping).
5. R8 "Dead component untouched": verified by diff review (0.3, 1.13, 2.8, 3.13, 4.4), not by a test.
6. R6 scenarios in 2.5 and the R3 / R7 / R8 guard tests are green on arrival by design; their evidence must say so to stay honest under Strict TDD.

No scenario is left without a task.

## Dependency order (summary)

mapper and prisma types (1.1-1.4) -> table-row mapper (1.5-1.6) -> fixture fallout (1.7) -> shared formatter (1.8-1.9) -> `CommentItem` (1.10-1.11) -> docs (1.12) -> gate and commit 1 (1.13-1.14) -> history modal (2.1-2.8, commit 2) -> `BusinessRowActions` indicator (3.1-3.5) -> create-comment callback (3.6-3.7) -> `BusinessTableSection` (3.8-3.9) -> page client and `MisNegociosPage` (3.10-3.11) -> gate and commit 3 (3.12-3.13) -> final verification and PR notes (4.1-4.8).

Parallelism: single writer, strictly sequential inside each work unit. Within WU1 the formatter and `CommentItem` chain (1.8-1.12) has no code dependency on the count chain (1.1-1.7) and could be reordered, but both land in commit 1, so the order above is kept to keep the gate simple.

## Task count

| Phase | Tasks | Of which RED/guard tests | Of which GREEN/implementation | Other (docs, refactor, commit, gates) |
|-------|------:|-------------------------:|------------------------------:|--------------------------------------:|
| Phase 0 baseline and guards | 3 | 0 | 0 | 3 |
| Phase 1 (WU1) | 14 | 5 (1.1, 1.2, 1.5, 1.8, 1.10) | 5 (1.3, 1.4, 1.6, 1.9, 1.11) plus 1.7 (compile RED/GREEN) | 3 (1.12, 1.13, 1.14) |
| Phase 2 (WU2) | 8 | 3 (2.1, 2.3, 2.5) | 2 (2.2, 2.4) | 3 (2.6, 2.7, 2.8) |
| Phase 3 (WU3) | 13 | 5 (3.1, 3.3, 3.5, 3.6, 3.8) plus optional 3.10 | 4 (3.2, 3.4, 3.7, 3.9) plus 3.11 | 2 (3.12, 3.13) |
| Phase 4 final | 8 | 0 | 0 | 8 |
| **Total** | **46** | | | |
