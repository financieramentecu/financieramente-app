# Services dependency map (legacy) + references (T001–T005)

Branch: `002-architecture-refactor`

This document covers Phase 1 (Setup) tasks:
- T001: Legacy services public API + internal dependencies
- T002: All references to legacy services in `src/**/*.{ts,tsx}`
- T003: Related tests (if any)
- T004: Duplication findings vs feature APIs
- T005: `src/lib/*` evaluation (`navigation/**`, `utils.ts`)

---

## T001 — Legacy services map (`src/services/*.service.ts`)

### `company` (`src/services/company.service.ts`)

| Field | Details |
|---|---|
| Public exports | `getCompanies()` |
| Internal deps | `@/lib/prisma`; Prisma model import `Company` from `@prisma/client` |
| Other legacy service deps | None |
| Query shape | `prisma.company.findMany({ where: { status: true }, orderBy: { name: 'asc' } })` |

### `currency` (`src/services/currency.service.ts`)

| Field | Details |
|---|---|
| Public exports | `getCurrencies()` |
| Internal deps | `@/lib/prisma`; Prisma model import `Currency` from `@prisma/client` |
| Other legacy service deps | None |
| Query shape | `prisma.currency.findMany({ where: { active: true }, orderBy: { name: 'asc' } })` |

### `origin` (`src/services/origin.service.ts`)

| Field | Details |
|---|---|
| Public exports | `getClientOrigins()` |
| Internal deps | `@/lib/prisma`; Prisma model import `ClientOrigin` from `@prisma/client` |
| Other legacy service deps | None |
| Query shape | `prisma.clientOrigin.findMany({ where: { status: true }, orderBy: { name: 'asc' } })` |

### `periodicity` (`src/services/periodicity.service.ts`)

| Field | Details |
|---|---|
| Public exports | `getPeriodicities()` |
| Internal deps | `@/lib/prisma`; Prisma model import `BuyPeriodicity` from `@prisma/client` |
| Other legacy service deps | None |
| Query shape | `prisma.buyPeriodicity.findMany({ where: { active: true }, orderBy: { name: 'asc' } })` |

### `product` (`src/services/product.service.ts`)

| Field | Details |
|---|---|
| Public exports | `getProducts()` |
| Internal deps | `@/lib/prisma`; Prisma model import `Product` from `@prisma/client` |
| Other legacy service deps | None |
| Query shape | `prisma.product.findMany({ where: { status: true }, orderBy: { name: 'asc' } })` |

---

## T002 — References to legacy services (`@/services/*.service`)

Pattern searched: `@/services/{company,currency,origin,periodicity,product}.service` in `src/**/*.{ts,tsx}`.

### Import sites (file → imported symbols)

| File | Imports |
|---|---|
| `src/app/dashboard/products/page.tsx` | `getCompanies` from `@/services/company.service` |
| `src/app/dashboard/products/editar/[id]/page.tsx` | `getCompanies` from `@/services/company.service` |
| `src/app/dashboard/products/create/page.tsx` | `getCompanies` from `@/services/company.service` |
| `src/app/dashboard/negocios/editar/[id]/page.tsx` | `getCompanies`, `getProducts`, `getPeriodicities`, `getCurrencies`, `getClientOrigins` from respective legacy services |
| `src/app/dashboard/negocios/crear/page.tsx` | `getCompanies`, `getProducts`, `getPeriodicities`, `getCurrencies`, `getClientOrigins` from respective legacy services |

### Totals (by service)

| Service | Imported symbol | Import count |
|---|---|---:|
| company | `getCompanies` | 5 |
| product | `getProducts` | 2 |
| periodicity | `getPeriodicities` | 2 |
| currency | `getCurrencies` | 2 |
| origin | `getClientOrigins` | 2 |

---

## T003 — Tests related to legacy services

Patterns searched:
- `from "@/services/"` in `**/*.{test,spec}.{ts,tsx}`
- service filename mentions (`company.service`, `currency.service`, etc.) in `**/*.{test,spec}.{ts,tsx}`

### Findings

- No matching tests found for these legacy service imports/matches with the above patterns.

---

## T004 — Duplication findings (legacy services vs feature APIs)

### Context

- Legacy services are direct Prisma reads (`@/lib/prisma`) returning Prisma models.
- Feature APIs in `src/features/admin/*/lib/*-api.ts` use `apiClient` and hit `/admin/*` endpoints, with richer capabilities (filters, CRUD).

### Mapping: legacy → feature API

| Legacy service | Legacy function | Feature API file | Feature API surface likely to replace |
|---|---|---|---|
| `@/services/company.service` | `getCompanies()` | `src/features/admin/companies/lib/company-api.ts` | `companyApi.getCompanies(filters?)` |
| `@/services/currency.service` | `getCurrencies()` | `src/features/admin/currencies/lib/currency-api.ts` | `currencyApi.getCurrencies(filters?)` |
| `@/services/origin.service` | `getClientOrigins()` | `src/features/admin/origins/lib/origin-api.ts` | `originApi.getClientOrigins()` |
| `@/services/periodicity.service` | `getPeriodicities()` | `src/features/admin/periodicities/lib/periodicity-api.ts` | `periodicityApi.getPeriodicities(filters?)` |
| `@/services/product.service` | `getProducts()` | `src/features/admin/products/lib/product-api.ts` | `productApi.getProducts(filters?)` |

### Superficial differences / risks

- **Data source mismatch**: legacy reads DB directly in server components/pages; feature APIs fetch over HTTP (`apiClient`). Migrating imports changes runtime behavior (DB access → HTTP request) and can introduce auth/session/caching differences.
- **Filtering differences**:
  - Legacy queries hard-filter active/status flags (`status: true` or `active: true`) and always sort by `name asc`.
  - Feature APIs often accept filters via query params (e.g. `search`, `status`) and rely on backend defaults for ordering/filtering.
  - `productApi.getProducts` additionally supports `companyId` filter and has `getActiveCompanies()` helper.

### Recommendation (no migration yet)

- **Consolidate read paths** by choosing one source of truth per layer:
  - Server-side “page data” should ideally use a consistent boundary: either route handlers / server actions or typed feature libs that do not reach into legacy `src/services`.
- **When migrating imports**, ensure behavioral parity by:
  - Preserving “active only” semantics explicitly (e.g. pass `status=active` where relevant), or align backend defaults to match legacy.
  - Confirm ordering defaults on the `/admin/*` endpoints (if order is important to UI).

---

## T005 — `src/lib` evaluation (navigation + utils)

### `src/lib/navigation/**`

Files:
- `src/lib/navigation/menu-builder.ts`
- `src/lib/navigation/menu-items.tsx`

Evidence (importers):
- `src/features/shared/layout/Sidebar.tsx` imports `buildMenuByRole`
- `src/app/page.tsx` imports `getRedirectUrlByRole`
- `src/app/dashboard/page.tsx` imports `getRedirectUrlByRole`

Decision proposal:
- **Keep in `src/lib/navigation/**`** as **infrastructure/app-shell navigation** (not domain-specific, cross-cutting).
- Note: `menu-items.tsx` currently imports `React` default; in React 19 this is typically unnecessary, but changing it is out of scope for Phase 1.

### `src/lib/utils.ts`

Exports:
- `cn(...inputs)` tailwind/classname merge helper.

Evidence (importers):
- Used widely across `src/features/shared/ui/*` and multiple domain features (`features/auth`, `features/negocios`, `features/product`, `features/empresas`, etc.). (3+ features)

Decision proposal:
- **Move to `src/features/shared/lib/utils.ts` (or `src/features/shared/ui/utils.ts`)** and re-export via shared barrel eventually, because it’s clearly used by 3+ features.
- However, since many files import `@/lib/utils`, a migration should be done with an automated codemod (similar to T006) to avoid churn.

