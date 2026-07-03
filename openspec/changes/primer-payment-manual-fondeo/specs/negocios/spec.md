# Delta for negocios

## MODIFIED Requirements

### Requirement: Aporte Visual State Rendering

The FundingModal MUST derive the visual state of each aporte from `(status, installmentIndex, expectedDate, now, role)` and render exactly one of nine mutually exclusive variants. No aporte MAY display in two variants simultaneously.

(Previously: `installmentIndex` was not a classification input; SIN_FONDEAR variants were absent because the cron auto-funded all payments before the modal rendered them.)

| Variant | Condition | Row color | Label | Buttons (ADMIN/ANALISTA_SOPORTE) | Buttons (AGENTE/COACH) |
|---|---|---|---|---|---|
| SIN_FONDEAR-PRIMER | status=SIN_FONDEAR AND installmentIndex=1 | Amber | "Sin fondear — Aporte 1" | FONDEAR | — |
| SIN_FONDEAR-FUTURO | status=SIN_FONDEAR AND installmentIndex>1 AND expectedDate strictly future | Default | "Pendiente: {expectedDate}" | Marcar Cartera, Pago Anticipado | — |
| SIN_FONDEAR-CURRENT | status=SIN_FONDEAR AND installmentIndex>1 AND expectedDate in current month | Default | "Pendiente: {expectedDate}" | Marcar Cartera | — |
| SIN_FONDEAR-VENCIDO | status=SIN_FONDEAR AND installmentIndex>1 AND expectedDate past | Default | "Vencido: {expectedDate}" | — | — |
| FONDEADO-PAST | status=FONDEADO AND dateAnchored month/year < current month/year | Green | "Fondeado: {dateAnchored}" | — | — |
| FONDEADO-CURRENT | status=FONDEADO AND dateAnchored month/year >= current month/year | Gray | "Se fondeará en: {expectedDate}" | Marcar Cartera, Pago Anticipado | — |
| EN_CARTERA | status=EN_CARTERA | Red (fila completa) | "En cartera: {portfolioDate}" | Quitar Cartera | — |
| PAGO_ANTICIPADO | status=PAGO_ANTICIPADO | Green | "Pago anticipado: {earlyPaymentDate}" | — | — |
| CARTERA_PAGADO | status=CARTERA_PAGADO | Green | "Cartera pagada: {portfolioPaymentDate}" | — | — |

**Date resolution rule**: use `expectedDate ?? dateAnchored` as reference for month comparison. If both null → FONDEADO_CURRENT (gray, "Fecha por confirmar").

**Payment lifecycle** (corrected): Payments are created as SIN_FONDEAR at EMITIDO transition with no dateAnchored. Installment 1 transitions to FONDEADO only via explicit operator action. Installments 2+ transition via cron when expectedDate <= today.

#### Scenario: Installment 1 SIN_FONDEAR shows FONDEAR button for privileged roles

- GIVEN aporte with status=SIN_FONDEAR and installmentIndex=1
- WHEN ADMIN or ANALISTA_SOPORTE opens the FundingModal
- THEN the row renders amber with only a "FONDEAR" button (no Marcar Cartera, no Pago Anticipado)

#### Scenario: Future SIN_FONDEAR (index>1) shows cartera and anticipado buttons

- GIVEN aporte with status=SIN_FONDEAR, installmentIndex>1, expectedDate strictly future
- WHEN ADMIN or ANALISTA_SOPORTE opens the modal
- THEN Marcar Cartera and Pago Anticipado buttons are visible

#### Scenario: Current-month SIN_FONDEAR (index>1) shows only Marcar Cartera

- GIVEN aporte with status=SIN_FONDEAR, installmentIndex>1, expectedDate in current month/year
- WHEN ADMIN or ANALISTA_SOPORTE opens the modal
- THEN only Marcar Cartera button is visible; Pago Anticipado is not shown

#### Scenario: Past SIN_FONDEAR (index>1) shows no buttons

- GIVEN aporte with status=SIN_FONDEAR, installmentIndex>1, expectedDate in a past month
- WHEN any role opens the modal
- THEN no action buttons are visible (cron handles this payment)

#### Scenario: Past-month FONDEADO renders green, no buttons (unchanged)

- GIVEN aporte with status=FONDEADO and dateAnchored in a prior month/year
- WHEN any role opens the FundingModal
- THEN the row is green with no action buttons

#### Scenario: Current/future FONDEADO renders gray with action buttons (unchanged)

- GIVEN aporte with status=FONDEADO and dateAnchored in current or future month/year
- WHEN ADMIN or ANALISTA_SOPORTE opens the modal
- THEN the row is gray AND Marcar Cartera and Pago Anticipado buttons are visible

---

## ADDED Requirements

### Requirement: First Payment Manual Funding

An operator with canFundPayments authorization MUST be able to manually fund installment 1 by providing a date. The system MUST open a date picker dialog (defaulting to today in Bogotá time) when the FONDEAR button is clicked. On confirm, the system MUST atomically: transition payment 1 from SIN_FONDEAR to FONDEADO with `dateAnchored = dateOnlyToBogotaNoonUtc(fundingDate)`; and, if business status is EMITIDO, transition business to FONDEADO with the same dateAnchored.

#### Scenario: Operator funds payment 1 — business transitions EMITIDO → FONDEADO

- GIVEN payment 1 in SIN_FONDEAR and business in EMITIDO, operator has canFundPayments
- WHEN operator selects a date and confirms FONDEAR
- THEN payment 1 SHALL be FONDEADO with `dateAnchored` equal to the chosen date at Bogotá noon UTC
- AND business SHALL be FONDEADO with the same `dateAnchored`

#### Scenario: Payment 1 funded when business already FONDEADO

- GIVEN payment 1 in SIN_FONDEAR and business already in FONDEADO
- WHEN operator confirms FONDEAR with any date
- THEN payment 1 SHALL become FONDEADO with that dateAnchored
- AND business status SHALL NOT change

#### Scenario: API rejects funding when payment 1 is not SIN_FONDEAR

- GIVEN payment 1 with status=FONDEADO
- WHEN POST /fondear-aportes with fundedInstallmentIndexes=[1] is called
- THEN the API MUST return 409 Conflict and no state change occurs

#### Scenario: Operator may select future date

- GIVEN the date picker dialog is open for payment 1
- WHEN operator selects a date in the future and confirms
- THEN payment 1 SHALL become FONDEADO with that future dateAnchored
- AND the system MUST NOT reject a future date as invalid

---

### Requirement: Cron Auto-Funding Excludes First Payment

The `fundDuePayments` cron job MUST only query payments where `installmentIndex > 1`. Installment 1 MUST NOT appear in the cron's funding set, regardless of its status or expectedDate.

#### Scenario: Cron skips installment 1 even when past due

- GIVEN payment with installmentIndex=1, status=SIN_FONDEAR, expectedDate <= today
- WHEN fundDuePayments cron runs
- THEN payment 1 MUST remain SIN_FONDEAR
- AND no audit entry for that payment is created by the cron

#### Scenario: Cron funds installments 2+ normally

- GIVEN payment with installmentIndex=2, status=SIN_FONDEAR, expectedDate <= today
- WHEN fundDuePayments cron runs
- THEN that payment SHALL be FONDEADO with dateAnchored = expectedDate

---

### Requirement: Fondear Endpoint Accepts Optional Funding Date

`POST /api/negocios/[id]/fondear-aportes` MUST accept an optional `fundingDate` field (string, YYYY-MM-DD) in the request body. When `fundingDate` is provided, each funded payment's `dateAnchored` SHALL be `dateOnlyToBogotaNoonUtc(fundingDate)`. When absent, existing behavior applies (use expectedDate). The field MUST be validated as a valid date string when present.

#### Scenario: fundingDate provided overrides expectedDate as dateAnchored

- GIVEN a POST with `fundedInstallmentIndexes=[1]` and `fundingDate="2025-06-15"`
- WHEN the transaction commits
- THEN payment 1 `dateAnchored` SHALL equal the UTC noon instant for 2025-06-15 in Bogotá timezone

#### Scenario: fundingDate absent uses expectedDate (backward compatible)

- GIVEN a POST with `fundedInstallmentIndexes=[2]` and no fundingDate
- WHEN the transaction commits
- THEN payment 2 `dateAnchored` SHALL equal its `expectedDate` (existing behavior unchanged)

---

### Requirement: Manual First Payment Audit Action

The system MUST register `APORTE_PRIMER_PAGO_FONDADO_MANUAL` in the `AuditAction` enum. Every successful manual funding of installment 1 MUST emit exactly one AuditLog entry including: userId, email, ipAddress, userAgent, businessId, installmentIndex=1, fundingDate, previousStatus=SIN_FONDEAR. `logAuditEvent` MUST NOT throw or block the response.

#### Scenario: Audit entry on manual first payment funding

- GIVEN successful manual FONDEAR on payment 1
- WHEN the endpoint responds with success
- THEN AuditLog MUST contain action=APORTE_PRIMER_PAGO_FONDADO_MANUAL with all required identity and context fields
