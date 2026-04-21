# Capability: Negocios

## Purpose
Gestionar la creación, edición y visualización de los negocios (vouchers/comisiones) dentro de la plataforma, asegurando que la información capturada sea precisa y clara para los agentes.

## Requirements

### Requirement: Simplificación de Textos de Ayuda y Opciones de Moneda
El sistema debe reducir la carga cognitiva y confusión del usuario en el formulario de creación de negocios mediante la limpieza y precisión de los textos informativos.

#### Scenario: Eliminar mensaje de negocios internacionales
- **WHEN** El usuario se encuentra en la sección de información del producto del formulario "Crear Negocio".
- **THEN** No debe visualizarse el mensaje de ayuda: "Si estas registrado a un negocio internacional elige el nombre del producto...".

#### Scenario: Renombrar opción de Moneda USD
- **WHEN** El usuario despliega el selector de "Moneda" en el formulario "Crear Negocio".
- **THEN** La opción correspondiente al Dólar Americano debe mostrarse con la etiqueta "Moneda Extranjera".

#### Scenario: Actualizar mensaje de ayuda del campo Valor
- **WHEN** El usuario visualiza la sección "Información del negocio" en el formulario "Crear Negocio".
- **THEN** El texto informativo sobre el valor del negocio debe decir: "Recuerde que el campo Valor debe ser equivalente al valor de la prima por 12".
- **AND** Se omiten las referencias previas a "Crea Patrimonio de Skandia" y otras condiciones específicas.


### Requirement: Edit client origin from Ver Negocio modal when EMITIDO

The system SHALL display a confirmation alert before persisting the new client origin if the business is in `EMITIDO` state. The alert MUST warn the user that commissions will be recalculated. If accepted, the system SHALL call the update API.
(Previously: The system saved the origin immediately without alerting about recalculation.)

#### Scenario: User saves new origin and accepts recalculation warning

- GIVEN the user is in edit mode (Select visible) and has selected a different client origin for a business in EMITIDO state
- WHEN the user clicks "Guardar"
- THEN the system SHALL display an alert warning that commissions will be recalculated
- WHEN the user confirms the alert
- THEN the system SHALL send the update request to change `idClientOrigin`
- AND the modal SHALL return to the label view showing the new origin

#### Scenario: User cancels origin change at the warning

- GIVEN the user is in edit mode and has selected a different client origin
- WHEN the user clicks "Guardar"
- THEN the system SHALL display an alert warning that commissions will be recalculated
- WHEN the user cancels or dismisses the alert
- THEN the system SHALL NOT send the update request
- AND the modal SHALL remain in edit mode or revert the selection without saving

### Requirement: Migración a DataTable Unificado
La tabla de negocios debe dejar de usar el componente manual y migrar al nuevo `DataTable` estándar.

#### Scenario: Transición Visual
- **WHEN** Se navega a la sección de Negocios.
- **THEN** Se debe ver la misma información actual (Cliente, Monto, Estado, etc.) pero renderizada mediante el nuevo `DataTable`.

#### Scenario: Funcionalidad de Acciones
- **WHEN** El usuario tiene permisos de edición o cancelación.
- **THEN** Los botones correspondientes deben aparecer en la columna de Acciones inyectada mediante el prop `actions`.
---

### Requirement: COMISIONANDO is a valid business status

The system MUST accept `COMISIONANDO` in types, API validation, and filters.

#### Scenario: Validation passes

- GIVEN `status=COMISIONANDO`
- WHEN validated
- THEN validation SHALL succeed

---

### Requirement: Liquidación advances linked negocio from FONDEADO to LIQUIDADO

When commission liquidation (Liquidar) completes settlement for linked businesses, the system MUST set a linked business to `LIQUIDADO` only if its current status is `FONDEADO`. The system MUST NOT promote from `EMITIDO` directly to `LIQUIDADO` in this settlement step. The canonical lifecycle is **`EMITIDO` → `FONDEADO` → `LIQUIDADO`**.

#### Scenario: Fondeado becomes liquidado after settle

- **GIVEN** a business linked to the settled commissions with `status` `FONDEADO`
- **WHEN** the settlement transaction applies the business status update
- **THEN** that business MUST end with `status` `LIQUIDADO`

#### Scenario: Emitido unchanged by settle

- **GIVEN** a business with `status` `EMITIDO` (not yet fondeado)
- **WHEN** the same settlement flow runs its business update
- **THEN** that business MUST remain `EMITIDO` (the conditional update MUST NOT match it)

---

### Requirement: COMISIONANDO in business list UI

Until legacy data is migrated, the system SHOULD still indicate `COMISIONANDO` when the API returns that status so rows are not blank. The renewed status filter MUST NOT offer `COMISIONANDO` as a filter option (see **Renewed list status filter options**).

(Previously: The system SHOULD show a `COMISIONANDO` badge in business lists.)

#### Scenario: Legacy COMISIONANDO row

- **GIVEN** API returns `COMISIONANDO` before migration completes
- **WHEN** the principal list renders the row
- **THEN** a status indicator MUST appear

---

### Requirement: LIQUIDADO visible in principal business list

The system MUST present `LIQUIDADO` as its own status when the canonical business list API returns that status. In the product lifecycle, `LIQUIDADO` is the terminal state after **`EMITIDO` → `FONDEADO` → `LIQUIDADO`**; commission settlement MUST only promote businesses already in **`FONDEADO`** to `LIQUIDADO` (see **pre-liquidación** spec: settlement business status).

#### Scenario: Distinct from other terminals

- **GIVEN** a business whose API status is `LIQUIDADO`
- **WHEN** the principal list renders the row
- **THEN** the status MUST NOT be shown as `CANCELADO`, `EMITIDO`, or `FONDEADO`

---

### Requirement: Renewed list status filter options

The principal business-list status filter MUST include `LIQUIDADO` as a selectable value. The filter MUST NOT include `COMISIONANDO` as a selectable value.

#### Scenario: LIQUIDADO selectable

- **GIVEN** the user opens the status filter on the principal list
- **WHEN** they inspect the options
- **THEN** a choice corresponding to `LIQUIDADO` MUST be available

#### Scenario: COMISIONANDO not in filter

- **GIVEN** the user opens the status filter on the principal list
- **WHEN** they inspect the options
- **THEN** `COMISIONANDO` MUST NOT appear as a filter choice

---

### Requirement: Accurate canceled presentation in list

For rows backed by canonical list API data, the system MUST NOT show the business as canceled unless the API status is `CANCELADO`.

#### Scenario: Non-canceled API status

- **GIVEN** API status is not `CANCELADO`
- **WHEN** the row is rendered in the principal list
- **THEN** the status MUST NOT read as canceled

#### Scenario: Unknown or unmapped status

- **GIVEN** API returns a status value not yet mapped to a presentation label
- **WHEN** the row is rendered
- **THEN** the system MUST NOT label it as `Cancelado` by default

---

### Requirement: Creation date column header

The column that shows business creation time on the principal list MUST use a header that clearly denotes creation (equivalent to «Fecha creación»), not a generic single-word date header alone.

#### Scenario: Header wording

- **GIVEN** the principal business list table is visible
- **WHEN** column headers render
- **THEN** the creation-time column header MUST convey “creation” explicitly

---

### Requirement: Status presentation parity list and detail

For the same API status code, the principal list and business detail/modal views MUST use the same status labeling semantics (same human-readable label for that code).

#### Scenario: Same code, same label

- **GIVEN** the same API status code on a list row and on the detail/modal view
- **WHEN** both surfaces render
- **THEN** the visible status label MUST match between them

---

### Requirement: Annual installments persisted on create when periodicity is Anual

When the purchase periodicity is **Anual** (catalog name `Anual`) and the business **term** is a positive integer **n** within **1…25**, the system **MUST** persist **exactly n** annual installment records for that business at creation time.

#### Scenario: Anual with term n creates n rows

- **GIVEN** periodicity resolves to **Anual** and **term = n** with **1 ≤ n ≤ 25**
- **WHEN** business creation succeeds
- **THEN** **n** installment records **MUST** exist for that `id_business`
- **AND** each **MUST** have `installment_index` in **1…n** with **no duplicates** per business

#### Scenario: Non-Anual creates no annual installment rows

- **GIVEN** periodicity is **not** Anual (or unspecified)
- **WHEN** business creation succeeds
- **THEN** **zero** annual installment records **MUST** exist for that business

### Requirement: Initial annual installment row state

Each annual installment row created at business creation **MUST** start with status **SIN_FONDEAR** and **MUST** have **no** funding date recorded (`date_anchored` absent/null) until a future process sets it.

#### Scenario: Initial state after create

- **GIVEN** **Anual** with term **n** and successful create
- **WHEN** installment rows are read
- **THEN** each row **SHALL** have status **SIN_FONDEAR**
- **AND** **SHALL NOT** have a funding timestamp

### Requirement: Term mandatory for Anual create

If periodicity is **Anual**, the system **MUST NOT** complete business creation without a valid **term** (positive integer). The user **SHALL** receive a clear validation error.

#### Scenario: Anual without term rejected

- **GIVEN** periodicity is **Anual** and **term** is missing or invalid
- **WHEN** create is attempted
- **THEN** creation **MUST** fail
- **AND** **no** business **nor** installment rows **MUST** be persisted

### Requirement: Term upper bound aligned UI and server

Business **term** **MUST NOT** exceed **25**. Client and server validation **SHALL** enforce the same maximum.

#### Scenario: Term above 25 rejected

- **GIVEN** **term** is greater than **25**
- **WHEN** create is attempted
- **THEN** validation **MUST** fail
- **AND** **no** business **nor** installment rows **MUST** be persisted

### Requirement: User-visible labels for installment status

When annual installment **status** is shown in the product UI (including future flows), the system **SHOULD** display **"SIN FONDEAR"** and **"FONDEADO"** for those states respectively (aligned with catalog semantics).

#### Scenario: Labels match states

- **GIVEN** a row in **SIN_FONDEAR** or **FONDEADO**
- **WHEN** the UI shows human-readable status
- **THEN** the label **SHOULD** be **"SIN FONDEAR"** or **"FONDEADO"** accordingly

### Requirement: Creation status unchanged for contract rule

Absent a registered contract on first creation, business **status** **MUST** remain **VENTA_EFECTUADA** as today; installment persistence **MUST NOT** change that rule.

#### Scenario: No contract still VENTA_EFECTUADA

- **GIVEN** **Anual**, valid **term**, and **no** contract on create
- **WHEN** creation succeeds
- **THEN** business status **SHALL** be **VENTA_EFECTUADA**

### Requirement: Issuance instant at first EMITIDO

The system MUST record exactly one **issuance instant** per business, at the moment the business first becomes `EMITIDO`. The system MUST NOT change that instant when only the contract identifier is corrected afterward while the business stays `EMITIDO`.

#### Scenario: Create with contract

- **GIVEN** successful creation with a non-empty contract
- **WHEN** the business is read back
- **THEN** status SHALL be `EMITIDO`
- **AND** an issuance instant SHALL be recorded for that business

#### Scenario: Create without contract

- **GIVEN** successful creation without a contract
- **WHEN** the business is read back
- **THEN** status SHALL be `VENTA_EFECTUADA`
- **AND** no issuance instant SHALL be recorded

#### Scenario: Later contract moves sale to EMITIDO

- **GIVEN** a business in `VENTA_EFECTUADA` without issuance
- **WHEN** a contract is saved and the business becomes `EMITIDO`
- **THEN** an issuance instant SHALL be recorded

#### Scenario: Contract edit after EMITIDO

- **GIVEN** `EMITIDO` with issuance already recorded
- **WHEN** the contract is updated without leaving `EMITIDO`
- **THEN** the issuance instant SHALL remain unchanged

### Requirement: Issuance exposed in business API payloads

Canonical business responses (list rows and detail) MUST expose issuance: a timestamp when recorded, otherwise an explicit absent value consistent with the contract schema. Clients MUST be able to distinguish issued from never-issued businesses.

#### Scenario: Issued business readable

- **GIVEN** a business with issuance recorded
- **WHEN** any canonical business payload is returned for it
- **THEN** issuance SHALL appear with the recorded instant

#### Scenario: Never issued readable

- **GIVEN** a business without issuance
- **WHEN** any canonical business payload is returned for it
- **THEN** issuance absence SHALL be explicit per schema

---

### Requirement: Fondeo action visibility for EMITIDO businesses

| Condition | Label |
|-----------|--------|
| `EMITIDO`, zero `AnnualPayment`, authorized | **Fondear** (direct HU3) |
| `EMITIDO` or `FONDEADO`, annual rows + ≥1 **`SIN_FONDEAR`**, authorized | **Fondear anualidad** (modal) |
| Roles | **AGENTE** own; **ASISTENTE_GERENCIA_OPERATIVA**, **ADMIN** all |
| **ANALISTA_SOPORTE** | No funding action |

If **`SIN_FONDEAR`** remain, parent MUST NOT fund except via the annual flow.

(Previously: *Fondeo action for EMITIDO businesses without annuities*.)

#### Scenario: Fondear — sin cuotas anuales

- **GIVEN** `EMITIDO`, zero `AnnualPayment`, authorized viewer
- **WHEN** the list renders
- **THEN** **"Fondear"** MUST appear

#### Scenario: Fondear anualidad — con cuotas pendientes (EMITIDO)

- **GIVEN** `EMITIDO`, ≥1 `AnnualPayment` with at least one **`SIN_FONDEAR`**, authorized viewer
- **WHEN** the list renders
- **THEN** **"Fondear anualidad"** MUST appear

#### Scenario: Fondear anualidad — padre ya FONDEADO y cuotas pendientes

- **GIVEN** `FONDEADO`, ≥1 **`SIN_FONDEAR`** installment, authorized viewer
- **WHEN** the list renders
- **THEN** **"Fondear anualidad"** MUST appear

#### Scenario: ANALISTA_SOPORTE — sin acción

- **GIVEN** `EMITIDO` eligible otherwise and **ANALISTA_SOPORTE**
- **WHEN** the list renders
- **THEN** neither **"Fondear"** nor **"Fondear anualidad"** SHALL appear

---

### Requirement: FONDEADO transition on funding confirmation

| Path | Rule |
|------|------|
| No annual rows | Direct: `FONDEADO` + `dateAnchored` (atomic). |
| Annual rows | Updates installments; first batch while **`EMITIDO`** sets parent **`FONDEADO`** + `dateAnchored`. |
| Parent already **FONDEADO** | Later batches update rows only; parent unchanged. |
| **POST** `/fondear` | MUST fail if any `AnnualPayment` exists. |
| Wrong status/method | MUST reject (e.g. **VENTA_EFECTUADA**, direct when ineligible). |

(Previously: *FONDEADO transition on confirm*; modal deferral was "out of scope — HU4".)

#### Scenario: Direct — sin anualidades

- **GIVEN** `EMITIDO`, zero annual rows
- **WHEN** direct fondear completes successfully
- **THEN** `status` SHALL be **FONDEADO** and `dateAnchored` set

#### Scenario: Anual — primera tanda promueve padre

- **GIVEN** `EMITIDO`, all installments unfunded
- **WHEN** annual confirm funds ≥1 row
- **THEN** parent SHALL be **FONDEADO** with `dateAnchored` set for that funding

#### Scenario: Anual — más cuotas con padre ya FONDEADO

- **GIVEN** parent **FONDEADO**, some rows still **`SIN_FONDEAR`**
- **WHEN** annual confirm funds more rows
- **THEN** those rows get `dateAnchored`; parent remains **FONDEADO**

#### Scenario: POST directo bloqueado con anualidades

- **GIVEN** `EMITIDO` and ≥1 `AnnualPayment`
- **WHEN** direct **POST** `/fondear` runs
- **THEN** the request MUST be rejected; no state change

#### Scenario: Rechazo por estado inelegible

- **GIVEN** invalid status or wrong HTTP path for that business
- **WHEN** funding is requested
- **THEN** the system MUST reject

---

### Requirement: Annual funding modal

List all installments; **`SIN_FONDEAR`** MUST be markable; funded rows MUST show `dateAnchored`. Title MUST include **`Business.contract`** when non-empty; else MAY use **«Negocio #id»**.

#### Scenario: Lista y fechas en el modal

- **GIVEN** mixed funded/unfunded annual rows for an eligible business
- **WHEN** the user opens the annual funding flow
- **THEN** all rows appear; funded rows show `dateAnchored`

#### Scenario: Título con contrato

- **GIVEN** non-empty contract on the list row and the modal open
- **WHEN** the modal title is shown
- **THEN** it MUST include the contract text (not only numeric business id)

### Requirement: No funded downgrade in v1

The system MUST NOT revert an installment from **FONDEADO** to **`SIN_FONDEAR`** (API or UI).

#### Scenario: Cuota ya fondeada permanece fondeada

- **GIVEN** installment **FONDEADO** with `dateAnchored`
- **WHEN** annual funding is submitted again
- **THEN** that installment MUST remain **FONDEADO**

### Requirement: Annual funding audit

Each successful annual funding confirmation MUST emit an audit record consistent with existing business-audit conventions.

#### Scenario: Auditoría en éxito

- **GIVEN** successful annual funding
- **THEN** an audit entry MUST exist

---

### Requirement: FONDEADO status visible in UI badge

The `FONDEADO` status MUST appear as a distinct badge/indicator in the business list and detail views. The badge SHOULD use an indigo color scheme.

#### Scenario: FONDEADO badge renders

- GIVEN a business with `status === FONDEADO`
- WHEN the business list or detail renders
- THEN a status badge labeled "FONDEADO" SHALL be visible

---

### Requirement: FONDEADO supported in list status filters

Status filter controls in the business list MUST include `FONDEADO` as a selectable value so users can filter businesses by that state.

#### Scenario: Filter by FONDEADO returns matching businesses

- GIVEN at least one business in `FONDEADO` state
- WHEN the user filters by status `FONDEADO`
- THEN only businesses with `status === FONDEADO` SHALL appear in results

---

### Requirement: BUSINESS_STATUS as single source of truth

The `BUSINESS_STATUS` constant MUST be consolidated into a single canonical location. All imports across the codebase SHALL reference only the consolidated source. The consolidated constant MUST include `FONDEADO` as a valid member.

#### Scenario: No duplicate constant definitions

- GIVEN the consolidated `BUSINESS_STATUS` constant
- WHEN the codebase is checked for duplicate constant declarations
- THEN exactly one definition SHALL exist
- AND all feature files SHALL import from that single location

---

### Requirement: Operational Excel export authorization

Only **ADMIN**, **ASISTENTE_GERENCIA_OPERATIVA**, and **ANALISTA_SOPORTE** SHALL obtain a successful business export; other authenticated roles MUST NOT.

#### Scenario: Authorized export succeeds

- **GIVEN** role **ADMIN**, **ASISTENTE_GERENCIA_OPERATIVA**, or **ANALISTA_SOPORTE** and ≥1 matching business
- **WHEN** export is requested with valid inputs
- **THEN** a downloadable spreadsheet SHALL be returned

#### Scenario: Unauthorized export forbidden

- **GIVEN** role **AGENTE** (or any non-export role)
- **WHEN** export is requested
- **THEN** no spreadsheet SHALL be returned and access SHALL be forbidden

---

### Requirement: Export UI visibility for authorized roles

The business-list export control SHALL appear only for **ADMIN**, **ASISTENTE_GERENCIA_OPERATIVA**, and **ANALISTA_SOPORTE**.

#### Scenario: Authorized role sees export

- **GIVEN** **ANALISTA_SOPORTE** on the business list
- **WHEN** the page renders
- **THEN** export SHALL be visible

#### Scenario: Agent does not see export

- **GIVEN** **AGENTE** on the business list
- **WHEN** the page renders
- **THEN** export SHALL NOT appear

---

### Requirement: Funding date filter (optional pair, Colombia civil days)

When **both** funding **start** and **end** are supplied, results MUST include only businesses whose **business-level funding instant** lies in the **inclusive** interval for **Colombia civil calendar days**. Creation time MUST NOT drive this filter.

When **either** bound is absent, the funding-date restriction MUST NOT apply; behavior MUST match the unpaginated list for the same inputs.

While the funding-date restriction applies, **null** business-level funding instant MUST exclude the row.

#### Scenario: Both dates — in range included

- **GIVEN** **start** and **end** supplied and a non-null business funding instant on a civil day inside the inclusive interval
- **WHEN** filters are evaluated
- **THEN** that business SHALL match for list and export

#### Scenario: Pair incomplete — no funding-date restriction

- **GIVEN** only one bound supplied
- **WHEN** filters are evaluated
- **THEN** funding instant MUST NOT act as a date-range filter

#### Scenario: Both dates — null funding excluded

- **GIVEN** **start** and **end** supplied and null business-level funding instant
- **WHEN** filters are evaluated
- **THEN** that business MUST NOT match

---

### Requirement: List and export parity

For shared filters (optional funding-date pair, status, unified search), export candidates MUST equal the unpaginated list set for identical parameters.

#### Scenario: Same membership with partial date inputs

- **GIVEN** identical parameters where the funding-date pair is incomplete
- **WHEN** list (unpaginated) and export both run
- **THEN** exported business identifiers MUST equal the list match set

---

### Requirement: Spreadsheet columns for commissions context

Each row MUST include core business facts, client, product, company, value, term, periodicity or annuity indicator, coach name and category, leader chain (name and category per level), origin, and **dynamic annuity funding-date columns** through the batch’s maximum installment index. Inapplicable cells SHALL be empty.

#### Scenario: Multiple annuity installments

- **GIVEN** annual periodicity with several funded installments
- **WHEN** export completes
- **THEN** each installment instant MUST appear under the correct heading

---

### Requirement: Export volume limit

The system MUST enforce a documented maximum row count. If matches exceed it, the operation MUST fail; it MUST NOT succeed with a truncated file.

#### Scenario: Over maximum

- **GIVEN** candidates above the configured maximum
- **WHEN** export is requested
- **THEN** no successful full export SHALL occur

---

### Requirement: Empty export result

Zero matches MUST NOT yield a successful spreadsheet download.

#### Scenario: No rows

- **GIVEN** zero matches
- **WHEN** export is requested
- **THEN** no successful spreadsheet SHALL be delivered
