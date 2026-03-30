# Proposal: Recalculate Commissions on Origin Change

## Intent
Ensure that when a business's client origin is changed in the UI (for businesses in `EMITIDO` state), its associated commissions are atomically recalculated based on the new origin's distribution configuration, while maintaining existing discounts and clawbacks.

## Scope

### In Scope
- Add a confirmation dialog in the UI when changing the origin to warn users about the recalculation.
- Modify the `PUT /api/negocios/[id]` API route to handle atomic recalculation.
- Create a service method to recreate `ComissionDistribution` and `Clawback` records for related `SettlementCommission` based on the new `ProductPercentageCommission`.
- **Phase 5 addition (Update)**: Revert previous `comission_distribution` DB schema changes (delete `commission_total` and `discount_total`).
- **Phase 5 presentation logic**: Update UI table "Detalle de Distribución":
  - **Header**: Add "Comisión Total" taking value from `SettlementCommission.commissionValue`.
  - **Table Columns**:
    - Comisión Bruta -> `valueComission`
    - % Descuento -> `appliedDiscountPercentage`
    - Total Descuento -> `totalDiscount`
    - % Distribución de Comisión -> `porcentaje_distribucion` (nuevo campo calculado)
    - % clawback -> `clawback.porcentajeApplied` (si aplica)
    - Descuento Clawback -> `clawback.valueClawback` (si aplica)
- **Phase 6 schema & math adjustments**: 
  - Update `ComissionDistribution` schema: add `commission_percentage` to store the applied distribution percentage.
  - Update pre-liquidation math: `Comisión Bruta` (value_commision) must exclusively use `SettlementCommission.commissionValue` * `% Categoria`, overriding previous base fallback logic.

### Out of Scope
- Recalculating commissions for businesses in states other than `EMITIDO`.
- Changing the mass pre-liquidation logic originating from batch file processing.
- Altering commissions that are already `SETTLED` (paid/closed).

## Approach
Upon receiving the origin change request, the backend will identify the new `ProductConfiguration` (using the same category and product, but the new origin) and obtain the related active `ProductPercentageCommission`. In a single `prisma.$transaction`, the system will:
1. Update the `Business` with the new `idClientOrigin` and `idProductPercentageCommission`.
2. Delete previous `ComissionDistribution` and `Clawback` entries for associated `SettlementCommission`s (in `PRE-SETTLED` state only).
3. Re-create them with the new category percentage distribution, applying the existing `discountPercentage` and `clawbackPercentage` stored in the `SettlementCommission`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/negocios/components/modals/BusinessViewModal.tsx` | Modified | Add confirmation alert before firing update API. |
| `src/app/api/negocios/[id]/route.ts` | Modified | Orchestrate the new recalculation logic. |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modified | Add function to recreate `ComissionDistribution` and `Clawback` based on origin change. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing product configuration | Low | Validate new configuration existence upfront and return an explicit error. |
| Modifying settled commissions | Low | Guard clause to explicitly ignore or reject recalculation for `SETTLED` state. |

## Rollback Plan
- If the transaction fails in production, the atomic nature of `$transaction` ensures no partial commission generation occurs. The business will remain with its old origin. For logical reversions, a git revert of the commits will be used.

## Dependencies
- None.

## Success Criteria
- [ ] Changing the origin from the modal displays a recalculation warning.
- [ ] Confirming the change successfully updates `idClientOrigin` and `idProductPercentageCommission` of the business.
- [ ] `ComissionDistribution` records correctly adopt the new category distribution, keeping previous discounts/clawbacks.
- [ ] The process does not corrupt non-EMITIDO businesses or SETTLED commissions.
