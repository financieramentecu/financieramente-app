# Design: Refactor Admin Discount — Service Layer, AsyncState Hooks, Menu Nav, Drop CommissionConfiguration

## Technical Approach

Four focused improvements to the `commission-discounts` feature, applied as independent refactors in a single change:

1. **Menu nav**: Add `Descuentos` sub-item under `Administración` in `src/lib/navigation/menu-items.tsx`.
2. **Service layer**: Extract all Prisma calls from the two API routes into `src/features/commission-discounts/services/commission-discount.service.ts`; routes become thin orchestrators (auth → validate → call service → respond).
3. **AsyncState hooks**: Rewrite `use-commission-discounts.ts` to use `AsyncState<CommissionDiscount[]>` from `src/features/shared/types/async-state.types.ts`; update consuming page accordingly.
4. **Drop CommissionConfiguration**: Remove model from `prisma/schema.prisma` + run `prisma migrate dev` to drop `commission_configuration` table; remove the model from `prisma/seeds/discount.ts`.

---

## Architecture Decisions

### Decision: Service as plain exported functions (not class)

**Choice**: Export plain `async function` from `commission-discount.service.ts` (e.g. `listCommissionDiscounts()`, `createCommissionDiscount()`, `inactivateCommissionDiscount()`).

**Alternatives considered**: Class-based service (`class CommissionDiscountService`) like `ProcessBatchService`.

**Rationale**: `ProcessBatchService` is a class because it needs injected `ProcessorFactory`. Discount operations have no internal state to share. The project's simpler services (`business.service.ts`, `agent.service.ts`) are plain functions. Follows SOLID/SRP — no reason to force a class.

---

### Decision: Service lives in `src/features/commission-discounts/services/`

**Choice**: `src/features/commission-discounts/services/commission-discount.service.ts`

**Alternatives considered**: Shared service under `src/features/shared/services/`.

**Rationale**: Feature-Based Architecture requires all domain code in `src/features/[feature-name]/`. Commission discounts are a domain-specific feature, not a shared utility. Consistent with how `load-file/services/` and `negocios/services/` are structured.

---

### Decision: Routes remain thin — only auth + body parsing + service call + response shaping

**Choice**: Routes call `auth()`, parse body (Zod), delegate to service, and format `ApiResponse<T>`. No Prisma imports in route files.

**Alternatives considered**: Keep Prisma in routes (current state), or introduce a separate "controller" layer.

**Rationale**: The project `CLAUDE.md` explicitly states: *"Services handle all Prisma queries. Actions = input validation, error messages, response shape. Services = database queries, domain logic that touches Prisma."* API routes follow the same contract as Server Actions in this codebase.

---

### Decision: `useCommissionDiscounts` returns `AsyncState<CommissionDiscount[]>` + `refresh()`

**Choice**: Replace custom `{ data, isLoading, error }` shape with `AsyncState<CommissionDiscount[]>` discriminated union as defined in `src/features/shared/types/async-state.types.ts`. Return `{ state, refresh }`.

**Alternatives considered**: Keep current shape (non-standard), use React Query.

**Rationale**: `AsyncState<T>` is the project standard — `openspec/config.yaml` explicitly states *"All React hooks fetching data MUST return `AsyncState<T>`"*. The consuming page must be updated to narrow on `state.status` rather than destructuring `{ data, isLoading }`.

---

### Decision: Drop `CommissionConfiguration` table in a Prisma migration

**Choice**: Remove `CommissionConfiguration` model from `prisma/schema.prisma`, run `npx prisma migrate dev --name drop_commission_configuration`, clean up the seed file.

**Alternatives considered**: Mark model as deprecated and leave in schema, soft-delete with a flag.

**Rationale**: `CommissionDiscount` is now the single source of truth for settlement percentages (confirmed by Phase 8 of `admin-discount`). The `commission_configuration` table has no remaining reads or writes in the codebase after the process-batch refactor. Dead schema causes confusion and maintenance overhead.

---

## Data Flow

### API Route (after refactor)

```
Request
  │
  ▼
route.ts
  ├── auth() ──→ 401 if no session
  ├── parse body (Zod) ──→ 400 if invalid
  ├── commissionDiscountService.xxx(input, userId) ──→ service result
  │       └── prisma.commissionDiscount.xxx(...)
  └── NextResponse.json(ApiResponse<T>)
```

### Hook (after AsyncState refactor)

```
useCommissionDiscounts()
  │
  ├── state: AsyncState<CommissionDiscount[]>
  │     ├── { status: 'idle' }       ← initial
  │     ├── { status: 'loading' }    ← fetching
  │     ├── { status: 'success', data: CommissionDiscount[] }
  │     └── { status: 'error', error: string }
  │
  └── refresh: () => void
```

### Page consumption pattern

```tsx
const { state, refresh } = useCommissionDiscounts()

if (state.status === 'loading') return <Skeleton />
if (state.status === 'error') return <ErrorMessage message={state.error} />
// state.status === 'success' → state.data is CommissionDiscount[]
<CommissionDiscountsTable discounts={state.data} ... />
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/navigation/menu-items.tsx` | Modify | Add `{ title: 'Descuentos', url: '/dashboard/admin/discounts', icon: <Percent /> }` as sub-item under `Administración` |
| `src/features/commission-discounts/services/commission-discount.service.ts` | **Create** | Plain functions: `listDiscounts()`, `createDiscount(input, userId)`, `findActiveByType(type)`, `inactivateDiscount(id, userId)` — all Prisma calls live here |
| `src/app/api/admin/discounts/route.ts` | Modify | Remove `prisma` import; call service functions; keep auth + Zod + response shaping |
| `src/app/api/admin/discounts/[id]/inactivate/route.ts` | Modify | Remove `prisma` import; call `inactivateDiscount(id, userId)` from service |
| `src/features/commission-discounts/hooks/use-commission-discounts.ts` | Modify | Return `{ state: AsyncState<CommissionDiscount[]>, refresh }` instead of custom shape |
| `src/app/dashboard/admin/discounts/page.tsx` | Modify | Adapt to `state.status` narrowing instead of `{ data, isLoading }` destructuring |
| `src/features/commission-discounts/__tests__/use-commission-discounts.test.ts` | Modify | Update assertions to match `AsyncState<T>` shape (`state.status === 'success'`, `state.data`) |
| `src/app/api/admin/discounts/__tests__/route.test.ts` | Modify | Update prisma mock to use service mock instead |
| `src/app/api/admin/discounts/[id]/inactivate/__tests__/route.test.ts` | Modify | Update prisma mock to use service mock instead |
| `prisma/schema.prisma` | Modify | Remove `CommissionConfiguration` model |
| `prisma/seeds/discount.ts` | Modify | Remove `commissionConfiguration.findFirst` + `commissionConfiguration.create` block |
| `prisma/migrations/xxx_drop_commission_configuration/migration.sql` | **Create** (auto) | Generated by `prisma migrate dev` |

---

## Interfaces / Contracts

### Service functions

```typescript
// src/features/commission-discounts/services/commission-discount.service.ts

import { prisma } from '@/lib/prisma'
import type { CreateCommissionDiscountData } from '@/features/commission-discounts/lib/commission-discount-schemas'

export async function listDiscounts() {
  return prisma.commissionDiscount.findMany({
    include: { createdBy: true, updatedBy: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function findActiveByType(type: string) {
  return prisma.commissionDiscount.findFirst({
    where: { type, status: 'ACTIVE' },
  })
}

export async function createDiscount(
  input: CreateCommissionDiscountData,
  createdById: number
) {
  return prisma.commissionDiscount.create({
    data: { ...input, description: input.description ?? null, createdById },
  })
}

export async function findDiscountById(id: number) {
  return prisma.commissionDiscount.findUnique({ where: { id } })
}

export async function inactivateDiscount(id: number, updatedById: number) {
  return prisma.commissionDiscount.update({
    where: { id },
    data: { status: 'INACTIVE', updatedById },
  })
}
```

### Hook return type

```typescript
// Before
{ data: CommissionDiscount[], isLoading: boolean, error: string | null, refresh: () => void }

// After
{ state: AsyncState<CommissionDiscount[]>, refresh: () => void }
```

### Menu item addition

```typescript
// src/lib/navigation/menu-items.tsx — inside Administración subItems array
{
  title: 'Descuentos',
  url: '/dashboard/admin/discounts',
  icon: <Percent className="h-4 w-4" />,
}
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — service | `listDiscounts`, `createDiscount`, `findActiveByType`, `inactivateDiscount` | Vitest + mock `@/lib/prisma` |
| Unit — hook | `useCommissionDiscounts` returns correct `AsyncState` transitions | `renderHook` + mock `commission-discount-api`; assert `state.status` values |
| Unit — routes (updated) | Routes mock the service module (not prisma directly) | `vi.mock` the service; assert auth guard + correct service calls |
| Integration (manual) | Menu shows "Descuentos" in sidebar; DB migration ran cleanly | Dev server smoke test |

---

## Migration / Rollout

### CommissionConfiguration removal

1. Verify no code references `prisma.commissionConfiguration` outside of the seed file — currently confirmed.
2. Remove model from `prisma/schema.prisma`.
3. Remove CommissionConfiguration seed block from `prisma/seeds/discount.ts`.
4. Run `npx prisma migrate dev --name drop_commission_configuration`.
5. Run `npx prisma generate`.
6. Run `npm run type-check` to confirm no stale references.

**Risk**: If any un-scanned code still references `commissionConfiguration`, the migration will fail at the Prisma generate step, not silently at runtime — safe failure mode.

---

## Open Questions

- None — all four changes are self-contained and unblocked.
