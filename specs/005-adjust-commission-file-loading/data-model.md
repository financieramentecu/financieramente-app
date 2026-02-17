# Data Model: Commission Adjustments

## Header Mappings
This table maps the headers from the two different Excel formats to the **unified database fields** in the `SettlementCommission` table. Regardless of which file is uploaded, the data will be stored in these shared fields.

| Target Field (DB) | Voluntarias Header (Source A) | Polizas Header (Source B) |
|-------------------|-------------------------------|---------------------------|
| `commissionValue` | `Com` | `Valor Comisión` (Must clean currency format `$ (x.xxx)`) |
| `baseCommission` | `Base` | `BASE` (Ignored for Polizas calculations) |
| `description` | `Tipo de Comision` | `Plan de Compensación` |
| `product` | `Producto` | `Polizas Producto` |
| `agentName` | `Nombre Fp` (or similar) | `Polizas Nombre Agente` |

## Entities

### FileImport (Existing - Modified)
Added field to track the file type.
- `fileType`: String (ENUM: 'VOLUNTARIAS', 'POLIZAS') - Determined during upload.

### SettlementCommission (Existing - Refactored)
Stores raw data from Excel rows.
- `status`: String ('PENDIENTE', 'SINCRONIZADO', 'LAG', 'ERROR', 'PRELIQUIDADO')
- `idBusiness`: Relation to Business (used for origin lookup in Polizas).
- `commissionValue`: Decimal (Base amount from Excel).
- `originCommission`: (NEW) Optional field. Stores 'CARTERA' if Plan equals `PROMOTOR_FRONT19_OMPEV`, else `null`.
- `baseCommission`: Decimal (Mapped from 'Base' field).
- `appliedDiscountPercentage`: (NEW) Decimal snapshot of the office discount used.
- `appliedClawbackPercentage`: (NEW) Decimal snapshot of the clawback % used.
- `description`: String (Mapped from 'Tipo de Comision' or 'Plan de Compensación').
- `product`: String (Mapped from 'Producto' or 'Polizas Producto').
- `paymentDate`: DateTime (Optional payment date).
- `commissionType`: Enum ('POLIZA', 'VOLUNTARIA')
- `error`: String (Error description if row fails).
- `isLag`: Boolean (If record is from a previous period).

### CommissionDistribution (Existing - Modified Logic)
Stores the results of the dynamic calculation.
- `role`: String ('COACH', 'LEADER', 'AGENCY') - Derived from calculation logic.
- `bruta`: Decimal (Amount before discounts).
- `neta`: Decimal (Amount after 12% tax discount).
- `clawback`: Decimal (Retention applied only for Polizas).

### CommissionConfiguration (Refactored from Discount)
Stores global or category-based percentages for calculations.
- `discountPercentage`: Decimal (e.g., 0.12 for 12% office discount).
- `clawbackPercentage`: Decimal (e.g., 0.10 for 10% retention).
- `name`: String (Identifier for the configuration).

### Clawback (Movement History)
Tracks every individual retention or adjustment.
- `idUser`: Relation to User.
- `valueClawback`: Decimal (Amount of the movement).
- `state`: String ('ACUMULADO' - retention, 'DESCONTADO' - adjustment).
- `porcentajeApplied`: Decimal snapshot of the percentage used.

### ClawbackBalance (Total Tracking)
Tracks the current total reserve per user.
- `idUser`: Relation to User (Primary Key).
- `totalAmount`: Decimal (Current balance).
- `updatedAt`: DateTime.

## Relationships
- `User` --(idUser)--> `FileImport`
- `FileImport` --(idFileImport)--> `SettlementCommission`
- `SettlementCommission` --(idSettlementCommission)--> `CommissionDistribution`
- `CommissionDistribution` --(idCommissionDistribution)--> `Clawback`
- `User (Coach)` --(idUserLeader)--> `User (Leader)`
- `User` --(idUser)--> `ClawbackBalance` (1:1)
- *Note: No hard relation to CommissionConfiguration.*

## State Transitions
- `SettlementCommission`: PENDIENTE -> PRELIQUIDADO (after formulas apply).
- `Clawback`: RETENIDO -> APLICADO (when subtracted from a future payout).
