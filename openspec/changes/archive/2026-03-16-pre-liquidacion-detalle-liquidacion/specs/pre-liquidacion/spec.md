# Delta for Pre-liquidación — Detalle con Liquidar/Rezagar por Registro

This delta adds a per-record detail view and bulk actions (Liquidar → SETTLED, Rezagar → LAG) for SYNCHRONIZED `SettlementCommission` records, without changing the existing pre-liquidación flow (SYNCHRONIZED → PRE-SETTLED).

---

## ADDED Requirements

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

## MODIFIED Requirements

None. The existing pre-liquidación flow (SYNCHRONIZED → PRE-SETTLED via bulk "Pre-liquidar") and all existing requirements (Clawback, file list, blocking re-sync on COMPLETED, etc.) remain unchanged.

---

## REMOVED Requirements

None.
