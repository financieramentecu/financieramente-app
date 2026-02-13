# Implementation Plan: Gestión de Reglas de Comisión

**Branch**: `004-manage-commission-rules` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-manage-commission-rules/spec.md`

## Summary

CRUD management for commission percentage rules (`ProductPercentageCommission`) nested under `ProductConfiguration`. Admins create rules with a description, assign category-based percentage distributions via an aggregation UI, toggle active status (with business-association guards), and designate a default rule for new businesses. Requires Prisma model rename migration, a new `description` field, a new feature module following the categories reference pattern, nested API routes, and new dashboard pages.

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

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Screaming Architecture | PASS | New feature in `src/features/commission-rules/` with full structure |
| II. SOLID Principles | PASS | Services via plain functions, Zod schemas, typed interfaces |
| III. TypeScript Best Practices | PASS | No `any`, readonly for IDs/timestamps, Zod inference |
| IV. Functional Programming | PASS | Pure functions, immutable interfaces, factory patterns where needed |
| V. Clean Code Standards | PASS | kebab-case files, camelCase vars, PascalCase types, handle* for events |
| VI. Test-First Development | PASS | Tests for schemas, API, hooks, mappers, components in `__tests__/` |
| VII. Error Handling & Validation | PASS | Zod schemas for create/update, typed ApiResponse errors |
| VIII. React Data Fetching (AsyncState) | PASS | Custom hooks returning AsyncState\<T\> |
| IX. API Response Standardization | PASS | All routes return ApiResponse\<T\> via NextResponse.json |
| X. Component Logic Separation | PASS | Hooks for logic, components for presentation |

**Gate Result**: ALL PASS. No violations to justify.

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
src/features/commission-rules/
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

# API Routes (nested under product-configurations)
src/app/api/product-configurations/[id]/commission-rules/
├── route.ts                         # GET list, POST create
└── [ruleId]/
    ├── route.ts                     # GET single, PUT update, PATCH toggle active
    └── assign-new-businesses/
        └── route.ts                 # POST assign as default for new businesses

# Dashboard Pages (nested under configuraciones-producto)
src/app/dashboard/configuraciones-producto/[id]/reglas/
├── page.tsx                         # Server component: list rules
├── crear/
│   └── page.tsx                     # Server component: create rule
└── editar/
    └── [ruleId]/
        └── page.tsx                 # Server component: edit rule

# Modifications to Existing Code
src/features/product-configuration/
├── components/
│   └── product-configurations-table.tsx  # Add "Gestionar Reglas" action column
└── types/
    └── product-configuration.types.ts    # Update field names after Prisma rename
src/features/product-configuration/mappers/
    └── product-configuration.mapper.ts   # Update field references
src/app/api/product-configurations/[id]/ppcs/
    └── route.ts                          # Update Prisma model references
```

**Structure Decision**: Feature-based architecture following the `categories` reference pattern. Commission rules are a separate feature module (`src/features/commission-rules/`) because they have their own domain types, validation rules, and UI. API routes are nested under `/product-configurations/[id]/` to express the parent-child relationship. Pages nested under `/configuraciones-producto/[id]/reglas/` for natural navigation.

## Complexity Tracking

> No constitution violations. Table not needed.
