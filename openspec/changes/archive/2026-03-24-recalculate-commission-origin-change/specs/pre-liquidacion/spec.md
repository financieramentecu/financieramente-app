# Delta for Pre-liquidacion

## ADDED Requirements

### Requirement: Atomic commission recalculation on origin change

When a business's client origin is updated via `PUT /api/negocios/[id]` and the business is in `EMITIDO` state, the system SHALL calculate the new percentages based on the new `ProductConfiguration` (matching the new origin, same product, same category). Within the same transaction, the system SHALL delete existing `ComissionDistribution` and `Clawback` records for related `SettlementCommission`s that are in `PRE-SETTLED` state, and recreate them using the new percentages while retaining the original `discountPercentage` and `clawbackPercentage` from the `SettlementCommission`.

#### Scenario: Recalculate PRE-SETTLED commissions on origin change

- GIVEN a business in `EMITIDO` state with one or more `SettlementCommission`s in `PRE-SETTLED` state
- AND the user changes the client origin
- WHEN the `PUT /api/negocios/[id]` endpoint is called
- THEN the system SHALL update the business's `idClientOrigin` and `idProductPercentageCommission`
- AND SHALL delete existing `ComissionDistribution` and `Clawback` records for the `PRE-SETTLED` commissions
- AND SHALL create new distribution and clawback records applying the new category percentages
- AND SHALL preserve the `discountPercentage` and `clawbackPercentage` from the `SettlementCommission`

#### Scenario: Existing commissions not in PRE-SETTLED state are untouched

- GIVEN a business with `SettlementCommission`s in `SYNCHRONIZED`, `LAG`, or `SETTLED` states
- WHEN the user changes the client origin and the update API is called
- THEN the system SHALL update the business's `idClientOrigin`
- AND SHALL NOT delete or recreate `ComissionDistribution` records for `SYNCHRONIZED`, `LAG`, or `SETTLED` commissions

#### Scenario: Missing product configuration aborts origin change

- GIVEN the user changes the client origin
- WHEN the new combination of product, category, and new origin does not have an active `ProductPercentageCommission`
- THEN the update API SHALL return an explicit error ("No existe distribución de comisiones para el nuevo origen")
- AND the system SHALL NOT update the business origin or recalculate any commissions
