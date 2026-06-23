# payment-funding-cron Specification

## Purpose

Scheduled service that funds all `SIN_FONDEAR` payments whose due date has arrived (America/Bogota), flips the parent business to `FONDEADO` on the first funding event, and exposes an authenticated internal HTTP route for the system cron to call.

---

## Requirements

### Requirement: Fund Due Payments Service

The system SHALL provide `fundDuePayments(today: Date)` in `payment-state.service.ts`. It MUST fund every payment with `status = SIN_FONDEAR` and `expectedDate <= today` (America/Bogota calendar day). It MUST skip payments in `EN_CARTERA`, `PAGO_ANTICIPADO`, `CARTERA_PAGADO`, or `FONDEADO`. It MUST NOT skip payments that are overdue (due date in the past).

#### Scenario: Due payment funded on scheduled run

- GIVEN a payment with `status = SIN_FONDEAR` and `expectedDate = today` (Bogota)
- WHEN `fundDuePayments(today)` runs
- THEN that payment's `status` SHALL become `FONDEADO` and `dateAnchored` SHALL be set to today
- AND an AuditLog entry MUST be created with action `PAYMENT_CRON_FUNDED`

#### Scenario: Overdue payment funded (today and backwards)

- GIVEN a payment with `status = SIN_FONDEAR` and `expectedDate` one month before today (Bogota)
- WHEN `fundDuePayments(today)` runs
- THEN that payment MUST also be funded (not skipped)

#### Scenario: Future payment not funded

- GIVEN a payment with `status = SIN_FONDEAR` and `expectedDate` strictly after today (Bogota)
- WHEN `fundDuePayments(today)` runs
- THEN that payment MUST remain `SIN_FONDEAR` with `dateAnchored` null

#### Scenario: EN_CARTERA payment skipped

- GIVEN a payment with `status = EN_CARTERA` and `expectedDate <= today`
- WHEN `fundDuePayments(today)` runs
- THEN that payment MUST remain `EN_CARTERA` and unchanged

#### Scenario: PAGO_ANTICIPADO payment skipped

- GIVEN a payment with `status = PAGO_ANTICIPADO` and `expectedDate <= today`
- WHEN `fundDuePayments(today)` runs
- THEN that payment MUST remain `PAGO_ANTICIPADO` and unchanged

---

### Requirement: Business FONDEADO Flip on First Funding

When `fundDuePayments` funds the first payment for a business that has never been funded (no prior `FONDEADO` payment), the system MUST transition the parent business from `EMITIDO` to `FONDEADO` and stamp `Business.dateAnchored` (only when currently `null`). The flip MUST NOT be tied to `installmentIndex = 1`; it triggers on the first actual funding event.

#### Scenario: First funding event flips business to FONDEADO

- GIVEN a business in `EMITIDO` with all payments `SIN_FONDEAR` and `Business.dateAnchored = null`
- WHEN `fundDuePayments` funds the first due payment
- THEN business `status` SHALL become `FONDEADO`
- AND `Business.dateAnchored` SHALL be set to the funding date
- AND an AuditLog entry MUST be created with action `BUSINESS_CRON_FONDEADO`

#### Scenario: dateAnchored write-once — not overwritten on subsequent funding

- GIVEN a business already `FONDEADO` with `Business.dateAnchored` set
- WHEN `fundDuePayments` funds a later payment for that same business
- THEN `Business.dateAnchored` MUST NOT be changed
- AND business status remains `FONDEADO`

---

### Requirement: Cron Does Not Flip CARTERA Business

If a business is in `CARTERA` status, `fundDuePayments` MUST NOT change the business status to `FONDEADO`, even when it funds individual `SIN_FONDEAR` payments belonging to that business.

#### Scenario: Business stays CARTERA after cron funds a payment

- GIVEN a business in `CARTERA` status with a `SIN_FONDEAR` payment due today
- WHEN `fundDuePayments(today)` runs
- THEN that payment's `status` SHALL become `FONDEADO` (with `PAYMENT_CRON_FUNDED` audit)
- AND the business status MUST remain `CARTERA`
- AND `Business.dateAnchored` MUST NOT be changed if already set

---

### Requirement: Authenticated Cron Route

The system MUST expose `POST /api/negocios/cron/fund-payments`. Requests MUST include `Authorization: Bearer <CRON_SECRET>`. Requests without the header or with an incorrect secret MUST be rejected with HTTP 401. On success, the route SHALL call `fundDuePayments` with today (America/Bogota) and return HTTP 200 with a summary of funded payments and businesses flipped.

#### Scenario: Valid Bearer executes funding run

- GIVEN a valid `Authorization: Bearer <correct CRON_SECRET>` header
- WHEN `POST /api/negocios/cron/fund-payments` is called
- THEN the response SHALL be HTTP 200 with a summary payload
- AND `fundDuePayments` MUST have been invoked with today (Bogota)

#### Scenario: Missing Authorization header rejected

- GIVEN no `Authorization` header in the request
- WHEN `POST /api/negocios/cron/fund-payments` is called
- THEN the response MUST be HTTP 401
- AND no payments or businesses SHALL be modified

#### Scenario: Wrong secret rejected

- GIVEN `Authorization: Bearer wrong-secret`
- WHEN `POST /api/negocios/cron/fund-payments` is called
- THEN the response MUST be HTTP 401
- AND no payments or businesses SHALL be modified

---

### Requirement: Bogota Timezone Semantics

All date comparisons in `fundDuePayments` and the cron route MUST use America/Bogota. "Today" MUST be the current calendar day in America/Bogota, not UTC. A centralized helper MUST be used; no ISO-string slicing.

#### Scenario: Date close to midnight UTC (Bogota still previous day)

- GIVEN current UTC time is 2026-06-12T03:00:00Z (which is 2026-06-11 22:00:00 -05:00 Bogota)
- WHEN `fundDuePayments` determines "today"
- THEN "today" in Bogota SHALL be 2026-06-11, not 2026-06-12
- AND payments with `expectedDate = 2026-06-12` MUST NOT be funded

#### Scenario: Date close to midnight UTC (Bogota already next day)

- GIVEN current UTC time is 2026-06-12T06:00:00Z (which is 2026-06-12 01:00:00 -05:00 Bogota)
- WHEN `fundDuePayments` determines "today"
- THEN "today" in Bogota SHALL be 2026-06-12
- AND payments with `expectedDate = 2026-06-12` MUST be eligible for funding

---

### Requirement: Audit Logging for Cron Operations

Every successful payment funding by the cron MUST produce an `AuditLog` entry with `action = PAYMENT_CRON_FUNDED`. Every business status flip to `FONDEADO` triggered by the cron MUST produce an `AuditLog` entry with `action = BUSINESS_CRON_FONDEADO`. Both actions MUST be registered in the `AuditAction` enum.

#### Scenario: AuditLog entry for cron-funded payment

- GIVEN `fundDuePayments` successfully funds a payment
- THEN an AuditLog entry SHALL exist with `action = PAYMENT_CRON_FUNDED`, the payment index, `idBusiness`, and the funding date
- AND `logAuditEvent` MUST NOT throw or block if it fails internally
