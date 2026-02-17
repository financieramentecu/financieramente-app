# Quickstart: Commission Adjustments

## Development Workflow

1. **Verify Configs**: Ensure `ProductPercentageCommission` records exist in the DB for the test products.
2. **File Detection**: Implement detection logic in `src/app/api/carga-archivos/process-batch/route.ts`.
3. **Formula Engine**: Update `aplicarFormulas` in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` to support dynamic lookups.
4. **Clawback Retentions**: Add the retention logic specifically for "POLIZAS" type.
5. **UI Feedback**: Update the pre-liquidation detail component to display the new "Bruta", "Neta", and "Clawback" columns.

## Key Files
- `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`: Core calculation engine.
- `src/app/api/carga-archivos/process-batch/route.ts`: Import and classification logic.
- `prisma/schema.prisma`: Data models.

## Running Tests
```bash
npm test src/features/pre-liquidacion
```
