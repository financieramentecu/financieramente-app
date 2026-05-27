# Delta for Negocios

## ADDED Requirements

### Requirement: Manual first-payment funding action (EMITIDO → FONDEADO)

The system MUST expose a "Fondear" action on the first annual installment row. This action MUST be available exclusively when all of the following are true simultaneously: `business.status === EMITIDO`, `business.dateAnchored` is null/absent, and `aporte.installmentIndex === 1`. Roles ADMIN and ANALISTA_SOPORTE MUST be able to trigger this action. All other roles MUST NOT see or be able to invoke it.

#### Scenario: Button visible under correct conditions

- GIVEN a business with `status = EMITIDO`, no `dateAnchored`, and installmentIndex 1 row rendered
- WHEN an ADMIN or ANALISTA_SOPORTE user views the installment table
- THEN the "Fondear" button MUST be visible on that row

#### Scenario: Button hidden when already fondeado

- GIVEN a business with `status = FONDEADO` or `dateAnchored` already set
- WHEN any user views the installment table
- THEN the "Fondear" button MUST NOT appear on any row

#### Scenario: Button hidden for non-first installment

- GIVEN a business with `status = EMITIDO` and no `dateAnchored`
- WHEN any user views installment rows with `installmentIndex > 1`
- THEN the "Fondear" button MUST NOT appear on those rows

#### Scenario: Button hidden for unauthorized role

- GIVEN a user whose role is not ADMIN or ANALISTA_SOPORTE
- WHEN they view the first installment row under otherwise valid conditions
- THEN the "Fondear" button MUST NOT be visible

---

### Requirement: Funding confirmation dialog with manual date entry

The system MUST present a confirmation dialog when the "Fondear" action is triggered. The dialog MUST require the user to supply a `fondeoDate` before confirming. The dialog MUST NOT allow submission without a valid date value.

#### Scenario: Dialog renders date input on open

- GIVEN the "Fondear" button is clicked
- WHEN the confirmation dialog opens
- THEN a date input field MUST be visible and empty by default

#### Scenario: Confirm disabled without date

- GIVEN the confirmation dialog is open
- WHEN `fondeoDate` is absent or invalid
- THEN the confirm action MUST be disabled

---

### Requirement: Atomic funding transaction

On confirmation, the system MUST apply the following atomically in a single database transaction: set `Business.status = FONDEADO`, set `Business.dateAnchored = fondeoDate`, set the first installment `Payment.dateAnchored = fondeoDate`. The transaction MUST only proceed if `Business.status` is currently `EMITIDO` at execution time (status guard). If the guard fails, the transaction MUST abort and return an error.

#### Scenario: Successful funding

- GIVEN a business with `status = EMITIDO` and no `dateAnchored`, installmentIndex 1
- WHEN the user confirms with a valid `fondeoDate`
- THEN `Business.status` MUST equal `FONDEADO`
- AND `Business.dateAnchored` MUST equal `fondeoDate`
- AND the first installment `Payment.dateAnchored` MUST equal `fondeoDate`
- AND the three changes MUST have been applied atomically

#### Scenario: Concurrent funding guard

- GIVEN a business whose status changed to `FONDEADO` between the UI load and the confirm
- WHEN the funding transaction executes
- THEN the transaction MUST abort
- AND an error response MUST be returned to the caller

---

### Requirement: Funding endpoint role gate

The `POST /api/negocios/[id]/aportes/[index]/fondear` endpoint MUST reject requests from any caller whose session role is not ADMIN or ANALISTA_SOPORTE with a 403 response. Authenticated users of allowed roles MUST receive a 200 response on success.

#### Scenario: Allowed role succeeds

- GIVEN an authenticated ADMIN or ANALISTA_SOPORTE session
- WHEN a valid funding request is submitted
- THEN the response MUST be 200 with updated business data

#### Scenario: Disallowed role rejected

- GIVEN an authenticated session with a role other than ADMIN or ANALISTA_SOPORTE
- WHEN a funding request is submitted
- THEN the response MUST be 403

---

### Requirement: Audit log entry on funding

Every successful funding transaction MUST write an `APORTE_PRIMER_PAGO_FONDEADO` audit entry. The entry MUST capture: `userId`, `email`, `ipAddress`, `userAgent`, `fondeoDate`, and the business identifier.

#### Scenario: Audit written on success

- GIVEN a successful funding transaction
- WHEN the operation completes
- THEN exactly one `APORTE_PRIMER_PAGO_FONDEADO` audit record MUST exist for that business
- AND it MUST include the actor's userId, email, and the fondeoDate supplied

---

## MODIFIED Requirements

### Requirement: Initial annual installment row state

Each annual installment row created at business creation **MUST** start with status **FONDEADO** and **MUST** have **no** funding date recorded (`date_anchored` absent/null) until the manual first-payment funding action sets it.

(Previously: rows started with status **SIN_FONDEAR**. The `SIN_FONDEAR` initial-state requirement is superseded: installment tracking is now anchored to the business-level funding gate, not a per-payment pre-funded status.)

#### Scenario: Initial state after create

- GIVEN **Anual** with term **n** and successful create
- WHEN installment rows are read
- THEN each row **SHALL** have status **FONDEADO**
- AND **SHALL NOT** have a funding timestamp

---

### Requirement: User-visible labels for installment status

When annual installment **status** is shown in the product UI, the system **SHOULD** display **"FONDEADO"** for the funded state. The label **"SIN FONDEAR"** is no longer applicable to initial-state rows.

(Previously: the system should display "SIN FONDEAR" and "FONDEADO" for those states respectively.)

#### Scenario: Funded row label

- GIVEN a row in **FONDEADO** state
- WHEN the UI shows human-readable status
- THEN the label **SHOULD** be **"FONDEADO"**

---

## REMOVED Requirements

### Requirement: SIN_FONDEAR as initial installment status

(Reason: The `SIN_FONDEAR` state as the mandatory starting point for annual installment rows is deprecated. Installments now start as `FONDEADO` (unpinned — no date set). The business-level `EMITIDO` status and absent `dateAnchored` are the canonical signals that funding has not yet occurred. The per-payment `SIN_FONDEAR` state is obsolete within this lifecycle.)
