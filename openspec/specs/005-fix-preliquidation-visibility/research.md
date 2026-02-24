# Research: Status Consistency (LOAD vs COMPLETADO)

## Context
During the investigation, a doubt arose regarding why files were left in `LOAD` status instead of `COMPLETADO` after uploading.

## Findings
1. **Prisma Schema**: `LOAD` and `COMPLETADO` are both valid strings for the `status` field.
2. **Business Rules**: In the current implementation of `pre-liquidacion.service.ts`, there is a hard validation:
   ```typescript
   if (fileImport.status !== 'LOAD') {
       return { success: false, mensaje: "El archivo debe estar en estado LOAD..." };
   }
   ```
3. **Frontend Expectation**: The React code in `PreLiquidacionPage` explicitly filters for `LOAD` to populate the "Pending" list.
4. **API Inconsistency**: Only `api/pre-liquidacion/archivos/route.ts` was searching for `COMPLETADO`.

## Decision
We will maintain the use of **`LOAD`** for this phase. 
- Changing to `COMPLETADO` would require updates in multiple files (Upload API, Pre-liquidation Service, Frontend Component).
- Correcting the `archivos` API is the surgical and safest fix that preserves the existing state machine logic.
