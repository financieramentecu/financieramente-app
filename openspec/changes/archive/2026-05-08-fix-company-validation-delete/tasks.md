# Tasks: Company Validation and Soft Delete Fixes

## Phase 1: Testing & Schema Refactoring (TDD)

- [x] 1.1 Update `src/features/company/__tests__/lib/company-schemas.test.ts` to include test cases for numeric `idCurrency` (RED).
- [x] 1.2 Refactor `src/features/company/lib/company-schemas.ts` to use `z.coerce.string()` for `idCurrency` in `createCompanySchema` and `updateCompanySchema` (GREEN).
- [x] 1.3 Verify that `npm run test src/features/company/__tests__/lib/company-schemas.test.ts` passes.

## Phase 2: API Consistency & Verification

- [x] 2.1 Verify `PUT` handler in `src/app/api/admin/companies/[id]/route.ts` correctly handles coerced string/number inputs without further changes.
- [x] 2.2 Verify `DELETE` handler in `src/app/api/admin/companies/[id]/route.ts` enforces active product check before deactivation.
- [x] 2.3 Verify `POST` handler in `src/app/api/admin/companies/route.ts` for new companies with numeric currency inputs.
- [x] 2.4 Fix frontend "stale closure" bug in `CompaniesPageClient.tsx` and refactor `useCompanyMutations` to return results directly.
- [x] 2.5 Enable name editing in `CompanyForm.tsx` and update related tests.

## Phase 3: Integration & Documentation

- [x] 3.1 Perform manual verification of company editing with currency change via Dashboard UI.
- [x] 3.2 Update `CHANGELOG.md` with the bug fix and version increment if necessary.
- [ ] 3.3 Create a Pull Request with the changes.
