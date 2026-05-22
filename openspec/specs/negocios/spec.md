# Capability: Negocios

## Purpose
Gestionar la creación, edición y visualización de los negocios (vouchers/comisiones) dentro de la plataforma, asegurando que la información capturada sea precisa y clara para los agentes.

## Requirements

### Requirement: Identity Number Validation Rule

The system MUST validate `identityNumber` using the regex `/^[A-Za-z0-9.\-]+$/` — accepting letters (upper and lower), digits, dots, and hyphens. The minimum length MUST be 5 characters and the maximum MUST be 20 characters.

The system MUST normalize the accepted value to uppercase server-side before storage.

The validation rule MUST be defined in exactly one location (`identity-number.schema.ts`). Both the client-creation action and the business form schema MUST import from that single source. No inline regex definition of this rule MAY exist elsewhere.

(Previously: `identityNumber` validated against `/^[0-9.]+$/`, accepting only digits and dots. No normalization was applied.)

#### Scenario: Digits-only identity number accepted (backward compat)

- GIVEN `identityNumber = '12345678'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'12345678'`

#### Scenario: Digit-dot identity number accepted (backward compat)

- GIVEN `identityNumber = '12.345.678'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'12.345.678'`

#### Scenario: Alphanumeric-hyphen identity number accepted (new)

- GIVEN `identityNumber = 'A-12345678'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'A-12345678'`

#### Scenario: Passport-style identity number accepted (new)

- GIVEN `identityNumber = 'PE-123456'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'PE-123456'`

#### Scenario: CE without separator accepted (new)

- GIVEN `identityNumber = 'CE987654'`
- WHEN the schema validates the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'CE987654'`

#### Scenario: Uppercase normalization applied

- GIVEN `identityNumber = 'ce-123456'` (lowercase input)
- WHEN the schema validates and transforms the input
- THEN validation SHALL succeed
- AND the stored value SHALL be `'CE-123456'`

#### Scenario: Mixed-case normalized to uppercase

- GIVEN `identityNumber = 'ab1234'`
- WHEN the schema validates and transforms the input
- THEN the stored value SHALL be `'AB1234'`

#### Scenario: Empty string rejected

- GIVEN `identityNumber = ''`
- WHEN the schema validates the input
- THEN validation MUST fail with a length or required error

#### Scenario: Space in identity number rejected

- GIVEN `identityNumber = '12 345'`
- WHEN the schema validates the input
- THEN validation MUST fail

#### Scenario: At-sign rejected

- GIVEN `identityNumber = 'abc@123'`
- WHEN the schema validates the input
- THEN validation MUST fail

#### Scenario: Underscore rejected

- GIVEN `identityNumber = 'A_1234'`
- WHEN the schema validates the input
- THEN validation MUST fail

#### Scenario: Too-short identity number rejected

- GIVEN `identityNumber = 'AB1'` (fewer than 5 characters)
- WHEN the schema validates the input
- THEN validation MUST fail with a minimum-length error

#### Scenario: Too-long identity number rejected

- GIVEN `identityNumber` with 21 characters
- WHEN the schema validates the input
- THEN validation MUST fail with a maximum-length error

### Requirement: Single-source identity number schema module

The system MUST provide `src/features/negocios/lib/identity-number.schema.ts` exporting `identityNumberSchema` as the canonical Zod schema for client identity numbers. This module MUST be the only location where the validation regex, min/max bounds, and uppercase transform are defined.

#### Scenario: Schema module is importable

- GIVEN `identity-number.schema.ts` exists
- WHEN any feature module imports `identityNumberSchema`
- THEN the import SHALL resolve without error and expose a Zod schema with parse and safeParse methods

#### Scenario: No duplicate regex definitions remain

- GIVEN the codebase after implementation
- WHEN checked for inline identity-number regex definitions
- THEN no inline `/^[0-9.]+$/` or equivalent identity-number regex MUST exist outside `identity-number.schema.ts`

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

### Requirement: Número de Aportes calculated field

The system MUST display a read-only `Número de Aportes` field in the business form, positioned beside the `Moneda` field. The value SHALL be computed reactively as `termYears × multiplier` where multipliers are: Anual=1, Semestral=2, Cuatrimestral=3, Trimestral=4, Bimestral=6, Mensual=12. The computed value MUST be persisted on the `Business` record.

#### Scenario: Field computes on periodicidad/plazo change

- GIVEN the user has selected a periodicity and entered a valid term
- WHEN either value changes
- THEN `Número de Aportes` SHALL update reactively without user action
- AND the field MUST be read-only (not editable by the user)

#### Scenario: numAportes persisted on save

- GIVEN a valid business form with computable numAportes
- WHEN the business is created or updated
- THEN `numAportes` SHALL be stored on the Business record with the computed value

### Requirement: numAportes exceptions — zero-aporte products and periodicities

The system MUST set `numAportes = 0` and block the `plazo` field (forcing it to 0) when the selected company is **SKANDIA** or **MFUND**. The system MUST also set `numAportes = 1` when periodicity is `"Pago Único"` or `"Aportes Ocasionales"` (exact catalog strings, with tilde and casing).

#### Scenario: SKANDIA or MFUND forces numAportes = 0

- GIVEN the user selects company SKANDIA or MFUND
- WHEN the form evaluates numAportes
- THEN `numAportes` SHALL be 0 and `plazo` field SHALL be blocked at 0

#### Scenario: Pago Único or Aportes Ocasionales forces numAportes = 1

- GIVEN periodicity is `"Pago Único"` or `"Aportes Ocasionales"`
- WHEN the form evaluates numAportes
- THEN `numAportes` SHALL be 1 regardless of term value

### Requirement: Payment labels renamed to Aporte N

The system MUST rename all `anual_payment` references to `payments` in the data layer, and MUST display labels as **"Aporte N"** (not "Anualidad N") in all UI surfaces. The audit action `BUSINESS_ANNUAL_FUNDED` MUST be renamed to `BUSINESS_PAYMENT_FUNDED`.

#### Scenario: UI labels use Aporte

- GIVEN a business with payment rows
- WHEN any UI surface renders payment labels
- THEN labels SHALL read "Aporte 1", "Aporte 2", … (never "Anualidad N")

### Requirement: expectedDate calculated and persisted at first fondeo

At the moment of the **first fondeo** (not at creation), the system MUST calculate an `expectedDate` for each payment row using `addMonths(firstFondeoDate, index × (12 / multiplier))`. The calculation MUST use `date-fns/addMonths` to correctly handle end-of-month and leap year edge cases. The calculated dates MUST be persisted on each payment record.

#### Scenario: expectedDate set on first fondeo

- GIVEN a business being fondeado for the first time with multiple payment rows
- WHEN the fondeo transaction completes
- THEN each payment row SHALL have `expectedDate` set using the addMonths formula
- AND end-of-month and leap year dates SHALL be handled correctly

#### Scenario: expectedDate not set at creation

- GIVEN a newly created business with payment rows
- WHEN the business record is read before any fondeo
- THEN payment rows SHALL NOT have `expectedDate` set

### Requirement: Direct fondeo when numAportes ∈ {0, 1}

When `numAportes` is 0 or 1, the system MUST bypass the FundingModal and execute fondeo directly (with existing confirmation flow). The system MUST NOT open the modal for these cases.

#### Scenario: numAportes = 0 triggers direct fondeo

- GIVEN an eligible EMITIDO business with numAportes = 0
- WHEN the user clicks "Fondear"
- THEN the system SHALL proceed with direct fondeo confirmation (no modal)

#### Scenario: numAportes = 1 triggers direct fondeo

- GIVEN an eligible EMITIDO business with numAportes = 1
- WHEN the user clicks "Fondear"
- THEN the system SHALL proceed with direct fondeo confirmation (no modal)

#### Scenario: numAportes ≥ 2 opens FundingModal

- GIVEN an eligible business with numAportes ≥ 2
- WHEN the user clicks "Fondear"
- THEN the system SHALL open the FundingModal

---

### Requirement: Fondeo action visibility for EMITIDO businesses

| Condition | Label |
|-----------|--------|
| `EMITIDO`, `numAportes ∈ {0,1}`, authorized | **Fondear** (direct, no modal) |
| `EMITIDO` or `FONDEADO`, `numAportes ≥ 2` + ≥1 **`SIN_FONDEAR`**, authorized | **Fondear** (opens modal) |
| Roles | **AGENTE (Coach)** → view-only, no funding action; **ASISTENTE_GERENCIA_OPERATIVA**, **ADMIN** → can fund |
| **ANALISTA_SOPORTE** | No funding action |

(Previously: AGENTE could fund own businesses; modal/direct split was based on zero AnnualPayment rows vs. annual rows.)

#### Scenario: Fondear directo — numAportes 0 o 1

- GIVEN `EMITIDO`, `numAportes ∈ {0,1}`, ADMIN or ASISTENTE_GERENCIA_OPERATIVA viewer
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it MUST NOT open a modal

#### Scenario: Fondear con modal — numAportes ≥ 2

- GIVEN `EMITIDO` or `FONDEADO`, `numAportes ≥ 2`, ≥1 `SIN_FONDEAR`, authorized viewer
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it SHALL open FundingModal

#### Scenario: AGENTE (Coach) — sin acción de fondeo

- GIVEN any eligible business and role AGENTE/Coach
- WHEN the list renders
- THEN neither direct fondeo nor modal fondeo SHALL appear

#### Scenario: ANALISTA_SOPORTE — sin acción

- GIVEN `EMITIDO` eligible otherwise and **ANALISTA_SOPORTE**
- WHEN the list renders
- THEN neither **"Fondear"** nor the modal trigger SHALL appear

---

### Requirement: FONDEADO transition on funding confirmation

| Path | Rule |
|------|------|
| No annual rows | Direct: `FONDEADO` + `dateAnchored` (atomic). |
| Annual rows | Updates installments; first batch while **`EMITIDO`** sets parent **`FONDEADO`** + `dateAnchored`. |
| Parent already **FONDEADO** | Later batches update rows only; parent status unchanged, but parent `dateAnchored` MUST be updated to latest funding date. |
| **POST** `/fondear` | MUST fail if any `AnnualPayment` exists. |
| Wrong status/method | MUST reject (e.g. **VENTA_EFECTUADA**, direct when ineligible). |

(Previously: Parent `dateAnchored` was unchanged for later batches if parent was already FONDEADO.)

#### Scenario: Direct — sin anualidades

- **GIVEN** `EMITIDO`, zero annual rows
- **WHEN** direct fondear completes successfully
- **THEN** `status` SHALL be **FONDEADO** and `dateAnchored` set

#### Scenario: Anual — primera tanda promueve padre

- **GIVEN** `EMITIDO`, all installments unfunded
- **WHEN** annual confirm funds ≥1 row
- **THEN** parent SHALL be **FONDEADO** with `dateAnchored` set for that funding

#### Scenario: Anual — más cuotas con padre ya FONDEADO actualiza fecha

- **GIVEN** parent **FONDEADO**, some rows still **`SIN_FONDEAR`**
- **WHEN** annual confirm funds more rows
- **THEN** those rows get `dateAnchored`
- **AND** parent remains **FONDEADO** but its `dateAnchored` SHALL be updated to the new funding date

#### Scenario: POST directo bloqueado con anualidades

- **GIVEN** `EMITIDO` and ≥1 `AnnualPayment`
- **WHEN** direct **POST** `/fondear` runs
- **THEN** the request MUST be rejected; no state change

#### Scenario: Rechazo por estado inelegible

- **GIVEN** invalid status or wrong HTTP path for that business
- **WHEN** funding is requested
- **THEN** the system MUST reject

---

### Requirement: Aporte Visual State Rendering

The FundingModal MUST derive the visual state of each aporte from `(status, expectedDate, now, role)` and render exactly one of four mutually exclusive variants. No aporte MAY display in two variants simultaneously.

| Variant | Condition | Row color | Label | Buttons (ADMIN/ANALISTA_SOPORTE) | Buttons (AGENTE/COACH) |
|---|---|---|---|---|---|
| FONDEADO-PAST | status=FONDEADO AND dateAnchored month/year < current month/year | Green | "Fondeado: {dateAnchored}" | — | — |
| FONDEADO-CURRENT | status=FONDEADO AND dateAnchored month/year >= current month/year | Gray | "Se fondeará en: {expectedDate}" | Marcar Cartera, Pago Anticipado | — |
| EN_CARTERA | status=EN_CARTERA | Red (fila completa) | "En cartera: {portfolioDate}" | Quitar Cartera | — |
| PAGO_ANTICIPADO | status=PAGO_ANTICIPADO | Green | "Pago anticipado: {earlyPaymentDate}" | — | — |

**Date resolution rule**: use `expectedDate ?? dateAnchored` as reference for month comparison. If both null → FONDEADO_CURRENT (gray, "Fecha por confirmar").

**Payment lifecycle**:
- Payments are ONLY created when negocio transitions to EMITIDO
- Created with `status=FONDEADO`, `expectedDate=calculatedDate`, `dateAnchored=calculatedDate`
- VENTA_EFECTUADA negocios have NO payments
- `dateAnchored` is preserved on structural syncs; `expectedDate` is always recalculated from emission date

#### Scenario: Past-month aporte renders green, no buttons

- GIVEN an aporte with status=FONDEADO and expectedDate in a prior month/year
- WHEN any role opens the FundingModal
- THEN the row is green with no action buttons visible

#### Scenario: Current/future aporte renders gray with action buttons for privileged roles

- GIVEN an aporte with status=FONDEADO and expectedDate in the current or a future month/year
- WHEN a user with role ADMIN or ANALISTA_SOPORTE opens the modal
- THEN the row is gray AND both "Marcar Cartera" and "Pago Anticipado" buttons are visible

#### Scenario: Current/future aporte renders gray, no buttons for read-only roles

- GIVEN an aporte with status=FONDEADO and expectedDate in the current or a future month/year
- WHEN a user with role AGENTE or COACH opens the modal
- THEN the row is gray AND no action buttons are visible

#### Scenario: EN_CARTERA aporte renders red with only Quitar Cartera

- GIVEN an aporte with status=EN_CARTERA
- WHEN a user with role ADMIN or ANALISTA_SOPORTE opens the modal
- THEN the row is red, an alert icon is shown, and only "Quitar Cartera" button is visible
- AND "Pago Anticipado" button is NOT present

#### Scenario: PAGO_ANTICIPADO aporte renders green with date label, no buttons

- GIVEN an aporte with status=PAGO_ANTICIPADO
- WHEN any role opens the modal
- THEN the row is green with label "Pago anticipado {earlyPaymentDate}"
- AND no action buttons are visible for any role

---

### Requirement: Mark EN_CARTERA Transition

A user with role ADMIN or ANALISTA_SOPORTE MUST be able to mark a FONDEADO aporte as EN_CARTERA. The system MUST require confirmation before persisting. The system MUST log the action to AuditLog. The transition MUST only succeed if current status is FONDEADO.

#### Scenario: Analista marks aporte as EN_CARTERA — happy path

- GIVEN an aporte with status=FONDEADO and the user has role ADMIN or ANALISTA_SOPORTE
- WHEN the user clicks "Marcar Cartera" and confirms the dialog
- THEN the aporte status becomes EN_CARTERA, portfolioDate is set to now
- AND an AuditLog entry is created with action=APORTE_CARTERA_MARKED, userId, email, ipAddress, userAgent, and human-readable details
- AND the modal row re-renders as the EN_CARTERA variant without a page reload

#### Scenario: User cancels confirmation dialog — no change

- GIVEN an aporte with status=FONDEADO
- WHEN the user clicks "Marcar Cartera" and dismisses the confirmation dialog
- THEN the aporte status remains FONDEADO and no AuditLog entry is created

#### Scenario: Transition rejected when status is not FONDEADO

- GIVEN an aporte with status=EN_CARTERA or PAGO_ANTICIPADO
- WHEN an API POST to the cartera endpoint is attempted
- THEN the API returns 409 Conflict and the status is unchanged

---

### Requirement: Revert EN_CARTERA (Quitar Cartera)

A user with role ADMIN or ANALISTA_SOPORTE MUST be able to revert an EN_CARTERA aporte to FONDEADO. The system MUST require confirmation. The system MUST log the action.

#### Scenario: Analista reverts cartera — happy path

- GIVEN an aporte with status=EN_CARTERA and the user has role ADMIN or ANALISTA_SOPORTE
- WHEN the user clicks "Quitar Cartera" and confirms
- THEN the aporte status becomes FONDEADO, portfolioDate is set to null
- AND an AuditLog entry is created with action=APORTE_CARTERA_UNMARKED
- AND the modal row re-renders as FONDEADO variant

#### Scenario: Cancel confirmation on Quitar Cartera

- GIVEN an aporte with status=EN_CARTERA
- WHEN the user clicks "Quitar Cartera" and cancels the dialog
- THEN status remains EN_CARTERA, no AuditLog entry is created

---

### Requirement: Mark PAGO_ANTICIPADO Transition

A user with role ADMIN or ANALISTA_SOPORTE MUST be able to mark a FONDEADO aporte as PAGO_ANTICIPADO. The system MUST require confirmation. The system MUST log the action. This transition MUST only succeed from FONDEADO status.

#### Scenario: Analista marks pago anticipado — happy path

- GIVEN an aporte with status=FONDEADO and the user has role ADMIN or ANALISTA_SOPORTE
- WHEN the user clicks "Pago Anticipado" and confirms
- THEN the aporte status becomes PAGO_ANTICIPADO, earlyPaymentDate is set to now
- AND an AuditLog entry is created with action=APORTE_PAGO_ANTICIPADO_MARKED
- AND the modal row re-renders as PAGO_ANTICIPADO variant showing the date label

#### Scenario: Cancel confirmation on Pago Anticipado

- GIVEN an aporte with status=FONDEADO
- WHEN the user clicks "Pago Anticipado" and cancels
- THEN status remains FONDEADO, no AuditLog entry is created

#### Scenario: Transition rejected when status is EN_CARTERA

- GIVEN an aporte with status=EN_CARTERA
- WHEN an API POST to the pago-anticipado endpoint is attempted
- THEN the API returns 409 Conflict

---

### Requirement: Role-Based API Authorization

Every mutation endpoint (cartera POST, cartera DELETE, pago-anticipado POST) MUST reject requests from users without role ADMIN or ANALISTA_SOPORTE. The role check MUST be enforced server-side regardless of UI state.

#### Scenario: Unauthorized role attempts mutation

- GIVEN a user with role AGENTE or COACH
- WHEN they send a POST/DELETE to any aporte state mutation endpoint
- THEN the API returns 403 Forbidden and no state change or AuditLog entry is written

---

### Requirement: AuditLog Coverage

Every successful state mutation MUST produce exactly one AuditLog entry. The entry MUST include: userId, email, ipAddress (via getClientIp), userAgent (via getUserAgent), and a human-readable details string naming the aporte index and resulting status.

#### Scenario: Audit entry content

- GIVEN a successful EN_CARTERA transition
- WHEN the service completes
- THEN AuditLog contains action=APORTE_CARTERA_MARKED, the aporte index, negocioId, and actor identity fields
- AND logAuditEvent MUST NOT throw or block the response if it fails internally

---

### Requirement: Annual funding modal

The FundingModal MUST display all payment rows with funded rows shown in a **compact read-only format**. The modal MUST be scrollable when rows exceed visible area. Each row MUST show `expectedDate`, `periodicidad`, and `plazo`. Unfunded (`SIN_FONDEAR`) rows MUST be markable. Title MUST include `Business.contract` when non-empty; else MAY use **«Negocio #id»**.

(Previously: Funded rows were shown without compact formatting; modal did not show expectedDate, periodicidad, or plazo per row; no scroll constraint specified.)

#### Scenario: Funded rows compact, unfunded markable

- GIVEN mixed funded/unfunded payment rows for an eligible business
- WHEN the user opens FundingModal
- THEN funded rows SHALL appear in compact read-only format
- AND unfunded rows SHALL be markable for funding

#### Scenario: Modal shows expectedDate, periodicidad, plazo

- GIVEN the FundingModal is open
- WHEN rows are rendered
- THEN each row SHALL display its `expectedDate`, `periodicidad`, and `plazo`

#### Scenario: Modal scrollable with many rows

- GIVEN a business with many payment rows exceeding visible modal area
- WHEN the modal renders
- THEN the row list SHALL be scrollable without clipping content

#### Scenario: Título con contrato

- GIVEN non-empty contract on the list row and the modal open
- WHEN the modal title is shown
- THEN it MUST include the contract text (not only numeric business id)

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

### Requirement: Enhanced operational Excel export

The system MUST provide professional Excel exports with advanced styling, auto-sizing columns, and specific fields for liquidation analysis.

(Previously: Fixed column order placed periodicidad before producto, origen before correo/teléfono; date order emisión/fondeo/creación before líder extra; currency column labeled "Valor negocio"; annual columns summarized as "Fecha de anualidades (dinámicas)".)

#### Scenario: Professional Styling and Auto-sizing

- **GIVEN** the Excel export is requested
- **WHEN** the file is generated
- **THEN** header cells MUST have a light blue background (`#ADD8E6`) and bold font.
- **AND** all columns MUST automatically adjust their width to fit the content (header or data).

#### Scenario: Formatting and Calculated Fields

- **GIVEN** the report is generated
- **WHEN** the data rows are populated
- **THEN** the **Valor de Negocio** column MUST use currency format `$#,##0.00`.

#### Scenario: Specific Column Order and Naming without Date Filters

- **GIVEN** the Excel report is generated without date filters (`dateFrom` and `dateTo` absent)
- **WHEN** the columns are populated left-to-right
- **THEN** the fixed columns MUST appear in this exact order and spelling:
  1. Agente  
  2. Nombres y Apellidos del Cliente  
  3. Número de Cédula  
  4. Correo Electrónico  
  5. Teléfono  
  6. Origen del cliente  
  7. Compañía  
  8. Plazo  
  9. Producto  
  10. Número de Contrato  
  11. Moneda  
  12. Valor de Negocio  
  13. Periodicidad del pago  
  14. Líder Encargado  
  15. Categoría Líder  
  16. Estado de negocio  
  17. Fecha de Creación  
  18. Fecha de Emisión  
  19. Fecha de Fondeo  
- **AND** IF additional leader hierarchy columns are emitted for leaders beyond the first, they MUST appear immediately after **Fecha de Fondeo** as successive pairs **Líder N nombre**, **Líder N categoría** for N = 2, 3, … as needed.
- **AND** IF annual installment date columns are emitted for annual periodicity, they MUST appear after any **Líder N** columns and MUST be labeled **Fecha Fondeo Anualidad 1** … **Fecha Fondeo Anualidad n** where **n** is the maximum count required for the exported set.

#### Scenario: Specific Column Order and Naming with Date Filters

- **GIVEN** the Excel report is generated with date filters (`dateFrom` and `dateTo` present)
- **WHEN** the columns are populated left-to-right
- **THEN** the fixed columns MUST appear in this exact order and spelling before any dynamic **Líder N** or **Fecha Fondeo Anualidad** columns:
  1. Fecha inicial fondeo  
  2. Fecha final fondeo  
  3. Agente  
  4. Nombres y Apellidos del Cliente  
  5. Número de Cédula  
  6. Correo Electrónico  
  7. Teléfono  
  8. Origen del cliente  
  9. Compañía  
  10. Plazo  
  11. Producto  
  12. Número de Contrato  
  13. Moneda  
  14. Valor de Negocio  
  15. Periodicidad del pago  
  16. Líder Encargado  
  17. Categoría Líder  
  18. Estado de negocio  
  19. Fecha de Creación  
  20. Fecha de Emisión  
  21. Fecha de Fondeo  
- **AND** dynamic **Líder N** pairs and **Fecha Fondeo Anualidad 1…n** MUST follow the same placement rules as in **Specific Column Order and Naming without Date Filters**.

### Requirement: Export volume limit

The system MUST enforce a documented maximum row count. If matches exceed it, the operation MUST fail; it MUST NOT succeed with a truncated file.

#### Scenario: Over maximum
- **GIVEN** candidates above the configured maximum
- **WHEN** export is requested
- **THEN** no successful full export SHALL occur

### Requirement: Empty export result

Zero matches MUST NOT yield a successful spreadsheet download.

#### Scenario: No rows
- **GIVEN** zero matches
- **WHEN** export is requested
- **THEN** no successful spreadsheet SHALL be delivered

---

### Requirement: Fallback dinámico de comisión restringido al Producto

Durante la creación de negocio, el sistema SHALL resolver un `ProductPercentageCommission` válido garantizando la identidad del negocio. El sistema SHALL priorizar la configuración exacta y, en su defecto, buscar un fallback restringido exclusivamente al producto seleccionado.

#### Scenario: Uso de comisión específica (Prioridad 1)
- **GIVEN** una configuración de producto activa para el `idProduct`, `idClientOrigin` e `idCategory` seleccionados.
- **WHEN** se crea el negocio.
- **THEN** el sistema SHALL usar el `idProductPercentageCommissionNewBusinesses` definido en esa configuración.

#### Scenario: Fallback dentro del producto (Prioridad 2)
- **GIVEN** que no existe una configuración exacta para la combinación Origen/Categoría del agente.
- **AND** existe al menos una configuración activa para el mismo `idProduct`.
- **WHEN** se crea el negocio.
- **THEN** el sistema SHALL asignar el primer `ProductPercentageCommission` activo encontrado para ese producto.
- **AND** el negocio SHALL mantener la identidad del producto y compañía seleccionados.

#### Scenario: Error por falta de configuración activa
- **GIVEN** que el producto seleccionado no tiene ninguna configuración de comisiones activa en el sistema.
- **WHEN** se intenta crear el negocio.
- **THEN** la creación SHALL fallar con un error controlado: "Este producto no tiene una configuración de comisiones activa".
- **AND** el sistema SHALL NOT persistir el negocio ni usar fallbacks de otros productos o compañías.

### Requirement: Generación determinística de códigos de configuración
Para evitar colisiones de nombres entre diferentes compañías (ej. producto "STANDARD" en dos compañías distintas), el código único de configuración MUST incluir el nombre de la compañía.

#### Scenario: Código único de 4 segmentos
- **WHEN** se genera el código de una `ProductConfiguration`.
- **THEN** el formato SHALL ser `[COMPAÑÍA]-[PRODUCTO]-[ORIGEN]-[CATEGORÍA]`.
- **AND** todos los segmentos MUST estar normalizados (mayúsculas y espacios reemplazados por `_`).

### Requirement: Orden por fecha de creación en listado de negocios

El listado principal de negocios MUST priorizar los negocios más recientes por fecha de creación.  
Cuando exista empate por marca de tiempo de creación, el sistema SHALL aplicar un desempate determinístico para mantener orden estable.

#### Scenario: Listado muestra primero los últimos creados

- GIVEN negocios con diferentes fechas de creación
- WHEN se consulta y renderiza el listado principal
- THEN los negocios SHALL aparecer de más reciente a más antiguo

#### Scenario: Empate por fecha de creación

- GIVEN dos o más negocios con la misma fecha de creación
- WHEN se consulta el listado principal
- THEN el sistema SHALL mantener un orden determinístico de desempate

### Requirement: Confirmación previa para fondeo directo

Cuando el negocio no tiene anualidades, el sistema MUST solicitar confirmación explícita antes de ejecutar el fondeo para prevenir errores de usuario.

#### Scenario: Usuario confirma fondeo directo

- GIVEN un negocio elegible para fondeo directo (sin anualidades)
- WHEN el usuario hace clic en fondear y confirma la acción
- THEN el sistema SHALL ejecutar el fondeo

#### Scenario: Usuario cancela fondeo directo

- GIVEN un negocio elegible para fondeo directo
- WHEN el usuario cierra o cancela la confirmación
- THEN el sistema SHALL NOT ejecutar el fondeo

### Requirement: Fondeo con anualidades sin confirmación intermedia

Cuando el negocio tiene anualidades pendientes, el sistema SHALL abrir directamente el flujo de anualidades y MUST NOT mostrar confirmación de fondeo directo.

#### Scenario: Fondeo anual abre flujo específico

- GIVEN un negocio con anualidades
- WHEN el usuario hace clic en fondear
- THEN el sistema SHALL abrir el flujo/modal de anualidades sin confirmación previa de fondeo directo

### Requirement: Estado de procesamiento en confirmación de fondeo

Durante la confirmación de fondeo directo, el sistema MUST mostrar un estado visible de procesamiento y bloquear acciones duplicadas hasta finalizar.

#### Scenario: Confirmación en progreso

- GIVEN que el usuario confirmó el fondeo directo
- WHEN la operación está en curso
- THEN el botón de confirmación SHALL mostrar estado de procesamiento
- AND los controles de confirmación/cancelación SHALL permanecer deshabilitados hasta completar

### Requirement: Business Form Section Consolidation

The business creation and edit forms MUST consolidate product and contract information into the business information section. The system SHALL NOT display a separate product information section.

#### Scenario: Section Order and Content
- **GIVEN** the user navigates to the business creation or edit form
- **WHEN** the form renders
- **THEN** exactly two main sections MUST be displayed: "Información del cliente" and "Información del negocio"
- **AND** the "Información del negocio" section MUST contain the following fields in order: contrato, compañia, producto, periodicidad, plazo, moneda, valor, agente.

---

### Requirement: Dashboard KPIs específicos para Coach

El sistema MUST exponer exactamente tres métricas (Ventas Efectuadas, Emitido, Fondeados) para el rol Coach, sin el indicador de Clawback. Cada métrica MUST incluir simultáneamente la cantidad de negocios y los montos en moneda local y extranjera.

#### Scenario: Visualización de tarjetas para Coach

- GIVEN el usuario tiene el rol de Coach
- WHEN ingresa a la vista principal de negocios
- THEN el sistema SHALL renderizar tres tarjetas: «Ventas Efectuadas», «Emitido» y «Fondeados»
- AND el sistema SHALL NOT mostrar la métrica de Clawback

#### Scenario: Visualización simultánea de monedas

- GIVEN que se renderizan las tarjetas de KPIs del Coach
- WHEN el usuario observa cualquier tarjeta
- THEN SHALL visualizar el conteo total de negocios en ese estado
- AND SHALL visualizar el monto total en moneda local (COP)
- AND SHALL visualizar el monto total en moneda extranjera (USD)

### Requirement: Contrato GET /api/negocios/stats y filtro createdAt para los tres KPI

El endpoint `GET /api/negocios/stats` SHALL aceptar parámetros opcionales de consulta `dateFrom` y `dateTo` en formato fecha calendario (YYYY-MM-DD). Cuando ambos están presentes y válidos, el sistema SHALL aplicar un único filtro por `createdAt` (límite inferior y superior en UTC derivados de días inclusivos en zona horaria de Bogotá) a las tres agregaciones en paralelo: Ventas Efectuadas, Emitido y Fondeados. Cuando falta uno o ambos parámetros de rango, el sistema SHALL NOT aplicar ese filtro `createdAt` a las agregaciones (totales sin acotar por ese rango). La forma de la respuesta (tres bloques de KPI) MUST permanecer estable respecto al contrato existente del Coach.

#### Scenario: Rango completo acota los tres KPI por createdAt

- GIVEN una petición `GET /api/negocios/stats` con `dateFrom` y `dateTo` válidos y pareados
- WHEN el backend calcula las tres métricas
- THEN cada agregación SHALL usar el mismo predicado de rango sobre `createdAt`
- AND ninguna de las tres SHALL usar únicamente `dateAnchored` para ese filtro de fechas de consulta

#### Scenario: Sin rango — sin filtro createdAt en stats

- GIVEN una petición sin `dateFrom` o sin `dateTo` (o sin ambos)
- WHEN se calculan las estadísticas
- THEN el sistema SHALL NOT aplicar el filtro de rango `createdAt` descrito arriba a las agregaciones

### Requirement: Fechas por rol en la vista Negocios (Coach vs Administrador)

Para el Coach, la vista de negocios SHALL inicializar el rango de fechas de la UI al primer día del mes calendario actual hasta el día actual (Bogotá), de modo que el Coach no quede con tabla o KPI vacíos por defecto al faltar fechas. Para el Administrador, los filtros de fecha de la vista SHALL iniciar vacíos por defecto. El Coach SHALL mapear ese rango de UI a `createdFrom`/`createdTo` en la lista y a `dateFrom`/`dateTo` en la llamada a stats según el contrato de API. El Administrador SHALL usar `dateFrom`/`dateTo` en la lista para filtrar por fecha de fondeo (`dateAnchored`) cuando los establezca.

#### Scenario: Coach con mes actual por defecto

- GIVEN un usuario Coach abre negocios
- WHEN se cargan los parámetros iniciales de fecha
- THEN el rango visible SHALL abarcar desde el día 1 del mes actual hasta hoy
- AND las peticiones de lista y estadísticas SHALL usar ese rango según los contratos de query params

#### Scenario: Administrador sin fechas por defecto

- GIVEN un usuario Administrador abre negocios
- WHEN se cargan los filtros iniciales
- THEN las fechas SHALL estar vacías por defecto
- AND el uso de rango para fondeo SHALL corresponder solo a lo que el admin configure

### Requirement: Parámetros de lista y exportación de negocios (createdAt vs dateAnchored)

La API de listado `GET /api/negocios` SHALL aceptar `createdFrom` y `createdTo` (opcionales, YYYY-MM-DD) para filtrar por `createdAt` del negocio. SHALL aceptar `dateFrom` y `dateTo` para filtrar por `dateAnchored` (fondeo). La semántica de fechas inclusive en calendario Bogotá MUST ser coherente entre lista, estadísticas y exportación. La ruta de exportación que aplique rangos de fechas SHALL construir los límites UTC usando la misma regla inclusiva Bogotá que evita el desfase de «día anterior» al interpretar solo cadenas ISO de fecha.

El where builder `buildBusinessListWhere` SHALL aceptar un parámetro opcional `visibleUserIds: number[]` y, cuando esté presente y el usuario no sea admin, filtrar por `idUser IN visibleUserIds` en lugar de un único `idUser`.

(Previously: `buildBusinessListWhere` sólo filtraba por un único `idUser` para el rol AGENTE; no aceptaba un conjunto de IDs visibles.)

#### Scenario: Coach envía createdFrom y createdTo

- GIVEN un Coach con rango de fechas en UI
- WHEN se solicita el listado de negocios
- THEN la petición SHALL incluir `createdFrom` y `createdTo` acordes al rango
- AND el backend SHALL filtrar por `createdAt` dentro de ese rango

#### Scenario: Administrador envía dateFrom y dateTo para fondeo

- GIVEN un Administrador con ambas fechas de rango configuradas
- WHEN se solicita el listado
- THEN la petición SHALL usar `dateFrom`/`dateTo` para el filtro por `dateAnchored`

#### Scenario: visibleUserIds aplicado a roles no-admin

- GIVEN un llamador con `visibleUserIds = [10, 20, 30]` y un usuario con rol no-admin
- WHEN `buildBusinessListWhere` construye el WHERE
- THEN el predicado MUST ser `idUser IN (10, 20, 30)` en lugar de un único valor

### Requirement: Tabla de negocios — etiquetas de fecha y rango de fondeo (Administrador)

En la sección de tabla de negocios, el sistema SHALL mostrar una cabecera de columna de fecha etiquetada según el rol: equivalente a «Creación» para Coach y equivalente a «Fondeo» para Administrador. Cuando el Administrador tiene activo un rango de fechas de fondeo (ambas fechas presentes), el sistema SHALL impedir cambiar libremente el filtro de estado de forma que entre en conflicto con la semántica de `dateAnchored` (p. ej. desactivar el selector y fijar estado acorde al diseño de producto para evitar combinaciones inválidas).

#### Scenario: Etiqueta según rol

- GIVEN el usuario es Coach
- WHEN se muestra la cabecera de la columna de fecha relevante
- THEN el texto SHALL indicar creación

#### Scenario: Etiqueta fondeo para admin

- GIVEN el usuario es Administrador
- WHEN se muestra la misma columna
- THEN el texto SHALL indicar fondeo

### Requirement: Acceso Coach a Negocios sin ruta duplicada

El sistema SHALL redirigir la ruta `/dashboard/agente` a `/dashboard/negocios`. La navegación principal disponible para el rol Agent/Coach SHALL NOT incluir un ítem de menú separado que apunte a un «dashboard del agente» duplicado cuando la experiencia unificada de KPIs y listado vive en negocios.

#### Scenario: Redirect desde agente

- GIVEN un usuario navega a `/dashboard/agente`
- WHEN la página resuelve
- THEN el navegador SHALL terminar en `/dashboard/negocios` (redirect)

#### Scenario: Sin entrada de menú redundante

- GIVEN el menú del Coach
- WHEN inspecciona los enlaces principales
- THEN SHALL NOT aparecer el ítem eliminado para dashboard duplicado según este cambio

### Requirement: Lookup de PPC para nuevos negocios sin filtrar por origen

El servicio `getPpcForNewBusinesses` en `src/features/negocios/services/product-configuration.service.ts` MUST buscar `ProductConfiguration` por `(idProduct, idCategory)` únicamente. El parámetro `idClientOrigin` MUST NOT usarse como criterio de búsqueda en el `findUnique` de `ProductConfiguration`.

Del mismo modo, `validateProductConfigurationExists` MUST operar sin `idClientOrigin` en el where del lookup de `ProductConfiguration`.

(Previously: ambas funciones buscaban `ProductConfiguration` por `idProduct_idClientOrigin_idCategory` — la clave única incluía el origen.)

#### Scenario: Lookup encuentra configuración sin filtrar por origen

- GIVEN existe una ProductConfiguration con `idProduct = X` e `idCategory = Y`
- WHEN se invoca `getPpcForNewBusinesses({ idProduct: X, idCategory: Y })` (sin `idClientOrigin`)
- THEN retorna `{ configExists: true, ppc: <PPC asignado> }`

#### Scenario: Lookup bloquea creación si no existe configuración

- GIVEN no existe ninguna ProductConfiguration con `idProduct = X` e `idCategory = Y`
- WHEN se invoca `getPpcForNewBusinesses({ idProduct: X, idCategory: Y })`
- THEN lanza error `"No existe configuración de distribución para el producto y categoría seleccionados. Configurá la distribución antes de continuar."` y la creación del negocio es bloqueada (HTTP 422)

#### Scenario: Validación de configuración existente sin origen

- GIVEN existe una ProductConfiguration con `idProduct = X`, `idCategory = Y` con PPC activo y categorías activas configuradas
- WHEN se invoca `validateProductConfigurationExists(idCategory: Y, idProduct: X)`
- THEN retorna `{ valid: true }`

#### Scenario: Validación falla si no existe configuración para el par producto+categoría

- GIVEN no existe ninguna ProductConfiguration con `idProduct = X` e `idCategory = Y`
- WHEN se invoca `validateProductConfigurationExists(idCategory: Y, idProduct: X)`
- THEN retorna `{ valid: false, reason: "No existe configuración de distribución para el producto y categoría del negocio. Configurá la distribución antes de continuar." }`

#### Scenario: Interface de parámetros actualizada

- GIVEN `GetPpcForNewBusinessesParams` actualmente incluye `idClientOrigin: number`
- WHEN se implementa el cambio
- THEN `idClientOrigin` es removido de la interface; todos los call sites son actualizados para no pasar este campo

---

## ADDED Requirements

### Requirement: Soft delete en Business

El endpoint `DELETE /api/negocios/[id]` (o cualquier operación de baja de negocio) MUST implementar soft delete: fijar `status = false` via `prisma.business.update`. MUST NOT ejecutar `prisma.business.delete()` en ningún path del código de negocios.

Si no existe actualmente un endpoint DELETE para negocios, este requisito aplica de forma preventiva: cualquier futura implementación MUST seguir el patrón de soft delete.

#### Scenario: Soft delete establece status=false

- GIVEN un Business con `status: true`
- WHEN se ejecuta la operación de baja de negocio
- THEN el registro en base de datos queda con `status = false` y el response retorna `{ success: true }`

#### Scenario: Sin delete físico en Business

- GIVEN cualquier operación de baja sobre un Business
- WHEN se procesa la solicitud
- THEN el registro PERMANECE en la base de datos; no existe ningún `prisma.business.delete()` en el código de la feature `negocios`

---

### Requirement: Búsqueda de agentes filtrada por categoría OVERRIDE y habilitada desde el inicio para admin/asistente

Cuando el usuario con rol `ADMIN` o `ASISTENTE_GERENCIA_OPERATIVA` crea un negocio, el campo de búsqueda de agente (Money Strategist) MUST estar habilitado desde que carga el formulario, sin requerir que se complete el documento primero.

La búsqueda de agentes (`GET /api/users/search`) MUST filtrar usuarios cuya categoría tenga `beneficiaryMode = OVERRIDE`. Solo se deben retornar usuarios que cumplan este criterio.

#### Scenario: Campo habilitado desde el inicio para admin/asistente

- GIVEN el usuario autenticado tiene rol `ADMIN` o `ASISTENTE_GERENCIA_OPERATIVA`
- WHEN abre el formulario de creación de negocio
- THEN el campo de búsqueda de agente está habilitado sin necesidad de que el campo de documento tenga valor

#### Scenario: Campo sigue bloqueado para otros roles o hasta completar documento

- GIVEN el usuario autenticado tiene rol distinto de `ADMIN` y `ASISTENTE_GERENCIA_OPERATIVA`
- WHEN abre el formulario de creación de negocio
- THEN el campo de búsqueda de agente permanece bloqueado hasta que el documento tenga 5+ caracteres

#### Scenario: Búsqueda filtra solo agentes con categoría OVERRIDE

- GIVEN existen usuarios con rol AGENTE — algunos con categoría `beneficiaryMode = OVERRIDE`, otros con `BENEFICIARIO_GENERAL`
- WHEN se llama `GET /api/users/search?query=<term>&beneficiaryMode=OVERRIDE`
- THEN se retornan únicamente los usuarios cuya categoría tiene `beneficiaryMode = OVERRIDE`

#### Scenario: Usuario sin categoría asignada no aparece en búsqueda OVERRIDE

- GIVEN un usuario con rol AGENTE sin categoría asignada (`idCategoria = null`)
- WHEN se llama `GET /api/users/search?query=<term>&beneficiaryMode=OVERRIDE`
- THEN ese usuario NO aparece en los resultados

### Requirement: Lookup de PPC para nuevos negocios usando idLevel del agente

El servicio que resuelve `ProductConfiguration` para nuevos negocios MUST buscar por `(idProduct, idLevel)` donde `idLevel` proviene del campo `user.idLevel` del agente asignado. El campo `idCategory` / `idCategoria` MUST NOT usarse como criterio de búsqueda en ningún path de creación de negocio.

(Previously: el servicio `getPpcForNewBusinesses` buscaba por `(idProduct, idCategory)` usando el campo `user.idCategoria`. En versiones anteriores también incluía `idClientOrigin`.)

#### Scenario: Creación exitosa con configuración encontrada por idLevel

- GIVEN el agente asignado tiene `idLevel = Y`
- AND existe una ProductConfiguration activa con `idProduct = X` e `idLevel = Y`
- WHEN se crea el negocio para el producto X con ese agente
- THEN el negocio es creado con el `ProductPercentageCommission` de esa configuración
- AND el negocio persiste correctamente con HTTP 201

#### Scenario: Sin configuración para el nivel del agente retorna 422

- GIVEN el agente asignado tiene `idLevel = Y`
- AND no existe ninguna ProductConfiguration con `idProduct = X` e `idLevel = Y`
- WHEN se intenta crear el negocio
- THEN la creación MUST fallar con HTTP 422
- AND el error MUST incluir: `"No existe configuración de distribución para el producto y nivel del agente seleccionado. Configurá la distribución antes de continuar."`
- AND ningún registro de negocio MUST ser persistido

#### Scenario: idCategoria no participa en el lookup

- GIVEN el agente tiene `idCategoria = Z` (FK a la nueva entidad Category) y `idLevel = Y`
- WHEN se ejecuta el lookup de ProductConfiguration
- THEN el sistema usa ÚNICAMENTE `idLevel = Y` como criterio; `idCategoria` no es parte del where

#### Scenario: Agente sin idLevel asignado

- GIVEN el agente asignado tiene `idLevel = null`
- WHEN se intenta crear el negocio
- THEN la creación MUST fallar con una validación previa: `"El agente no tiene un nivel asignado. Asigná un nivel al agente antes de continuar."`
- AND ningún registro de negocio MUST ser persistido

### Requirement: Búsqueda de agentes filtrada por Level beneficiaryMode OVERRIDE

Cuando se busca un agente durante la creación de un negocio, el endpoint `GET /api/users/search` MUST filtrar usuarios cuyo Level asignado (`user.idLevel → Level.beneficiaryMode`) sea `OVERRIDE`. La referencia de beneficiaryMode se resuelve ahora desde `Level`, no desde la antigua `Category`.

(Previously: el filtro `beneficiaryMode = OVERRIDE` se aplicaba vía la relación `user.idCategoria → Category.beneficiaryMode`. La Category referenciada era el modelo jerárquico antiguo.)

#### Scenario: Búsqueda retorna solo agentes con Level OVERRIDE

- GIVEN existen usuarios con Level `beneficiaryMode = OVERRIDE` y otros con `beneficiaryMode = BENEFICIARIO_GENERAL`
- WHEN se llama `GET /api/users/search?query=<term>&beneficiaryMode=OVERRIDE`
- THEN se retornan únicamente los usuarios cuyo Level tiene `beneficiaryMode = OVERRIDE`

#### Scenario: Usuario sin idLevel asignado no aparece en búsqueda OVERRIDE

- GIVEN un usuario con `idLevel = null`
- WHEN se llama `GET /api/users/search?query=<term>&beneficiaryMode=OVERRIDE`
- THEN ese usuario NO aparece en los resultados

---

### Requirement: Hierarchical Subordinate Resolution

The system MUST resolve the set of subordinate user IDs for any authenticated user by traversing the `User.idUserLeader` chain via BFS at the application level. The traversal MUST be cycle-safe using a visited `Set<number>`. An empty result (no subordinates) MUST be handled as returning only the root user's own ID.

#### Scenario: Linear chain resolves all descendants

- GIVEN users A → B → C (B is leader of C, A is leader of B)
- WHEN `getSubordinateUserIds(A.idUser)` is called
- THEN the result MUST contain B.idUser and C.idUser (not A.idUser)

#### Scenario: Multi-branch tree resolves all branches

- GIVEN leader A with two direct reports B and C, and B with report D
- WHEN `getSubordinateUserIds(A.idUser)` is called
- THEN the result MUST contain B.idUser, C.idUser, and D.idUser

#### Scenario: Cycle-safe traversal

- GIVEN a malformed chain where A.idUserLeader = B and B.idUserLeader = A
- WHEN `getSubordinateUserIds(A.idUser)` is called
- THEN the traversal MUST terminate without infinite loop
- AND MUST NOT contain duplicate IDs

#### Scenario: User with no subordinates

- GIVEN a user with no other users pointing to them via idUserLeader
- WHEN `getSubordinateUserIds(that user's idUser)` is called
- THEN the result MUST be an empty array

---

### Requirement: Hierarchical visibility for leader roles on business list

The system MUST scope `GET /api/negocios` results to the set `[self.idUser, ...subordinates]` for authenticated users with roles LEVEL_1 through LEVEL_5. AGENTE (LEVEL_0) MUST remain scoped to only their own `idUser`. ADMIN and SUPER_ADMIN MUST NOT have any `idUser` scope restriction applied.

#### Scenario: LEVEL_1+ leader sees own and subordinates' businesses

- GIVEN an authenticated user with role LEVEL_2 who has three subordinates
- WHEN `GET /api/negocios` is called
- THEN the response MUST include businesses owned by the leader and all three subordinates
- AND MUST NOT include businesses owned by users outside that subtree

#### Scenario: AGENTE sees only own businesses (unchanged)

- GIVEN an authenticated user with role AGENTE
- WHEN `GET /api/negocios` is called
- THEN the response MUST include only businesses where `idUser = self.idUser`

#### Scenario: ADMIN sees all businesses (unchanged)

- GIVEN an authenticated user with role ADMIN
- WHEN `GET /api/negocios` is called
- THEN no `idUser` scope restriction MUST be applied

#### Scenario: Leader with empty subordinate tree sees only own businesses

- GIVEN a LEVEL_3 user with no users reporting to them
- WHEN `GET /api/negocios` is called
- THEN the response MUST include only that user's own businesses

---

### Requirement: Hierarchical visibility parity on stats endpoint

The `GET /api/negocios/stats` endpoint MUST apply the same hierarchical visibility scope as `GET /api/negocios` for every role. KPI totals MUST reflect the same business set as the list.

#### Scenario: Leader stats match list scope

- GIVEN a LEVEL_2 leader with subordinates
- WHEN `GET /api/negocios/stats` is called
- THEN KPI counts MUST include businesses from the leader and all subordinates
- AND MUST match the business count returned by the unpaginated list with identical filters

#### Scenario: AGENTE stats scoped to own businesses

- GIVEN an authenticated AGENTE
- WHEN `GET /api/negocios/stats` is called
- THEN all KPI aggregations MUST include only that agent's own businesses

---

### Requirement: Flexibilidad de Selección de Moneda en Creación

El sistema SHALL facilitar la creación de negocios permitiendo el ajuste manual de la moneda, independientemente de la configuración por defecto de la compañía seleccionada.

#### Scenario: Cambio manual de moneda tras selección de compañía
- **GIVEN** el usuario está en el formulario de creación de negocio
- **WHEN** selecciona una compañía que tiene una moneda predeterminada (ej: USD)
- **THEN** el sistema SHALL cargar automáticamente esa moneda en el campo "Moneda"
- **AND** el sistema MUST mantener el campo "Moneda" habilitado para que el usuario pueda cambiarlo (ej: a COP) si lo desea

---

### Requirement: Edición Total de Negocios para Roles Privilegiados

El sistema MUST permitir la corrección total de la información de un negocio existente para usuarios con roles administrativos, asegurando la integridad operativa sin bloquear campos clave para estos perfiles.

#### Scenario: Usuario Admin edita campos restringidos
- **GIVEN** un usuario con rol `ADMIN` o `ASISTENTE_GERENCIA_OPERATIVA` visualiza un negocio en estado `EMITIDO`
- **WHEN** entra en modo edición
- **THEN** el sistema MUST habilitar los campos: Producto, Valor, Moneda, Periodicidad y Plazo
- **AND** el sistema MUST habilitar el cambio del Agente (Money Strategist) asignado
- **AND** el sistema SHALL enviar todos los cambios al endpoint `PUT /api/negocios/[id]` para su persistencia

#### Scenario: Usuario Agente mantiene edición restringida
- **GIVEN** un usuario con rol `AGENTE` visualiza su propio negocio en estado `EMITIDO`
- **WHEN** entra en modo edición
- **THEN** el sistema MUST mantener bloqueados los campos: Producto, Valor, Moneda, Periodicidad y Plazo
- **AND** el sistema MUST mantener bloqueado el campo Agente
- **AND** el sistema SHALL permitir únicamente la edición del número de Contrato (comportamiento actual)

#### Scenario: Bloqueo de información del cliente en edición de negocio
- **GIVEN** cualquier usuario en modo edición de un negocio
- **WHEN** visualiza la sección "Información del cliente"
- **THEN** el sistema MUST mantener todos los campos del cliente (Nombre, Documento, etc.) como solo lectura
- **AND** el sistema SHALL NOT permitir cambios en la entidad cliente desde este formulario

---

### Requirement: Validación de Rol en Endpoint de Actualización

El endpoint `PUT /api/negocios/[id]` MUST validar los permisos del usuario antes de procesar cambios en campos sensibles que afectan la liquidación.

#### Scenario: API procesa actualización total para Admin
- **GIVEN** una petición `PUT` con cambios en `valor` e `idProduct` realizada por un `ADMIN`
- **WHEN** el backend recibe la solicitud
- **THEN** el sistema MUST validar que el estado del negocio permita la edición (ej: no `LIQUIDADO`)
- **AND** el sistema SHALL actualizar todos los campos proporcionados en la base de datos

#### Scenario: API rechaza actualización de campos sensibles para Agente
- **GIVEN** una petición `PUT` con cambios en `valor` realizada por un `AGENTE`
- **WHEN** el backend recibe la solicitud
- **THEN** el sistema MUST retornar un error HTTP 403 (Forbidden) o ignorar los campos no permitidos para ese rol, persistiendo solo los autorizados (Contrato)

---

### Requirement: Server-side Column Sorting for Business List

The system MUST perform all business list sorting at the server level (database) to ensure consistent results across paginated data.

#### Scenario: User clicks column header for sorting
- **GIVEN** the user is viewing the business list
- **WHEN** the user clicks on a column header (e.g., Client, Identification, Contract, Company, Product)
- **THEN** the system SHALL send the `sortBy` and `sortOrder` parameters to the `GET /api/negocios` endpoint
- **AND** the server MUST return the data ordered by the requested field using Prisma's `orderBy`
- **AND** the client SHALL NOT apply any additional local sorting to the received data
