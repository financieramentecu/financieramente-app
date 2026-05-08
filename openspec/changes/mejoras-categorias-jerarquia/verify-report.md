# Verify Report — mejoras-categorias-jerarquia

**Change**: mejoras-categorias-jerarquia
**Mode**: Strict TDD
**Date**: 2026-05-06

---

## Verification Report

**Change**: mejoras-categorias-jerarquia
**Mode**: Strict TDD

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 18 |
| Tasks complete (marked [x]) | 16 |
| Tasks pending (marked [ ]) | 2 (8.1, 8.2 — the final run/check tasks) |

All implementation tasks (phases 1–7) are marked complete. Tasks 8.1 and 8.2 are the verification run itself.

---

### Build & Tests

**Tests**: ❌ 1 failed / 1702 passed / 3 skipped (174 test files, 1 failed)
**Type-check**: ❌ 15 TypeScript errors (1 in production code, 14 in test fixtures)

---

### Failing Test

**File**: `src/features/categories/__tests__/components/categories-table.test.tsx`
**Test**: `CategoriesTableSection > Multiple Types Display > should display type labels in table`

**Root cause**: The test expects label-mapped display names (`Aliado`, `Trinity`) but the component renders raw enum values (`ALIADO`, `TRINITY`) via a `<Badge>` with `{row.original.typeCategory}`. The component uses `useCategoryTypes()` for filter options (not for cell display labels). The test was written expecting a label-mapping step that was never implemented in the cell renderer.

---

### TypeScript Errors

**Production code (1 error)**:

- `src/app/dashboard/admin/categories/page.tsx:58` — `handleSubmit` passes `CreateCategoryInput` without the required `color` field. The form was updated but the page-level adapter was not updated to forward `color`.

**Test files (14 errors — do not block runtime)**:

| File | Error |
|------|-------|
| `__tests__/hooks/use-admin-category-mutations.test.ts` (×2) | Missing `color` in `CreateCategoryInput` fixtures |
| `__tests__/hooks/use-category-mutations.test.ts` (×5) | Missing `color` in `CreateCategoryInput` fixtures |
| `__tests__/lib/category-api.test.ts` (×5) | Missing `color` in `CreateCategoryInput` fixtures |
| `__tests__/mappers/category.mapper.test.ts` (×1) | Uses `BeneficiaryMode.FIXED_BENEFICIARY` (removed enum value) |
| `src/features/distribution-commission/__tests__/...` (×1) | Uses `'UPLINE_CHAIN'` (old enum value) in commission-rule test |

---

### TDD Compliance

| Task | RED evidence | GREEN result | Status |
|------|-------------|--------------|--------|
| 2.1 category-schemas tests | Tests added with new field requirements | All pass | ✅ |
| 2.2 category-schemas impl | color + idNextCategory + superRefine + default OVERRIDE | Confirmed | ✅ |
| 2.3 types updated | BeneficiaryMode union, color, idNextCategory, nextCategory | Confirmed | ✅ |
| 3.1 mapper tests (color, nextCategory, enum) | Tests added | 25 pass | ✅ |
| 3.2 mapper impl | Maps all new fields | Confirmed | ✅ |
| 5.1 form tests (color input, next-cat select, OVERRIDE) | Tests added | Pass | ✅ |
| 5.2 form impl | color picker, next-category select, BENEFICIARIO_GENERAL | Confirmed | ✅ |
| 5.3 table tests (color chip, next-cat column) | Tests added | 2/3 pass | ⚠️ |
| 5.4 table impl (color chip, next-cat column) | Color chip ✅, next-cat ✅ | Pass | ✅ |

---

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| 1. beneficiaryMode UPLINE_CHAIN→OVERRIDE | Schema, form, mapper, API | Multiple | ✅ |
| 1. beneficiaryMode FIXED_BENEFICIARY→BENEFICIARIO_GENERAL | Schema, form, mapper, API | Multiple | ✅ |
| 1. BENEFICIARIO_GENERAL requires idFixedBeneficiaryUser | superRefine guard | category-schemas.test.ts | ✅ |
| 1. Form shows/hides user selector conditionally | Switch to OVERRIDE clears user | category-form.test.tsx | ✅ |
| 2. Default beneficiaryMode = OVERRIDE | Schema default | category-schemas.test.ts | ✅ |
| 3. System category shows linked user when BENEFICIARIO_GENERAL | Table cell renderer | category-form.test.tsx | ✅ |
| 4. color field required | Schema validation | category-schemas.test.ts | ✅ |
| 4. color regex `^#[0-9A-Fa-f]{6}$` | Hex regex validation | category-schemas.test.ts | ✅ |
| 4. color shown as chip in table | data-testid="color-chip" with backgroundColor | categories-table.test.tsx | ✅ |
| 4. form blocks if color empty | color input required | category-form.test.tsx | ✅ |
| 5. idNextCategory self-ref FK | Schema optional | category-schemas.test.ts | ✅ |
| 5. select excludes self | next-category select filters self | category-form.test.tsx | ✅ |
| 5. GET returns nextCategory: {id, name} | Mapper maps relation | category.mapper.test.ts | ✅ |
| 5. Table shows nextCategory name or "—" | next-cat column | categories-table.test.tsx | ✅ |
| Type label mapping in table cells | "Aliado" / "Trinity" display | categories-table.test.tsx | ❌ |
| page.tsx forwards color to createCategory | handleSubmit adapter | — | ❌ |
| Old enum refs cleaned (BeneficiaryMode.FIXED_BENEFICIARY) | Mapper test line 212 | TS error | ❌ |
| Old enum refs cleaned (UPLINE_CHAIN in commission test) | Distribution-commission test | TS error | ❌ |

---

### Issues Found

**CRITICAL:**

1. **Type-check fails in production code** — `src/app/dashboard/admin/categories/page.tsx:58` does not pass `color` when calling `createCategory`. This means the create form at the page level will fail at runtime (TypeScript catches it, but the form would submit without color). Fix: add `color: formData.color as string` to the `handleSubmit` call in both create and update branches.

2. **Test failure** — `categories-table.test.tsx > should display type labels in table` fails because the table renders raw enum values (`ALIADO`, `TRINITY`) while the test expects human-friendly labels (`Aliado`, `Trinity`). Either: (a) add a label-mapping dictionary to the cell renderer, or (b) fix the test to assert the raw values. Task 7.7 added `useCategoryTypes()` for the filter but did not apply label mapping to the cell.

**WARNING:**

3. **Stale enum reference in mapper test** — `__tests__/mappers/category.mapper.test.ts:212` uses `BeneficiaryMode.FIXED_BENEFICIARY` which no longer exists. The test still passes at runtime (vitest) because it falls through as an unknown value, but it produces a TypeScript error and the test is not validating meaningful behavior.

4. **Stale enum reference in distribution-commission test** — `src/features/distribution-commission/__tests__/components/commission-rule-form.validation.test.tsx:37` uses `'UPLINE_CHAIN'` which is no longer a valid `BeneficiaryMode`. This test file was not updated when the enum was renamed.

5. **Test fixtures missing color** — 14 TypeScript errors across hook and API test fixtures that create `CreateCategoryInput` without the `color` field. Tests pass at runtime (vitest does not enforce types) but these are tech debt that will cause type-check CI to fail.

---

### Verdict: FAIL

**Blockers:**
- 1 failing test (categories-table type label mapping)
- 1 TypeScript error in production code (page.tsx missing color in handleSubmit)

**Non-blockers (should fix before merge):**
- 14 TypeScript errors in test fixtures (missing color field)
- 2 stale old-enum references in tests (FIXED_BENEFICIARY, UPLINE_CHAIN)
