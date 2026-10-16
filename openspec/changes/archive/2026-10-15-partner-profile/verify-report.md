```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:70e21d6a8fe2310f5100c8d852c6ee123bd68235bfbe3d83ec3f7ffe9bd1afc2
verdict: pass
blockers: 0
critical_findings: 0
requirements: 53/53
scenarios: 99/99
test_command: npm run test:unit && npm run test:integration
test_exit_code: 0
test_output_hash: sha256:70e21d6a8fe2310f5100c8d852c6ee123bd68235bfbe3d83ec3f7ffe9bd1afc2
build_command: npm run type-check
build_exit_code: 0
build_output_hash: sha256:23dcabfca2e95ef6cedb294db5ea44c1988f404c798d2be96394a044182a5fa1
```

## Verification Report

**Change**: partner-profile  **Mode**: Strict TDD (vitest)  **Branch**: COM-41 (uncommitted tree)
**Re-verify context**: Second re-verification. Prior pass (obs #123, `verify-report.md` 2026-10-11) returned FAIL with 2 CRITICAL findings (C1 stale `GOOD_PASSWORD` test fixture; C2 AA-05 spec drift). A corrective `sdd-apply` run ("Batch L", see `apply-progress.md` and Engram `sdd/partner-profile/apply-progress` obs #121) reportedly fixed both. This pass independently re-verifies that corrective batch rather than trusting its self-report.

### Completeness
Tasks 71/71 checked (Phases 1-9), 0 incomplete (`grep -c '\[ \]' tasks.md` = 0). Batch L is a corrective fix outside the original task list (no new checkboxes added), consistent with how C1/C2 were scoped in the prior verify.

### Execution evidence (run this pass, node v20.13.1 via nvm — default machine node v16 x64/esbuild mismatch still applies and was worked around the same way as before)
| Command | Exit | Result |
|---|---|---|
| `npm run test:unit` | **0** | **555 files passed (555)**; **5363 passed / 3 skipped (5366 tests), 0 failed** |
| `npm run test:integration` | **0** | 8 files, 53 tests passed (unchanged) |
| `npm run type-check` | **0** | clean, 0 errors (full project) |
| `npm run lint` | **0** | 0 errors, 3 pre-existing warnings (same 3 as prior pass: 2 unused-import warnings in unrelated test files, 1 `react-hooks/exhaustive-deps` in `use-production-kpis.ts`) |

`src/app/api/account/__tests__/token-routes.test.ts` — the file that was 12/12 RED in the prior pass — is now fully green (all `(AA-04, AA-05, AA-07, SEC-04)`-tagged cases pass), confirmed by direct grep against the fresh run log, not by re-reading the apply report.

### Fix verification (C1, C2)

**C1 (stale fixture) — CONFIRMED FIXED.**
`grep -n "GOOD_PASSWORD" src/app/api/account/__tests__/token-routes.test.ts` shows `const GOOD_PASSWORD = 'Abcdef12!'` — satisfies `accountPasswordSchema`'s 5 rules (length, lowercase, uppercase, digit, special). All 12 previously-failing cases (activate + reset-password: success, generic-400, trusted-IP rate-limit, generic-500) now pass per the fresh `npm run test:unit` log.

**C2 (spec drift) — CONFIRMED FIXED.**
Read both files directly and compared:
- `src/features/auth/lib/account-password.schema.ts`: 8-72 chars, requires `\p{Ll}` (lowercase), `\p{Lu}` (uppercase), `\d` (digit), and `[^\p{L}\d\s]` (special) — all 4 character-class regexes plus length bounds, each a separate chained `.regex()`/`.min()`/`.max()`.
- `openspec/changes/partner-profile/specs/account-activation/spec.md` AA-05 now reads: "Any password set via activation or reset MUST be 8-72 characters and contain at least one lowercase letter, one uppercase letter, one digit, and one special character" — exact match to the schema. The `Weak passwords rejected` scenario lists `abcdefgh`, `12345678`, and `Abcdefgh` (missing special char) as rejected; the `Compliant password` scenario uses `Abcd1234!` (satisfies all 5 checks) as accepted. No remaining reference to the old `abcd1234`-passes rule in this spec file.

### Regression check on the corrective batch itself
Searched the full codebase for the exact stale literals (`'Abcdef12'` without `!`, and `abcd1234`) beyond the fixed file:
- `src/app/login/__tests__/page.test.tsx`, `src/features/auth/hooks/__tests__/account-hooks.test.ts`, `src/lib/auth/__tests__/config-credentials-authorize.test.ts` still use `'Abcdef12'` — but these exercise **login** (credential authorize) and the **client submit hook**, neither of which re-validates password strength; AA-05 strength is enforced only server-side in the token-routes handler, which these tests do not go through. Not a regression.
- `src/app/api/admin/users/set-password/__tests__/route.test.ts` still uses `'abcd1234'` — this route uses a separate legacy `validatePasswordStrength` from `password-utils`, not `accountPasswordSchema`; it is the admin-initiated set-password feature, out of AA-05's scope ("password set via activation or reset"). Not a regression.
- `src/features/auth/services/__tests__/account-activation.service.test.ts` still uses `'abcd1234'` extensively — confirmed `account-activation.service.ts` does not import or call `accountPasswordSchema` (only `hashPassword`/`hashToken`); password-rule validation happens one layer up in the route handler (already covered by `token-routes.test.ts` and `account-password.schema.test.ts`). The service test is intentionally decoupled from password-strength rules (SRP) — not stale, not a regression.

All of the above files pass in the fresh full-suite run, confirming no hidden breakage.

### Compliance (53 requirements, 99 scenarios)
Method: implementation read plus covering test located by name and suite pass/fail, re-running the full suite rather than trusting any self-report.

**53/53 requirements COMPLIANT** (up from 51/53):
- **AA-04 Activation flow — COMPLIANT.** `token-routes.test.ts > POST '/api/account/activate' > returns 200 and audits ... on success` passes.
- **AA-05 Password rule — COMPLIANT.** Spec text and implementation now agree (see Fix Verification above); `account-password.schema.test.ts` (27 cases) and `token-routes.test.ts` password-rejection cases all pass.
- All other 51 requirements (PM-01..08, AA-01..03, AA-06..10, PA-01..08, SEC-01..04, NEG, CC, BS, ADM, LVL, SEED, PL, NAV, PD) re-spot-checked this pass:
  - **account-activation** (full file read): AA-01 state matrix, AA-02 token hash/TTL, AA-03 single-use/concurrency, AA-06 invalidation, AA-07 forgot-password scope, AA-08 generic responses/rate limit, AA-09 per-request revalidation, AA-10 pages/email — all covered by passing tests in the fresh run (middleware-matcher, credentials-rate-limiter, account-activation.service, config-credentials-authorize, token-routes).
  - **partner-access** (full file read): PA-01 deny-by-default allowlist, PA-02 menu, PA-03 calculadora exclusion, PA-04 own-business scope, PA-05 notification parity, PA-06 accepted client-search risk, PA-07 partner dashboard, PA-08 impersonation rules — unchanged since prior pass, all covering tests still pass in the fresh 555-file run.
  - **security** (full file read): SEC-01 per-request revalidation, SEC-02 middleware `/api` coverage, SEC-03 central business-access helper, SEC-04 secure token handling — unchanged, still covered and passing.

**99/99 scenarios compliant** (up from 97/99). The 2 previously-regressed scenarios (AA-04 "Activate", AA-05 "Compliant password") are now both COMPLIANT.

### Architecture / CLAUDE.md compliance
No production code changed in Batch L (only a test fixture string, one test assertion message, and spec prose) — the architecture spot-check from the prior pass (soft-delete, no Prisma-in-route, audit logging, AsyncState, English code/Spanish UI strings, Feature-Based layout) still holds unchanged, since nothing in those areas was touched. Re-confirmed no `prisma.*.delete()`, no new Prisma call in a route handler or client component, no audit-logging gap, introduced by this corrective batch.

### Findings

**CRITICAL**: None.

**WARNING** (carried over from prior passes, still open; none caused by Batch L)
- W1 CONSULTOR visibility widening still not documented in `.changeset/partner-profile.md` or `deploy-checklist.md` (only in apply-progress).
- W2 Rate limiter remains in-process (per instance); activate/reset still IP-only, not IP+email as AA-08 literally states.
- W3 AA-03 atomicity proven only against a fake DB.
- W4 Confirm no stray untracked `.mcp.json` gets committed.
- W5 The 3 `react-hooks/exhaustive-deps`-class lint warnings remain pre-existing (same 3 as both prior passes; count unchanged).

**SUGGESTION**
- S1-S7 from the original pass, still open (see Engram `sdd/partner-profile/verify-report` history / prior `verify-report.md`).
- S8 Product id 82 ("SELEC TERM TO A 85 & TO A 100") still has no PARTNER_EXTERNAL `ProductConfiguration` because its generated `code` exceeds the 50-char column limit. This is the same explicit, accepted, deferred product-owner decision as the prior pass — **not a new gap**, carried forward unchanged. Still recommended for `deploy-checklist.md`'s known-limitations section before archive.
- S9 `PASSWORD_REQUIREMENTS` / live checklist UI still has no corresponding spec requirement ID; unchanged suggestion from prior pass.

### Test-quality sample
`token-routes.test.ts` now exercises the corrected fixture end-to-end (200/400/429/500 paths) with real assertions on status, body and audit side effects — not tautological. The fix was mechanical and scoped exactly as predicted in the prior report (one fixture string, one assertion message).

### Limits (could NOT be verified)
Same as prior passes: no database or browser available in this environment — migration apply/backfill, real seed run beyond what already ran, real concurrent token consumption, Edge runtime/cookies, SSE, SendGrid, Playwright e2e, UI rendering in a real browser. Toolchain note unchanged: default machine `node` (v16 x64) cannot run Vitest; this pass used `~/.nvm/versions/node/v20.13.1` (arm64) instead.

### Verdict: PASS (0 CRITICAL, 5 WARNING, 9 SUGGESTION)
Both blocking CRITICAL findings from the prior re-verify (C1 failing test suite, C2 AA-05 spec/code drift) are confirmed fixed by independent re-execution: full test suite is green (555/555 files, 5363/5366 tests passed, 3 skipped, 0 failed), type-check and lint are clean, and the AA-05 spec text now matches the shipped `accountPasswordSchema` exactly. 53/53 requirements and 99/99 scenarios are compliant. Remaining WARNING/SUGGESTION items are pre-existing, non-blocking, and unchanged from prior passes (including the explicitly deferred product-82 gap, S8). Recommend proceeding to `sdd-archive`.
