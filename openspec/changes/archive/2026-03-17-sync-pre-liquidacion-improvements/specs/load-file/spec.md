# Delta for load-file

## MODIFIED Requirements

### Requirement: Block Pre-liquidated or Completed Periods

The system SHALL reject a new sync attempt if a `FileImport` with `status = COMPLETED` OR `status = PRE-SETTLED` exists for the same `fileType`, `month`, `year`, and `idUser`. The rejection MUST occur before any new record is created. The API route SHALL return HTTP 409.
(Previously: only blocked `COMPLETED` status).

#### Scenario: Sync blocked when period is pre-settled

- GIVEN a `FileImport` with `status = PRE-SETTLED`, `fileType = POLIZA`, `month = 2`, `year = 2026`, `idUser = 10` exists
- WHEN the same user initiates an import with `fileType = POLIZA`, `month = 2`, `year = 2026`
- THEN the system SHALL return HTTP 409
- AND the response body SHALL contain `{ data: null, error: "Período en pre-liquidación" }`

## ADDED Requirements

### Requirement: Status Labels Localization (Spanish UI)

The system MUST display all `FileImport` status values in the UI using Spanish labels. This mapping MUST apply to the Status Badge and the Status Filter in `HistorialCargasTab`.

| English Status | Spanish Label | Color/Style |
|----------------|---------------|-------------|
| `LOAD` | Cargado | Blue |
| `PROCESSING` | Procesando | Orange |
| `PRE-SETTLED` | Pre-liquidado | Purple |
| `COMPLETED` | Liquidado | Green |
| `ERROR` | Error | Red |

#### Scenario: Status displayed in Spanish

- GIVEN a `FileImport` with `status = 'PRE-SETTLED'`
- WHEN rendered in `HistorialCargasTab`
- THEN the badge MUST show the text "Pre-liquidado"
