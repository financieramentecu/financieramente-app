# Verification Report

**Change**: mejoras-negocios-aportes-fondeos
**Version**: N/A (delta spec)
**Mode**: Strict TDD
**Run date**: 2026-05-01 (post-fix run — all prior CRITICAL issues resolved)

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 21 |
| Tasks complete | 21 |
| Tasks incomplete | 0 |

All 21 tasks across 6 phases are checked off in apply-progress.

---

## Build & Tests Execution

**Build (tsc --noEmit)**: ✅ Passed — zero type errors

**Tests**: ✅ 362 passed / ❌ 0 failed / ⚠️ 0 skipped

```
Test Files  39 passed (39)
     Tests  362 passed (362)
  Start at  20:15:12
  Duration  4.75s
```

Notable test files for this change:
- `calculate-num-aportes.test.ts` — 12/12 ✅
- `calculate-expected-dates.test.ts` — 6/6 ✅
- `action-cell.test.tsx` — 25/25 ✅
- `business-entity.mapper.test.ts` — 23/23 ✅
- `create-business.test.ts` — 7/7 ✅
- `annual-payments/route.test.ts` — 2/2 ✅
- `fondear-anualidades/route.test.ts` — 5/5 ✅
- `map-business-to-table-row.test.ts` — 2/2 ✅
- `annual-funding-modal.test.tsx` — 2/2 ✅
- `negocios-page-client.fondear-confirmation.test.tsx` — 4/4 ✅

**Coverage**: ➖ Not measured (not requested)

---

## TDD Compliance Table (Strict TDD)

| Task | RED Phase | GREEN Phase | Result |
|------|-----------|-------------|--------|
| 2.1/2.2 calculateNumAportes | ✅ RED confirmed | ✅ 12/12 PASS | ✅ |
| 2.3/2.4 calculateExpectedDates | ✅ RED confirmed | ✅ 6/6 PASS | ✅ |
| 3.1/3.2 canViewPayments / canFundPayments | ✅ 16 FAIL confirmed | ✅ 16/16 PASS | ✅ |

RED→GREEN discipline followed for all pure-helper and role-helper phases.

---

## Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Número de Aportes field | Field computes on periodicidad/plazo change | `calculate-num-aportes.test.ts > standard multipliers` | ✅ COMPLIANT |
| Número de Aportes field | numAportes persisted on save | `create-business.test.ts` (7 tests pass) | ✅ COMPLIANT |
| numAportes exceptions | SKANDIA or MFUND forces numAportes = 0 | `calculate-num-aportes.test.ts > SKANDIA + MFUND → 0` | ✅ COMPLIANT |
| numAportes exceptions | Pago Único → 1 (confirmed post-spec decision) | `calculate-num-aportes.test.ts > Pago Único → 1` | ✅ COMPLIANT (spec superseded: impl=1 confirmed) |
| numAportes exceptions | Aportes Ocasionales → 1 (confirmed post-spec decision) | `calculate-num-aportes.test.ts > Aportes Ocasionales → 1` | ✅ COMPLIANT (spec superseded: impl=1 confirmed) |
| Payment labels renamed | UI labels use Aporte | `annual-funding-modal.test.tsx` (2 tests pass) | ✅ COMPLIANT |
| expectedDate at first fondeo | expectedDate set on first fondeo | `calculate-expected-dates.test.ts` (6 tests) + fondear-aportes route structural | ✅ COMPLIANT |
| expectedDate at first fondeo | expectedDate NOT set at creation | Code inserts `expectedDate: null`; no dedicated assertion | ⚠️ PARTIAL |
| Direct fondeo numAportes ∈ {0,1} | numAportes = 0 triggers direct fondeo | `negocios-page-client.fondear-confirmation.test.tsx` | ✅ COMPLIANT |
| Direct fondeo numAportes ∈ {0,1} | numAportes = 1 triggers direct fondeo | `negocios-page-client.fondear-confirmation.test.tsx` | ✅ COMPLIANT |
| Direct fondeo numAportes ∈ {0,1} | numAportes ≥ 2 opens FundingModal | `action-cell.test.tsx` (25 tests) | ✅ COMPLIANT |
| Fondeo action visibility | Fondear directo — numAportes 0 o 1 (ADMIN/AGO) | `action-cell.test.tsx` | ✅ COMPLIANT |
| Fondeo action visibility | Fondear con modal — numAportes ≥ 2 | `action-cell.test.tsx` | ✅ COMPLIANT |
| Fondeo action visibility | AGENTE Coach — "Ver Fondeo" when hasPayments | `action-cell.test.tsx > Ver Fondeo for AGENTE with pending payments` | ✅ COMPLIANT (confirmed post-spec product decision) |
| Fondeo action visibility | AGENTE Coach — no button when no payments | `action-cell.test.tsx > NOT show Ver Fondeo without payments` | ✅ COMPLIANT |
| Fondeo action visibility | ANALISTA_SOPORTE — sin acción | No explicit test; excluded by role-list structure | ⚠️ PARTIAL |
| FundingModal | Funded rows compact, unfunded markable | `annual-funding-modal.test.tsx` (title tests; row layout structural) | ⚠️ PARTIAL |
| FundingModal | Modal shows expectedDate, periodicidad, plazo | No assertion on field values | ❌ UNTESTED |
| FundingModal | Modal scrollable with many rows | No dedicated test | ❌ UNTESTED |
| FundingModal | Título con contrato | `annual-funding-modal.test.tsx > title includes contract` | ✅ COMPLIANT |

**Compliance summary**: 15/20 scenarios fully compliant, 3 partial, 2 untested.

---

## Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Prisma model renamed to Payment (@@map) | ✅ Implemented | `prisma/schema.prisma` confirmed |
| Business.numAportes Int? added | ✅ Implemented | Schema + create-business.ts + mapper |
| Payment.expectedDate DateTime? added | ✅ Implemented | Schema + fondear-aportes/route.ts |
| calculateNumAportes helper | ✅ Implemented | `src/features/negocios/lib/calculate-num-aportes.ts` |
| calculateExpectedDates helper | ✅ Implemented | `src/features/negocios/lib/calculate-expected-dates.ts` |
| canViewPayments / canFundPayments role helpers | ✅ Implemented | `src/features/auth/lib/roles.ts` — AGENTE excluded from canFundPayments |
| PaymentInstallmentDto with expectedDate | ✅ Implemented | `business-api.types.ts` — AnnualInstallmentDto kept as @deprecated alias |
| FundingModal.tsx (renamed from AnnualFundingModal) | ✅ Implemented | Both files exist; AnnualFundingModal kept for legacy compat |
| payments/route.ts API | ✅ Implemented | `/api/negocios/[id]/payments/route.ts` exposes expectedDate |
| fondear-aportes/route.ts API | ✅ Implemented | calculateExpectedDates on first fondeo + canFundPayments auth guard |
| BUSINESS_PAYMENT_FUNDED audit action rename | ✅ Implemented | audit-logger.ts:20 uses BUSINESS_PAYMENT_FUNDED; both routes use it |
| numAportes Pago Único / Aportes Ocasionales → 1 | ✅ Implemented (post-spec) | Returns 1; direct fondeo path (no modal) |
| numAportes SKANDIA/MFUND → 0 | ✅ Implemented | Returns 0; no payments created |
| API AGENTE 403 (defense in depth) | ✅ Implemented | fondear-aportes/route.ts:92 calls canFundPayments |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Prisma @@map("payments") + RENAME TABLE SQL | ✅ Yes | Migration SQL in openspec; schema uses @@map |
| expectedDate computed at first fondeo (not creation) | ✅ Yes | fondear-aportes/route.ts: EMITIDO→FONDEADO guard + calculateExpectedDates |
| date-fns/addMonths for date calc | ✅ Yes | calculate-expected-dates.ts uses addMonths |
| canViewPayments / canFundPayments defense-in-depth | ✅ Yes | ActionCell uses canFundPayments(userRole); API uses canFundPayments check |
| useEffect for numAportes reactivity | ✅ Yes | business-info-section.tsx lines 51-75 |
| AuditAction renamed to BUSINESS_PAYMENT_FUNDED | ✅ Yes | Enum + both fondear routes updated |
| BusinessTableSection canFondearRole uses inline logic (not helper) | ⚠️ Deviated | Lines 468-470 duplicate ADMIN/AGO list instead of calling canFundPayments(). Identical behavior today but is a maintenance debt. ActionCell.tsx correctly uses the helper. |
| AGENTE "Ver Fondeo" when hasPayments (post-spec product decision) | ⚠️ Deviated (intentional) | Spec says "sin acción de fondeo"; confirmed product decision shows "Ver Fondeo" when business HAS payments. Tests assert this. Spec text is superseded. |

---

## Issues Found

**CRITICAL** (must fix before archive):
None.

**WARNING** (should fix):

1. **BusinessTableSection.tsx uses inline canFondearRole instead of canFundPayments helper** — Lines 468-470 hardcode `ADMIN || ASISTENTE_GERENCIA_OPERATIVA` instead of calling `canFundPayments(userRole)`. If the role list changes in `roles.ts`, this section will silently diverge.
   - File: `src/features/negocios/components/BusinessTableSection.tsx:468-470`

2. **FundingModal row content (expectedDate, periodicidad, plazo) is untested** — The spec scenario "each row SHALL display its `expectedDate`, `periodicidad`, and `plazo`" has no test assertion. Only modal title is asserted.
   - File: `src/features/negocios/components/modals/__tests__/annual-funding-modal.test.tsx`

3. **fondear-aportes/route.ts has zero route-level tests** — The new endpoint has no test file. The existing `fondear-anualidades/__tests__/route.test.ts` covers the legacy route only. AGENTE 403 and expectedDate persistence are untested at the integration level.
   - Missing: `src/app/api/negocios/[id]/fondear-aportes/__tests__/route.test.ts`

**SUGGESTION** (nice to have):

4. **Update spec text to reflect confirmed product decisions** — `openspec/changes/mejoras-negocios-aportes-fondeos/specs/negocios/spec.md` lines 24-36 still say `numAportes = 0` for Pago Único/Aportes Ocasionales. Update to `numAportes = 1` to align with the confirmed implementation. Spec lines 114-118 should also note the "Ver Fondeo" coach behavior.

5. **ANALISTA_SOPORTE exclusion has no explicit test** — Excluded by role list structure; a direct assertion would be more self-documenting.

6. **Old fondear-anualidades route kept alongside fondear-aportes** — `src/app/api/negocios/[id]/fondear-anualidades/route.ts` still exists. If kept for backward compat, document it; otherwise schedule removal.

---

## Verdict

**PASS WITH WARNINGS**

All 362 tests pass, type-check is clean, all 21 tasks are complete. All previously identified CRITICAL issues (audit action rename, TS2352 in test mock) are resolved. The Pago Único/Aportes Ocasionales numAportes=1 product decision is confirmed and implemented consistently. The implementation is functionally complete and ready for archive, with three warnings to address in a follow-up: BusinessTableSection inline role logic, missing FundingModal row-content tests, and no test file for the fondear-aportes route.

