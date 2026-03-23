# Quickstart: Gestión de Reglas de Comisión

**Branch**: `004-manage-commission-rules` | **Date**: 2026-02-12

## Prerequisites

- Node.js 20+
- PostgreSQL 15 running locally
- `.env.local` configured with `DATABASE_URL`
- Dependencies installed (`npm install`)
- Existing database with current migrations applied

## Implementation Order

### Phase 1: Database Migration

```bash
# 1. Update prisma/schema.prisma with model renames + description field
# 2. Generate and apply migration
npx prisma migrate dev --name rename-ppc-models-add-description
npx prisma generate
```

**Verify**: Run `npx prisma studio` and confirm:
- Model shows as `ProductPercentageCommission` with `description` column
- Existing data preserved (table names unchanged)

### Phase 2: Update Existing Code (post-rename)

Update all TypeScript references to the renamed models:
1. `src/features/product-configuration/types/product-configuration.types.ts`
2. `src/features/product-configuration/mappers/product-configuration.mapper.ts`
3. `src/app/api/product-configurations/[id]/ppcs/route.ts`
4. Any other files referencing `productPercentajeCommision` (grep for it)

**Verify**: `npm run type-check` passes with zero errors.

### Phase 3: Feature Module — Types & Schemas

```
src/features/commission-rules/
├── types/commission-rule.types.ts
└── lib/commission-rule-schemas.ts
```

1. Define domain interfaces (`CommissionRule`, `CommissionRuleCategory`, `CommissionRuleListItem`, input types)
2. Create Zod schemas: `createCommissionRuleSchema`, `updateCommissionRuleSchema`
3. Write tests: `__tests__/lib/commission-rule-schemas.test.ts`

**Verify**: `npm run test:unit -- --run src/features/commission-rules/__tests__/lib/commission-rule-schemas.test.ts`

### Phase 4: Feature Module — API & Mappers

```
src/features/commission-rules/
├── lib/commission-rule-api.ts
└── mappers/commission-rule.mapper.ts
```

1. Implement mapper: `prismaToCommissionRule`, `prismaToCommissionRuleList` (handles percentage * 100 conversion)
2. Implement API client functions: `getCommissionRules`, `getCommissionRule`, `createCommissionRule`, `updateCommissionRule`, `toggleCommissionRuleActive`, `assignNewBusinessesRule`
3. Write tests for mapper and API

**Verify**: `npm run test:unit -- --run src/features/commission-rules/__tests__`

### Phase 5: API Routes

```
src/app/api/product-configurations/[id]/commission-rules/
├── route.ts (GET, POST)
└── [ruleId]/
    ├── route.ts (GET, PUT, PATCH)
    └── assign-new-businesses/route.ts (POST)
```

1. Implement each route handler following the categories pattern
2. POST creates rule + categories in a Prisma transaction
3. PUT replaces categories (delete old + create new) in a transaction
4. PATCH checks business count before deactivation
5. Write route tests

**Verify**: Test with `curl` or API client against dev server.

### Phase 6: Feature Module — Hooks

```
src/features/commission-rules/hooks/
├── use-commission-rules.ts
├── use-commission-rule.ts
└── use-commission-rule-mutations.ts
```

1. `useCommissionRules(configId, filters)` — list with pagination, search, active filter
2. `useCommissionRule(configId, ruleId)` — single rule fetch for edit form
3. `useCommissionRuleMutations(configId)` — create, update, toggleActive, assignNewBusinesses

**Verify**: Hook tests with `renderHook` + `waitFor`

### Phase 7: Feature Module — Components

```
src/features/commission-rules/components/
├── commission-rules-page-client.tsx
├── commission-rules-table.tsx
├── commission-rule-form.tsx
├── commission-rule-form-skeleton.tsx
└── category-percentage-row.tsx
```

1. Table: columns for description, active status badge, category count, business count, "Nuevos Negocios" badge, actions (edit, toggle, assign)
2. Form: description input + `useFieldArray` for category-percentage rows
3. Impact warning dialog on edit save
4. Empty/incomplete visual indicators

**Verify**: Component tests with Testing Library

### Phase 8: Dashboard Pages

```
src/app/dashboard/configuraciones-producto/[id]/reglas/
├── page.tsx
├── crear/page.tsx
└── editar/[ruleId]/page.tsx
```

1. Server components with auth wrapper + DashboardLayout
2. Import corresponding client components

### Phase 9: Integration

1. Add "Gestionar Reglas" button column to `product-configurations-table.tsx`
2. Add menu item if needed (or rely on navigation from table)
3. Run full test suite: `npm run test:all`
4. Run type check: `npm run type-check`
5. Run lint: `npm run lint`

## Key Commands

```bash
# Development
npm run dev

# Testing
npm run test:unit
npm run test:unit -- --run src/features/commission-rules/
npm run type-check
npm run lint

# Database
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

## Files to Grep After Prisma Rename

```bash
# Find all references to old model names that need updating
grep -r "productPercentajeCommision" src/ --include="*.ts" --include="*.tsx"
grep -r "ProductPercentajeCommision" src/ --include="*.ts" --include="*.tsx"
```
