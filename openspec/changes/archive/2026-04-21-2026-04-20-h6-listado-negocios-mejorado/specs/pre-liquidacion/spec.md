# Delta for Pre-liquidación (business status on settlement)

## ADDED Requirements

### Requirement: Settlement promotes only FONDEADO businesses to LIQUIDADO

The canonical business status flow is **`EMITIDO` → `FONDEADO` → `LIQUIDADO`**. When commission settlement completes, the system MUST set a linked business to `LIQUIDADO` only if its current status is **`FONDEADO`**. The system MUST NOT promote from `EMITIDO` directly to `LIQUIDADO` in that settlement step.

#### Scenario: Fondeado becomes liquidado after settle

- **GIVEN** a business linked to the settled commissions with `status` `FONDEADO`
- **WHEN** the settlement transaction applies the business status update
- **THEN** that business MUST end with `status` `LIQUIDADO`

#### Scenario: Emitido unchanged by settle

- **GIVEN** a business with `status` `EMITIDO` (not yet fondeado)
- **WHEN** the same settlement flow runs its business update
- **THEN** that business MUST remain `EMITIDO` (the conditional update MUST NOT match it)
