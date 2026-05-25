# Flagsmith Integration — Ordered Task Checklist

### PHASE 0 — Verification gate (blocks everything)

**T0 · Verify peer dependency compatibility**
- Satisfies: design §1 (package choices, React 19 risk), FR1
- Sequential: MUST complete before T1
- Action: run `npm info flagsmith peerDependencies` and `npm info flagsmith-nodejs peerDependencies`; confirm `flagsmith@9.x` accepts `react@^19`. If peerDep is `react@^18` strict, document fallback path (vanilla Flagsmith + custom React context) and decide before installing.
- File: none (read-only verification)

---

### PHASE 1 — Install (depends on T0)

**T1 · Install packages**
- Satisfies: FR1, design §1
- Sequential: after T0
- Action: `npm install flagsmith flagsmith-nodejs`
- Record exact resolved versions in apply-progress artifact.
- File: `package.json`, `package-lock.json`

---

### PHASE 2 — App code (T2–T4 can run in parallel; T5–T6 sequential after T2–T4)

**T2 · Create `feature-flags.types.ts`** (parallel with T3, T4)
- Satisfies: FR4
- File: `src/features/shared/types/feature-flags.types.ts`
- Contents: `FeatureFlag` string-literal union (seed with `'negocios_advanced_filters'`); `FlagsmithServerState = string`
- No dependencies on other new files.

**T3 · Create `flagsmith-server.ts`** (parallel with T2, T4; depends on T1 at runtime)
- Satisfies: FR1 (server singleton), FR2 (getServerFlags), NFR2 (60s refresh), NFR3 (key isolation)
- File: `src/features/shared/lib/flagsmith-server.ts`
- Contents: module-scoped singleton `getInstance()`, `getFlagsmithServerState()`, `isFeatureEnabledServer(flag: FeatureFlag)`
- Import: `FeatureFlag`, `FlagsmithServerState` from T2 output

**T4 · Create `flagsmith-provider.tsx`** (parallel with T2, T3; depends on T1 at runtime)
- Satisfies: FR1 (client provider), NFR1 (no SSR flicker)
- File: `src/features/shared/providers/flagsmith-provider.tsx`
- Contents: `'use client'` `FlagsmithProvider` wrapping `VendorProvider` from `flagsmith/react`, accepts `serverState: FlagsmithServerState`
- Import: `FlagsmithServerState` from T2 output

**T5 · Create `use-feature-flag.ts`** (sequential after T2 + T4)
- Satisfies: FR2 (hook), FR4 (type-safe name parameter), NFR1
- File: `src/features/shared/hooks/use-feature-flag.ts`
- Contents: `'use client'` hook wrapping `useFlags` from `flagsmith/react`; returns `{ enabled: boolean, value: ... }`; param typed as `FeatureFlag`
- Import: `FeatureFlag` from T2; depends on provider context from T4

**T6 · Modify `src/app/layout.tsx`** (sequential after T3 + T4)
- Satisfies: FR1, FR2, NFR1 (server state hydration)
- File: `src/app/layout.tsx`
- Changes: make `RootLayout` async; await `getFlagsmithServerState()`; wrap children with `<FlagsmithProvider serverState={flagsmithServerState}>`
- Import: `getFlagsmithServerState` from T3; `FlagsmithProvider` from T4

---

### PHASE 3 — Infrastructure (independent of app code; can run in parallel with Phase 2)

**T7 · Update `.env.example`** (independent — parallel with Phase 2)
- Satisfies: FR6
- File: `.env.example`
- Append: `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY=` and `FLAGSMITH_SERVER_KEY=` with comment pointing to Flagsmith dashboard

**T8 · Update `deploy-qa.yml`** (independent — parallel with Phase 2)
- Satisfies: FR3, FR5
- File: `.github/workflows/deploy-qa.yml`
- Action: insert two lines inside the `cat > .env << 'ENVEOF'` heredoc after `DO_SPACES_PREFIX=qa`:
  ```
  NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY=${{ secrets.FLAGSMITH_CLIENT_KEY_QA }}
  FLAGSMITH_SERVER_KEY=${{ secrets.FLAGSMITH_SERVER_KEY_QA }}
  ```
- Also verify docker-compose.qa.yml forwards the full `.env` via `env_file:`; if it uses explicit `environment:` keys instead, add the two new vars there.

**T9 · Update `deploy-prod.yml`** (independent — parallel with Phase 2)
- Satisfies: FR3, FR5
- File: `.github/workflows/deploy-prod.yml`
- Action: insert two lines inside the heredoc after `DO_SPACES_PREFIX=prod`:
  ```
  NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY=${{ secrets.FLAGSMITH_CLIENT_KEY_PROD }}
  FLAGSMITH_SERVER_KEY=${{ secrets.FLAGSMITH_SERVER_KEY_PROD }}
  ```
- Also verify `docker-compose.prod.yml` (same as T8 check).

---

### PHASE 4 — Tests (sequential after Phase 2 completes)

**T10 · Unit test: `flagsmith-server.ts`**
- Satisfies: FR1 scenarios (singleton init, missing env var)
- File: `src/features/shared/lib/__tests__/flagsmith-server.test.ts`
- Cases:
  - throws when `FLAGSMITH_SERVER_KEY` is not set
  - returns same instance on repeated calls (singleton)
  - calls `getEnvironmentFlags()` and serializes state

**T11 · Unit test: `use-feature-flag.ts`**
- Satisfies: FR2 scenarios (hook returns false before hydration, returns value after hydration), FR4 (compile-time type check via test assertions)
- File: `src/features/shared/hooks/__tests__/use-feature-flag.test.ts`
- Cases:
  - returns `{ enabled: false, value: null }` when SDK has no flags
  - returns correct `enabled` value after mock hydration

**T12 · Integration smoke test: layout renders with provider**
- Satisfies: NFR1 (no SSR flicker scenario)
- File: `src/app/__tests__/layout.test.tsx` (or extend existing layout test if present)
- Cases:
  - async RootLayout renders without throwing when `getFlagsmithServerState` resolves
  - `FlagsmithProvider` receives a non-empty `serverState` string

---

### PHASE 5 — Verification (sequential after Phase 2 + Phase 4)

**T13 · Verify server key isolation (NFR3)**
- Action: run `npm run build` and grep `.next/static/` chunks for the literal value of `FLAGSMITH_SERVER_KEY`; assert absent.
- File: none (manual/CI check)

**T14 · Document GitHub Secrets required (FR5)**
- Action: create/update `.github/SECRETS.md` or append to existing deploy docs listing the four required secrets: `FLAGSMITH_CLIENT_KEY_QA`, `FLAGSMITH_SERVER_KEY_QA`, `FLAGSMITH_CLIENT_KEY_PROD`, `FLAGSMITH_SERVER_KEY_PROD`
- File: `.github/SECRETS.md` (or existing secrets doc)

---

## Dependency map summary

```
T0 (verify peerDeps)
  └── T1 (install)
        ├── T2 (types)  ─────────────────────┐
        ├── T3 (server singleton) ← T2        │
        ├── T4 (client provider)  ← T2        │
        │                                      │
        ├── T5 (hook) ← T2 + T4               │
        └── T6 (layout) ← T3 + T4             │
                                               │
T7 (env.example) — independent                 │
T8 (deploy-qa)  — independent                  │
T9 (deploy-prod) — independent                 │
                                               │
T10 (test server)  ← T3                       │
T11 (test hook)    ← T5                        │
T12 (test layout)  ← T6 ──────────────────────┘
                                               │
T13 (bundle check) ← T6 complete              │
T14 (secrets doc)  ← T8 + T9                 │
```

## Estimated changed lines
- T2: ~15 lines
- T3: ~45 lines
- T4: ~30 lines
- T5: ~25 lines
- T6: ~10 lines (diff)
- T7: ~6 lines
- T8: ~3 lines
- T9: ~3 lines
- T10: ~50 lines
- T11: ~40 lines
- T12: ~30 lines
- T13: 0 (check)
- T14: ~15 lines

**Total: ~272 lines — single PR, under 400-line budget. Chained PRs: No.**
