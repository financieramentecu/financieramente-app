# Data Model: Commission Adjustments

## Entities

### FileImport (Existing - Modified)
Added field to track the file type.
- `fileType`: String (ENUM: 'VOLUNTARIAS', 'POLIZAS') - Determined during upload.

### SettlementCommission (Existing)
Stores raw data from Excel rows.
- `status`: String ('PENDIENTE', 'SINCRONIZADO', 'LAG', 'ERROR', 'PRELIQUIDADO')
- `idBusiness`: Relation to Business (used for origin lookup in Polizas).
- `valorComision`: Decimal (Base amount from Excel).

### ComissionDistribution (Existing - Modified Logic)
Stores the results of the dynamic calculation.
- `role`: String ('COACH', 'LEADER', 'AGENCY') - Derived from calculation logic.
- `bruta`: Decimal (Amount before discounts).
- `neta`: Decimal (Amount after 12% tax discount).
- `clawback`: Decimal (Retention applied only for Polizas).

### Clawback (Existing)
Tracks retentions and adjust balance.
- `idComissionDistribution`: Unique relation to the distribution that generated it.
- `valueClawback`: Decimal (The retention amount).
- `state`: String ('RETENIDO', 'LIBERADO', 'APLICADO', 'CANCELADO')

## Relationships
- `User` --(idUser)--> `FileImport`
- `FileImport` --(idFileImport)--> `SettlementCommission`
- `SettlementCommission` --(idSettlementCommission)--> `ComissionDistribution`
- `ComissionDistribution` --(idComissionDistribution)--> `Clawback`
- `User (Coach)` --(idUserLeader)--> `User (Leader)`

## State Transitions
- `SettlementCommission`: PENDIENTE -> PRELIQUIDADO (after formulas apply).
- `Clawback`: RETENIDO -> APLICADO (when subtracted from a future payout).
