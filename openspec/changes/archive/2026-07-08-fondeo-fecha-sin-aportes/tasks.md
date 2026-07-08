# Tasks: Fecha de fondeo seleccionable para negocios sin aportes

Legend: `[P]` = can run in parallel with sibling tasks in the same group (no shared file). Sequential tasks depend on the previous one unless noted.

## Completion Status (2026-07-08 apply batch)

- [x] A1 — Zod schema (`fondear.schema.ts`)
- [x] A2 — Route handler parse/validate/anchor
- [x] A3 — Audit log detail enrichment
- [x] B1 — `numAportes` on Business DTO
- [x] B2 — Mapper threads `numAportes`
- [x] B3 — Fixtures updated (+ new `createMockTableBusiness` factory)
- [x] C1 — `FundDirectFundingModal` component
- [x] D1 — `businessService.fondear(id, fundedDate?)`
- [x] D2 — `useBusinessMutation().fondearBusiness(id, fundedDate?)`
- [x] E1 — Page wiring branch (`numAportes===0` → modal, else AlertDialog unchanged)
- [x] F1 — Integration test (component-level, not Playwright — see note below)
- [x] F2 — ERD/cleanup check — no schema change, no dead code, no new date-handling doc row

**F1 deviation note**: implemented as a component-level integration test in
`negocios-page-client.fondear-confirmation.test.tsx` (mocked API layer,
`@testing-library/react` + `userEvent`) rather than a Playwright e2e spec.
The codebase has no existing Playwright coverage for the equivalent
`numAportes>=1`/annual-funding flows either — `e2e/negocios-export.spec.ts`
is the only negocios Playwright spec and it covers exports, not funding.
Component-level integration is the established test boundary for this flow
in this repo, so this satisfies F1's intent without introducing a new,
unmaintained test tier. 12/12 tasks complete.

## Group A — Backend (sequential, foundation for everything else)

### A1. Zod schema for `/fondear` body
- **File**: `src/features/negocios/lib/*.schema.ts` (new or extend existing schema file for negocios)
- **Satisfies**: Spec "FONDEADO transition on funding confirmation" — invalid/future fundedDate rejected with 400.
- **Acceptance criteria**:
  - Schema accepts optional `fundedDate: string` matching `^\d{4}-\d{2}-\d{2}$`.
  - Schema rejects malformed strings (e.g. `2026/06/15`, `15-06-2026`, empty string).
  - Body without `fundedDate` is valid (field optional).
- **Tests (RED first)**: unit tests for the schema — valid date, invalid format, missing field.
- **Parallel**: [P] can be written alongside A2 test scaffolding, but must land before A2 implementation.

### A2. Route handler: parse, validate, reject future dates, anchor date
- **File**: `src/app/api/negocios/[id]/fondear/route.ts`
- **Depends on**: A1
- **Satisfies**: Spec scenarios "Direct con fecha provista", "Direct sin fecha — fallback a hoy", "Fecha inválida o futura rechazada", "Negocio inexistente", "Sin permiso", "POST directo bloqueado con anualidades".
- **Acceptance criteria**:
  - Parses `fundedDate` from body using A1 schema.
  - If `fundedDate` present and valid: convert via `dateOnlyToBogotaNoonUtc()`; if it resolves to a date after today (Bogotá), return 400 before any mutation.
  - If `fundedDate` absent: fallback to `new Date()` (existing behavior unchanged).
  - Existing 403 (no `canFundPayments`), 404 (missing business), and 400 (AnnualPayment exists) behaviors remain intact — no regression.
  - No DB write occurs on validation failure (atomic guarantee preserved).
- **Tests (RED first)**:
  - Integration: valid `fundedDate` → `dateAnchored` equals noon Bogotá UTC for that date.
  - Integration: missing `fundedDate` → `dateAnchored` equals today noon Bogotá UTC.
  - Integration: future `fundedDate` → 400, no state change (business still EMITIDO, no AuditLog row).
  - Integration: malformed `fundedDate` → 400, no state change.
  - Regression: existing 403/404/AnnualPayment-exists tests still pass unmodified.

### A3. Audit log detail enrichment
- **File**: `src/app/api/negocios/[id]/fondear/route.ts` (same file as A2, do in same commit/PR slice)
- **Depends on**: A2
- **Satisfies**: Spec scenario "AuditLog en fondeo directo con fecha".
- **Acceptance criteria**:
  - `logAuditEvent(BUSINESS_FUNDED, ...)` details string includes business id, contract number, and the resolved funding date (human-readable, e.g. `DD/MM/YYYY`).
  - No new `AuditAction` enum value added (per design finding — action already exists).
- **Tests (RED first)**: integration test asserting `AuditLog.details` contains contract + formatted date after a successful direct fondeo with `fundedDate`.

## Group B — Frontend data plumbing (sequential, needed before UI wiring)

### B1. Add `numAportes` to Business DTO
- **File**: `src/features/negocios/types/business.types.ts`
- **Satisfies**: Design finding #3 — list DTO must distinguish `numAportes` 0 vs 1 vs ≥2.
- **Acceptance criteria**: `Business` type gains `numAportes: number | null`.
- **Tests**: type-check only (no runtime test needed); verify no consumer breaks (`npm run type-check`).
- **Parallel**: [P] independent of Group A.

### B2. Map `numAportes` in table row mapper
- **File**: `src/features/negocios/lib/map-business-to-table-row.ts`
- **Depends on**: B1
- **Acceptance criteria**: `mapBusinessToTableRow` copies `b.numAportes` into the mapped row unchanged (including `null`).
- **Tests (RED first)**: unit test — mapper output includes `numAportes` matching input entity for values `0`, `1`, `2`, `null`.

### B3. Add `numAportes` to test fixtures
- **File**: `src/features/negocios/__tests__/fixtures/mock-business.ts`
- **Depends on**: B1
- **Acceptance criteria**: fixture factory accepts/produces `numAportes` so downstream tests (B2, D-group) don't break on missing field.
- **Tests**: existing fixture-consuming tests still pass (regression check, no new test file needed).
- **Parallel**: [P] with B2 (both depend only on B1, touch different files).

## Group C — New modal component (parallel with Group A/B once B1 lands)

### C1. `FundDirectFundingModal` component
- **File**: `src/features/negocios/components/modals/FundDirectFundingModal.tsx` (new)
- **Depends on**: none functionally, but should follow `FundedDatePickerDialog` prop contract — read that file before writing.
- **Satisfies**: Spec "Modal con fecha para numAportes = 0", "Confirmar con fecha seleccionada", "Cancelar fondeo directo".
- **Acceptance criteria**:
  - Wraps `FundedDatePickerDialog`, title "Confirmar Fondeo".
  - Displays business/contract identifying info passed via props.
  - Date input defaults to today (Bogotá).
  - `onConfirm(date: string)` callback fires with `YYYY-MM-DD` on confirm; component does not call the API itself (SRP — caller submits).
  - Cancel/close calls `onCancel`/`onOpenChange(false)` without invoking `onConfirm`.
  - Own local loading/error display slots (props-driven), per design note ("owns loading/error").
- **Tests (RED first)**: render test — default date is today; confirm calls `onConfirm` with selected date; cancel does not call `onConfirm`; loading/error prop states render accordingly.

## Group D — Hook & service layer (sequential, needed before page wiring)

### D1. Service: `fondear(id, fundedDate?)`
- **File**: `src/features/negocios/services/business.service.ts`
- **Acceptance criteria**: function sends POST with JSON body `{ fundedDate }` only when provided; omits body/sends `{}` when absent (backward compatible with numAportes=1 flow).
- **Tests (RED first)**: unit test — call with date includes it in POST body; call without date sends no `fundedDate` key.
- **Parallel**: [P] with C1 (different files, no shared dependency).

### D2. Hook: `fondearBusiness(id, fundedDate?)`
- **File**: `src/features/negocios/hooks/use-business-mutation.ts`
- **Depends on**: D1
- **Acceptance criteria**: hook signature accepts optional `fundedDate`; forwards to service; existing callers (no-arg) unaffected.
- **Tests (RED first)**: hook test with mocked service — asserts service called with forwarded date; existing no-date test still passes.

## Group E — Page wiring (sequential, final integration point)

### E1. Branch logic in `negocios-page-client.tsx`
- **File**: `src/app/dashboard/negocios/negocios-page-client.tsx`
- **Depends on**: B1, B2, C1, D2
- **Satisfies**: Spec "numAportes = 0 con modal de fecha", "numAportes = 1 directo (sin cambios)".
- **Acceptance criteria**:
  - `handleFondearBusiness`/`handleConfirmFondear` branches: `numAportes === 0` → open `FundDirectFundingModal`; `numAportes === 1` → existing `AlertDialog` unchanged; `hasPayments`/annual-rows path unchanged.
  - New state for `FundDirectFundingModal` open/pending mirrors existing `AlertDialog` state pattern (naming consistent with existing handlers).
  - `onConfirm` from modal calls `executeFondearBusiness(business, fundedDate)` → hook → service → API.
  - On success: refetch list + stats, close modal (existing `onSuccess` pattern reused).
  - On error: surface error in modal (per C1 error slot), do not close modal, no refetch.
- **Tests (RED first)**:
  - `numAportes=0` click "Fondear" opens `FundDirectFundingModal` (not AlertDialog).
  - `numAportes=1` click "Fondear" still opens `AlertDialog`, no date picker.
  - Confirm in modal triggers POST with selected date; success closes modal + refetches.
  - Cancel in modal: no POST fired.
  - API error: modal stays open, error shown, no refetch.

## Group F — Full-stack integration & cleanup

### F1. End-to-end integration test
- **Depends on**: A3, E1
- **Acceptance criteria**: single integration test (or Playwright e2e if suite supports it) covering: ADMIN/ANALISTA_SOPORTE/ASISTENTE_GERENCIA_OPERATIVA sees "Fondear" for `numAportes=0` EMITIDO business → opens modal → selects past date → confirms → business becomes FONDEADO with `dateAnchored` matching selection → AuditLog row created → list refetches → modal closes.
- **Tests**: as described above (this task IS the test).

### F2. ERD & documentation check
- **Depends on**: none (can run anytime after A1, but do last to confirm no drift)
- **Acceptance criteria**:
  - Confirm no `prisma/schema.prisma` changes were needed (design says no schema change) — if true, no `prisma/ERD.md` update required; note this explicitly in the PR description.
  - Remove any dead code from the old plain `AlertDialog` path for `numAportes=0` if fully replaced (verify `numAportes=1` AlertDialog code path is NOT removed — only the `numAportes=0` branch changes).
  - Confirm `docs/DATE_HANDLING_CONVENTIONS.md` doesn't need a new row (reuses existing `dateOnlyToBogotaNoonUtc()` helper, no new date-handling pattern introduced).
- **Tests**: none (manual verification + lint/type-check clean).

---

## Execution Order Summary

1. A1 → A2 → A3 (backend, sequential)
2. B1 → {B2, B3} [P] (frontend types/mapper/fixtures)
3. C1 [P with D1] (new modal component)
4. D1 → D2 (service/hook, D1 parallel with C1)
5. E1 (page wiring — needs B1, B2, C1, D2 all done)
6. F1 → F2 (integration test, then cleanup/docs)

Groups A and B/C/D can proceed in parallel threads since they touch disjoint files; E1 is the sync point requiring B, C, and D complete. F1 requires both A and E done.

## Review Workload Forecast

- Estimated changed/added files: ~9 (route.ts, schema file, business.types.ts, map-business-to-table-row.ts, mock-business.ts fixture, new FundDirectFundingModal.tsx, business.service.ts, use-business-mutation.ts, negocios-page-client.tsx) plus new/updated test files (~6-8).
- Estimated changed lines: ~300-400 (matches proposal estimate), driven mostly by new modal component + its tests and the integration test suite.
- 400-line budget risk: Medium — likely to land near or slightly over 400 lines once tests are included.
- Chained PRs recommended: No — change is cohesive and isolated to one feature slice (`numAportes=0` funding flow); splitting would fragment a single testable user flow.
- Decision needed before apply: Yes — confirm with user whether to proceed as a single PR near the 400-line budget or request `size:exception`, per cached `delivery_strategy`.
