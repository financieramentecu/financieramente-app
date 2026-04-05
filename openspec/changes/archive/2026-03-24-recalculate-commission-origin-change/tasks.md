# Tasks: Recalculate Commissions on Origin Change

## Phase 1: Core Service Implementation (TDD)

- [x] 1.1 **[RED]** Create unit tests in `src/features/pre-liquidacion/__tests__/pre-liquidacion.service.test.ts` for the signature `recalcularComisionesPorCambioOrigen`. Assert missing product config throws an error and assert it calculates correct `ComissionDistribution` entries while retaining discounts and clawbacks for only `PRE-SETTLED` status commissions.
- [x] 1.2 **[GREEN/REFACTOR]** Implement `recalcularComisionesPorCambioOrigen(businessId, newOriginId, currentUserData)` within `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`. Execute finding config, updating business origin, deleting associated allocations, and storing re-created ones all within a single `prisma.$transaction`.

## Phase 2: API Integration (TDD)

- [x] 2.1 **[RED]** Create integration tests in `src/app/api/negocios/[id]/__tests__/route.test.ts` to simulate updating the `idClientOrigin` of an `EMITIDO` business, expecting recalculation side-effects instead of a basic update.
- [x] 2.2 **[GREEN/REFACTOR]** Modify `src/app/api/negocios/[id]/route.ts`. Detect when the caller updates `idClientOrigin` on a business where `status === 'EMITIDO'`. Delegate the logic to the new `recalcularComisionesPorCambioOrigen` service function.

## Phase 3: Frontend Validation (TDD)

- [x] 3.1 **[RED]** Modify `src/features/negocios/__tests__/components/modals/BusinessViewModal.test.tsx` to assert that selecting a newly updated origin and clicking 'Guardar' strictly triggers an alert warning about commission recalculations when state is `EMITIDO`.
- [x] 3.2 **[GREEN/REFACTOR]** Update `src/features/negocios/components/modals/BusinessViewModal.tsx` to intercept the `onSaveOrigin` callback. Inject a shadcn/ui `AlertDialog` component showing "Las comisiones van a ser recalculadas" to confirm the action.

## Phase 4: Integration and Verification

- [x] 4.1 Execute full test suite `npm run test:all` to ensure no related tests break.
- [x] 4.2 Validate visually in local Dev that an edited origin properly updates the table of `ComissionDistribution` records linked to the specific business.

## Phase 5: UI Presentation and State Refactor (Revised)

- [x] 5.1 Revert `prisma/schema.prisma` to remove `commission_total` and `discount_total` from `ComissionDistribution`. Rollback the manual migration to sync the DB.
- [x] 5.2 Revert `pre-liquidacion.service.ts` creation queries to remove the two fields. Update the assigned `status` of `ComissionDistribution` to `'PRE-SETTLED'` purely during pre-liquidation creation.
- [x] 5.3 Update `obtenerDistribucionComision` (API) y `types.ts` to expose the exact requested mapping: `commission_value` (parent), `value_commision` (bruta), `applied_discount_percentace` (desc %), `discount_total` (from `totalDiscount`), `commission_porcentaje` (from `ProductPercentageCommissionCategory`), `percentaje_applied` (clawback %), `value_clawback` (clawback desc).
- [x] 5.4 Modify `ModalDetalleDistribucion.tsx` to add "Comisión Total" to the Header, and use the exact new variable map in the Distribution table, leaving Clawback columns empty if they do not apply.

## Phase 6: Math Correction & Database Schema (New)

- [x] 6.2 Update `pre-liquidacion.service.ts`: Exclusively calculate `valorComisionBruta` using `commissionValue` on settlement_commission`(ignore`baseCommission`), save result on `comission_distribution`field`value_commision`.
