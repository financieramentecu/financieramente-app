# Delta for pre-liquidacion

## Context

This delta covers the period-lock enforcement added to the pre-liquidación domain as part of the `mejora-sincronizacion-periodo` change. No other pre-liquidación behavior changes in this change. All other requirements in `openspec/specs/pre-liquidacion/spec.md` remain in effect and unchanged.

---

## ADDED Requirements

### Requirement: Block Re-Sync on Completed Period (FileImportService responsibility)

The system SHALL prevent a new sync attempt when a `FileImport` record with `status = COMPLETED` exists for the same `fileType`, `month`, `year`, and `idUser`. This guard SHALL be enforced in `FileImportService.initiateImport()` — NOT in the pre-liquidación service or any pre-liquidación route handler. Pre-liquidación itself has no behavior change: once a file reaches `status = COMPLETED` (set by the liquidation process), the guard in `FileImportService` ensures no further sync can inadvertently associate new commissions with a liquidated period.

The system SHALL return an error with the message `"El período {month}/{year} ya fue liquidado"` and SHALL NOT create or reuse any `FileImport` record for that period.

#### Scenario: Completed period blocks new sync

- GIVEN a `FileImport` with `status = COMPLETED`, `fileType = POLIZA`, `month = 2`, `year = 2026`, `idUser = 10` exists (set by the liquidation process)
- WHEN `idUser = 10` attempts to initiate a new file import for `fileType = POLIZA`, `month = 2`, `year = 2026`
- THEN `FileImportService.initiateImport()` SHALL reject the request
- AND the API route SHALL return HTTP 409 with `{ data: null, error: "El período 2/2026 ya fue liquidado" }`
- AND no new `FileImport` record SHALL be created
- AND no new `SettlementCommission` records SHALL be associated with that period

#### Scenario: Pre-liquidación service is not the enforcement point

- GIVEN a `FileImport` has `status = COMPLETED`
- WHEN any pre-liquidación service method is called for operations unrelated to re-sync (e.g. fetching detalle, running pre-liquidación calculations)
- THEN those methods SHALL NOT be responsible for checking whether the period is COMPLETED for re-sync blocking purposes
- AND their behavior SHALL remain unchanged from the existing spec

#### Scenario: LOAD period is not blocked

- GIVEN a `FileImport` with `status = LOAD`, `fileType = POLIZA`, `month = 2`, `year = 2026`, `idUser = 10` exists
- WHEN `idUser = 10` initiates a new file import for the same `fileType`, `month`, and `year`
- THEN `FileImportService.initiateImport()` SHALL NOT block the request
- AND SHALL return the existing `FileImport` as a deduplication result (`{ created: false, fileImport: <existing> }`)
