# SDD Proposal: flagsmith-integration

## Intent

### Problem
- No mechanism to toggle features remotely; every change requires a redeploy.
- No way to gate experimental UI (e.g. negocios filters, future PDF uploads) per environment or per user segment.
- No kill-switch for risky paths in production.

### Why now
- Release cadence is increasing (1.9.0 just shipped, multiple feature branches active). Without flags, rollback granularity is "redeploy previous tag".
- QA and Prod environments are already isolated via the `_QA` / `_PROD` secret convention — Flagsmith fits cleanly into that pattern.

### Success criteria
- A typed `useFeatureFlag(name)` hook is usable in any Client Component.
- Server Components and Route Handlers can read the same flags via a server singleton — no client/server divergence.
- No SSR flicker: client hydrates from server state on first paint.
- Toggling a flag in the Flagsmith dashboard takes effect within 60s in both QA and Prod without a deploy.
- Flag names are a TypeScript union — typos fail at compile time.

---

## Scope

### In scope
- Hybrid integration: `flagsmith-nodejs` server singleton with `localEvaluation: true` + client `FlagsmithProvider` hydrated from server state.
- Strongly-typed flag catalog in `src/features/shared/types/feature-flags.types.ts` (union of known flag names).
- `useFeatureFlag(name)` hook in `src/features/shared/hooks/` returning a boolean (and value for multivariate, follow-up).
- Wiring `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` and `FLAGSMITH_SERVER_KEY` into both deploy workflows via new GitHub Secrets (`FLAGSMITH_*_QA`, `FLAGSMITH_*_PROD`).
- Update `.env.example` (if present) to document the new variables.
- One reference flag wired end-to-end so the team has a concrete usage example.

### Out of scope
- User identity / segmentation by authenticated user (defer to follow-up; first cut uses environment-level flags only).
- Redis caching layer for the server SDK (`localEvaluation` already removes per-request network hops).
- Flagsmith self-hosting (use Flagsmith cloud initially).
- Migrating existing conditionals to flags retroactively — features opt-in as they need flags.
- A/B analytics integration.
- Local dev environment separate from QA (convention: local uses QA keys via `.env.local`).

---

## Approach

### Architecture (hybrid server + client)

1. **Server singleton** (`src/features/shared/lib/flagsmith-server.ts`)
   - Lazy-initialized `Flagsmith` instance from `flagsmith-nodejs` with `environmentKey: process.env.FLAGSMITH_SERVER_KEY`, `enableLocalEvaluation: true`, `environmentRefreshIntervalSeconds: 60`.
   - Exports `getServerFlags()` returning the flags object for the current environment.
   - Module-scoped singleton (Next.js process-level cache) — safe because flags are environment-wide, not per-user.

2. **Root layout integration** (`src/app/layout.tsx`)
   - Server Component awaits `getServerFlags()` and serializes state.
   - Passes `serverState` prop into a new `<FlagsmithProvider>` that wraps the existing provider tree (inside `AuthProvider` + `ThemeProvider`).
   - No client fetch on first paint → no flicker.

3. **Client provider** (`src/features/shared/providers/flagsmith-provider.tsx`)
   - `'use client'` wrapper around Flagsmith React SDK's `FlagsmithProvider`.
   - Accepts `serverState` and hydrates the client SDK from it.
   - Configured with `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` for any future client-initiated refreshes.

4. **Typed hook** (`src/features/shared/hooks/use-feature-flag.ts`)
   - Signature: `useFeatureFlag(name: FeatureFlagName): { enabled: boolean, value: ... }`.
   - Internally uses Flagsmith's `useFlags([name])`.
   - Returns `enabled: false` if SDK state is not yet hydrated (defensive default — features are off until proven on).

5. **Flag catalog** (`src/features/shared/types/feature-flags.types.ts`)
   - `export type FeatureFlag = 'flag_a' | 'flag_b' | ...` — single source of truth.
   - New flags must be added here before use; enforces compile-time safety.

### Deploy pipeline integration
- Add `FLAGSMITH_CLIENT_KEY_QA`, `FLAGSMITH_SERVER_KEY_QA`, `FLAGSMITH_CLIENT_KEY_PROD`, `FLAGSMITH_SERVER_KEY_PROD` as GitHub repository secrets.
- Extend the `cat > .env << 'ENVEOF'` blocks in both `deploy-qa.yml` and `deploy-prod.yml` to inject `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` and `FLAGSMITH_SERVER_KEY` from the appropriate secrets.
- No Terraform changes required — droplets read env at container start.

### Rationale for hybrid over client-only
Client-only would (a) flash un-flagged UI on first paint, (b) prevent gating API routes, and (c) couple all flag checks to Client Components, violating our preference for Server Components where possible. The hybrid pattern is explicitly supported by Flagsmith via `getState()` / `serverState` and costs only one extra file (the server singleton) and one extra env var.

### Rationale for placement under `src/features/shared/`
Flagsmith is cross-cutting infrastructure used by every feature. It is NOT a domain. Per Screaming Architecture rules in CLAUDE.md, cross-feature infrastructure lives in `src/features/shared/`.

---

## Open questions / tradeoffs
- Should we add a Redis cache for the server SDK now or defer? Recommendation: defer — `localEvaluation: true` already eliminates per-request network calls.
- Should we identify users to Flagsmith for segmentation? Recommendation: defer to a follow-up SDD; first cut is environment-level only.
- Verify `flagsmith` and `flagsmith-nodejs` peerDependency compatibility with React 19 / Next.js 15 before locking versions during the spec/design phase.

**Note**: The existing `_QA` / `_PROD` secret naming convention and inline `.env` generation in deploy workflows make adding new env-scoped configuration mechanical. Reuse that pattern rather than introducing a new secret loading strategy.
