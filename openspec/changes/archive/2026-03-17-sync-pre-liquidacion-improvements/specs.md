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
# Delta for pre-liquidacion

## MODIFIED Requirements

### Requirement: File list for pre-liquidación updated for PRE-SETTLED status

The system SHALL list file imports in the pre-liquidación module as follows:
- **Tab "Pre-liquidar"**: SHALL include files with `status = LOAD` AND `sincronizados > 0`.
- **Tab "Histórico"**: SHALL include files with `status = PRE-SETTLED` OR `status = COMPLETED`.

#### Scenario: Pre-liquidated file moves to Histórico

- GIVEN a file whose commissions have been pre-liquidated (`status` transitioned to `PRE-SETTLED`)
- WHEN the user navigates to the Pre-liquidación module
- THEN the file MUST NOT appear in the "Pre-liquidar" tab
- BUT MUST appear in the "Histórico" tab

### Requirement: Navigation to Pre-liquidation Details

The "Histórico" tab (and the "Historial" tab in Load-File) SHALL provide an "IR a PRELIQUIDACIÓN" button for files with `status = PRE-SETTLED`. This button SHALL navigate to `/dashboard/pre-liquidacion/[fileId]`.

#### Scenario: Direct navigation from Load-File History

- GIVEN a file with `status = 'PRE-SETTLED'` in the Historial de Cargas
- WHEN the user clicks "IR a PRELIQUIDACIÓN"
- THEN the system SHALL navigate to the specific pre-liquidación detail page for that file

## ADDED Requirements

### Requirement: Spanish Table Headers in Results

The results table and exports in the Pre-liquidación module MUST use Spanish headers for all columns to ensure a fully localized experience.

| English Key | Spanish Header |
|-------------|----------------|
| `SYNCHRONIZED` | SINCRONIZADOS |
| `PRE-SETTLED` | PRE-LIQUIDADOS |
| `LAG` | REZAGADOS |
| `TOTAL` | TOTAL |

#### Scenario: Table headers in Spanish

- GIVEN the user is viewing the results of a pre-liquidated file
- WHEN the summary table is rendered
- THEN headers MUST be in Spanish (e.g., "PRE-LIQUIDADOS" instead of "PRE-SETTLED")
