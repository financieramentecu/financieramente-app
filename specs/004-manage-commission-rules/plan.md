# Implementation Plan: Distribución de Comisión

**Branch**: `004-manage-commission-rules` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-manage-commission-rules/spec.md`

## Summary

CRUD management for commission distribution rules (`ProductPercentageCommission`) nested under `ProductConfiguration`. Admins create distributions with a description, assign category-based percentage distributions via an aggregation UI, toggle active status (with business-association guards), and designate a default rule for new businesses.

**Terminology Update**: The feature has been renamed from "Reglas de Comisión" to "**Distribución de Comisión**" to better reflect the business domain.

**Navigation**: A new sidebar item "Distribución de comisión" will point to the dedicated module at `/dashboard/distribucion-comisiones/`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 15 (App Router), React 19, Prisma ORM, Zod, React Hook Form, Shadcn/UI + Radix UI, Tailwind CSS v4, Sonner (toasts)
**Storage**: PostgreSQL 15 via Prisma ORM
**Testing**: Vitest + Testing Library (unit/integration), Playwright (E2E)
**Target Platform**: Web application (SSR + CSR)
**Project Type**: Web (Next.js monolith)
**Performance Goals**: Page load < 1s (CE-003), full rule configuration < 2 min (CE-001)
**Constraints**: No physical deletion of rules. Percentage input as whole numbers (0.01–999.99) converted to fractions for Decimal(5,4) storage. Deactivation blocked when businesses are associated.
**Scale/Scope**: Admin-only feature. Moderate data volume (hundreds of configurations, tens of rules per config).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._
PASS. Standard "Financieramente" stack usage.

## Project Structure

### Documentation (this feature)

```text
specs/004-manage-commission-rules/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── commission-rules-api.yaml
│   └── assign-new-businesses.yaml
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Prisma Migration
prisma/
├── schema.prisma                    # Rename models + add description field
└── migrations/
    └── YYYYMMDD_rename_ppc_models_add_description/

# Feature Module (new)
src/features/distribution-commission/
├── types/
│   └── commission-rule.types.ts     # Domain interfaces
├── lib/
│   ├── commission-rule-api.ts       # Fetch wrappers (ApiResponse<T>)
│   └── commission-rule-schemas.ts   # Zod schemas (create, update, category line)
├── mappers/
│   └── commission-rule.mapper.ts    # Prisma → domain type conversion
├── hooks/
│   ├── use-commission-rules.ts      # List rules for a config (AsyncState)
│   ├── use-commission-rule.ts       # Single rule fetch (AsyncState)
│   └── use-commission-rule-mutations.ts  # Create, update, toggle, assign
├── components/
│   ├── commission-rules-page-client.tsx     # List page client component
│   ├── commission-rules-table.tsx           # DataTable for rules
│   ├── commission-rule-form.tsx             # Create/edit form with aggregation
│   ├── commission-rule-form-skeleton.tsx    # Loading skeleton
│   └── category-percentage-row.tsx          # Single row in aggregation table
├── __tests__/
│   ├── fixtures/
│   │   └── mock-commission-rule.ts
│   ├── lib/
│   │   ├── commission-rule-api.test.ts
│   │   └── commission-rule-schemas.test.ts
│   ├── mappers/
│   │   └── commission-rule.mapper.test.ts
│   ├── hooks/
│   │   ├── use-commission-rules.test.ts
│   │   ├── use-commission-rule.test.ts
│   │   └── use-commission-rule-mutations.test.ts
│   └── components/
│       ├── commission-rules-table.test.tsx
│       └── commission-rule-form.test.tsx
└── index.ts

# API Routes
src/app/api/product-configurations/[id]/distribution-commission/
├── route.ts                         # GET list, POST create
└── [ruleId]/
    ├── route.ts                     # GET single, PUT update, PATCH toggle active
    └── assign-new-businesses/
        └── route.ts                 # POST assign as default for new businesses

# Dashboard Pages (New dedicated module)
src/app/dashboard/distribucion-comisiones/
├── page.tsx                         # Entry point: List Product Configurations
├── [id]/
│   └── reglas/
│       ├── page.tsx                 # List rules for config [id]
│       ├── crear/
│       │   └── page.tsx             # Create rule
│       └── editar/
│           └── [ruleId]/
│               └── page.tsx         # Edit rule

# Modifications to Existing Code
src/features/product-configuration/
├── components/
│   └── product-configurations-table.tsx  # Reuse or adapt for the entry page list
└── types/
    └── product-configuration.types.ts    # Update field names after Prisma rename
src/features/product-configuration/mappers/
    └── product-configuration.mapper.ts   # Update field references
src/app/api/product-configurations/[id]/ppcs/
    └── route.ts                          # Update Prisma model references
src/features/shared/layout/
    └── menu-items.tsx                    # [MODIFIED] Add "Distribución de comisión" link
```

**Structure Decision**: Feature-based architecture following the `categories` reference pattern.

## Refactoring & Updates (2026-02-14)

1.  **Renaming**: Feature renamed from `commission-rules` to `distribution-commission`.
    - API routes moved to `src/app/api/product-configurations/[id]/distribution-commission/`.
    - UI text updated to use "Distribución de Comisión".
2.  **Layout**: All dashboard pages (List, Create, Edit) are now wrapped in `DashboardLayout` for consistent navigation and header.
3.  **Error Handling**: Fixed `useCommissionRules` hook to correctly handle API responses where `error` is null.
4.  **Dependencies**: Updated imports in API routes to point to `features/distribution-commission`.

## Refactoring & Updates (Round 2)

**Goal**: Polish UI/UX and fix bugs based on user feedback.

1.  **Navigation**: Remove "Distribución de comisión" from the sidebar. Access will be exclusively through the "Configuración de Producto" table.
2.  **Product Configuration Table**:
    - Rename action "Gestionar Distribución" to "**Configuración comisión**".
    - Style it as a button (variant: default or outline) instead of a link/ghost button.
3.  **Distribution Details (Rules Table)**:
    - **Categories Column**: Display category names and their percentages as **Chips/Badges**.
    - **Status Indicators**: Change the "Predeterminada" label to "**Nuevos negocios**".
4.  **Bug Fixes**:
    - Fix errors when creating/editing percentages (ensure proper type conversion).
    - Fix errors when creating/editing the distribution rule itself.

## Bug Investigation: Toast Error on Save (2026-02-14)

**Issue**: saving data shows an error toast ("Error"), but the data is saved correctly.

**Root Cause**:

- The API routes (`POST`, `PUT`, `PATCH`) are returning `{ data: ..., error: null }` on success.
- The `ApiResponse` type definition defines success as `{ data: T }` (no error property).
- The frontend hook `useCommissionRuleMutations` checks failure using `if ('error' in response)`.
- Since `error: null` is present in the response object, the check evaluates to `true`, treating success as a failure.

**Fix Plan**:

2.  **Frontend (Defensive)**: Update `useCommissionRuleMutations` to check `if ('error' in response && response.error)` to be robust against mixed responses.

## Bug Investigation: Assign Default Rule (2026-02-14)

**Issue**: Assigning "Nuevos negocios" shows error toast, but change applies on reload. User wants immediate feedback without reload.

**Root Cause**:

- **Error Toast**: Same as above—`assign-new-businesses/route.ts` returns `error: null`, causing false failure detection.
- **"No Reload"**: `router.refresh()` is called on success, but since the hook thinks it failed, it might not be triggering the refresh or the user is confused by the error toast.

**Fix Plan**:

1.  **Backend**: Remove `error: null` from `assign-new-businesses/route.ts` success response.
2.  **Frontend**: Ensure `onSuccess` (which triggers `router.refresh()`) is called. The existing logic usually calls it on success.
3.  **UI Feedback**: The existing component already has a success toast. Fixing the boolean return from the hook will reveal it.

## Bug Investigation: Edit Page "Error: null" (2026-02-14)

**Issue**: Accessing the Edit page shows "Error: null" despite a successful 200 OK API response.

**Root Cause**:

- **Backward Compatibility**: The `GET` endpoint in `distribution-commission/[ruleId]/route.ts` still returns `{ error: null }`.
- **Frontend Hook**: `useCommissionRule` checks `if ('error' in response)`, identifying the presence of the `error` key (even if null) as a failure.
- **Throw**: It then throws `response.error` (null), resulting in the visible "Error: null".

**Fix Plan**:

- **Backend**: Remove `error: null` from the `GET` success response in `distribution-commission/[ruleId]/route.ts`.
