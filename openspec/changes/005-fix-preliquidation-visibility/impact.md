# Impact Analysis: Pre-liquidation Visibility Fix

## Overview
This change standardizes the communication between the Upload module and the Pre-liquidation module by recognizing the `LOAD` state as the canonical "ready to process" state.

## Affected Components

### 1. Backend (API)
- **Endpoint**: `GET /api/pre-liquidacion/archivos`
- **Impact**: Increased result set. Files that were previously hidden will now be returned to the client.
- **Risk**: Low. The service already handles `LOAD` status, so enabling visibility is safe.

### 2. Business Logic (Services)
- **Service**: `pre-liquidacion.service.ts`
- **Impact**: The detail view for a file will now return fewer records (`SINCRONIZADO` only).
- **Risk**: Low. `LAG` and `ERROR` records are maintained in the database for historical and recovery purposes but are not needed for the math of distribution.

### 3. Frontend (UI)
- **Impact**: The user will now see their uploaded files immediately. The summary cards will only reflect actionable commissions.
- **Visual Changes**: The detail table will be cleaner, omitting rows with errors or missing business links.

## State Machine Consistency
- **Current Flow**: `PROCESANDO` -> `LOAD` (Hidden)
- **Proposed Flow**: `PROCESANDO` -> `LOAD` (Visible) -> `PRELIQUIDADO`
- **Integrity**: This aligns with the requirements found in `specs/001-commission-sync`.
