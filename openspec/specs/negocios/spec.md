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

### Requirement: Liquidar sets EMITIDO to COMISIONANDO

Liquidar MUST set linked businesses from `EMITIDO` to `COMISIONANDO` only; other statuses unchanged.

#### Scenario: EMITIDO promoted

- GIVEN linked business `EMITIDO`
- WHEN Liquidar completes
- THEN status SHALL be `COMISIONANDO`

#### Scenario: Not EMITIDO

- GIVEN linked business not `EMITIDO`
- WHEN Liquidar completes
- THEN status SHALL be unchanged

#### Scenario: Idempotent COMISIONANDO

- GIVEN business already `COMISIONANDO`
- WHEN Liquidar completes again
- THEN status SHALL remain `COMISIONANDO`

---

### Requirement: COMISIONANDO in business list UI

The system SHOULD show a `COMISIONANDO` badge in business lists.

#### Scenario: Badge visible

- GIVEN row with `COMISIONANDO`
- WHEN rendered
- THEN a status indicator SHALL appear

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

### Requirement: Fondeo action for EMITIDO businesses without annuities

The system MUST display a "Fondear" action in the business list for every business whose `status === EMITIDO` AND that has zero `AnnualPayment` rows. The action MUST be visible only to authorized roles: AGENTE (own businesses), ASISTENTE_GERENCIA_OPERATIVA (all businesses), ADMIN (all businesses).

#### Scenario: Authorized role sees Fondear on eligible business

- GIVEN an EMITIDO business with no AnnualPayment rows, viewed by an authorized role
- WHEN the business list renders
- THEN the "Fondear" action MUST appear in the actions column for that row

#### Scenario: Unauthorized role cannot see Fondear

- GIVEN an EMITIDO business with no AnnualPayment rows, viewed by ANALISTA_SOPORTE
- WHEN the business list renders
- THEN the "Fondear" action SHALL NOT appear for that row

---

### Requirement: FONDEADO transition on confirm

When an authorized user confirms the fondear action on an eligible business, the system MUST atomically set `dateAnchored = now()` and transition `status` to `FONDEADO`. No modal SHALL appear for non-annual businesses (zero AnnualPayment rows).

#### Scenario: Happy path — EMITIDO no annuities → FONDEADO

- GIVEN an EMITIDO business with no AnnualPayment rows and an authorized user
- WHEN the user confirms the fondear action
- THEN `status` SHALL become `FONDEADO`
- AND `dateAnchored` SHALL be set to the current timestamp

#### Scenario: VENTA_EFECTUADA business cannot be fondeada

- GIVEN a business in `VENTA_EFECTUADA` state
- WHEN a fondear request is submitted for it
- THEN the system MUST reject the request with a validation error
- AND `status` and `dateAnchored` SHALL remain unchanged

#### Scenario: Already FONDEADO business cannot be fondeada again

- GIVEN a business already in `FONDEADO` state
- WHEN a fondear request is submitted for it
- THEN the system MUST reject the request with a validation error

#### Scenario: Business with AnnualPayment rows redirects to modal (out of scope — HU4)

- GIVEN an EMITIDO business with one or more AnnualPayment rows
- WHEN the fondear action is triggered
- THEN the system MUST NOT execute the direct FONDEADO transition
- AND SHALL defer to the annual fondeo modal flow (HU4)

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
