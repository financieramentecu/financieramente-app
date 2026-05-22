# Proposal: Allow Alphanumeric Identity Numbers

## Intent

The current client creation flow rejects identity numbers that contain letters because the Zod regex `/^[0-9.]+$/` only accepts digits and dots. Real-world identity documents in our market include:

- **Cédula de Extranjería (CE)**: alphanumeric prefixes (`CE-123456`, `E-987654`).
- **Pasaporte**: mixed letters and digits (`AB1234567`, `PE-123456`).
- **Otros documentos**: hyphens and uppercase letters.

Users with these documents cannot be onboarded today, blocking legitimate business. We need to relax validation while preserving safety against malicious inputs (no spaces, no special chars beyond `.` and `-`).

## Scope

### In Scope
- Update `identityNumber` Zod validation to accept `[A-Za-z0-9.\-]+`.
- Extract a single shared `identityNumberSchema` so the rule is defined once.
- Replace both call sites (form schema + server action embedded schema) with the shared one.
- **Normalize to uppercase server-side** via Zod `.transform(v => v.toUpperCase())` in the shared schema — ensures `'ce-123'` is stored as `'CE-123'`.
- Add unit tests covering letters, digits, dot, hyphen — and rejecting spaces, `@`, empty strings; also assert uppercase normalization.

### Out of Scope
- Database schema changes (column already `VarChar(20)`).
- Front-end input masking or live-uppercase behavior in the UI.
- Backfilling or normalizing existing identity numbers in the DB.
- Adding document-type discrimination (CC vs CE vs PA).
- Changes to update/edit-client flows that do not currently re-validate `identityNumber`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None at spec level. This is an input-validation rule relaxation. No user-visible capability changes — same flow, broader accepted inputs.

## Approach

Single source of truth for the validation rule:

1. Create `src/features/negocios/lib/identity-number.schema.ts` exporting `identityNumberSchema` — a Zod string with min(1), max(20), regex `/^[A-Za-z0-9.\-]+$/`, and `.transform(v => v.toUpperCase())` for server-side normalization.
2. Replace the inline regex in `src/features/negocios/lib/business-form-schemas.ts` (`businessFormSchema.identityNumber`) with an import.
3. Replace the duplicated regex in `src/features/negocios/actions/create-client.ts` (`createClientSchema.identityNumber`) with the same import.
4. Add a colocated `__tests__/identity-number.schema.test.ts` that asserts accepted inputs, rejected inputs, and that `'ce-123456'` is stored as `'CE-123456'`.
5. TDD: write the failing schema test first, then implement.

This fixes the SOLID-O (Open/Closed) duplication as a side effect — future changes to the rule touch one file.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/negocios/lib/identity-number.schema.ts` | New | Shared Zod schema for identity numbers. |
| `src/features/negocios/lib/business-form-schemas.ts` | Modified | Import shared schema instead of inline regex (lines 22–26). |
| `src/features/negocios/actions/create-client.ts` | Modified | Import shared schema instead of inline regex (lines 22–26). |
| `src/features/negocios/__tests__/identity-number.schema.test.ts` | New | Unit tests for accepted/rejected inputs. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Allowing letters breaks downstream consumers expecting digits-only. | Low | Grep confirmed no numeric parsing of `identityNumber`; column is `VarChar(20)`. |
| Hyphen in regex could be misread as range. | Low | Escape as `\-` at end of class; cover with explicit test. |
| Existing tests assume digits-only identity numbers. | Low | New regex is a SUPERSET — all current valid inputs still pass. |

## Rollback Plan

Revert the three modified/added files (`identity-number.schema.ts`, `business-form-schemas.ts`, `create-client.ts`, and the test file). No DB migration to undo, no data to backfill. A single `git revert` of the implementation commit is sufficient.

## Dependencies

- None. No new packages, no schema changes, no API contract changes.

## Success Criteria

- [ ] `identityNumberSchema` exists in `src/features/negocios/lib/identity-number.schema.ts` and is the only place defining the rule.
- [ ] Both `business-form-schemas.ts` and `create-client.ts` import it (no inline regex remains).
- [ ] Tests pass for: `'12345678'`, `'12.345.678'`, `'A-12345678'`, `'PE-123456'`, `'CE987654'`.
- [ ] Tests reject: `''`, `'12 345'`, `'abc@123'`, `'A_1234'`.
- [ ] Uppercase normalization: `'ce-123456'` → stored as `'CE-123456'`; `'ab1234'` → `'AB1234'`.
- [ ] `npm run type-check` and `npm run lint` pass clean.
- [ ] Manual smoke: create client with `'CE-1234567'` succeeds end-to-end.
