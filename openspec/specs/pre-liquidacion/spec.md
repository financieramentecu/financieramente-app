# Spec: Fix Pre-liquidation Visibility & Filtering

## Purpose

Ensure that synchronized files (status `LOAD`) are visible in the dashboard and that the detail view correctly filters for actionable records (`SINCRONIZADO`).

## Problem Description

1. **Visibility Bug**: Newly uploaded files are marked as `LOAD`, but the API only searches for `COMPLETADO` or `PRELIQUIDADO`.
2. **Noise in Detail**: The pre-liquidation detail view shows all records, including `LAG` and `ERROR`, which cannot be processed for commission distribution.

## Full Business Flow

```mermaid
graph TD
    subgraph "1. Carga y Sincronización"
        A[Usuario sube Excel] --> B[POST /api/carga-archivos/process-batch]
        B --> C{¿Registros Válidos?}
        C -- No --> D[Registro: ERROR]
        C -- Sí --> E{¿Existe Negocio?}
        E -- No --> F[Registro: LAG]
        E -- Sí --> G[Registro: SINCRONIZADO]
        D & F & G --> H[Archivo: LOAD]
    end

    subgraph "2. Visualización (Pre-liquidar)"
        I[Usuario abre Pre-liquidación] --> J[GET /api/pre-liquidacion/archivos]
        J --> K{Filtro de Archivos}
        K -- "IN (LOAD, PRELIQUIDADO)" --> L[Mostrar Archivo en Lista]
        L --> M[Usuario selecciona Archivo]
        M --> N[GET /api/pre-liquidacion/detalle/id]
        N --> O{Filtro de Registros}
        O -- "ONLY SINCRONIZADO" --> P[Mostrar Registros al Usuario]
        O -- "LAG / ERROR" --> Q[Ocultar registros de la vista]
    end

    subgraph "3. Pre-liquidación"
        P --> R[Clic en botón Pre-liquidar]
        R --> S[Procesar cálculos y distribuciones]
        S --> T[Archivo: PRELIQUIDADO]
        S --> U[Registros: PRELIQUIDADO]
    end
```

## Requirements

1. **FR-01**: The system SHALL include files with status `LOAD` in the `GET /api/pre-liquidacion/archivos` endpoint.
2. **FR-02**: The system SHALL filter `SettlementCommission` records to show ONLY `SINCRONIZADO` status in the pre-liquidation detail view.
3. **FR-03**: The pre-liquidation process SHALL only be available for files in `LOAD` state.

### Requirement: Pre-liquidación SHALL NOT update ClawbackBalance

The system SHALL NOT create or update `ClawbackBalance` in the pre-liquidación process. Pre-liquidación SHALL only create `Clawback` rows when the flow requires clawback persistence (Poliza CARTERA, Poliza no-CLAW, Poliza CLAW). Updating the user's general clawback balance (adding or subtracting amounts) SHALL be performed only by the liquidation process, not by pre-liquidación.

#### Scenario: Pre-liquidación does not modify ClawbackBalance

- GIVEN a registro with `commissionType === 'POLIZA'`, `isClawback === false`, and `clawbackPercentage` such that `valorClawback > 0` for at least one category
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows and one `Clawback` row per distribution with `valorClawback > 0`
- AND SHALL NOT call create, update, or findUnique on `ClawbackBalance` for any user

#### Scenario: After pre-liquidating, user ClawbackBalance unchanged

- GIVEN a user with an existing `ClawbackBalance` totalAmount equal to X
- AND at least one `SettlementCommission` for that user's business is pre-liquidated with clawback (Poliza no-CLAW, valorClawback > 0)
- WHEN pre-liquidación completes for that commission
- THEN the system SHALL have created the corresponding `Clawback` rows
- AND the same user's `ClawbackBalance.totalAmount` SHALL still be X (unchanged)

### Requirement: Pre-liquidación flow derivation

The system SHALL derive a pre-liquidación flow for each `SettlementCommission` record being processed, based only on `commissionType`, `originCommission`, and `isClawback`. The flow SHALL determine whether clawback is persisted (i.e. whether `Clawback` rows are created). In pre-liquidación the system SHALL NOT create or update `ClawbackBalance` regardless of flow; balance updates are the responsibility of the liquidation process.

- Flow **Voluntarias**: `commissionType === 'VOLUNTARIA'`.
- Flow **Poliza CLAW**: `commissionType === 'POLIZA'` AND `isClawback === true` (evaluated before CARTERA so that CARTERA + CLAW is treated as CLAW).
- Flow **Poliza CARTERA**: `commissionType === 'POLIZA'` AND `originCommission === 'CARTERA'`.
- Flow **Poliza no-CLAW**: `commissionType === 'POLIZA'` AND `isClawback === false` AND not CARTERA (or any other Poliza case not already classified).

#### Scenario: Voluntarias — no clawback persistence

- GIVEN a registro with `commissionType === 'VOLUNTARIA'`
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows with discount applied as today
- AND SHALL NOT create any `Clawback` row for that registro
- AND SHALL NOT create or update `ClawbackBalance` for any user for that registro

#### Scenario: Poliza CARTERA — clawback registered only, no balance update

- GIVEN a registro with `commissionType === 'POLIZA'`, `originCommission === 'CARTERA'`, `isClawback === false`, and `clawbackPercentage` such that `valorClawback > 0` for at least one category
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows using `porcentaje_portfolio` and apply discount and clawback
- AND SHALL create one `Clawback` row per `ComissionDistribution` that has `valorClawback > 0`, linked to that distribution and to the user who owns the business (`business.user.idUser`)
- AND SHALL NOT create or update `ClawbackBalance` for that user (balance update SHALL be done in the liquidation process)

#### Scenario: Poliza no-CLAW — clawback registered only, no balance update

- GIVEN a registro with `commissionType === 'POLIZA'`, `isClawback === false`, and `clawbackPercentage` such that `valorClawback > 0` for at least one category
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows and apply discount and clawback
- AND SHALL create one `Clawback` row per `ComissionDistribution` with `valorClawback > 0`, linked to that distribution and to `business.user.idUser`
- AND SHALL NOT create or update `ClawbackBalance` for that user (balance update SHALL be done in the liquidation process)

#### Scenario: Poliza CLAW — clawback registered only, no balance update

- GIVEN a registro with `commissionType === 'POLIZA'` AND `isClawback === true` (clawback percentage on the record is zero; amount is taken from the user's general clawback balance)
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows (distribute by category; discount applied; clawback percentage 0 on record)
- AND SHALL compute the amount to debit from the user's clawback balance as follows: for each category, `valorComisionBruta * activeClawbackPercentage` (where `activeClawbackPercentage` is the active CommissionDiscount for type CLAWBACK, or a defined fallback if none); the total debit SHALL be the sum over all categories
- AND SHALL create one `Clawback` row per `ComissionDistribution` with `valueClawback` equal to that category's share of the total debit, linked to that distribution and to `business.user.idUser`
- AND SHALL NOT create or update `ClawbackBalance` for that user in pre-liquidación (balance subtraction SHALL be done in the liquidation process)

#### Scenario: Poliza CARTERA + CLAW — treated as Poliza CLAW

- GIVEN a registro with `commissionType === 'POLIZA'`, `originCommission === 'CARTERA'`, and `isClawback === true`
- WHEN the system derives the flow for that registro
- THEN the flow SHALL be Poliza CLAW, not Poliza CARTERA

### Requirement: Clawback row and balance user

The system SHALL associate each `Clawback` row with the user who owns the business of the commission record. The user SHALL be the agent: `business.user.idUser` (the business owner). The system MUST NOT use the file uploader or any other user for Clawback. In pre-liquidación the system SHALL NOT perform any `ClawbackBalance` create or update, so no balance row is associated with pre-liquidación; the liquidation process will associate balance updates with the same user when it runs.

#### Scenario: Clawback linked to business owner

- GIVEN a registro with `business.user.idUser === 42`
- WHEN the system creates a `Clawback` row for that registro
- THEN `Clawback.idUser` SHALL be 42
- AND the system SHALL NOT create or update a `ClawbackBalance` row in pre-liquidación

### Requirement: Clawback initial state and balance atomicity

When creating a `Clawback` row, the system SHALL set `state` to `'RETENIDO'`. The system SHALL perform all persistence for a single `SettlementCommission` (all `ComissionDistribution` creates, all `Clawback` creates when applicable, and the `SettlementCommission` status update to `PRE-SETTLED`) within a single transactional boundary so that either all of these writes succeed or none do. The system SHALL NOT include any `ClawbackBalance` create or update in this transaction.

#### Scenario: Transaction rollback on failure

- GIVEN a registro being processed and the transaction has created at least one `ComissionDistribution` and is about to create a `Clawback`
- WHEN the creation of a `Clawback` row fails (e.g. constraint or DB error)
- THEN the entire transaction for that registro SHALL be rolled back
- AND no `ComissionDistribution` for that registro SHALL remain
- AND the `SettlementCommission` SHALL NOT be updated to `PRE-SETTLED`

#### Scenario: Idempotency — only SYNCHRONIZED processed

- GIVEN a `SettlementCommission` with status `PRE-SETTLED` or any status other than `SYNCHRONIZED`
- WHEN pre-liquidación runs for the same file and date range
- THEN the system SHALL NOT process that record again (it SHALL only select records with status `SYNCHRONIZED`)
- AND SHALL NOT create duplicate `Clawback` rows for the same `ComissionDistribution` (enforced by unique constraint on `idComissionDistribution`)

### Requirement: No clawback persistence when valorClawback is zero (Poliza non-CLAW)

Unchanged in effect: when `valorClawback` is zero for every category, the system SHALL NOT create any `Clawback` row and SHALL NOT update `ClawbackBalance` for that registro. (In pre-liquidación the system never updates ClawbackBalance in any case.)

#### Scenario: Poliza with zero clawback percentage

- GIVEN a registro with `commissionType === 'POLIZA'`, `isClawback === false`, and `clawbackPercentage === 0`
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows only
- AND SHALL NOT create `Clawback` rows
- AND SHALL NOT create or update `ClawbackBalance`

### Requirement: Pre-liquidación data access for flow and user

The system SHALL load, when fetching `SettlementCommission` records for pre-liquidación, the fields `commissionType`, `originCommission`, and `isClawback`, and SHALL include the related `business` with its `user` (so that `business.user.idUser` is available). This data SHALL be sufficient to derive the flow and to associate each `Clawback` row with the correct user without further queries inside the transaction. No `ClawbackBalance` operations are performed in pre-liquidación, so no additional data for balance updates is required.

#### Scenario: Query includes business and user

- GIVEN the pre-liquidación process fetches registros for a file and date range
- WHEN the query is executed
- THEN each returned record SHALL include `commissionType`, `originCommission`, `isClawback`, and `business` with `user` (at least `idUser`)
- AND the service SHALL NOT need to query `User` or `Business` again inside the per-registro transaction to create Clawback rows

### Requirement: Pre-liquidación results and export use PRE-SETTLED state

The system SHALL use the canonical state value `PRE-SETTLED` when querying pre-liquidated commission records for historial (results) and export. Any API that returns or filters by pre-liquidated commissions SHALL filter `SettlementCommission` by `status === 'PRE-SETTLED'` and SHALL NOT use any other string (e.g. `PRELIQUIDADO`) for that filter.

#### Scenario: Historial results return data after pre-liquidating

- GIVEN a file has been pre-liquidated and at least one `SettlementCommission` has status `PRE-SETTLED`
- WHEN the client requests results for that file (e.g. GET pre-liquidación resultados for that fileId)
- THEN the system SHALL return those commission records with status `PRE-SETTLED`
- AND the response SHALL include the expected distributions and metadata so the historial tab shows data

#### Scenario: Export returns data after pre-liquidating

- GIVEN a file has been pre-liquidated and at least one `SettlementCommission` has status `PRE-SETTLED`
- WHEN the client requests export for that file (e.g. POST pre-liquidación exportar for that fileId)
- THEN the system SHALL include those commission records with status `PRE-SETTLED` in the export
- AND the export SHALL NOT be empty due to a status filter mismatch

### Requirement: File list for pre-liquidación includes pending and pre-liquidated files

The system SHALL list file imports available for pre-liquidación (e.g. for the pre-liquidación screen) such that: (1) a file SHALL appear if it has at least one `SettlementCommission` with status `SYNCHRONIZED` OR at least one with status `PRE-SETTLED`; (2) for each file, the system SHALL expose a live count of commissions with status `SYNCHRONIZED` (sincronizados) and a live count with status `PRE-SETTLED` (registrosPreliquidados). The UI "Pendientes" tab SHALL use sincronizados > 0 to show files that can still be pre-liquidated; the "Histórico" tab SHALL use registrosPreliquidados > 0 to show files that have pre-liquidated records.

#### Scenario: Pre-liquidated file remains in list

- GIVEN a file whose commissions have all been pre-liquidated (all `SettlementCommission` records for that file have status `PRE-SETTLED`)
- WHEN the client requests the list of files for pre-liquidación
- THEN the system SHALL include that file in the list
- AND the file SHALL have registrosPreliquidados equal to the number of PRE-SETTLED commissions for that file
- AND the file SHALL appear in the "Histórico" tab when the UI filters by registrosPreliquidados > 0

#### Scenario: Pending file shows correct counts

- GIVEN a file that has at least one `SettlementCommission` with status `SYNCHRONIZED` and none with status `PRE-SETTLED`
- WHEN the client requests the list of files for pre-liquidación
- THEN the system SHALL include that file in the list
- AND sincronizados SHALL equal the count of SYNCHRONIZED commissions for that file
- AND registrosPreliquidados SHALL be 0
- AND the file SHALL appear in the "Pendientes" tab when the UI filters by sincronizados > 0

#### Scenario: File with both pending and pre-liquidated records

- GIVEN a file that has at least one `SettlementCommission` with status `SYNCHRONIZED` and at least one with status `PRE-SETTLED`
- WHEN the client requests the list of files for pre-liquidación
- THEN the system SHALL include that file in the list
- AND sincronizados SHALL equal the count of SYNCHRONIZED commissions
- AND registrosPreliquidados SHALL equal the count of PRE-SETTLED commissions
- AND the file MAY appear in both Pendientes and Histórico depending on UI logic (e.g. show in both or in the tab that matches the user's intent)

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

---

### Requirement: Detail page for SYNCHRONIZED records

The system SHALL provide a detail page at route `/dashboard/pre-liquidacion/[fileId]` that lists only `SettlementCommission` records with status `SYNCHRONIZED` for the given `FileImport`. The page SHALL support row-level checkbox selection and a select-all control, with the **checkbox column as the first (leftmost) column**. The system SHALL display a section header above the table by `fileType` (e.g. "PRELIQUIDACIÓN VOLUNTARIA" when `fileType === 'VOLUNTARIA'`, "PRELIQUIDACIÓN POLIZA" otherwise). The system SHALL display column sets that differ by the file's `fileType` **without** a "Tipo" or "Tipo Comisión" column: VOLUNTARIA columns in order (Checkbox, Contrato, Nombre Asesor, Monto, Base Comisión, Fecha Inicio, Fecha Fin, % Descuento, Rezagado, Fecha Sincronización, Acciones) and POLIZA columns in order (Checkbox, Contrato, Nombre Asesor, Monto, Base Comisión, % Descuento, % Clawback, Es Clawback, Rezagado, Fecha Sincronización, Fecha Rezagado, Acciones). The system SHALL expose a "Ver Negocio" row action that opens a business detail modal; when the business status is EMITIDO, the modal SHALL allow editing the client origin from the modal (label on load, "Editar origen" in footer, then Select and Guardar) per the requirement "Edit client origin from Ver Negocio modal when EMITIDO".

#### Scenario: User opens detail page and sees SYNCHRONIZED records only

- GIVEN a `FileImport` with id `fileId` that has at least one `SettlementCommission` with status `SYNCHRONIZED` and some with status `LAG` or `PRE-SETTLED`
- WHEN an authorized user navigates to `/dashboard/pre-liquidacion/[fileId]`
- THEN the system SHALL return only records with status `SYNCHRONIZED` for that file
- AND the table SHALL display the correct column set according to the file's `fileType` (VOLUNTARIA or POLIZA)
- AND the checkbox column SHALL be the first column (leftmost)
- AND a section header SHALL indicate the file type (e.g. PRELIQUIDACIÓN VOLUNTARIA or PRELIQUIDACIÓN POLIZA)

#### Scenario: User selects rows and opens Ver Negocio

- GIVEN the detail page is displayed with at least one row
- WHEN the user clicks the "Ver Negocio" action on a row that has an associated business
- THEN the system SHALL open a business detail modal for that business
- AND the modal SHALL show all information in labels (read-only) on load, including the current client origin as a label
- AND when the business status is EMITIDO, the modal footer SHALL show an "Editar origen" button next to "Cerrar" so the user can edit the client origin from the modal

#### Scenario: Select-all and row checkbox control selection

- GIVEN the detail page is displayed with multiple rows
- WHEN the user checks the header "select-all" checkbox
- THEN all visible rows SHALL be selected
- WHEN the user unchecks one row
- THEN that row SHALL be deselected and the select-all SHALL reflect partial selection
- AND the bulk action bar SHALL enable "Liquidar" and "Rezagar" only when at least one row is selected

---

### Requirement: API returning SYNCHRONIZED records for the detail page

The system SHALL provide an API (e.g. `GET /api/pre-liquidacion/registros/[fileId]`) that returns only `SettlementCommission` records with status `SYNCHRONIZED` for the given file. The response SHALL include a flat list of records with all fields required to render the detail table (e.g. contrato, nombreAsesor, tipo/descripcion, monto, baseComision, porcentajeDescuento, porcentajeClawback, esClawback, esRezagado, fechaSincronizacion, fechaRezagado, fechaInicio, fechaFin) and SHALL include file metadata (idFileImport, nombreArchivo, fileType, usuarioCargo, fechaCarga, totalRegistros, sincronizados) so the UI can render the page header and choose the column set by `fileType`.

#### Scenario: Client requests registros for a file

- GIVEN a file with id `fileId` and at least one SYNCHRONIZED record
- WHEN the client sends GET to the registros endpoint for that `fileId`
- THEN the response SHALL contain only records with status `SYNCHRONIZED`
- AND each record SHALL include the flat field set required for both VOLUNTARIA and POLIZA column sets
- AND the response SHALL include archivo metadata including `fileType`

#### Scenario: File with no SYNCHRONIZED records

- GIVEN a file with id `fileId` and zero `SettlementCommission` records with status `SYNCHRONIZED`
- WHEN the client sends GET to the registros endpoint for that `fileId`
- THEN the response SHALL include an empty list of registros
- AND the archivo metadata SHALL still be present so the UI can show the file name and state

---

### Requirement: Bulk Liquidar action (SYNCHRONIZED → SETTLED)

The system SHALL allow an authorized user to select one or more rows on the detail page and trigger a "Liquidar" action. The system SHALL transition only those selected records that currently have status `SYNCHRONIZED` to status `SETTLED` within a single transactional boundary. Records that are not `SYNCHRONIZED` (e.g. already `SETTLED` or `LAG`) SHALL be skipped and SHALL NOT be updated. After the transition, if the count of remaining `SYNCHRONIZED` records for that file is zero, the system SHALL set the `FileImport.status` to `COMPLETED` within the same transaction. The system SHALL NOT create or update `ClawbackBalance` in this action; that responsibility remains with the liquidaciones feature.

#### Scenario: User liquidates selected records

- GIVEN the user has selected three rows on the detail page, all with status `SYNCHRONIZED`
- WHEN the user confirms "Liquidar" in the confirmation dialog
- THEN the system SHALL update those three records to status `SETTLED` in a single transaction
- AND SHALL return the number of records actually transitioned (e.g. 3)
- AND SHALL NOT update any record that was not in the selection or that was not `SYNCHRONIZED`

#### Scenario: File completes when last SYNCHRONIZED record is liquidated

- GIVEN a file has exactly five `SettlementCommission` records, all with status `SYNCHRONIZED`
- WHEN the user selects all five and confirms "Liquidar"
- THEN the system SHALL set all five to status `SETTLED`
- AND SHALL set that file's `FileImport.status` to `COMPLETED` in the same transaction
- AND the API response SHALL indicate `fileCompleted: true` so the UI can show a completion message or offer navigation

#### Scenario: File not completed when some SYNCHRONIZED remain

- GIVEN a file has ten `SettlementCommission` records with status `SYNCHRONIZED`
- WHEN the user selects three and confirms "Liquidar"
- THEN the system SHALL set only those three to status `SETTLED`
- AND SHALL NOT set `FileImport.status` to `COMPLETED` because seven SYNCHRONIZED records remain
- AND the API response SHALL indicate `fileCompleted: false`

#### Scenario: Non-SYNCHRONIZED ids in request are skipped

- GIVEN the user selects two rows: one with status `SYNCHRONIZED` and one already `SETTLED` (e.g. due to a prior partial liquidation)
- WHEN the user confirms "Liquidar"
- THEN the system SHALL update only the record that is still `SYNCHRONIZED`
- AND SHALL return `liquidated: 1`
- AND SHALL NOT throw an error; silent skip is acceptable

---

### Requirement: Bulk Rezagar action (SYNCHRONIZED → LAG)

The system SHALL allow an authorized user to select one or more rows on the detail page and trigger a "Rezagar" action. The system SHALL transition only those selected records that currently have status `SYNCHRONIZED` to status `LAG`, set `isLag` to true and `lagDate` to the current date, within a single transactional boundary. Records that are not `SYNCHRONIZED` SHALL be skipped. The system SHALL NOT update `FileImport.status` when rezagar is performed; only the full liquidation path (zero SYNCHRONIZED remaining) sets `FileImport.status` to `COMPLETED`.

#### Scenario: User rezaga selected records

- GIVEN the user has selected two rows on the detail page, both with status `SYNCHRONIZED`
- WHEN the user confirms "Rezagar" in the confirmation dialog
- THEN the system SHALL update those two records to status `LAG`, `isLag = true`, and `lagDate = now()` in a single transaction
- AND SHALL return the number of records actually transitioned (e.g. 2)
- AND SHALL NOT change `FileImport.status`

#### Scenario: Rezagar does not complete the file

- GIVEN a file has five `SettlementCommission` records, all `SYNCHRONIZED`
- WHEN the user selects all five and confirms "Rezagar"
- THEN the system SHALL set all five to status `LAG` with `lagDate` set
- AND SHALL NOT set `FileImport.status` to `COMPLETED` (Rezagar never triggers COMPLETED)

---

### Requirement: Audit logging for Liquidar and Rezagar

The system SHALL write an audit log entry after each successful Liquidar operation with action `COMMISSION_SETTLED` and SHALL include in the details the list of record ids and the file id. The system SHALL write an audit log entry after each successful Rezagar operation with action `COMMISSION_LAGGED` and SHALL include in the details the list of record ids. Audit logging SHALL NOT block the API response (e.g. fire-and-forget with error handling).

#### Scenario: Audit log created after Liquidar

- GIVEN an authorized user successfully liquidates records with ids `[1, 2, 3]` for file `fileId = 5`
- WHEN the liquidar API completes successfully
- THEN an audit log entry SHALL be created with action `COMMISSION_SETTLED` and details containing `ids` and `fileId`
- AND the API response SHALL have been returned without waiting for the audit write

#### Scenario: Audit log created after Rezagar

- GIVEN an authorized user successfully rezaga records with ids `[4, 5]`
- WHEN the rezagar API completes successfully
- THEN an audit log entry SHALL be created with action `COMMISSION_LAGGED` and details containing `ids`

---

### Requirement: Authorization for detail page and bulk actions

The system SHALL allow access to the detail page and to the registros, liquidar, and rezagar APIs only for users with role `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, or `ANALISTA_SOPORTE`. The role `ANALISTA_SOPORTE` SHALL have the permission `liquidaciones.preliquidacion` set to true so that they can access the pre-liquidación section, the new detail page, and the new endpoints under the same role checks as the other two roles.

#### Scenario: ANALISTA_SOPORTE can access detail page and actions

- GIVEN the user is authenticated with role `ANALISTA_SOPORTE` and permissions grant `liquidaciones.preliquidacion`
- WHEN the user navigates to `/dashboard/pre-liquidacion/[fileId]` or calls GET registros, POST liquidar, or POST rezagar
- THEN the system SHALL allow the request and return data or perform the action according to the other requirements
- AND SHALL NOT deny access solely due to role

#### Scenario: Unauthorized role cannot call new endpoints

- GIVEN the user is authenticated with a role other than `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, or `ANALISTA_SOPORTE`
- WHEN the user calls GET `/api/pre-liquidacion/registros/[fileId]`, POST `/api/pre-liquidacion/liquidar`, or POST `/api/pre-liquidacion/rezagar`
- THEN the system SHALL deny the request (e.g. 403) and SHALL NOT return registros or perform Liquidar/Rezagar

---

### Requirement: Navigation to detail from file list

The pre-liquidación file list (e.g. the component that lists available files for pre-liquidación) SHALL provide a way to navigate to the detail page for a given file so that users can perform per-record Liquidar and Rezagar actions. For example, a "Ver Detalle" button or link SHALL navigate to `/dashboard/pre-liquidacion/[fileId]` for the selected file.

#### Scenario: User navigates from file list to detail

- GIVEN the user is on the pre-liquidación screen and sees a file with at least one SYNCHRONIZED record
- WHEN the user clicks "Ver Detalle" (or equivalent) for that file
- THEN the application SHALL navigate to `/dashboard/pre-liquidacion/[fileId]` for that file's id
- AND the detail page SHALL load and display the SYNCHRONIZED records for that file

---

### Requirement: File metadata includes fileType for column set

The system SHALL expose `fileType` for each file in the pre-liquidación file list and in the registros response so that the detail page can choose the correct column set (VOLUNTARIA vs POLIZA). The type `ArchivoDisponible` (or equivalent) SHALL include a `fileType` field; the service that returns the list of files for pre-liquidación SHALL include `fileType` in the query and in the returned data.

#### Scenario: Detail page receives fileType and renders correct columns

- GIVEN a file with `fileType = 'POLIZA'`
- WHEN the client fetches the registros for that file
- THEN the response SHALL include archivo.fileType equal to `'POLIZA'`
- AND the UI SHALL render the POLIZA column set (including % Clawback, Es Clawback, Fecha Rezagado)

#### Scenario: VOLUNTARIA file shows VOLUNTARIA columns

- GIVEN a file with `fileType = 'VOLUNTARIA'`
- WHEN the client fetches the registros for that file
- THEN the response SHALL include archivo.fileType equal to `'VOLUNTARIA'`
- AND the UI SHALL render the VOLUNTARIA column set (including Fecha Inicio, Fecha Fin)

---

### Requirement: Edit client origin from Ver Negocio modal when EMITIDO

When the "Ver Negocio" modal is opened from the pre-liquidación detail page and the business has status EMITIDO, the system SHALL allow the user to change the client origin from within the modal without navigating to the business edit page. On load, the origin SHALL be displayed as a label (read-only). The modal footer SHALL show an "Editar origen" button next to "Cerrar" only when the business status is EMITIDO. When the user clicks "Editar origen", the origin label SHALL be replaced by a Select with the list of active client origins and the footer SHALL show "Guardar" and "Cerrar". When the user selects a different origin and clicks "Guardar", the system SHALL persist the new `idClientOrigin` (e.g. via `PUT /api/negocios/[id]` with body `{ idClientOrigin }`) and SHALL refresh the business data so the modal returns to label view with the updated origin. The backend SHALL accept updates of only `idClientOrigin` when the business status is EMITIDO.

#### Scenario: Modal loads with origin as label and Editar origen in footer when EMITIDO

- GIVEN the user opened "Ver Negocio" from the pre-liquidación detail page for a business with status EMITIDO
- WHEN the modal is displayed
- THEN the current client origin SHALL be shown as a label (text)
- AND the modal footer SHALL show "Editar origen" next to "Cerrar"
- AND the modal SHALL NOT show a Select for origin until the user clicks "Editar origen"

#### Scenario: Clicking Editar origen shows Select and Guardar in footer

- GIVEN the Ver Negocio modal is open for an EMITIDO business and the origin is shown as a label
- WHEN the user clicks "Editar origen"
- THEN the origin label SHALL be replaced by a Select with the list of active client origins, pre-selected with the current origin
- AND the footer SHALL show "Guardar" and "Cerrar" (and SHALL NOT show "Editar origen" while in edit mode)
- AND "Guardar" SHALL be enabled only when the user has selected a different origin value

#### Scenario: User saves new origin and modal returns to label view

- GIVEN the user is in edit mode (Select visible) and has selected a different client origin
- WHEN the user clicks "Guardar"
- THEN the system SHALL send an update request (e.g. PUT with `idClientOrigin`) and SHALL persist the change for that business
- AND the modal SHALL refresh the business data and SHALL return to the initial view: origin as label and footer with "Editar origen" and "Cerrar"
- AND the label SHALL display the newly saved origin name

#### Scenario: Non-EMITIDO business does not show Editar origen

- GIVEN the user opened "Ver Negocio" for a business with status other than EMITIDO (e.g. VENTA_EFECTUADA or CANCELADO)
- WHEN the modal is displayed
- THEN the origin SHALL be shown as a label only
- AND the footer SHALL NOT show "Editar origen", only "Cerrar"

---

### Requirement: Detail Page Lists PRE-SETTLED Commissions

(Supersedes the SYNCHRONIZED-only filter in "Requirement: Detail page for SYNCHRONIZED records" above for the primary detail view query. The detail page at `/dashboard/pre-liquidacion/[fileId]` now queries `SettlementCommission` where `status = 'PRE-SETTLED'` for the given `fileId`.)

The detail page MUST query `SettlementCommission` where `status = 'PRE-SETTLED'` for the given `fileId`.

Column headers and empty-state copy MUST clearly indicate that the shown records are in PRE-SETTLED status.

#### Scenario: Detail page shows PRE-SETTLED records

- GIVEN a user navigates to `/dashboard/pre-liquidacion/[fileId]`
- WHEN the page loads
- THEN only commissions with `status = 'PRE-SETTLED'` are displayed in the table

#### Scenario: No PRE-SETTLED records exist for the file

- GIVEN a `fileId` that has zero PRE-SETTLED commissions
- WHEN the detail page loads
- THEN an empty state is shown with copy indicating no pre-settled commissions are available

---

### Requirement: New Service Function for PRE-SETTLED Query

The `pre-liquidacion.service.ts` MUST expose `obtenerComisionesPreliquidadas(fileImportId: number)` that returns all `SettlementCommission` records where `status = 'PRE-SETTLED'` and `fileImportId` matches.

#### Scenario: Returns correct records

- GIVEN `fileImportId = 7` with three PRE-SETTLED commissions
- WHEN `obtenerComisionesPreliquidadas(7)` is called
- THEN exactly those three records are returned

#### Scenario: Returns empty array when none exist

- GIVEN `fileImportId = 99` with no PRE-SETTLED commissions
- WHEN `obtenerComisionesPreliquidadas(99)` is called
- THEN an empty array is returned (no error thrown)

---

## Technical Design

- **API Archivos**: Modify `src/app/api/pre-liquidacion/archivos/route.ts` Prisma query.
- **Service Detail**: Modify `obtenerDetallePreLiquidacion` in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` to change the `where` clause for records.
- **Detail page**: `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` — Client Component, orchestrates RegistrosLiquidacionTable + BarraAccionesLiquidacion.
- **New API endpoints**: GET `/api/pre-liquidacion/registros/[fileId]`, POST `/api/pre-liquidacion/liquidar`, POST `/api/pre-liquidacion/rezagar`.
- **New service functions**: `obtenerRegistrosParaLiquidacion`, `liquidarRegistros`, `rezagarRegistros` in `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`.
- **New types**: `RegistroLiquidacionDetalle`, `RespuestaRegistrosLiquidacion` in `src/features/pre-liquidacion/types/types.ts`.
- **Audit actions**: `COMMISSION_SETTLED`, `COMMISSION_LAGGED` added to `src/features/auth/lib/audit-logger.ts`.
- **Permissions**: `ANALISTA_SOPORTE.liquidaciones.preliquidacion = true` in `src/features/auth/lib/permissions.ts`.
- **Ver Negocio / Edit origin**: `BusinessViewModal` extended with `allowEditOrigin`/`clientOriginsOptions`/`onSaveOrigin`; PUT `/api/negocios/[id]` accepts `idClientOrigin` when business status is EMITIDO.
