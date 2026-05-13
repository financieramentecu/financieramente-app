# Tasks: Product Management — Commission Fields

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180–240 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fix bugs + missing import + seed scale + test corrections | PR 1 | All remaining work fits in one PR; most implementation already done |

---

## Phase 1: Bug Fixes (sequential — must run first)

- [x] 1.1 Fix `src/app/api/products/[id]/route.ts` ~line 157: add `import type { ContributionType } from '@/features/product/types/product.types'` — `ContributionType` is used in `updateData` type annotation but not imported (TypeScript compile error)
- [x] 1.2 Fix `prisma/seeds/sync-product-commissions.ts` ~line 33: remove `/ 100` — percentages are 0-100 in domain; seed must store the raw `parseFloat` value, not a fraction
- [x] 1.3 Fix `prisma/seeds/sync-product-commissions.ts` ~line 65: uncomment/add `console.log` for unmatched product rows (spec requires every skipped row to be logged)

## Phase 2: Schema — contributionType Required (sequential after Phase 1)

- [x] 2.1 Remove `.default('REGULAR')` from `contributionType` in `src/features/product/lib/product-schemas.ts` — spec states "no domain default; required on create"; current schema has a default which contradicts the spec
- [x] 2.2 Confirm `updateProductSchema` (`.partial()`) still allows omitting `contributionType` on PATCH — no code change needed; add an inline comment to the schema clarifying required-on-create vs optional-on-update

## Phase 3: Test Corrections — Fix Wrong Scale (parallel with Phase 2)

- [x] 3.1 Fix `src/features/product/__tests__/mappers/product.mapper.test.ts` ~line 18: change `new Prisma.Decimal(0.765)` → `new Prisma.Decimal(76.5)` — test uses 0-1 fraction scale; spec and design confirm 0-100 storage
- [x] 3.2 Add mapper test: `Decimal(76.5)` maps to `number` `76.5` after `.toNumber()` — covers spec scenario "Decimal → number via mapper"

## Phase 4: Test Additions — Spec Gap Coverage (parallel with Phase 2)

- [x] 4.1 Add schema test: `contributionType` omitted on create must fail (spec: "required on create; no domain default") — only valid after task 2.1
- [x] 4.2 Add schema test: `commissionPercentage = -1` fails on create (spec: "below 0 is rejected")
- [x] 4.3 Add schema test: `commissionPercentage = 101` fails on create (spec: "above 100 is rejected")
- [x] 4.4 Add schema test: `contributionType = 'OTRO'` fails on create (spec: "invalid enum value rejected")

All tests go in `src/features/product/__tests__/lib/product-schemas.test.ts`.

## Phase 5: Seed Rewrite — csv-parse + Correct Scale (sequential after Phase 1)

- [x] 5.1 Check `package.json`; if `csv-parse` is absent install it: `npm install csv-parse`
- [x] 5.2 Rewrite `prisma/seeds/sync-product-commissions.ts` using `csv-parse`: handle quoted fields, trim all values, case-insensitive match on both company and product name, store commission as raw 0-100 float (strip `%`, `parseFloat`), `console.log` every unmatched row
- [x] 5.3 Add a sanity log before first DB write: log parsed `commissionPercentage` for the first CSV row so a dry run confirms the correct scale

## Phase 6: Integration Verification (sequential — after all above)

- [x] 6.1 Run `npm run type-check` — 0 errors (validates task 1.1 import fix)
- [x] 6.2 Run `npm run test:unit` — 0 product test failures (validates tasks 2.x–4.x)
- [ ] 6.3 Manual smoke: `POST /api/products` with `commissionPercentage: 5.5, contributionType: 'REGULAR'` → 201 with both fields in response body
- [ ] 6.4 Manual smoke: run seed against dev DB; spot-check one product record and confirm `commissionPercentage` is in 0-100 range (not 0-1 fraction)
