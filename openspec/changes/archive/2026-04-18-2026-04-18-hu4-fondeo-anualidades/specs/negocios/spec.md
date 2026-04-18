# Delta for negocios

## MODIFIED Requirements

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

## ADDED Requirements

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
