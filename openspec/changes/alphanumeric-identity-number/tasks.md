# Tasks: Alphanumeric Identity Number

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80–120 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception (not needed — well under budget) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 4 file changes (TDD order) | PR 1 | Test file first, then schema, then two callers |

---

## Phase 1: RED — Write Failing Tests

- [x] 1.1 Create `src/features/negocios/__tests__/identity-number.schema.test.ts`. Import `identityNumberSchema` from `../lib/identity-number.schema` (does not exist yet — this MUST fail to import / all tests RED). Scaffold describe blocks: `valid inputs`, `invalid inputs`, `length bounds`, `server-side transform`.
- [x] 1.2 Add test cases for **valid inputs**: `'12345'`, `'12.345.678'`, `'A-12345678'`, `'PE-123456'`, `'CE987654'`, `'ab1234'` — all `safeParse` return `success: true`.
- [x] 1.3 Add test cases for **invalid inputs**: `''`, `'AB1'` (< 5 chars), `'12 345'` (space), `'abc@123'` (`@`), `'A_1234'` (`_`), 21-char string — all `safeParse` return `success: false`.
- [x] 1.4 Add test cases for **server-side transform**: compose `identityNumberSchema.transform(v => v.toUpperCase())` and assert `'ce-123456'` → `'CE-123456'`, `'ab1234'` → `'AB1234'`.
- [x] 1.5 Confirm `npm run test:unit -- identity-number` reports RED (all failing).

## Phase 2: GREEN — Implement Schema Module

- [x] 2.1 Create `src/features/negocios/lib/identity-number.schema.ts`. Export `IDENTITY_NUMBER_REGEX = /^[A-Za-z0-9.\-]+$/`, `IDENTITY_NUMBER_MIN = 5`, `IDENTITY_NUMBER_MAX = 20`, and `identityNumberSchema` (z.string, min(1) for required, min(5), max(20), regex). No `.transform()`.
- [x] 2.2 Run `npm run test:unit -- identity-number` — confirm all tests GREEN.

## Phase 3: Wire Callers

- [x] 3.1 In `src/features/negocios/lib/business-form-schemas.ts`, add import `import { identityNumberSchema } from './identity-number.schema'`. Replace the inline `identityNumber` field (lines 19–26) with `identityNumber: identityNumberSchema`. Delete the old inline `.min(1).min(5).regex(/^[0-9.]+$/)` block.
- [x] 3.2 In `src/features/negocios/actions/create-client.ts`, add import `import { identityNumberSchema } from '../lib/identity-number.schema'`. Replace the inline `identityNumber` field (lines 19–26) with `identityNumber: identityNumberSchema.transform(v => v.toUpperCase())`. Delete the old inline block.
- [x] 3.3 Grep `src/features/negocios` for any remaining `[0-9.]+` or `[0-9]+` inline identity-number regex patterns — confirm zero results outside `identity-number.schema.ts`.

## Phase 4: Verification

- [x] 4.1 Run `npm run test:unit` — full suite GREEN; no regressions in `use-business-form`, `create-business`, `business-form.mapper` tests.
- [x] 4.2 Run `npm run type-check` — zero errors.
- [x] 4.3 Run `npm run lint` — zero warnings or errors.
- [x] 4.4 Commit: `feat(negocios): add alphanumeric identity number validation schema` (atomic, single PR).
