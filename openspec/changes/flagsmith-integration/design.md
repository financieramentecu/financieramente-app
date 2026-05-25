# Flagsmith Integration — Technical Design

## Summary

Hybrid server+client SDK pattern. Server singleton with `enableLocalEvaluation` hydrates a client `FlagsmithProvider` via `serverState` from the root layout, exposing a typed `useFeatureFlag(flag)` hook to all Client Components and a `getServerFlags()` helper to Server Components / Route Handlers.

---

## 1. Package choices

| Concern | Package | Version target | Notes |
|---|---|---|---|
| Server SDK | `flagsmith-nodejs` | ^4.x | Official Node SDK. Supports `enableLocalEvaluation`, `environmentRefreshIntervalSeconds`, `getEnvironmentFlags()`, `getState()` for hydration export. |
| Client SDK | `flagsmith` | ^9.x | Vanilla JS core. |
| React bindings | `flagsmith/react` (subpath of `flagsmith`) | ^9.x | Exposes `FlagsmithProvider`, `useFlags`. No separate `@flagsmith/react` package. React 19 compatible (no class lifecycle conflicts, peerDep accepts `>=16`). |

**Decision**: install `flagsmith` and `flagsmith-nodejs` only. Do NOT install a separate React package. Verify peer deps with `npm info flagsmith peerDependencies` during tasks phase; if `flagsmith@9` declares `react@^18` strict, install with `--legacy-peer-deps` is unacceptable — instead pin to the latest minor that lists React 19 or use the `flagsmith-nodejs` server only + hand-rolled minimal client wrapper. Spec/apply phase must record the exact resolved versions.

**Rejected**: `@flagsmith/nextjs` (does not exist as official package); `unleash-proxy-client` (unrelated vendor); `LaunchDarkly` (rejected in proposal — cost).

---

## 2. File structure (exact contents contract)

### 2.1 `src/features/shared/types/feature-flags.types.ts`

```ts
/**
 * Single source of truth for all known feature flag identifiers.
 * Add a new flag here BEFORE referencing it anywhere in the app.
 * Names must match exactly the flag key configured in the Flagsmith dashboard.
 */
export type FeatureFlag =
  | 'negocios_advanced_filters'   // reference flag — wired end-to-end as proof
  // | 'future_flag_name'

/**
 * Shape of the serialized Flagsmith state passed from the Server Component
 * root layout to the client `FlagsmithProvider` for hydration.
 * Kept as `string` (Flagsmith ships its own internal shape via getState()).
 */
export type FlagsmithServerState = string
```

Rationale: a string-literal union enforces compile-time safety. `FlagsmithServerState` is intentionally opaque — we forward whatever `flagsmith-nodejs` `getState()` returns (it serializes internally) and pass it as `serverState` to the React provider. Treating it as `string` (JSON) avoids leaking SDK internals into our types.

### 2.2 `src/features/shared/lib/flagsmith-server.ts`

```ts
import Flagsmith from 'flagsmith-nodejs'
import type { FlagsmithServerState } from '@/features/shared/types/feature-flags.types'

let instance: Flagsmith | null = null

function getInstance(): Flagsmith {
  if (instance) return instance
  const environmentKey = process.env.FLAGSMITH_SERVER_KEY
  if (!environmentKey) {
    throw new Error('FLAGSMITH_SERVER_KEY is not set')
  }
  instance = new Flagsmith({
    environmentKey,
    enableLocalEvaluation: true,
    environmentRefreshIntervalSeconds: 60,
  })
  return instance
}

/**
 * Returns the serialized Flagsmith state for the current environment.
 * Use ONLY from Server Components, Route Handlers, or Server Actions.
 * Never import from a 'use client' module.
 */
export async function getFlagsmithServerState(): Promise<FlagsmithServerState> {
  const fs = getInstance()
  const flags = await fs.getEnvironmentFlags()
  // Flagsmith server SDK exposes a method to serialize state for the client SDK.
  // Exact API: flags.getState() returns a JSON-serializable object; we stringify.
  return JSON.stringify(flags.getState ? flags.getState() : flags)
}

/**
 * Server-side boolean check for a flag. Use when you need to gate a Route
 * Handler or Server Component without hydrating the client.
 */
export async function isFeatureEnabledServer(
  flag: import('@/features/shared/types/feature-flags.types').FeatureFlag,
): Promise<boolean> {
  const fs = getInstance()
  const flags = await fs.getEnvironmentFlags()
  return flags.isFeatureEnabled(flag)
}
```

SOLID: SRP — only init + read. No domain, no Prisma, no HTTP. OCP — new flags do not require touching this file.

### 2.3 `src/features/shared/providers/flagsmith-provider.tsx`

```tsx
'use client'

import { FlagsmithProvider as VendorProvider } from 'flagsmith/react'
import flagsmith from 'flagsmith/isomorphic'
import type { ReactNode } from 'react'
import type { FlagsmithServerState } from '@/features/shared/types/feature-flags.types'

interface FlagsmithProviderProps {
  children: ReactNode
  serverState: FlagsmithServerState
}

export function FlagsmithProvider({ children, serverState }: FlagsmithProviderProps) {
  return (
    <VendorProvider
      flagsmith={flagsmith}
      serverState={JSON.parse(serverState)}
      options={{
        environmentID: process.env.NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY!,
        // No initial fetch — we already hydrated from serverState.
        // Background refresh handled by client SDK defaults.
      }}
    >
      {children}
    </VendorProvider>
  )
}
```

Note: `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` is intentionally public — Flagsmith client keys are designed to be exposed. Server key is NEVER prefixed `NEXT_PUBLIC_`.

### 2.4 `src/features/shared/hooks/use-feature-flag.ts`

```ts
'use client'

import { useFlags } from 'flagsmith/react'
import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'

export interface FeatureFlagResult {
  enabled: boolean
  value: string | number | boolean | null
}

/**
 * Typed wrapper around Flagsmith's `useFlags`. Returns `enabled: false`
 * as a defensive default until the SDK reports a definitive state.
 */
export function useFeatureFlag(flag: FeatureFlag): FeatureFlagResult {
  const flags = useFlags([flag])
  const entry = flags[flag]
  return {
    enabled: entry?.enabled ?? false,
    value: entry?.value ?? null,
  }
}
```

We do NOT use `AsyncState<T>` here because Flagsmith hydrates synchronously from `serverState` on first render — there is no loading window. The async pattern would introduce a false "idle" flash.

### 2.5 `src/app/layout.tsx` (modification)

```tsx
import type { Metadata } from 'next'
import './tailwind.css'
import './globals.css'
import { ThemeProvider } from '@/features/shared/ui/ThemeProvider'
import { Toaster } from '@/features/shared/ui/sonner'
import { AuthProvider } from '@/features/shared/providers/auth-provider'
import { FlagsmithProvider } from '@/features/shared/providers/flagsmith-provider'
import { getFlagsmithServerState } from '@/features/shared/lib/flagsmith-server'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { /* unchanged */ }

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const flagsmithServerState = await getFlagsmithServerState()
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn('font-sans antialiased')}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <FlagsmithProvider serverState={flagsmithServerState}>
              {children}
              <Toaster />
            </FlagsmithProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Two functional changes: `RootLayout` becomes `async`, and `FlagsmithProvider` wraps `{children}` inside `AuthProvider`.

---

## 3. Data flow

```
[Flagsmith Cloud]
      │  (poll every 60s — enableLocalEvaluation)
      ▼
┌──────────────────────────────────────────────┐
│ Node process — flagsmith-server.ts singleton │
└──────────────────────────────────────────────┘
      │ getFlagsmithServerState()
      ▼
   RootLayout (Server Component, async)
      │ <FlagsmithProvider serverState={...}>
      ▼
   Client SDK hydrates synchronously
      │ useFeatureFlag('negocios_advanced_filters')
      ▼
   Any Client Component → boolean
```

Server-side check path (no client hydration needed): Route Handler / Server Action → `isFeatureEnabledServer(flag)` → same singleton, same cached env.

---

## 4. CI/CD injection

### 4.1 GitHub Secrets to create

| Name | Source | Visible to |
|---|---|---|
| `FLAGSMITH_CLIENT_KEY_QA` | Flagsmith dashboard → QA env → Client-side key | deploy-qa.yml |
| `FLAGSMITH_SERVER_KEY_QA` | Flagsmith dashboard → QA env → Server-side key | deploy-qa.yml |
| `FLAGSMITH_CLIENT_KEY_PROD` | Flagsmith dashboard → Prod env → Client-side key | deploy-prod.yml |
| `FLAGSMITH_SERVER_KEY_PROD` | Flagsmith dashboard → Prod env → Server-side key | deploy-prod.yml |

### 4.2 `.github/workflows/deploy-qa.yml`

Insert inside the `cat > /opt/financieramente/.env << 'ENVEOF'` heredoc after `DO_SPACES_PREFIX=qa`:

```yaml
            NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY=${{ secrets.FLAGSMITH_CLIENT_KEY_QA }}
            FLAGSMITH_SERVER_KEY=${{ secrets.FLAGSMITH_SERVER_KEY_QA }}
```

### 4.3 `.github/workflows/deploy-prod.yml`

Insert inside the `cat > .env << 'ENVEOF'` heredoc after `DO_SPACES_PREFIX=prod`:

```yaml
          NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY=${{ secrets.FLAGSMITH_CLIENT_KEY_PROD }}
          FLAGSMITH_SERVER_KEY=${{ secrets.FLAGSMITH_SERVER_KEY_PROD }}
```

Indentation must match the surrounding lines exactly (8 spaces for QA, 10 for Prod — check on edit).

### 4.4 Docker compose

Both `docker-compose.qa.yml` and `docker-compose.prod.yml` should already forward the entire `.env` file to the `app` service via `env_file:` — no change needed. Verify during apply phase; if instead they use explicit `environment:` keys, append the two new variables there too.

---

## 5. Local dev

### 5.1 `.env.local` (developer machine)

```
NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY=<QA client key from Flagsmith dashboard>
FLAGSMITH_SERVER_KEY=<QA server key from Flagsmith dashboard>
```

Convention (per proposal): local dev points at the QA Flagsmith environment.

### 5.2 `.env.example`

Append:

```
# Flagsmith feature flags — get keys from https://app.flagsmith.com
NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY=
FLAGSMITH_SERVER_KEY=
```

---

## 6. ADRs

### ADR-1: Hybrid server+client over client-only
- **Decision**: Initialize Flagsmith on the server in `RootLayout`, pass `serverState` to client.
- **Rationale**: Prevents un-flagged UI flash; enables Route Handler gating; lets us keep Server Components as the default.
- **Rejected alternative**: Client-only with `<Suspense>` fallback. Rejected because every flagged surface would need a fallback skeleton and SEO/SSR output would always render the OFF state.

### ADR-2: `FeatureFlag` as a string literal union (not enum, not zod)
- **Decision**: `export type FeatureFlag = 'flag_a' | 'flag_b'`.
- **Rationale**: Zero runtime cost; tree-shakeable; matches Flagsmith dashboard keys 1:1; TypeScript narrows automatically.
- **Rejected**: TS `enum` (runtime object, harder tree-shake); Zod schema (overkill — these are static identifiers, not user input).

### ADR-3: Singleton module pattern for server SDK
- **Decision**: Module-scoped `let instance: Flagsmith | null` lazily initialized.
- **Rationale**: Next.js dev mode hot-reloads modules but the production runtime keeps one instance per process — exactly what `enableLocalEvaluation` needs to amortize the 60s polling cost.
- **Rejected**: `globalThis` cache (used for Prisma elsewhere) — unnecessary because Flagsmith singletons are cheap to recreate on HMR and we want fresh keys when env changes in dev.

### ADR-4: No Redis cache for server SDK in v1
- **Decision**: Skip Redis.
- **Rationale**: `enableLocalEvaluation: true` already keeps the entire env state in memory and refreshes every 60s. Redis only helps with multi-process coordination, which is not a goal yet.
- **Revisit when**: We scale to >3 app instances OR add user-segmented flags (per-identity calls cannot use local evaluation as efficiently).

### ADR-5: Hook returns object, not bare boolean
- **Decision**: `useFeatureFlag` returns `{ enabled, value }`.
- **Rationale**: Multivariate flags (string/number values) are a near-term need per proposal. Returning the bare boolean now would force a breaking API change later.
- **Tradeoff**: Slightly more verbose at the call site: `const { enabled } = useFeatureFlag('x')`. Acceptable.

### ADR-6: Hook does NOT use `AsyncState<T>`
- **Decision**: Synchronous return, default `enabled: false`.
- **Rationale**: With `serverState` hydration there is no loading state. Forcing `AsyncState` would add a meaningless `idle`/`loading` flash and contradict the no-flicker success criterion.
- **Project convention exception**: documented here so reviewers do not flag the deviation.

---

## 7. Integration points

| Caller | Module | Why |
|---|---|---|
| `src/app/layout.tsx` | `getFlagsmithServerState` | One call per render, server-only |
| Any Client Component | `useFeatureFlag` | Read flag, no fetch |
| `src/app/api/**/route.ts` | `isFeatureEnabledServer` | Gate endpoints without hydrating client |
| Server Actions (`actions/`) | `isFeatureEnabledServer` | Same as routes |

Architecture rule reaffirmed: services NEVER import Flagsmith — that would couple Prisma access to flag state. Gating happens at the action/route boundary; services accept already-validated parameters.

---

## 8. Security boundary

- `FLAGSMITH_SERVER_KEY` — server-only. Must NEVER appear with a `NEXT_PUBLIC_` prefix. Enforced by code review + a lint check (recommended follow-up, not in v1 scope).
- `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` — bundled into the client; Flagsmith design intent. Read-only environment key, safe.
- Server key access is gated via `getInstance()` which throws if the env var is missing — fail fast on misconfigured deploys.

---

## 9. Risks / unresolved

1. **React 19 peerDep on `flagsmith` client SDK** — must be verified during tasks/apply. If incompatible, fallback: use `flagsmith` core (vanilla) + write a 30-line custom React context. Design accommodates this swap because only `flagsmith-provider.tsx` and `use-feature-flag.ts` would change.
2. **`getState()` API shape** — confirm `flagsmith-nodejs` exposes a serializable state method consumable by `flagsmith/react`'s `serverState` prop. If the names differ (e.g. `getEnvironment().toJSON()`), only `flagsmith-server.ts` changes.
3. **Async `RootLayout`** — Next.js 15 supports it but any other Server Component cached above the layout (rare) could need adjusting. Risk: low.
4. **Local dev pointing at QA Flagsmith env** — devs can accidentally toggle QA flags from the dashboard. Acceptable per proposal; revisit if it causes incidents.
5. **No telemetry/analytics in v1** — we will not know flag usage frequency. Defer.

**Note**: Flagsmith's hybrid pattern requires the server SDK and React provider to agree on a state envelope shape — pin the exact API names during the tasks phase by reading the installed SDK source, not third-party docs.
