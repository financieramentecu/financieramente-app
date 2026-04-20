# Design: HU3 — Fondeo sin anualidades

## Technical Approach

Add a `POST /api/negocios/[id]/fondear` route mirroring the existing cancel sub-route pattern. The route authenticates, checks role permissions (AGENTE own, ASISTENTE_GERENCIA_OPERATIVA all, ADMIN all), verifies `status === EMITIDO`, counts `annualPayments` to confirm zero rows, then atomically sets `dateAnchored = now()` and `status = FONDEADO`. A Prisma migration adds `dateAnchored DateTime?` to Business. The UI adds a "Fondear" button in `ActionCell` and a `FONDEADO` indigo badge. The duplicate `BUSINESS_STATUS` in `business-status.types.ts` is consolidated into `business-entity.types.ts`.

## Architecture Decisions

### Decision: POST fondear sub-route (not PATCH on main route)

| Option | Tradeoff | Chosen? |
|--------|----------|---------|
| POST `/[id]/fondear` | Dedicated route, mirrors cancel pattern, clear intent | Yes |
| PATCH on `/[id]` with action field | Overloads existing route, harder to guard | No |

**Rationale**: Cancel already uses a dedicated sub-route. Fondear has distinct guards (zero annualPayments check) that don't belong in the generic PUT. Consistency with cancel pattern reduces cognitive load.

### Decision: `dateAnchored` on Business model (not only AnnualPayment)

| Option | Tradeoff | Chosen? |
|--------|----------|---------|
| `dateAnchored` on Business | Single field for non-annual fondeo timestamp; simple query | Yes |
| Derive from AnnualPayment rows | No rows exist for non-annual businesses; impossible | No |

**Rationale**: Non-annual businesses have zero AnnualPayment rows, so the funding timestamp must live on Business itself. AnnualPayment already has its own `dateAnchored` for per-installment fondeo (HU4).

### Decision: Count annualPayments in-route (not a separate service)

| Option | Tradeoff | Chosen? |
|--------|----------|---------|
| `_count` in findUnique query | One DB call, simple, follows cancel pattern | Yes |
| Separate service method | Extra abstraction for a single count check | No |

**Rationale**: The guard is a simple count check. The cancel route does its status check inline. Follow the same pattern; extract to service only if reused later.

### Decision: Consolidate BUSINESS_STATUS into `business-entity.types.ts`

| Option | Tradeoff | Chosen? |
|--------|----------|---------|
| Keep canonical in `business-entity.types.ts` | Already has `CANCELADO`, more complete | Yes |
| Create new shared file | Unnecessary file; existing consumers already import from entity types | No |

**Rationale**: `business-entity.types.ts` already has the superset (includes CANCELADO). `business-status.types.ts` is the stale copy. Re-export `determineBusinessStatus` from entity types, update imports.

## Data Flow

```
ActionCell (click "Fondear")
    │
    ▼
POST /api/negocios/[id]/fondear
    │
    ├─ auth() → session
    ├─ getCurrentUserByEmail() → role check (AGENTE/ASIST/ADMIN)
    ├─ prisma.business.findUnique({ _count: { annualPayments } })
    │   ├─ status !== EMITIDO → 400
    │   └─ annualPayments > 0 → 400 (defer to HU4)
    ├─ prisma.business.update({ status: FONDEADO, dateAnchored: now() })
    ├─ logAuditEvent(BUSINESS_FUNDED)
    └─ return prismaBusinessToEntity(updated)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `dateAnchored DateTime?` to Business model |
| `src/app/api/negocios/[id]/fondear/route.ts` | Create | POST endpoint: auth + role + status + zero-AP guard + atomic update |
| `src/features/negocios/types/business-entity.types.ts` | Modify | Add `FONDEADO` to `BUSINESS_STATUS`; add `dateAnchored` to `BusinessEntity`; add `determineBusinessStatus` |
| `src/features/negocios/types/business-status.types.ts` | Modify | Remove duplicate `BUSINESS_STATUS`; re-export from entity types or deprecate |
| `src/features/negocios/types/business-prisma.types.ts` | Modify | Add `_count: { select: { annualPayments: true } }` to `businessWithRelations` |
| `src/features/negocios/mappers/business-entity.mapper.ts` | Modify | Map `dateAnchored` to entity |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | Add `FONDEADO` to status enum in `businessListParamsSchema` and `businessEntitySchema` |
| `src/features/negocios/components/BusinessTable/ActionCell.tsx` | Modify | Add "Fondear" button gated by EMITIDO + authorized roles; add `onFondear` callback |
| `src/features/negocios/components/ui/BusinessStatusBadge.tsx` | Modify | Add `FONDEADO` config (indigo badge) |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `BUSINESS_FUNDED` to `AuditAction` enum |

## Interfaces / Contracts

```typescript
// New fondear route allowed roles
const FONDEAR_ALLOWED_ROLES = [
  UserRole.ADMIN,
  UserRole.ASISTENTE_GERENCIA_OPERATIVA,
  UserRole.AGENTE, // own businesses only
]

// ActionCell gains onFondear callback + hasAnnualPayments prop
interface ActionCellProps {
  // ...existing
  hasAnnualPayments: boolean
  onFondear?: (id: number) => void
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `BusinessStatusBadge` renders FONDEADO indigo | Vitest + Testing Library |
| Unit | `ActionCell` shows/hides Fondear by role + status + annualPayments | Vitest + Testing Library |
| Integration | POST `/fondear` happy path, status guard, AP guard, role guard | Vitest + mocked Prisma |
| Integration | Mapper correctly maps `dateAnchored` | Vitest |

## Migration / Rollout

1. `npx prisma migrate dev --name add-date-anchored-to-business` adds nullable `dateAnchored DateTime?` column
2. No data backfill needed -- existing businesses have no funding date
3. Rollback: drop column (nullable, no data loss)

## Open Questions

- None
