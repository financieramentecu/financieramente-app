# Import migration script (T006)

This is a **reproducible codemod** to help migrate imports away from legacy services:

- Legacy: `@/services/{company,currency,origin,periodicity,product}.service`
- Target (admin feature APIs): `@/features/admin/*/lib/*-api`

It supports **dry-run** (default) and **write** mode.

---

## What it changes

For each file in `src/**/*.ts(x)` it:

1) Detects named imports like:

```ts
import { getCompanies } from '@/services/company.service'
```

2) Replaces import to use the feature API object:

```ts
import { companyApi } from '@/features/admin/companies/lib/company-api'
```

3) Rewrites call sites (best-effort):

```ts
getCompanies()
// =>
companyApi.getCompanies()
```

Supported symbol rewrites:

| Legacy import | Rewritten as |
|---|---|
| `getCompanies` | `companyApi.getCompanies` |
| `getCurrencies` | `currencyApi.getCurrencies` |
| `getClientOrigins` | `originApi.getClientOrigins` |
| `getPeriodicities` | `periodicityApi.getPeriodicities` |
| `getProducts` | `productApi.getProducts` |

---

## Usage

Dry-run (prints summary, writes nothing):

```bash
tsx scripts/update-legacy-service-imports.ts --dry-run
```

Write mode (updates files in-place):

```bash
tsx scripts/update-legacy-service-imports.ts --write
```

Help:

```bash
tsx scripts/update-legacy-service-imports.ts --help
```

---

## Notes / limitations

- This script is intentionally conservative for Phase 1:
  - It only rewrites **named imports** from the legacy service module paths.
  - It only rewrites **simple call patterns** `symbol(` → `api.symbol(`.
- It does **not** validate semantic parity (e.g. filters like `status=active` vs legacy `status: true`). That must be handled during migration work (Phase/US1).

