# Data Model: Commission Sync & Pre-liquidation

## Entities (new/updated)

### SettlementCommission (updated)
Key changes:
- Add `commission_type` (`POLIZA` | `VOLUNTARIA`)
- Add `descripcion`
- Add `discount_percentage` (snapshot)
- Add `clawback_percentage` (snapshot)
- Add `origin_commission` (`CARTERA` | NULL)
- Remove legacy columns: `poliza`, `ramo`, `producto`, `recibo`, `fecha_pago`

Core fields (conceptual):
- id_settlement_commission (PK)
- id_file_import (FK)
- id_business (nullable FK)
- descripcion
- commission_value
- commission_percentage (nullable)
- base_commission
- discount_percentage (snapshot)
- clawback_percentage (snapshot)
- origin_commission
- commission_type
- status (PENDIENTE | SINCRONIZADO | LAG | ERROR | PRELIQUIDADO)
- is_lag (boolean)
- created_at / updated_at

### CommissionConfiguration (renamed, disconnected)
Standalone configuration table (no FK relationships).

Fields:
- id_config_commission (PK)
- discount_percentage
- clawback_percentage
- name
- description
- status (ACTIVE / INACTIVE)
- created_at / updated_at

### CommissionDistribution (updated)
Key changes:
- Apply discount/clawback snapshots at calculation time.
- Keep status lifecycle (LIQUIDADO, NOTIFICADO, PAGADA, ANULADA).

Fields:
- id_commission_distribution (PK)
- id_settlement_commission (FK)
- id_percentage_commission_category (FK)
- commission_value (bruta)
- commission_value_final (neta)
- total_discount
- applied_discount_percentage (snapshot)
- observation (optional)
- status
- created_at / updated_at

### Clawback (updated)
Key changes:
- Add `id_user` to identify the owner of the clawback reserve.

Fields:
- id_clawback (PK)
- id_user (FK)
- id_commission_distribution (FK)
- value_clawback
- porcentaje_applied (snapshot)
- state (ACUMULADO | DESCONTADO)
- applied_date
- release_date
- reason
- created_at / updated_at

### ClawbackBalance (new)
Key changes:
- 1:1 balance per user for clawback net amount.

Fields:
- id_user (PK, FK)
- total_amount
- updated_at

### ProductPercentageCommissionCategory (updated)
Add `porcentaje_portfolio` for CARTERA calculations.

Fields:
- id (PK)
- id_category (FK)
- id_product_percentage_commission (FK)
- porcentaje_distribucion
- porcentaje_portfolio (new)
- active

### AuditLog (existing)
Used to register errors during import parsing/validation.

Required fields for this feature (conceptual):
- id_audit_log (PK)
- action (e.g., IMPORT_ERROR)
- email (nullable)
- id_user (nullable)
- created_at
- metadata (if available in schema) or description/details (if available)

## Relationships

- FileImport 1..* SettlementCommission
- SettlementCommission 1..* CommissionDistribution
- ProductPercentageCommissionCategory 1..* CommissionDistribution
- CommissionDistribution 0..1 Clawback
- User 1..* Clawback
- User 1..1 ClawbackBalance
- CommissionConfiguration: no relations (standalone)

## State Transitions

- SettlementCommission: PENDIENTE → SINCRONIZADO | LAG | ERROR → PRELIQUIDADO
- FileImport: PROCESANDO → LOAD → PRELIQUIDADO (unchanged)

## Validation Rules

- Headers must match selected type (POLIZA/VOLUNTARIA).
- POLIZA: no date validation; VOLUNTARIA: validate Desde/Hasta.
- Numeric values must be parsed after normalization; invalid numbers → ERROR + audit.
