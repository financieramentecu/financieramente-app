# Tasks: Pre-liquidation Visibility & Filtering Fix

## Phase 1: API & Service Corrections

- [x] **T001: Update Archivos API Filter**
  - File: `src/app/api/pre-liquidacion/archivos/route.ts`
  - Action: Add `LOAD` to the `in` array in the Prisma `where` clause.
  - Reason: Enable visibility of recently uploaded files.

- [x] **T002: Refine Record Filtering in Service**
  - File: `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`
  - Function: `obtenerDetallePreLiquidacion`
  - Action: Update `settlementCommission.findMany` where clause to `status: 'SINCRONIZADO'`.
  - Reason: Remove `LAG` and `ERROR` noise from the pre-liquidation view.

## Phase 2: Verification

- [ ] **V001: Manual UI Test**
  - Upload a new file (reaches `LOAD`).
  - Go to Pre-liquidation -> File should appear.
  - Open File -> Only `SINCRONIZADO` records should appear.
  - Process -> Success.

- [ ] **V002: Regression Check**
  - Verify that `LAG` records still exist in the DB and are not deleted, just hidden from this specific view.
