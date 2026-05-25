# GitHub Secrets Required

This document lists all GitHub repository secrets required for CI/CD deployments.

## Flagsmith Feature Flags

| Secret | Environment | Description |
|--------|-------------|-------------|
| `FLAGSMITH_CLIENT_KEY_QA` | QA | Client-side SDK key for QA environment (`NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY`). Safe to expose in the browser. |
| `FLAGSMITH_SERVER_KEY_QA` | QA | Server-side SDK key for QA environment (`FLAGSMITH_SERVER_KEY`). **MUST NOT appear in client bundle.** |
| `FLAGSMITH_CLIENT_KEY_PROD` | Production | Client-side SDK key for Production environment (`NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY`). Safe to expose in the browser. |
| `FLAGSMITH_SERVER_KEY_PROD` | Production | Server-side SDK key for Production environment (`FLAGSMITH_SERVER_KEY`). **MUST NOT appear in client bundle.** |

### How to Obtain Keys

1. Log in to [Flagsmith dashboard](https://app.flagsmith.com)
2. Navigate to your project → Environment
3. For **Client key** (`FLAGSMITH_CLIENT_KEY_*`): copy the "Client-side Environment Key"
4. For **Server key** (`FLAGSMITH_SERVER_KEY_*`): copy the "Server-side Environment Key"

### Security Note

`FLAGSMITH_SERVER_KEY` is used exclusively in Server Components and Route Handlers via
`src/features/shared/lib/flagsmith-server.ts` which imports `server-only`.
This ensures the key is never included in the client JavaScript bundle.

`NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY` is intentionally public and used only for hydrating
the client-side Flagsmith context without additional API calls (NFR1: no SSR flicker).

---

## Other Required Secrets (existing)

See `deploy-qa.yml` and `deploy-prod.yml` for the full list of existing secrets (database, auth, storage, etc.).
