# Research: Commission Adjustments

## Findings

### Hierarchical Resolution
The `User` model in `prisma/schema.prisma` contains an `idUserLeader` field (self-relation). 
- **Decision**: Use `user.leader` relation to resolve the hierarchy (Coach -> Leader). 
- **Rationale**: This is the native way the app handles relationships.

### Commission Percentage Lookups
The app uses `getPpcForNewBusinesses` in `product-configuration.service.ts` to find the `ProductPercentageCommission` based on `Product`, `ClientOrigin`, and `Category`.
- **Decision**: Extend or use this service to fetch the Coach's base percentage dynamically for both Voluntarias and Polizas.
- **Rationale**: Reuses existing configuration logic and allows for per-product/origin/category flexibility.

### Clawback Reserves
There is no dedicated `Reserve` table. The `Clawback` table exists with a `state` field ('RETENIDO', 'LIBERADO', 'APLICADO', 'CANCELADO').
- **Decision**: Implement a virtual "reserve" by summing `Clawback` records for a user that are in 'RETENIDO' state. For "claw" type records in Excel, create negative entries or apply them to existing retentions.
- **Rationale**: Leverages the existing schema without adding unnecessary tables.

### File Type Detection
The user Excel example shows identical headers but different internal logic.
- **Decision**: Use Filename-based detection (e.g., "VOLUNTARIAS") for Phase 1. 

## Alternatives Considered
- **Strict Header Detection**: Rejected because the headers are identical in the provided examples.
- **New Reserve Table**: Rejected to keep the schema lean; the `Clawback` table is sufficient for tracking retentions.
