# Delta Spec: Product Commission Properties

## New Requirements

### [NEW] Product.commissionPercentage
- **Type**: Decimal(5,4) (para soportar porcentajes con 2 decimales convertidos a fracción, ej: 76.50% -> 0.7650)
- **Default**: 0.0000
- **Constraint**: NOT NULL

### [NEW] Product.contributionType
- **Type**: Enum (`ContributionType`)
- **Values**: `REGULAR`, `INICIO`
- **Constraint**: NOT NULL

### [NEW] Synchronization Seed
- **Source**: `docs/product-percentage-payment-commission.csv`
- **Logic**: Upsert/Update products by name.
- **Mapping**:
  - `APORTE`: "REGULAR" -> `REGULAR`, "UNICO" -> `INICIO`.
  - `% COMISIONAL...`: Parse string to Decimal.
