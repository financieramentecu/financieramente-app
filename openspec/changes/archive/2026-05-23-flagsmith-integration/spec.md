# Flagsmith Integration Specification

## Purpose

Define what MUST be true after the Flagsmith feature flags integration lands. This is a full spec (new domain — no existing spec to delta against).

---

## Requirements

### Requirement: FR1 — SDK Initialization

The system MUST initialize a server-side Flagsmith singleton in `src/features/shared/lib/flagsmith-server.ts` using `flagsmith-nodejs`. The singleton MUST use `enableLocalEvaluation: true` and `environmentRefreshIntervalSeconds: 60`. The server key MUST be read exclusively from `process.env.FLAGSMITH_SERVER_KEY` and MUST NOT be exposed to the browser bundle.

The system MUST provide a client-side `FlagsmithProvider` in `src/features/shared/providers/flagsmith-provider.tsx` as a `'use client'` component. It MUST accept a `serverState` prop and hydrate the Flagsmith React SDK from it on first render. It MUST be configured with `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` for client-side refreshes.

#### Scenario: Server singleton is initialized on first request

- GIVEN the Next.js process starts
- WHEN `getServerFlags()` is called for the first time
- THEN a single `Flagsmith` instance is created using `FLAGSMITH_SERVER_KEY`
- AND subsequent calls reuse the same instance without re-initializing

#### Scenario: Server singleton missing env var

- GIVEN `FLAGSMITH_SERVER_KEY` is not set in the environment
- WHEN `getServerFlags()` is called
- THEN an error is thrown with a message indicating the missing variable
- AND no Flagsmith instance is created

#### Scenario: Client provider hydrates from server state

- GIVEN the root layout passes a non-null `serverState` to `FlagsmithProvider`
- WHEN the client component tree mounts
- THEN the Flagsmith client SDK is initialized from `serverState` without an additional network fetch

---

### Requirement: FR2 — Flag Evaluation

The system MUST expose `getServerFlags()` for use in Server Components and Route Handlers, returning the current environment's flags object. The system MUST expose `useFeatureFlag(name: FeatureFlagName): boolean` for use in Client Components. Both paths MUST return the same flag values for a given environment state. `useFeatureFlag` MUST return `false` when the SDK has not yet hydrated.

#### Scenario: Server Component reads a flag

- GIVEN a Server Component imports `getServerFlags`
- WHEN it awaits the function and reads a flag by name
- THEN it receives the boolean value currently set in the Flagsmith environment

#### Scenario: Client Component reads a flag via hook

- GIVEN a Client Component calls `useFeatureFlag('some_flag')`
- WHEN the provider has been hydrated from serverState
- THEN the hook returns the boolean value matching the server-evaluated state

#### Scenario: Hook returns false before hydration

- GIVEN the `FlagsmithProvider` has not yet initialized its state
- WHEN `useFeatureFlag('any_flag')` is called
- THEN it returns `false`

#### Scenario: Flag is toggled in Flagsmith dashboard

- GIVEN a flag is enabled in the Flagsmith dashboard
- WHEN 60 seconds elapse after the toggle
- THEN `getServerFlags()` returns the updated value on the next call

---

### Requirement: FR3 — Environment Separation

The system MUST use distinct Flagsmith keys for QA and Production environments. QA deployments MUST use `FLAGSMITH_CLIENT_KEY_QA` and `FLAGSMITH_SERVER_KEY_QA`. Production deployments MUST use `FLAGSMITH_CLIENT_KEY_PROD` and `FLAGSMITH_SERVER_KEY_PROD`. Local development MUST use QA keys via `.env.local`.

#### Scenario: QA deploy injects QA keys

- GIVEN the `deploy-qa.yml` workflow runs
- WHEN the `.env` file is generated on the droplet
- THEN `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` equals the value of `FLAGSMITH_CLIENT_KEY_QA`
- AND `FLAGSMITH_SERVER_KEY` equals the value of `FLAGSMITH_SERVER_KEY_QA`

#### Scenario: Production deploy injects Prod keys

- GIVEN the `deploy-prod.yml` workflow runs
- WHEN the `.env` file is generated on the droplet
- THEN `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` equals the value of `FLAGSMITH_CLIENT_KEY_PROD`
- AND `FLAGSMITH_SERVER_KEY` equals the value of `FLAGSMITH_SERVER_KEY_PROD`

#### Scenario: Local dev uses QA keys

- GIVEN a developer copies `.env.example` to `.env.local`
- WHEN the app starts locally
- THEN it connects to the QA Flagsmith environment

---

### Requirement: FR4 — Type Safety

The system MUST define all valid flag names as a TypeScript union type `FeatureFlagName` in `src/features/shared/types/feature-flags.types.ts`. `useFeatureFlag` and any server-side flag accessor MUST accept only `FeatureFlagName` as the `name` parameter. Using an undeclared flag name MUST produce a TypeScript compile error.

#### Scenario: Valid flag name compiles

- GIVEN `FeatureFlagName = 'flag_example_a' | 'flag_example_b'`
- WHEN a developer calls `useFeatureFlag('flag_example_a')`
- THEN TypeScript accepts the call without errors

#### Scenario: Invalid flag name fails at compile time

- GIVEN `FeatureFlagName` does not include `'undeclared_flag'`
- WHEN a developer calls `useFeatureFlag('undeclared_flag')`
- THEN TypeScript reports a type error at compile time

#### Scenario: New flag is added to catalog

- GIVEN a developer adds `'new_flag'` to the `FeatureFlagName` union
- WHEN the project is type-checked
- THEN `useFeatureFlag('new_flag')` is valid throughout the codebase

---

### Requirement: FR5 — CI/CD Secret Injection

The system MUST declare four GitHub repository secrets: `FLAGSMITH_CLIENT_KEY_QA`, `FLAGSMITH_SERVER_KEY_QA`, `FLAGSMITH_CLIENT_KEY_PROD`, `FLAGSMITH_SERVER_KEY_PROD`. Both `deploy-qa.yml` and `deploy-prod.yml` MUST inject the environment-appropriate values into the droplet `.env` file following the existing `cat > .env << 'ENVEOF'` pattern.

#### Scenario: Deploy workflow adds new env vars

- GIVEN the updated deploy workflow files are merged
- WHEN a QA or Prod deploy runs
- THEN the generated `.env` includes `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` and `FLAGSMITH_SERVER_KEY`
- AND no existing env vars in the block are removed or overwritten incorrectly

#### Scenario: Missing GitHub secret causes workflow failure

- GIVEN a required secret (`FLAGSMITH_SERVER_KEY_QA`) is not configured in the repo
- WHEN `deploy-qa.yml` runs
- THEN the workflow fails with a clear secret reference error before the app starts

---

### Requirement: FR6 — Local Development Setup

The system MUST update `.env.example` to document `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` and `FLAGSMITH_SERVER_KEY` with placeholder values and comments indicating they should point to QA credentials in `.env.local`.

#### Scenario: Developer follows setup instructions

- GIVEN a developer copies `.env.example` to `.env.local` and fills in QA keys
- WHEN `npm run dev` is executed
- THEN the app boots, the server singleton initializes against the QA environment, and no missing-env errors appear

---

### Requirement: NFR1 — No SSR Flicker

The system MUST serialize Flagsmith server state in the root Server Component and pass it as `serverState` to `FlagsmithProvider` before the initial HTML is sent to the browser. Client Components MUST NOT fetch flags independently on first paint.

#### Scenario: First paint contains no un-flagged flash

- GIVEN a page contains a component gated by `useFeatureFlag`
- WHEN the page is server-rendered and sent to the browser
- THEN the initial HTML already reflects the correct flag state
- AND no visible layout shift or content flash occurs on hydration

---

### Requirement: NFR2 — Flag Propagation Lag

Flag value changes made in the Flagsmith dashboard MUST be reflected in server-side evaluations within 60 seconds. This is enforced by `environmentRefreshIntervalSeconds: 60` on the server singleton.

#### Scenario: Propagation within SLA

- GIVEN a flag is changed in the Flagsmith dashboard
- WHEN 60 seconds pass
- THEN the next call to `getServerFlags()` returns the updated value

---

### Requirement: NFR3 — Server Key Isolation

`FLAGSMITH_SERVER_KEY` MUST NOT appear in any client-side bundle or be readable from the browser. The key MUST only be used in `flagsmith-server.ts` (server-only module). `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` is the only Flagsmith credential permitted in the browser bundle.

#### Scenario: Server key is absent from client bundle

- GIVEN a production build is generated (`npm run build`)
- WHEN the output bundle is inspected
- THEN no string matching `FLAGSMITH_SERVER_KEY`'s value is present in any `.js` chunk under `.next/static/`

#### Scenario: Client provider uses only public key

- GIVEN `FlagsmithProvider` is rendered in the browser
- WHEN it performs any client-initiated flag refresh
- THEN it uses only `NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY`
