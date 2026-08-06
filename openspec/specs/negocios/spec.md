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
| `EMITIDO`, `numAportes = 0`, ADMIN/ANALISTA_SOPORTE/ASISTENTE_GERENCIA_OPERATIVA | **Fondear** (opens date-picker modal) |
| `EMITIDO`, `numAportes = 1`, authorized | **Fondear** (direct, no modal) |
| `EMITIDO`/`FONDEADO`, `numAportes ≥ 2` + ≥1 `SIN_FONDEAR`, authorized | **Fondear** (opens modal) |
| AGENTE (Coach) | view-only, no funding action |

(Previously: `numAportes ∈ {0,1}` fondeaba directo sin modal en ambos casos; ANALISTA_SOPORTE no tenía ninguna acción de fondeo.)

#### Scenario: numAportes = 0 con modal de fecha

- GIVEN `EMITIDO`, `numAportes = 0`, ADMIN, ANALISTA_SOPORTE o ASISTENTE_GERENCIA_OPERATIVA
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it MUST open the date-picker modal

#### Scenario: numAportes = 1 directo (sin cambios)

- GIVEN `EMITIDO`, `numAportes = 1`, authorized viewer
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it MUST NOT open a modal

#### Scenario: numAportes ≥ 2 con modal (sin cambios)

- GIVEN `EMITIDO`/`FONDEADO`, `numAportes ≥ 2`, ≥1 `SIN_FONDEAR`, authorized
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it SHALL open FundingModal

#### Scenario: AGENTE (Coach) sin acción (sin cambios)

- GIVEN any eligible business and role AGENTE/Coach
- WHEN the list renders
- THEN neither direct fondeo nor modal fondeo SHALL appear

#### Scenario: ANALISTA_SOPORTE ahora autorizado (numAportes = 0)

- GIVEN `EMITIDO`, `numAportes = 0`, rol ANALISTA_SOPORTE
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it MUST open the date-picker modal

---

### Requirement: FONDEADO transition on funding confirmation

| Path | Rule |
|------|------|
| No annual rows | Direct: `FONDEADO` + `dateAnchored` (atomic). |
| `numAportes = 0` | `dateAnchored` MUST derive from request `fundedDate` (YYYY-MM-DD) via `dateOnlyToBogotaNoonUtc()`; if absent, fallback to today (Bogotá). |
| Annual rows | Updates installments; first batch while `EMITIDO` sets parent `FONDEADO` + `dateAnchored`. |
| Parent already FONDEADO | Later batches update rows only; parent `dateAnchored` MUST update to latest funding date. |
| **POST** `/fondear` | MUST fail if any `AnnualPayment` exists. |
| Invalid/future `fundedDate` | MUST reject with 400. |
| Wrong status/method | MUST reject (e.g. VENTA_EFECTUADA, direct when ineligible) with 400/404 as applicable. |

(Previously: `dateAnchored` for direct fondeo without annual rows always used server's `new Date()`; no request body date accepted; no explicit date validation.)

#### Scenario: Direct con fecha provista

- GIVEN `EMITIDO`, `numAportes = 0`, request body `{ fundedDate: "2026-06-15" }`
- WHEN direct fondear completes
- THEN `status` SHALL be `FONDEADO` and `dateAnchored` SHALL equal noon Bogotá UTC for `2026-06-15`

#### Scenario: Direct sin fecha — fallback a hoy

- GIVEN `EMITIDO`, `numAportes = 0`, request body sin `fundedDate`
- WHEN direct fondear completes
- THEN `dateAnchored` SHALL equal today's date at noon Bogotá UTC

#### Scenario: Fecha inválida o futura rechazada

- GIVEN request body con `fundedDate` inválida o posterior a hoy
- WHEN direct fondear se solicita
- THEN the API MUST return 400 Bad Request and no state change

#### Scenario: Negocio inexistente

- GIVEN `id` de negocio inexistente
- WHEN direct fondear se solicita
- THEN the API MUST return 404 and no state change

#### Scenario: Sin permiso

- GIVEN usuario sin rol autorizado (`canFundPayments` false)
- WHEN direct fondear se solicita
- THEN the API MUST return 403 and no state change

#### Scenario: AuditLog en fondeo directo con fecha

- GIVEN direct fondeo exitoso con `numAportes = 0`
- WHEN la transacción se confirma
- THEN an AuditLog entry MUST be created with action `BUSINESS_FUNDED` (or equivalent), `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string including business id, contract, and the selected `fundedDate`

#### Scenario: POST directo bloqueado con anualidades (sin cambios)

- GIVEN `EMITIDO` and ≥1 `AnnualPayment`
- WHEN direct **POST** `/fondear` runs
- THEN the request MUST be rejected; no state change

---

### Requirement: Aporte Visual State Rendering

The FundingModal MUST derive the visual state of each aporte from `(status, expectedDate, now, role)` and render exactly one of five mutually exclusive variants. No aporte MAY display in two variants simultaneously.

| Variant | Condition | Row color | Label | Buttons (ADMIN/ANALISTA_SOPORTE) | Buttons (AGENTE/COACH) |
|---|---|---|---|---|---|
| FONDEADO-PAST | status=FONDEADO AND dateAnchored month/year < current month/year | Green | "Fondeado: {dateAnchored}" | — | — |
| FONDEADO-CURRENT | status=FONDEADO AND dateAnchored month/year >= current month/year | Gray | "Se fondeará en: {expectedDate}" | Marcar Cartera, Pago Anticipado | — |
| EN_CARTERA | status=EN_CARTERA | Red (fila completa) | "En cartera: {portfolioDate}" | Quitar Cartera | — |
| PAGO_ANTICIPADO | status=PAGO_ANTICIPADO | Green | "Pago anticipado: {earlyPaymentDate}" | — | — |
| CARTERA_PAGADO | status=CARTERA_PAGADO | Green | "Cartera pagada: {portfolioPaymentDate}" | — | — |

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

#### Scenario: CARTERA_PAGADO aporte renders green with date label, no buttons

- GIVEN an aporte with status=CARTERA_PAGADO
- WHEN any role opens the FundingModal
- THEN the row is green with label "Cartera pagada: {portfolioPaymentDate}"
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

The "Quitar Cartera" button on an EN_CARTERA aporte SHALL open `ConfirmCarteraPagadoDialog` to collect a `portfolioPaymentDate` and transition the aporte forward to CARTERA_PAGADO (terminal). The system MUST require confirmation. The system MUST log the action as APORTE_CARTERA_PAGADO.

(Previously: "Quitar Cartera" reverted the aporte from EN_CARTERA back to FONDEADO, nulling portfolioDate, with action=APORTE_CARTERA_UNMARKED.)

#### Scenario: Quitar Cartera opens ConfirmCarteraPagadoDialog

- GIVEN an aporte with status=EN_CARTERA and the user has role ADMIN or ANALISTA_SOPORTE
- WHEN the user clicks "Quitar Cartera"
- THEN ConfirmCarteraPagadoDialog SHALL open with today's date pre-filled

#### Scenario: Confirming transitions to CARTERA_PAGADO

- GIVEN the ConfirmCarteraPagadoDialog is open with a valid portfolioPaymentDate
- WHEN the user confirms
- THEN the aporte status becomes CARTERA_PAGADO and portfolioPaymentDate is persisted
- AND an AuditLog entry is created with action=APORTE_CARTERA_PAGADO
- AND the modal row re-renders as the CARTERA_PAGADO variant

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

Every mutation endpoint (cartera POST, cartera DELETE, pago-anticipado POST, cartera-pagado POST) MUST reject requests from users without role ADMIN or ANALISTA_SOPORTE. The role check MUST be enforced server-side regardless of UI state.

(Previously: Covered cartera POST, cartera DELETE, pago-anticipado POST only.)

#### Scenario: Unauthorized role attempts mutation

- GIVEN a user with role AGENTE or COACH
- WHEN they send a POST/DELETE to any aporte state mutation endpoint (including /cartera-pagado)
- THEN the API returns 403 Forbidden and no state change or AuditLog entry is written

---

### Requirement: AuditLog Coverage

Every successful state mutation MUST produce exactly one AuditLog entry. The entry MUST include: userId, email, ipAddress (via getClientIp), userAgent (via getUserAgent), and a human-readable details string naming the aporte index and resulting status. The `APORTE_CARTERA_PAGADO` action MUST be registered in the AuditAction enum.

(Previously: Covered APORTE_CARTERA_MARKED, APORTE_CARTERA_UNMARKED, APORTE_PAGO_ANTICIPADO_MARKED. Did not include APORTE_CARTERA_PAGADO.)

#### Scenario: Audit entry content for CARTERA_PAGADO

- GIVEN a successful CARTERA_PAGADO transition
- WHEN the service completes
- THEN AuditLog contains action=APORTE_CARTERA_PAGADO, the aporte index, negocioId, portfolioPaymentDate, and actor identity fields
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

### Requirement: CARTERA_PAGADO Terminal Transition

The system MUST provide a forward-only, terminal transition from `EN_CARTERA` to `CARTERA_PAGADO` when a user with role ADMIN or ANALISTA_SOPORTE confirms the client has paid the cartera. The transition MUST record a `portfolioPaymentDate` supplied by the actor. Once in `CARTERA_PAGADO`, the aporte MUST NOT offer any further transition buttons.

#### Scenario: Happy path — EN_CARTERA confirmed as paid

- GIVEN an aporte with status=EN_CARTERA and the user has role ADMIN or ANALISTA_SOPORTE
- WHEN the user clicks "Quitar Cartera", provides a `portfolioPaymentDate`, and confirms the dialog
- THEN the aporte status becomes CARTERA_PAGADO and `portfolioPaymentDate` is persisted
- AND an AuditLog entry is created with action=APORTE_CARTERA_PAGADO, userId, email, ipAddress, userAgent, and human-readable details
- AND the modal row re-renders as the CARTERA_PAGADO variant with no action buttons

#### Scenario: User cancels the confirmation dialog

- GIVEN an aporte with status=EN_CARTERA
- WHEN the user opens the dialog and cancels without confirming
- THEN the aporte status remains EN_CARTERA and no AuditLog entry is created

#### Scenario: API rejects transition when status is not EN_CARTERA

- GIVEN an aporte with status FONDEADO, PAGO_ANTICIPADO, or CARTERA_PAGADO
- WHEN POST /api/negocios/[id]/aportes/[index]/cartera-pagado is called
- THEN the API returns 409 Conflict and no state change occurs

#### Scenario: Unauthorized role is rejected

- GIVEN a user with role AGENTE or COACH
- WHEN POST /api/negocios/[id]/aportes/[index]/cartera-pagado is called
- THEN the API returns 403 Forbidden and no state change or AuditLog entry is written

#### Scenario: Missing portfolioPaymentDate is rejected

- GIVEN a POST to /cartera-pagado with no portfolioPaymentDate in the body
- WHEN the server validates the request
- THEN the API returns 400 Bad Request and no state change occurs

---

### Requirement: ConfirmCarteraPagadoDialog UI

The system MUST render a dedicated `ConfirmCarteraPagadoDialog` component (not the generic `ConfirmActionDialog`) for the CARTERA_PAGADO confirmation. The dialog MUST include a date input pre-filled with today's date, green color styling, and the warning copy: "La cartera cambiará a pagado, ya no se va poder registrarlo como cartera."

#### Scenario: Dialog opens with today's date pre-filled

- GIVEN the user clicks "Quitar Cartera" on an EN_CARTERA aporte
- WHEN the dialog renders
- THEN the date input value SHALL default to today's date (YYYY-MM-DD)
- AND the dialog SHALL display green styling and the warning message

#### Scenario: User changes the date before confirming

- GIVEN the ConfirmCarteraPagadoDialog is open
- WHEN the user updates the date input to a past date and confirms
- THEN the POST request body SHALL include that user-selected date as portfolioPaymentDate

---

### Requirement: portfolioPaymentDate in PaymentInstallmentDto

The `PaymentInstallmentDto` MUST include `portfolioPaymentDate: string | null`. The API MUST return this field on all aporte detail payloads. The UI MUST display this date when the aporte is in CARTERA_PAGADO variant.

#### Scenario: portfolioPaymentDate present in API response

- GIVEN an aporte that has transitioned to CARTERA_PAGADO
- WHEN the aporte detail is fetched
- THEN the response SHALL include `portfolioPaymentDate` with the recorded ISO date string

#### Scenario: portfolioPaymentDate null for non-CARTERA_PAGADO aportes

- GIVEN an aporte with status FONDEADO, EN_CARTERA, or PAGO_ANTICIPADO
- WHEN the aporte detail is fetched
- THEN `portfolioPaymentDate` SHALL be null

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

Cuando el negocio no tiene anualidades, el sistema MUST solicitar confirmación explícita antes de ejecutar el fondeo. Cuando `numAportes = 0`, la confirmación MUST ser un modal "Confirmar Fondeo" con selector de fecha (default: hoy, Bogotá), visible SOLO para ADMIN, ANALISTA_SOPORTE y ASISTENTE_GERENCIA_OPERATIVA. Cuando `numAportes = 1`, la confirmación SHALL mantener el AlertDialog simple sin selector de fecha.

(Previously: siempre AlertDialog simple sin fecha, para cualquier `numAportes` sin anualidades; fondeo anclado a `new Date()` del servidor.)

#### Scenario: Modal con fecha para numAportes = 0

- GIVEN negocio `EMITIDO`, `numAportes = 0`, usuario autorizado
- WHEN hace clic en "Fondear"
- THEN el modal "Confirmar Fondeo" MUST mostrarse con selector de fecha inicializado en hoy (Bogotá)

#### Scenario: Confirmar con fecha seleccionada

- GIVEN modal abierto para negocio con `numAportes = 0`
- WHEN el usuario elige fecha y confirma
- THEN el sistema SHALL enviar `fundedDate` (YYYY-MM-DD) al backend y ejecutar el fondeo con esa fecha

#### Scenario: Cancelar fondeo directo

- GIVEN modal o AlertDialog de fondeo directo abierto
- WHEN el usuario cancela o cierra
- THEN el sistema SHALL NOT ejecutar el fondeo

#### Scenario: numAportes = 1 sin cambios

- GIVEN negocio `EMITIDO`, `numAportes = 1`
- WHEN el usuario confirma fondeo
- THEN el sistema SHALL ejecutar el fondeo vía AlertDialog simple, sin selector de fecha

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

### Requirement: Contrato GET /api/negocios/stats y paridad con filtros avanzados (COM-73)

El endpoint `GET /api/negocios/stats` SHALL aceptar los mismos parámetros de filtro avanzado que `GET /api/negocios` (`BusinessFilterParams`: rangos de fecha de fondeo/creación/emisión, estados, Money Strategist, categoría, soportes, compañía, producto, origen, plazo, periodicidad, etc.). La semántica de cada dimensión MUST coincidir con la lista: `dateFrom`/`dateTo` filtran `dateAnchored`; `createdFrom`/`createdTo` filtran `createdAt`; `dateIssuedFrom`/`dateIssuedTo` filtran `dateIssued`. Al aplicar filtros desde la UI (botón «Aplicar»), los KPIs de «Resumen» MUST recalcularse sobre el mismo conjunto filtrado. Al limpiar filtros, los KPIs MUST volver a totales sin esas restricciones (dentro del alcance jerárquico del rol). Si no hay coincidencias, cada tarjeta MUST mostrar `0` negocios y montos `0` (nunca `null`/`NaN`). La forma de la respuesta (tres bloques: Ventas Efectuadas, Emitidos —incl. `sinSoporte`—, Fondeados) MUST permanecer estable.

#### Scenario: Aplicar filtros avanzados actualiza los tres KPI

- **GIVEN** el usuario aplica uno o más filtros avanzados en la vista de negocios
- **WHEN** el cliente solicita `GET /api/negocios/stats` con esos mismos query params
- **THEN** cada agregación SHALL usar el mismo predicado `WHERE` que la lista (vía `buildBusinessListWhere`)
- **AND** las tarjetas Ventas Efectuadas, Emitidos y Fondeados SHALL reflejar solo negocios que cumplan los filtros

#### Scenario: Limpiar filtros restablece KPIs globales

- **GIVEN** existían filtros aplicados en la URL
- **WHEN** el usuario limpia filtros y confirma
- **THEN** la solicitud de stats SHALL omitir esas dimensiones
- **AND** los KPIs SHALL mostrar el consolidado sin restricciones de filtro avanzado (respetando visibilidad jerárquica)

#### Scenario: Sin coincidencias — ceros seguros

- **GIVEN** la combinación de filtros no arroja negocios
- **WHEN** se calculan las estadísticas
- **THEN** cada KPI SHALL retornar `count: 0`, `totalCop: 0`, `totalUsd: 0` (y `sinSoporte: 0` en Emitidos)
- **AND** el sistema SHALL NOT retornar `null` ni `NaN` en esos campos

#### Scenario: Rango de fondeo usa dateAnchored (no createdAt)

- **GIVEN** una petición con `dateFrom` y `dateTo` válidos y pareados
- **WHEN** el backend calcula las métricas
- **THEN** el filtro de fechas SHALL aplicarse sobre `dateAnchored` (paridad con la lista)

---

### Requirement: Contact fields unblocked for lead conversion

When the business-creation form is opened for a lead conversion (a `leadId` is present in context), the system MUST NOT apply the document-length gate (`identityNumber.length >= 5`) to the contact fields (`email`, `name`, `lastNames`, `phone`, `clientOrigin`) or to the `agent` selector. This exemption applies for every lead conversion, independent of which lead fields were prefilled. The gate MUST continue to apply unchanged when no `leadId` is present (manual creation flow). The blocking condition MUST be derived in exactly one place in the form's state (no duplicated derivation across sections).

#### Scenario: Lead without identityNumber leaves contact fields editable

- GIVEN the business-creation form is opened with a `leadId` for a lead that has no `identityNumber`
- WHEN the form renders
- THEN `email`, `name`, `lastNames`, `phone`, `clientOrigin`, and `agent` SHALL be editable
- AND the user SHALL be able to submit without first typing a document number

#### Scenario: Lead with identityNumber still leaves contact fields editable

- GIVEN the business-creation form is opened with a `leadId` for a lead that already has an `identityNumber`
- WHEN the form renders
- THEN the contact fields and `agent` selector SHALL NOT be blocked by the document-length rule

#### Scenario: Manual creation without leadId still gates on document length

- GIVEN the business-creation form is opened without a `leadId`
- WHEN `identityNumber` has fewer than 5 characters
- THEN the contact fields and `agent` selector SHALL remain blocked, unchanged from current behavior

### Requirement: Existing client resolved before creation on lead conversion

When a business is submitted from a lead conversion (`leadId` present), the system MUST attempt to resolve an existing `Client` before creating a new one, using EXACT matching only (never partial/fuzzy): first by the identity composite (`typeIdentity` + `identityNumber`), and if no match, by exact `email`. If a match is found, the system MUST reuse that `Client` instead of creating a new one, routed through the same selection path already used for manual existing-client selection, so existing update-on-change logic synchronizes any differing contact data. The reuse MUST be silent — no confirmation prompt or additional user-facing notice. If no match is found, the system MUST create a new `Client` exactly as it does today.

#### Scenario: Matching client found by identity is reused silently

- GIVEN a `Client` already exists whose identity composite matches the identity supplied on lead conversion
- WHEN the user submits the business-creation form for that lead
- THEN the existing `Client` SHALL be reused for the new `Business`
- AND no new `Client` record SHALL be created
- AND no confirmation dialog SHALL be shown to the user

#### Scenario: Matching client found by email when identity does not match

- GIVEN no `Client` matches the supplied identity composite, but a `Client` exists with the exact same `email`
- WHEN the user submits the business-creation form for that lead
- THEN the existing `Client` matched by `email` SHALL be reused
- AND no new `Client` record SHALL be created

#### Scenario: No matching client creates a new one as today

- GIVEN no `Client` matches by identity composite or by exact `email`
- WHEN the user submits the business-creation form for that lead
- THEN a new `Client` SHALL be created following the current creation path unchanged

#### Scenario: Reused client with differing contact data is synced

- GIVEN a resolved existing `Client` whose stored name, email, or phone differs from the data on the lead
- WHEN the reused `Client` is routed through the existing selection path
- THEN the existing change-detection and update logic SHALL persist the differing fields on that `Client`

### Requirement: Money Strategist locked to the lead's owner on conversion

When the business-creation form is opened from a lead conversion (`leadId` present) and the resolved lead has an assigned owner, the system MUST prefill the `agent` (Money Strategist) field with that owner and MUST lock the field so it cannot be changed, overriding any auto-assignment that would otherwise apply (e.g. the logged-in user being an AGENTE who normally self-assigns). This lock MUST apply only in creation mode from a lead conversion; it MUST NOT apply to manual creation (no `leadId`) or to edit mode, which use their own existing agent-assignment rules unchanged.

#### Scenario: Lead owner locks the agent field, overriding self-assignment

- GIVEN the business-creation form is opened with a `leadId` whose lead has an assigned owner
- AND the logged-in user is an AGENTE who would normally auto-assign themselves as the agent
- WHEN the form renders
- THEN the `agent` field SHALL be prefilled with the lead's owner
- AND the `agent` field SHALL be disabled/non-editable
- AND an explanatory caption SHALL be shown indicating the Money Strategist is responsible for the lead and cannot be modified

#### Scenario: Manual creation is unaffected by the lock

- GIVEN the business-creation form is opened without a `leadId`
- WHEN the form renders
- THEN the `agent` field SHALL follow existing auto-assignment/search rules, unlocked
- **AND** SHALL NOT reinterpretar `dateFrom`/`dateTo` como `createdAt`

#### Scenario: Rango de creación usa createdAt

- **GIVEN** una petición con `createdFrom` y `createdTo` válidos y pareados
- **WHEN** el backend calcula las métricas
- **THEN** cada agregación SHALL usar el predicado de rango sobre `createdAt`

### Requirement: Fechas por rol en la vista Negocios (Coach vs Administrador)

Para el Coach, la vista de negocios SHALL inicializar el rango de fechas de la UI al primer día del mes calendario actual hasta el día actual (Bogotá), de modo que el Coach no quede con tabla o KPI vacíos por defecto al faltar fechas. Para el Administrador, los filtros de fecha de la vista SHALL iniciar vacíos por defecto. El Coach SHALL mapear ese rango de UI a `createdFrom`/`createdTo` tanto en la lista como en stats (misma semántica). El Administrador SHALL usar `dateFrom`/`dateTo` para filtrar por fecha de fondeo (`dateAnchored`) cuando los establezca. Los KPIs de «Resumen» MUST usar exactamente los mismos query params de filtro avanzado que la lista (COM-73).

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
- **GIVEN** un usuario sin rol `ADMIN` ni `ASISTENTE_GERENCIA_OPERATIVA` en modo edición de un negocio
- **WHEN** visualiza la sección "Información básica y general"
- **THEN** el sistema MUST mantener todos los campos del cliente (Nombre, Documento, Email, Teléfono, Origen, etc.) como solo lectura
- **AND** el sistema SHALL NOT permitir cambios en la entidad cliente desde este formulario

#### Scenario: Asistente Operativo de Gerencia edita información básica del cliente
- **GIVEN** un usuario con rol `ASISTENTE_GERENCIA_OPERATIVA` (o `ADMIN`) en modo edición de un negocio
- **WHEN** visualiza la sección "Información básica y general"
- **THEN** el sistema MUST permitir editar: No. Documento, Email, Apellidos, Nombres, Teléfono y Origen del Cliente
- **AND** al guardar con campos obligatorios vacíos el sistema MUST prevenir el guardado y mostrar errores de validación
- **AND** al guardar correctamente el sistema MUST persistir los datos del cliente (y origen en el negocio), registrar auditoría `CLIENT_UPDATED`, mostrar un mensaje de éxito y refrescar la vista de edición con los datos actualizados
- **AND** el endpoint/action de actualización del cliente MUST rechazar la edición en contexto `business-edit` si el rol no es `ADMIN` ni `ASISTENTE_GERENCIA_OPERATIVA`

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

---

## Capability: negocios-advanced-filters (NEW)

### Requirement: Advanced Filters Sheet Panel

The system MUST replace any existing filter modal/dialog with a `side="right"` Sheet component. The Sheet MUST contain all filter dimensions and MUST be dismissed without applying when the user closes it without clicking "Aplicar". The Sheet MUST open only when the user clicks the "Filtros avanzados" toolbar button.

#### Scenario: Sheet opens on button click

- GIVEN the user is on the negocios list page
- WHEN the user clicks "Filtros avanzados"
- THEN the Sheet MUST slide in from the right
- AND all current filter values MUST be pre-populated from the active URL search params

#### Scenario: Sheet dismissed without applying

- GIVEN the Sheet is open with changed filter values
- WHEN the user closes the Sheet without clicking "Aplicar"
- THEN URL search params MUST remain unchanged
- AND the negocios list MUST NOT re-fetch

---

### Requirement: Toolbar Layout

The toolbar MUST always display exactly three controls: search input, "Filtros avanzados" button, and Export button. No other filter controls MAY appear inline.

The "Filtros avanzados" button MUST display an amber badge (`#F59E0B`) showing the count of active filter DIMENSIONS. The badge MUST be hidden when the count is zero. The Export button MUST be disabled while data is loading.

#### Scenario: Badge count reflects active dimensions

- GIVEN the user has selected 2 statuses and set a date range
- WHEN the toolbar renders
- THEN the badge MUST show `2` (Status = 1 dimension, Date range = 1 dimension)

#### Scenario: Badge hidden when no active filters

- GIVEN all filter dimensions are at their default/empty state
- WHEN the toolbar renders
- THEN no badge MUST be visible on the "Filtros avanzados" button

#### Scenario: Export disabled during load

- GIVEN data is being fetched
- WHEN the toolbar renders
- THEN the Export button MUST be in disabled state

---

### Requirement: Filter Dimension — Date Range with Field Selector

The Sheet MUST include a single date range picker with a selector for the date field. Field options MUST be: "Fondeo" (params: `dateFrom`/`dateTo`), "Creación" (params: `createdFrom`/`createdTo`), "Emisión" (params: `dateIssuedFrom`/`dateIssuedTo`). The default field for all roles MUST be "Fondeo". Changing the date field MUST clear any currently set date range values.

#### Scenario: Default field is Fondeo for all roles

- GIVEN the user opens the Sheet for the first time with no active date filters
- WHEN the date section renders
- THEN the field selector MUST show "Fondeo" as selected

#### Scenario: Changing field clears date range

- GIVEN the user has "Fondeo" selected with dateFrom and dateTo set
- WHEN the user selects "Creación"
- THEN dateFrom and dateTo MUST be cleared in the form state

---

### Requirement: Filter Dimension — Status Multiselect

The Sheet MUST present status as a multiselect. Selected values MUST be serialized as `statuses[]` (array) in URL search params. The dimension MUST count as active if at least one value is selected.

#### Scenario: Multiple statuses selected and applied

- GIVEN the user selects EMITIDO and FONDEADO
- WHEN the user clicks "Aplicar"
- THEN URL MUST contain `statuses[]=EMITIDO&statuses[]=FONDEADO`

---

### Requirement: Filter Dimension — Has Comprobantes

The Sheet MUST include a radio control with three options: "Todos" (default), "Con comprobantes" (`hasSupports=true`), "Sin comprobantes" (`hasSupports=false`). The dimension MUST count as active when the selection is not "Todos".

#### Scenario: Con comprobantes applied

- GIVEN the user selects "Con comprobantes"
- WHEN the user clicks "Aplicar"
- THEN URL MUST contain `hasSupports=true`

#### Scenario: Todos is default and not active

- GIVEN no hasSupports param in URL
- WHEN the Sheet renders
- THEN "Todos" MUST be pre-selected and the dimension MUST NOT count toward the badge

---

### Requirement: Filter Dimensions — Multiselect Catalogs

The Sheet MUST include multiselect controls for: Company (`companyIds[]`), Product (`productIds[]`), Origin (`originIds[]`), Term/Plazo (`terms[]`, discrete year values from DB), Periodicity (`periodicityIds[]`, loaded from catalog endpoint), and Money Strategist (text autocomplete, param: `agentName`). Each dimension MUST count as active if at least one value is selected (or non-empty string for agentName).

#### Scenario: Periodicity options loaded from endpoint

- GIVEN the Sheet opens
- WHEN the Periodicity multiselect renders
- THEN options MUST be loaded from `GET /api/periodicities` and ordered by name

#### Scenario: Term options from distinct Business.term values

- GIVEN the Sheet opens
- WHEN the Term multiselect renders
- THEN options MUST reflect distinct year values present in the Business table

---

### Requirement: Apply and Clear Actions

Clicking "Aplicar" MUST commit all filter state to URL search params and close the Sheet. Clicking "Limpiar filtros" MUST reset all filter dimensions to defaults (date field "Creación", date range = current month via `createdFrom`/`createdTo`, all multiselects cleared, hasSupports reset to "Todos", agentName cleared).

#### Scenario: Apply commits and closes

- GIVEN filters are set in the Sheet
- WHEN the user clicks "Aplicar"
- THEN URL params MUST be updated with the new filter state
- AND the Sheet MUST close

#### Scenario: Clear resets to current-month creation default

- GIVEN filters are active in the Sheet
- WHEN the user clicks "Limpiar filtros"
- THEN all multiselects MUST show no selections
- AND date field MUST be "Creación" with range = first day of current month through today (`createdFrom`/`createdTo`)
- AND fondeo/emisión date params MUST be cleared
- AND hasSupports MUST be "Todos"
- AND the list MUST NOT show the full history (empty date filter)

---

### Requirement: Shared DateRangePicker Component

The system MUST provide a shared `DateRangePicker` component in `src/features/shared/ui/` using a Popover + Calendar (`mode="range"`, react-day-picker v9). This component MUST NOT be duplicated per feature.

#### Scenario: Range picker renders and accepts date range

- GIVEN the DateRangePicker is mounted
- WHEN the user selects a start and end date via calendar
- THEN the component MUST call its onChange callback with the selected range

---

## Capability: negocios-export-parity (NEW)

### Requirement: Export Parameter Parity via Shared Zod Schema

`POST /api/negocios/export` MUST accept exactly the same filter parameters as `GET /api/negocios`. Both routes MUST import and use a single shared Zod schema for all filter params. The export endpoint MUST apply each filter to its query identically to the list endpoint.

#### Scenario: Export applies all list filter params

- GIVEN the list is filtered by statuses, dateFrom/dateTo, companyIds, agentName, and hasSupports
- WHEN the same params are sent to export
- THEN the exported set MUST match the unpaginated list set for those params

#### Scenario: Parity schema test

- GIVEN the shared filter Zod schema
- WHEN both the list route and export route parse the same input
- THEN both MUST produce identical filter objects with no missing or extra params on either side

---

## Capability: negocios-list-filtering (MODIFIED)

### Requirement: List Filter Params and WHERE Clause Extensions

(Previously: `status` was a single value; no `dateIssued` range, `hasSupports`, `terms[]`, `periodicityIds[]`, or `statuses[]` params existed in the list or WHERE builder.)

The list API `GET /api/negocios` MUST accept the following additional/updated params:

| Param | Type | WHERE behavior |
|---|---|---|
| `statuses[]` | string array | `{ status: { in: [...] } }` — replaces single `status` when array provided; `status` single param still accepted |
| `dateIssuedFrom` / `dateIssuedTo` | date string | `{ dateIssued: { gte, lte, not: null } }` |
| `createdFrom` / `createdTo` | date string | `{ createdAt: { gte, lte } }` |
| `hasSupports: true` | boolean | `{ supports: { some: { status: true } } }` |
| `hasSupports: false` | boolean | `{ supports: { none: { status: true } } }` |
| `terms[]` | number array | `{ term: { in: [...] } }` |
| `periodicityIds[]` | number array | `{ periodicityId: { in: [...] } }` |
| `agentName` | string | text match on agent name |
| `companyIds[]` | number array | `{ idCompany: { in: [...] } }` |
| `productIds[]` | number array | `{ idProduct: { in: [...] } }` |
| `originIds[]` | number array | `{ idClientOrigin: { in: [...] } }` |

#### Scenario: statuses[] filters correctly

- GIVEN `statuses[]=EMITIDO&statuses[]=FONDEADO`
- WHEN `buildBusinessListWhere` evaluates the param
- THEN the Prisma where MUST include `{ status: { in: ['EMITIDO', 'FONDEADO'] } }`

#### Scenario: dateIssuedFrom/To excludes null dateIssued rows

- GIVEN `dateIssuedFrom=2024-01-01&dateIssuedTo=2024-12-31`
- WHEN `buildBusinessListWhere` evaluates the param
- THEN the Prisma where MUST include `{ dateIssued: { gte: ..., lte: ..., not: null } }`
- AND businesses with `dateIssued = null` MUST NOT appear in results

#### Scenario: hasSupports=true returns only businesses with active supports

- GIVEN `hasSupports=true`
- WHEN the WHERE clause is applied
- THEN only businesses with at least one support record with `status: true` MUST be returned

#### Scenario: hasSupports=false returns only businesses without active supports

- GIVEN `hasSupports=false`
- WHEN the WHERE clause is applied
- THEN only businesses with zero support records with `status: true` MUST be returned

#### Scenario: Single status backward compat

- GIVEN a caller sends `status=EMITIDO` (legacy single param)
- WHEN the list API processes the param
- THEN it MUST return businesses filtered to `EMITIDO` as before

---

## Capability: Periodicity Catalog Endpoint (NEW)

### Requirement: GET /api/periodicities

If `GET /api/periodicities` does not exist, the system MUST create it. The endpoint MUST return `{ id: number, name: string }[]` ordered by `name` ascending. The endpoint MUST require authentication using the same middleware pattern as other catalog endpoints.

#### Scenario: Returns ordered catalog

- GIVEN the user is authenticated
- WHEN `GET /api/periodicities` is called
- THEN the response MUST be an array of `{ id, name }` ordered alphabetically by name

#### Scenario: Unauthenticated request rejected

- GIVEN no valid session
- WHEN `GET /api/periodicities` is called
- THEN the API MUST return 401 Unauthorized

---

### Requirement: Excel Export Authorized by Hierarchy Level 2-6

The system MUST enable the "Exportar Excel" action on the Lista de Negocios for any authenticated user whose hierarchy position is Nivel 2 (Team Leader) through Nivel 6 (MIA), in addition to any existing admin-like roles. Authorization MUST behave identically across the full Nivel 2-6 range — no sub-range may be excluded or treated differently.

The client (`canExportExcel`) and the server (`POST /api/negocios/export`) MUST evaluate authorization for export using the exact same single source of truth. A user for whom the client enables the button MUST be authorized by the server for that same request, and vice versa — there MUST be no user for whom client and server disagree.

#### Scenario: Nivel 2 (Team Leader) sees export enabled

- GIVEN an authenticated user at Nivel 2 (Team Leader)
- WHEN the user opens Lista de Negocios
- THEN the "Exportar Excel" button SHALL be enabled
- AND a POST to `/api/negocios/export` from this user SHALL be authorized

#### Scenario: Nivel 6 (MIA) sees export enabled

- GIVEN an authenticated user at Nivel 6 (MIA)
- WHEN the user opens Lista de Negocios
- THEN the "Exportar Excel" button SHALL be enabled
- AND a POST to `/api/negocios/export` from this user SHALL be authorized

#### Scenario: User outside Nivel 2-6 and without admin-like role is denied

- GIVEN an authenticated user whose hierarchy level falls outside Nivel 2-6 and who holds no admin-like role
- WHEN the user opens Lista de Negocios
- THEN the "Exportar Excel" button SHALL be disabled or absent
- AND a POST to `/api/negocios/export` from this user SHALL be rejected with an authorization error

#### Scenario: Client and server authorization never diverge

- GIVEN any authenticated user
- WHEN evaluating whether export is allowed
- THEN the client-side gate and the server-side gate SHALL produce the same allow/deny result for that user

### Requirement: Export Rows Scoped to Hierarchy Subtree (Bug Fix)

The export endpoint (`POST /api/negocios/export`) MUST restrict exported rows to the businesses visible within the requesting user's hierarchy subtree, computed the same way as the list endpoint (`GET /api/negocios`) via `visibleUserIds`. A non-admin user MUST NOT receive rows belonging to businesses outside their subordinate tree, regardless of filters applied.

(Previously: the export endpoint computed authorization but never passed `visibleUserIds` to `buildBusinessListWhere`, so any non-admin exporter — once authorized — would receive rows from outside their hierarchy scope. This was masked only because today's export gate is admin-only, and admins legitimately skip the scope branch.)

#### Scenario: Non-admin export contains only subtree businesses

- GIVEN a Nivel 2-6 user whose hierarchy subtree contains a known set of businesses S
- WHEN the user exports without filters
- THEN every row in the exported file SHALL belong to S
- AND no row SHALL reference a business outside S

#### Scenario: Export scope matches list scope exactly

- GIVEN a Nivel 2-6 user with no filters applied
- WHEN comparing the set of businesses returned by `GET /api/negocios` against the set exported by `POST /api/negocios/export`
- THEN both sets SHALL be identical

### Requirement: Export Respects Applied Advanced Filters

The export endpoint MUST apply the same advanced filters the user has active in Lista de Negocios, combined with the hierarchy subtree scope. The exported file's columns MUST match the columns visible in the table.

#### Scenario: Filtered export contains only matching, in-scope rows

- GIVEN a Nivel 2-6 user with advanced filters applied (e.g. status, date range)
- WHEN the user triggers "Exportar Excel"
- THEN the exported file SHALL contain only businesses that satisfy the active filters
- AND every row SHALL also belong to the user's hierarchy subtree
- AND the file's columns SHALL match the columns visible in the table

#### Scenario: Unfiltered export contains full visible scope

- GIVEN a Nivel 2-6 user with no advanced filters applied
- WHEN the user triggers "Exportar Excel"
- THEN the exported file SHALL contain the total set of businesses visible to the user under their hierarchy scope
- AND no additional filtering SHALL be applied beyond hierarchy scope

### Requirement: Empty Filtered Export Shows No-Records Message (Regression)

The system MUST continue to show a "No hay registros para exportar" message when the active filters (combined with hierarchy scope) yield zero matching businesses. This existing behavior MUST NOT be broken by the authorization gate change or the scope fix.

#### Scenario: Filters with zero matches show empty-state message

- GIVEN a Nivel 2-6 user with advanced filters applied that match zero businesses within their hierarchy scope
- WHEN the user triggers "Exportar Excel"
- THEN the system SHALL show "No hay registros para exportar"
- AND no file SHALL be generated or downloaded

---

## ADDED Requirements (sdd/editar-fecha-fondeo-soportes)

### Requirement: Inline edit of Business.dateAnchored with Payment sync

The system MUST allow inline editing of `Business.dateAnchored` in the negocios table, following the existing `dateIssued` inline-edit pattern (`BusinessTableSection.tsx`). Editing MUST be restricted to users authorized by `canFundPayments()` (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE). The edit MUST be permitted regardless of the business's current status (no state-machine restriction beyond the permission check), and MUST NOT trigger commission or period recalculation. On save, the system MUST persist the new date via `dateOnlyToBogotaNoonUtc()` inside a `prisma.$transaction` that ALSO updates `Payment.dateAnchored` where `installmentIndex === 1` for that business, in the same atomic operation. Payments with `installmentIndex !== 1` MUST remain unchanged. Every successful edit MUST create an `AuditLog` entry with action `BUSINESS_DATE_ANCHORED_UPDATED`.

#### Scenario: Authorized user edits dateAnchored — Payment[1] syncs

- GIVEN a user with role ADMIN, ASISTENTE_GERENCIA_OPERATIVA, or ANALISTA_SOPORTE viewing the negocios table
- WHEN they inline-edit `dateAnchored` to a valid past or present date and save
- THEN `Business.dateAnchored` SHALL update to the noon-Bogotá-UTC value
- AND `Payment.dateAnchored` for `installmentIndex = 1` SHALL update to the same value in the same transaction
- AND an `AuditLog` entry with action `BUSINESS_DATE_ANCHORED_UPDATED` SHALL be created

#### Scenario: Other installments are not affected

- GIVEN a business with payment rows for installments 1, 2, and 3
- WHEN `dateAnchored` is edited and saved
- THEN only the `installmentIndex = 1` payment row's `dateAnchored` SHALL change
- AND installments 2 and 3 SHALL retain their existing `dateAnchored` values

#### Scenario: Unauthorized user cannot edit

- GIVEN a user without `canFundPayments()` permission (e.g. AGENTE)
- WHEN they view the negocios table
- THEN the `dateAnchored` cell MUST remain read-only or the edit request MUST be rejected with 403

#### Scenario: Future date rejected

- GIVEN an authorized user attempts to save `dateAnchored` set to a date after today (Bogotá)
- WHEN the request is submitted
- THEN the API MUST reject with 400 and no state change MUST occur

#### Scenario: Transaction rollback on partial failure

- GIVEN the Payment[1] update fails after the Business update was staged within the same `prisma.$transaction`
- WHEN the transaction is evaluated
- THEN neither `Business.dateAnchored` nor `Payment.dateAnchored` MUST be persisted (full rollback)

### Requirement: Support validation before funding

Both funding endpoints, `/fondear` (direct/no-annualities) and `/fondear-aportes` (annual installments), MUST reject the funding action when `supportCount === 0` for the target business. The block MUST occur before any status or date mutation. The UI MUST present the modal message "No se puede fondear sin soportes adjuntos" when blocked. Editing an ALREADY-funded business's `dateAnchored` MUST NOT be subject to this guard (guard applies only to the funding action, not to date correction).

#### Scenario: Funding blocked with zero supports (direct)

- GIVEN an `EMITIDO` business with `supportCount = 0`
- WHEN an authorized user attempts `/fondear`
- THEN the API MUST reject with an error the UI maps to "No se puede fondear sin soportes adjuntos"
- AND no status or date change MUST occur

#### Scenario: Funding blocked with zero supports (annual)

- GIVEN an `EMITIDO`/`FONDEADO` business with pending annual installments and `supportCount = 0`
- WHEN an authorized user attempts `/fondear-aportes`
- THEN the API MUST reject with the same block behavior
- AND no installment status change MUST occur

#### Scenario: Funding proceeds when supports exist

- GIVEN a business with `supportCount >= 1` and otherwise-eligible funding conditions
- WHEN an authorized user funds via either endpoint
- THEN the funding action MUST proceed per existing FONDEADO transition rules

#### Scenario: Blocked attempt is audited

- GIVEN a funding attempt blocked due to `supportCount = 0`
- WHEN the block is enforced
- THEN an `AuditLog` entry MUST be created recording the blocked attempt, businessId, and actor identity

#### Scenario: Editing dateAnchored on already-funded business is not blocked by support guard

- GIVEN a `FONDEADO` business with `supportCount = 0` (e.g. legacy data pending remediation)
- WHEN an authorized user edits `dateAnchored` (not a funding action)
- THEN the support guard MUST NOT block the date edit

### Requirement: Remediation of businesses funded without supports

The system MUST provide `scripts/remediate-unsupported-funded-businesses.js` to identify and revert businesses with `status = FONDEADO` and `supportCount === 0` (funded before this validation existed). The script MUST support `--dry-run` (report only, no writes) and `--apply` (execute) modes.

#### Scenario: Dry-run reports affected businesses without mutating data

- GIVEN businesses exist with `status = FONDEADO` and zero active supports
- WHEN the script runs with `--dry-run`
- THEN it MUST output the list of affected business IDs and counts
- AND no database rows MUST change

#### Scenario: Apply mode reverts state atomically per business

- GIVEN the same affected set
- WHEN the script runs with `--apply`
- THEN for each affected business: `status` MUST become `EMITIDO`, `Business.dateAnchored` MUST become `NULL`, all its `Payment` rows MUST become `status = SIN_FONDEAR` with `dateAnchored = NULL`
- AND an `AuditLog` entry with action `BUSINESS_REMEDIATION_REVERTED` MUST be created per business, including businessId, previous status, operator, and timestamp

#### Scenario: Business with supports is excluded

- GIVEN a `FONDEADO` business with `supportCount >= 1`
- WHEN the script identifies candidates (dry-run or apply)
- THEN that business MUST NOT appear in the affected set

---

### Requirement: Novedad state persisted on Business

The system MUST persist `novedadStatus` (nullable: `PENDIENTE` | `RESUELTA`), `novedadMarkedAt` (nullable timestamp), and `novedadResolvedAt` (nullable timestamp) on the `Business` record. A business never marked MUST have `novedadStatus = null` and both timestamps `null`.

#### Scenario: Never-marked business has null novedad fields

- GIVEN a business that has never been marked with a novedad
- WHEN the business record is read
- THEN `novedadStatus` SHALL be `null`
- AND `novedadMarkedAt` and `novedadResolvedAt` SHALL be `null`

### Requirement: Mark novedad on VENTA_EFECTUADA business

The system MUST allow marking a business as "Con Novedad" only when `status === VENTA_EFECTUADA` and `novedadStatus` is not already `PENDIENTE`. Any authenticated role MAY perform this action (no role allowlist). On success, the system MUST set `novedadStatus = PENDIENTE` and `novedadMarkedAt` to the current instant, and MUST emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_MARKED` including `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string.

#### Scenario: Mark succeeds on VENTA_EFECTUADA

- GIVEN a business with `status === VENTA_EFECTUADA` and `novedadStatus === null`
- WHEN any authenticated user calls the mark action
- THEN `novedadStatus` SHALL become `PENDIENTE`
- AND `novedadMarkedAt` SHALL be set to the current instant
- AND an `AuditLog` entry with action `BUSINESS_NOVEDAD_MARKED` SHALL be created

#### Scenario: Mark rejected outside VENTA_EFECTUADA

- GIVEN a business with `status !== VENTA_EFECTUADA`
- WHEN the mark action is requested
- THEN the request MUST fail and `novedadStatus` MUST remain unchanged

#### Scenario: Mark rejected when already PENDIENTE

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the mark action is requested again
- THEN the request MUST fail and no duplicate `AuditLog` entry SHALL be created

### Requirement: Unmark a PENDIENTE novedad

The system MUST allow unmarking a novedad only when `novedadStatus === PENDIENTE`. Any authenticated role MAY perform this action. On success, the system MUST reset `novedadStatus` and `novedadMarkedAt` to `null` (the business returns to the never-marked state), and MUST emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_UNMARKED` including `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string.

#### Scenario: Unmark resets to never-marked state

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN any authenticated user calls the unmark action
- THEN `novedadStatus` SHALL become `null`
- AND `novedadMarkedAt` SHALL become `null`
- AND an `AuditLog` entry with action `BUSINESS_NOVEDAD_UNMARKED` SHALL be created

#### Scenario: Unmark rejected when not PENDIENTE

- GIVEN a business with `novedadStatus === null` or `RESUELTA`
- WHEN the unmark action is requested
- THEN the request MUST fail and `novedadStatus` MUST remain unchanged

### Requirement: Auto-resolve novedad on transition to EMITIDO

Within the existing business-update transaction, when a business with `novedadStatus === PENDIENTE` transitions to `status === EMITIDO`, the system MUST atomically set `novedadStatus = RESUELTA` and record `novedadResolvedAt` as the current instant, regardless of the actor's role. The system MUST emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_RESOLVED` including `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string.

#### Scenario: Pending novedad auto-resolves on EMITIDO transition

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the update transaction transitions that business to `status === EMITIDO`
- THEN `novedadStatus` SHALL become `RESUELTA`
- AND `novedadResolvedAt` SHALL be set to the current instant
- AND an `AuditLog` entry with action `BUSINESS_NOVEDAD_RESOLVED` SHALL be created
- AND this MUST occur regardless of the actor's role

#### Scenario: No pending novedad — no resolution side effect

- GIVEN a business with `novedadStatus === null` or `RESUELTA`
- WHEN the update transaction transitions that business to `status === EMITIDO`
- THEN `novedadStatus` and `novedadResolvedAt` MUST remain unchanged
- AND no `BUSINESS_NOVEDAD_RESOLVED` entry SHALL be created

### Requirement: Novedad persists through cancellation

Cancelling a business with a `PENDIENTE` novedad MUST NOT change `novedadStatus`. The novedad MUST remain `PENDIENTE`.

#### Scenario: Cancelling does not clear a pending novedad

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the business is cancelled
- THEN `novedadStatus` SHALL remain `PENDIENTE`
- AND `novedadMarkedAt` MUST remain unchanged

### Requirement: Novedad column in business list

The principal business list (`BusinessTableSection`) MUST render a "Novedad" column immediately after the "Estado" column. The cell MUST be empty when `novedadStatus === null`, MUST show "Pendiente" styled in orange when `novedadStatus === PENDIENTE`, and MUST show "Resuelta" styled in green/neutral when `novedadStatus === RESUELTA`.

#### Scenario: Empty cell for never-marked business

- GIVEN a business row with `novedadStatus === null`
- WHEN the business list renders
- THEN the Novedad cell SHALL be empty

#### Scenario: Pendiente cell in orange

- GIVEN a business row with `novedadStatus === PENDIENTE`
- WHEN the business list renders
- THEN the Novedad cell SHALL show "Pendiente" styled in orange

#### Scenario: Resuelta cell in green/neutral

- GIVEN a business row with `novedadStatus === RESUELTA`
- WHEN the business list renders
- THEN the Novedad cell SHALL show "Resuelta" styled in green/neutral

### Requirement: Novedad row actions in BusinessRowActions

The row-actions dropdown MUST offer "Marcar Con Novedad" only when `status === VENTA_EFECTUADA` and `novedadStatus !== PENDIENTE`. The dropdown MUST offer "Desmarcar Novedad" only when `novedadStatus === PENDIENTE`. Neither action MAY be gated by role.

#### Scenario: Marcar Con Novedad visible on eligible business

- GIVEN a business with `status === VENTA_EFECTUADA` and `novedadStatus !== PENDIENTE`
- WHEN any authenticated user opens the row-actions dropdown
- THEN "Marcar Con Novedad" SHALL be visible

#### Scenario: Marcar Con Novedad hidden when not VENTA_EFECTUADA or already pending

- GIVEN a business with `status !== VENTA_EFECTUADA`, or `novedadStatus === PENDIENTE`
- WHEN the row-actions dropdown opens
- THEN "Marcar Con Novedad" SHALL NOT be visible

#### Scenario: Desmarcar Novedad visible only when PENDIENTE

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the row-actions dropdown opens
- THEN "Desmarcar Novedad" SHALL be visible

#### Scenario: Desmarcar Novedad hidden when not PENDIENTE

- GIVEN a business with `novedadStatus === null` or `RESUELTA`
- WHEN the row-actions dropdown opens
- THEN "Desmarcar Novedad" SHALL NOT be visible

### Requirement: Novedad visible in business detail view

The business detail view MUST display the novedad status with the same color semantics as the list column (empty when `null`, orange "Pendiente", green/neutral "Resuelta").

#### Scenario: Detail view shows Pendiente in orange

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the business detail view renders
- THEN the novedad status SHALL show "Pendiente" styled in orange

#### Scenario: Detail view shows Resuelta in green/neutral

- GIVEN a business with `novedadStatus === RESUELTA`
- WHEN the business detail view renders
- THEN the novedad status SHALL show "Resuelta" styled in green/neutral

#### Scenario: Detail view shows nothing when never marked

- GIVEN a business with `novedadStatus === null`
- WHEN the business detail view renders
- THEN no novedad status indicator SHALL be shown

---

## REMOVED Requirements

### Requirement: Fondeo por anualidades vía /fondear-anualidades (dead route)

(Reason: superseded by `/fondear-aportes`; the `/fondear-anualidades` route, its schema, and its tests are unused dead code with only self-referencing test callers.)
(Migration: None — no active callers found; `/fondear-aportes` already covers annual-installment funding.)
