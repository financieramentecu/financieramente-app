# SDD verification — crm-person-captures

Status: implementation and automated verification complete; ready for PR validation.

Reviewed additive nullable Prisma migration; capture catalogue/admin authorization; native, trusted webhook, CSV and landing ingestion; explicit LeadLink group traversal and full write-scope checks; ownership history; visible board/detail grouping; scoped timeline pagination and human/System provenance. No session, entitlement or automatic supersession implementation was introduced. Existing capture opportunities remain separate active Leads.

Evidence: CSV suite 57 passing tests/7 files; landing suite 25 passing tests/3 files; latest form-service + captures-admin suite 18 passing tests/2 files after moving origin provenance inside the snapshot transaction. Targeted CSV/form lint and diff whitespace checks passed. These are focused unit/component checks, not claims of live database verification.

Review follow-ups resolved in source and focused regressions:
1. Mixed-owner manual relation/owner group conflicts carry status409 to routes; unrelated validation errors retain400.
2. Manual relation re-reads current originTag inside its transaction before filling; a concurrent-attribution regression prevents overwrite.
3. Board initial attribution uses full visible group members through one additional scoped batch only when needed; filtered selectable captures and representative stay unchanged. Hidden members remain excluded by graph scope.

Focused follow-up suite: 24 tests passed across board/associated/relation/assignment/owner-route files; targeted lint passed. Includes explicit owner-route409 regression.

Final validation:
- 941 CRM unit/component tests passed across 144 files; mocked full-flow integration: 5 passed.
- Global TypeScript, ESLint over changed TypeScript files, Prisma schema validation and diff whitespace checks passed.
- All 98 migrations applied successfully to an isolated PostgreSQL 15 database.
- Additive migration preservation probe passed: legacy row retained its name/source/active state; new fields remained null; no inferred catalogue entries were inserted.
- Real-service script: 8 scenarios passed for native captures/grouped pipeline/timeline, reassignment/hidden-member denial, inactive captures, legacy/new webhook and CSV, post-insert foreign-key rollback, and landing capture/replay.
- Both captures remain active; no session balances or supersession were implemented.

Reproduce real-service checks only against the guarded disposable database:
```sh
DATABASE_URL='postgresql://crm_test@127.0.0.1:55438/crm_person_captures' DIRECT_URL='postgresql://crm_test@127.0.0.1:55438/crm_person_captures' NODE_ENV=test npx tsx scripts/check-crm-person-captures.ts
```
The script asserts the exact localhost database before importing Prisma. It creates synthetic fixtures; use a disposable database. The expected foreign-key error output demonstrates actual transaction rollback.

Deployment: apply the additive migration using the existing migration workflow. No new required environment variables or cron jobs. Keep nullable columns on application rollback; do not drop captured data.

Browser acceptance has not been performed on this branch and remains a QA validation step. No QA/production writes or deployment performed.

CI follow-up: the first PR run passed lint, unit and integration jobs but Chromatic could not extract stories because the existing CreateBusinessForm story imported real Next.js server actions and initialized Prisma in the browser. Storybook now aliases those action modules to explicit unavailable-action mocks, for both Webpack and Vite. Production action code is unchanged. Storybook build, TypeScript and targeted lint passed; the affected default form story rendered in the in-app browser with no console errors. This Storybook smoke check does not replace CRM acceptance in QA.
