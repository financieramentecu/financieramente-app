# Design: Recalculate Commissions on Origin Change

## Technical Approach

To satisfy the delta specs for updating the client origin with commission recalculations, we will implement an atomic database transaction. The front-end modal will be wrapped with an `AlertDialog` prior to calling the `PUT` endpoint. In the backend, the `PUT /api/negocios/[id]` API currently only updates the `idClientOrigin` via a simple Prisma query. Since recalculating commissions spans the `pre-liquidacion` domain, we will inject a new robust service function inside `pre-liquidacion.service.ts` that safely deletes outdated distributions for the affected business, fetches the appropriate category distributions for the new origin, and recreates the records while persisting original discounts and clawbacks. This function will be called instead of the current trivial update when the business is in the `EMITIDO` state.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|----------|--------|-------------------------|-----------|
| **Service Location** | Implement recalculation logic in `pre-liquidacion.service.ts` | Add the logic directly in `src/app/api/negocios/[id]/route.ts` or in `business.service.ts` | Commission and distribution calculations are core to the `pre-liquidacion` module according to Screaming Architecture. The `negocios` route handler should orchestrate HTTP and auth, then delegate complex updates to the matching domain service. |
| **Atomic Operations** | Wrap the entire business update and commission recreation within a single `prisma.$transaction` | Updating the business first, then sequentially modifying the related `SettlementCommission` records | Changing an origin affects money-critical records; a failed partial update would leave a business out of sync with its commission distributions. Atomic execution guarantees data consistency. |
| **Existing Fixed Percentages** | Rely on `discountPercentage` and `clawbackPercentage` directly from the `SettlementCommission` record | Re-query the globally active `CommissionDiscount` table configurations | The spec explicitly demands retaining the *existing* discounts and clawback amounts associated directly with the previously synchronized record, preventing historical state corruption. |

## Data Flow

    [BusinessViewModal UI]
            │ (User clicks 'Guardar', UI displays Alert. User confirms 'Aceptar')
            ▼
    [PUT /api/negocios/:id]
            │ (Validates body, auth, role access, and business status === EMITIDO)
            ▼
    [recalcularComisionesPorCambioOrigen] (pre-liquidacion.service.ts)
            │
            ├─► Validate new `ProductConfiguration` and active `ProductPercentageCommission` exists.
            ├─► `prisma.$transaction` starts
            │    ├─► `Business.update`: update `idClientOrigin` & `idProductPercentageCommission`.
            │    ├─► For every `SettlementCommission` in `PRE-SETTLED` state:
            │    │    ├─► `ComissionDistribution.deleteMany` and `Clawback.deleteMany`
            │    │    └─► Iterates over new categories: `ComissionDistribution.create` & `Clawback.create`
            │    └─► Generate AuditLog
            └─► Returns fully hydrated updated business entity.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/components/modals/BusinessViewModal.tsx` | Modify | Add an `AlertDialog` that intercepts the 'Guardar' action, warning the user about commission recalculation. If accepted, execute `onSaveOrigin`. |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | Create exported `recalcularComisionesPorCambioOrigen` executing the sequence described in Data Flow. Requires fetching the business, verifying distributions, and re-creating them accurately. |
| `src/app/api/negocios/[id]/route.ts` | Modify | Update the logic inside `PUT` handler. When modifying `idClientOrigin` and state is `EMITIDO`, call the new `recalcularComisionesPorCambioOrigen` function rather than `prisma.business.update`. |
| `prisma/schema.prisma` | Modify | **Phase 5**: Add `discountTotal` and `commissionTotal` to `ComissionDistribution`. |
| `src/features/pre-liquidacion/components/ModalDetalleDistribucion.tsx` | Modify | **Phase 5**: Update columns: Comisión Bruta renders parent's `commissionValue` (uncalculated base), Total Descuento renders `discountTotal`, Comisión Final renders `commissionTotal`. |

## Interfaces / Contracts

The `PUT /api/negocios/[id]` endpoint contract remains structurally the same (receives `{ idClientOrigin }` and returns an `ApiResponse<BusinessEntity>`), but underneath it will generate a wider transactional impact.

No new payload shapes are introduced. We strictly adhere to existing models structure.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `recalcularComisionesPorCambioOrigen` service | Mock Prisma Client in `pre-liquidacion.service.test.ts` to ensure `deleteMany` and `create` methods are called correctly within `$transaction`. Verify computation matches new configuration inputs. |
| Integration | `PUT /api/negocios/[id]` | Use Supertest to simulate an origin change on an `EMITIDO` business, ensuring the modified API successfully redirects the flow to the new service and returns HTTP 200 with the correct updated references. |
| Unit | `BusinessViewModal` UI | Simulate 'Guardar' click with React Testing Library to ensure `AlertDialog` prevents immediate submit and verify callback acts after clicking confirm. |

## Migration / Rollout

No migration required. The recalculation strategy targets existing relational structures and will strictly process `PRE-SETTLED` statuses, seamlessly co-existing with existing records.

## Open Questions

- None.
