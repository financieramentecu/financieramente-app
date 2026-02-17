# Quickstart: Commission Adjustments

## Development Workflow

1. **Phase 1 (Carga)**: Enhance `process-batch/route.ts` to detect and store `FileType`.
2. **Phase 2 (Pre-Liquidation)**: Refactor `pre-liquidacion.service.ts` to use the dynamic `CalculationService` (Voluntarias vs Polizas).
3. **Phase 3 (Adjustment)**: Add logic to process 'claw' records and reduce reserves.
4. **Phase 4 (UI)**: Update frontend tables to display the new distribution fields.

## Key Files
- `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`: Core calculation engine.
- `src/app/api/carga-archivos/process-batch/route.ts`: Import and classification logic.
- `prisma/schema.prisma`: Data models.

## Running Tests
```bash
npm test src/features/pre-liquidacion
```
