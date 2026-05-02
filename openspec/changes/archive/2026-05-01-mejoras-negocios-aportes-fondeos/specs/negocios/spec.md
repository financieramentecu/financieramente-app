# Delta for Negocios

## ADDED Requirements

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

The system MUST set `numAportes = 0` and block the `plazo` field (forcing it to 0) when the selected company is **SKANDIA** or **MFUND**. The system MUST also set `numAportes = 0` when periodicity is `"Pago Único"` or `"Aportes Ocasionales"` (exact catalog strings, with tilde and casing).

#### Scenario: SKANDIA or MFUND forces numAportes = 0

- GIVEN the user selects company SKANDIA or MFUND
- WHEN the form evaluates numAportes
- THEN `numAportes` SHALL be 0 and `plazo` field SHALL be blocked at 0

#### Scenario: Pago Único or Aportes Ocasionales forces numAportes = 0

- GIVEN periodicity is `"Pago Único"` or `"Aportes Ocasionales"`
- WHEN the form evaluates numAportes
- THEN `numAportes` SHALL be 0 regardless of term value

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

## MODIFIED Requirements

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
