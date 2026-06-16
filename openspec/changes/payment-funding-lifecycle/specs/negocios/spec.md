# Delta for negocios

## ADDED Requirements

### Requirement: Payment Creation Defaults to SIN_FONDEAR

When a business transitions to `EMITIDO` and payments are created via `syncPaymentsStructure`, every new payment MUST be created with `status = SIN_FONDEAR` and `dateAnchored = null`.

#### Scenario: New EMITIDO payments start SIN_FONDEAR

- GIVEN a business transitions to `EMITIDO` and `syncPaymentsStructure` runs
- WHEN payment rows are created
- THEN each payment SHALL have `status = SIN_FONDEAR` and `dateAnchored = null`

#### Scenario: Existing payments not affected by sync

- GIVEN payments already exist with `status = FONDEADO`
- WHEN `syncPaymentsStructure` runs on a business that is already `EMITIDO`
- THEN existing `FONDEADO` payments MUST NOT be downgraded

---

### Requirement: CARTERA Business Status

The system MUST support `CARTERA` as a valid business status in `BUSINESS_STATUS` and the `BusinessStatus` union type. The invariant MUST hold: a business is `CARTERA` if and only if it has at least one payment with `status = EN_CARTERA`; a business is `FONDEADO` if and only if it has at least one funded payment and zero `EN_CARTERA` payments.

#### Scenario: CARTERA accepted in type validation

- GIVEN `status = CARTERA`
- WHEN validated against `BUSINESS_STATUS` or `BusinessStatus`
- THEN validation SHALL succeed

#### Scenario: CARTERA accepted in business-api.schemas.ts

- GIVEN a request payload with `status = CARTERA`
- WHEN schema validation runs
- THEN validation SHALL succeed

---

### Requirement: markCartera Sets Business to CARTERA

When an authorized user marks a payment as `EN_CARTERA` (via `markCartera`), the system MUST atomically set the payment's `status = EN_CARTERA`, stamp the payment's cartera date, AND set the parent business `status = CARTERA`. The audit actions `APORTE_CARTERA_MARKED` and `BUSINESS_CARTERA` MUST both be logged.

#### Scenario: markCartera transitions payment and business

- GIVEN a business in `FONDEADO` with a payment in `FONDEADO`
- WHEN an authorized user calls markCartera for that payment
- THEN the payment `status` SHALL become `EN_CARTERA` with cartera date set
- AND the business `status` SHALL become `CARTERA`
- AND AuditLog entries MUST be created for `APORTE_CARTERA_MARKED` and `BUSINESS_CARTERA`

#### Scenario: markCartera on non-FONDEADO payment rejected

- GIVEN a payment with `status = SIN_FONDEAR` or `CARTERA_PAGADO`
- WHEN the API call to markCartera is made
- THEN the API MUST return 409 Conflict and no state change SHALL occur

---

### Requirement: markCarteraPagado Returns Business to FONDEADO When No EN_CARTERA Remain

When `markCarteraPagado` is called and the payment transitions to `CARTERA_PAGADO`, the system MUST check if any other payment for the same business remains `EN_CARTERA`. If none remain, the business MUST return to `FONDEADO` and `Business.dateAnchored` SHALL be stamped only if currently `null`. The `BUSINESS_REFONDEADO` audit action MUST be logged on the business status change.

#### Scenario: Last EN_CARTERA resolved — business returns to FONDEADO

- GIVEN a business in `CARTERA` with exactly one `EN_CARTERA` payment
- WHEN that payment is transitioned to `CARTERA_PAGADO`
- THEN the business `status` SHALL become `FONDEADO`
- AND `Business.dateAnchored` SHALL be stamped if null
- AND an AuditLog entry MUST be created with action `BUSINESS_REFONDEADO`

#### Scenario: Other EN_CARTERA payments remain — business stays CARTERA

- GIVEN a business in `CARTERA` with two `EN_CARTERA` payments
- WHEN one payment is transitioned to `CARTERA_PAGADO`
- THEN the business `status` MUST remain `CARTERA`

#### Scenario: dateAnchored not overwritten on refondeo

- GIVEN a business with `Business.dateAnchored` already set
- WHEN `markCarteraPagado` returns the business to `FONDEADO`
- THEN `Business.dateAnchored` MUST NOT be changed

---

### Requirement: Funded Date PATCH Endpoint and Edit Modal

The system MUST expose `PATCH /api/negocios/[id]/aportes/[index]/date-anchored` for authorized users (ADMIN, ANALISTA_SOPORTE) to update a payment's `dateAnchored`. A UI modal SHALL mirror the "adelantar pago" flow (date input, confirmation step). The endpoint MUST require role authorization and MUST log the change to AuditLog.

#### Scenario: Authorized user updates dateAnchored

- GIVEN a user with role ADMIN or ANALISTA_SOPORTE and a `FONDEADO` payment
- WHEN PATCH `/api/negocios/[id]/aportes/[index]/date-anchored` is called with a valid date
- THEN the payment's `dateAnchored` SHALL be updated to the new value
- AND an AuditLog entry MUST be created

#### Scenario: Unauthorized user rejected

- GIVEN a user with role AGENTE or COACH
- WHEN PATCH `/api/negocios/[id]/aportes/[index]/date-anchored` is called
- THEN the API MUST return 403 Forbidden and no change SHALL occur

---

### Requirement: Aporte Visual State — SIN_FONDEAR Variant

The `aporte-visual-state` module MUST handle `SIN_FONDEAR` as a distinct variant. A `SIN_FONDEAR` payment MUST render without action buttons (no "Marcar Cartera", no "Pago Anticipado") for any role.

#### Scenario: SIN_FONDEAR payment renders with no action buttons

- GIVEN a payment with `status = SIN_FONDEAR`
- WHEN any role opens the FundingModal
- THEN the row SHALL render the `SIN_FONDEAR` variant
- AND no action buttons SHALL be visible

---

### Requirement: Button Visibility — Bogota Month Boundary Rules

The system MUST apply Bogota timezone when evaluating month boundaries for action button visibility. The rules are:

| Button | Condition |
|--------|-----------|
| "Marcar Cartera" | `status = FONDEADO` AND reference month/year >= current month/year (Bogota) |
| "Pago Anticipado" | `status = FONDEADO` AND reference month/year is strictly AFTER current month/year (Bogota) |

Reference date is `expectedDate ?? dateAnchored`. If both null, use FONDEADO_CURRENT (no action buttons).

#### Scenario: Cartera button visible for current-month FONDEADO payment

- GIVEN a payment with `status = FONDEADO` and `expectedDate` in the current calendar month (Bogota)
- WHEN an authorized user opens the FundingModal
- THEN "Marcar Cartera" SHALL be visible
- AND "Pago Anticipado" SHALL NOT be visible (not strictly future)

#### Scenario: Both buttons visible for future-month FONDEADO payment

- GIVEN a payment with `status = FONDEADO` and `expectedDate` one or more months after current (Bogota)
- WHEN an authorized user opens the FundingModal
- THEN both "Marcar Cartera" AND "Pago Anticipado" SHALL be visible

#### Scenario: No action buttons for past-month FONDEADO payment

- GIVEN a payment with `status = FONDEADO` and `expectedDate` in a prior month/year (Bogota)
- WHEN any role opens the FundingModal
- THEN no action buttons SHALL be visible (FONDEADO-PAST variant)

#### Scenario: Bogota midnight edge — UTC date ahead of Bogota calendar day

- GIVEN current UTC is 2026-07-01T03:00:00Z (Bogota: 2026-06-30 22:00:00)
- AND a payment with `expectedDate = 2026-07-01`
- WHEN button visibility is evaluated
- THEN the system SHALL treat current month as June 2026 (Bogota)
- AND that payment's "Marcar Cartera" SHALL NOT be visible (payment is in a future month)

---

### Requirement: CARTERA Status Rendered in UI Surfaces

`CARTERA` MUST appear as a distinct labeled option in the business list status filter (`AdvancedFiltersSheet`), in the status badge component (`BusinessStatusBadge`), and in the production dashboard donut chart (`by-status-colors.ts`) with a dedicated color and label.

#### Scenario: CARTERA selectable in status filter

- GIVEN the user opens the status filter in the business list
- WHEN they inspect the options
- THEN a choice corresponding to `CARTERA` MUST be available

#### Scenario: CARTERA badge renders

- GIVEN a business with `status = CARTERA`
- WHEN the business list or detail renders
- THEN a status badge labeled with the `CARTERA` display label SHALL be visible

#### Scenario: CARTERA appears in dashboard donut

- GIVEN at least one business in `CARTERA` status
- WHEN the production dashboard donut renders
- THEN the `CARTERA` segment SHALL appear with its own color and label

---

### Requirement: Timezone Fix for isSameMonthOrFuture

The `isSameMonthOrFuture` function MUST use America/Bogota for all month/year comparisons. It MUST NOT derive the current month by slicing a UTC ISO string.

#### Scenario: Correct month derived in Bogota timezone

- GIVEN current UTC time places the calendar day in a prior Bogota month (e.g., UTC 2026-07-01T01:00:00Z = Bogota June 30)
- WHEN `isSameMonthOrFuture` is called for a date in June 2026
- THEN the function SHALL return `true` (same month in Bogota)
- AND would return `false` if it incorrectly used UTC (July)

---

### Requirement: Idempotent Migration — Reset Future Payments to SIN_FONDEAR

The migration script `prisma/seeds/reset-future-payments-to-sin-fondear.ts` MUST run five idempotent steps in order:
1. **Schedule backfill (emitted businesses)**: for every business in an emitted lifecycle status (`EMITIDO`, `FONDEADO`, `CARTERA`) with payments missing `expectedDate`, recompute the schedule via `calculateExpectedDates(dateIssued, numAportes, periodicityName)` and persist `expectedDate` per `installmentIndex`. Businesses with missing `dateIssued`/`numAportes`/periodicity, or an unknown periodicity (which would clone dates), MUST be skipped and logged for manual review — never guessed.
2. **Future reset (emitted businesses)**: every payment with `status = FONDEADO` and `expectedDate` strictly after today (Bogota): set `status = SIN_FONDEAR` and `dateAnchored = null`.
3. **Non-emitted cleanup**: payments of `VENTA_EFECTUADA` businesses in `FONDEADO` or `SIN_FONDEAR` state are reset to `SIN_FONDEAR` with `dateAnchored = null` AND `expectedDate = null` (the real schedule is generated on emission). Cartera/anticipado payments on non-emitted businesses are left untouched and logged as anomalies.
4. **FONDEADO invariant backfill**: every business with `status = EMITIDO`, at least one `FONDEADO` payment, and zero `EN_CARTERA` payments: set business `status = FONDEADO` and stamp `Business.dateAnchored` with the earliest payment funding date (write-once — only when the business date is null). This closes the legacy gap the cron cannot resolve (the cron only flips a business when IT funds a payment). Audited with `BUSINESS_MIGRATION_FONDEADO`.
5. **Cartera invariant backfill**: every business with at least one `EN_CARTERA` payment: set business `status = CARTERA`.

`EN_CARTERA` payments are never modified by any step. Running the script twice MUST produce the same result as running it once.

#### Scenario: EMITIDO business with funded payment flipped to FONDEADO

- GIVEN an `EMITIDO` business with at least one `FONDEADO` payment and no `EN_CARTERA` payment
- WHEN the migration runs
- THEN the business `status` SHALL become `FONDEADO`
- AND `Business.dateAnchored` SHALL equal the earliest `dateAnchored` among its FONDEADO payments (only if it was null)

#### Scenario: Legacy payment without schedule gets expectedDate recomputed

- GIVEN an `EMITIDO` business with valid `dateIssued`, `numAportes`, and periodicity, and a payment with `expectedDate = null`
- WHEN the migration runs
- THEN that payment's `expectedDate` SHALL equal the recomputed schedule date for its `installmentIndex`

#### Scenario: Business with unrecoverable schedule is skipped

- GIVEN an emitted business missing `dateIssued` or with an unknown periodicity
- WHEN the migration runs
- THEN none of its payments SHALL be modified by steps 1–2
- AND the business SHALL be logged for manual review

#### Scenario: Future-due FONDEADO payment reset to SIN_FONDEAR

- GIVEN an emitted business and a payment with `status = FONDEADO` and `expectedDate` strictly after today (Bogota)
- WHEN the migration runs
- THEN that payment SHALL have `status = SIN_FONDEAR` and `dateAnchored = null`

#### Scenario: Past-due FONDEADO payment not touched

- GIVEN a payment with `status = FONDEADO` and `expectedDate` today or earlier (Bogota)
- WHEN the migration runs
- THEN that payment MUST remain `FONDEADO` with its `dateAnchored` unchanged

#### Scenario: Non-emitted business fully cleaned

- GIVEN a `VENTA_EFECTUADA` business with payments in `FONDEADO` state
- WHEN the migration runs
- THEN those payments SHALL be `SIN_FONDEAR` with `dateAnchored = null` and `expectedDate = null`

#### Scenario: EN_CARTERA payment untouched

- GIVEN a payment with `status = EN_CARTERA`
- WHEN the migration runs
- THEN that payment MUST remain `EN_CARTERA` with all fields unchanged

#### Scenario: Business with EN_CARTERA payment backfilled to CARTERA

- GIVEN a business with at least one payment in `EN_CARTERA`
- WHEN the migration runs
- THEN the business `status` SHALL become `CARTERA`

#### Scenario: Migration is idempotent

- GIVEN the migration has already been run once
- WHEN the migration runs a second time
- THEN the resulting database state SHALL be identical to after the first run (no error, no double mutation)

---

## MODIFIED Requirements

### Requirement: Aporte Visual State Rendering

The FundingModal MUST derive the visual state of each aporte from `(status, expectedDate, dateAnchored, now, role)` using America/Bogota for all date comparisons and render exactly one of six mutually exclusive variants. No aporte MAY display in two variants simultaneously.

(Previously: Five variants; no SIN_FONDEAR variant; month comparison used UTC ISO slicing; cartera/anticipado button visibility did not distinguish current vs. future month in Bogota.)

| Variant | Condition | Row color | Label | Buttons (ADMIN/ANALISTA_SOPORTE) | Buttons (AGENTE/COACH) |
|---|---|---|---|---|---|
| SIN_FONDEAR | status=SIN_FONDEAR | Gray | "Sin fondear" | — | — |
| FONDEADO-PAST | status=FONDEADO AND ref month/year < current (Bogota) | Green | "Fondeado: {dateAnchored}" | — | — |
| FONDEADO-CURRENT | status=FONDEADO AND ref month/year = current (Bogota) | Gray | "Se fondeará en: {expectedDate}" | Marcar Cartera | — |
| FONDEADO-FUTURE | status=FONDEADO AND ref month/year > current (Bogota) | Gray | "Se fondeará en: {expectedDate}" | Marcar Cartera, Pago Anticipado | — |
| EN_CARTERA | status=EN_CARTERA | Red | "En cartera: {portfolioDate}" | Quitar Cartera | — |
| PAGO_ANTICIPADO | status=PAGO_ANTICIPADO | Green | "Pago anticipado: {earlyPaymentDate}" | — | — |
| CARTERA_PAGADO | status=CARTERA_PAGADO | Green | "Cartera pagada: {portfolioPaymentDate}" | — | — |

**Date resolution rule**: reference = `expectedDate ?? dateAnchored`. If both null → FONDEADO_CURRENT (gray, "Fecha por confirmar"). All month comparisons MUST use America/Bogota.

**Round 6 note — no "Fondear primer pago" button**: The table above does NOT include a manual "Fondear primer pago" button. The EMITIDO→FONDEADO business flip is owned exclusively by the daily cron (`fundDuePayments`) and the migration backfill (Decision 7). A FONDEADO first payment (installment index 1) MUST render identically to any other FONDEADO payment — no special button is shown. This was implemented in Round 6 by removing `getFirstPaymentFondeoButton`, `MARK_FONDEAR` from `AporteButton`, and the entire `POST /api/negocios/[id]/aportes/[index]/fondear` route.

#### Scenario: SIN_FONDEAR payment renders no action buttons

- GIVEN a payment with `status = SIN_FONDEAR`
- WHEN any role opens the FundingModal
- THEN the row SHALL render the SIN_FONDEAR variant with no action buttons

#### Scenario: Past-month FONDEADO renders green, no buttons

- GIVEN a payment with `status = FONDEADO` and reference date in a prior month/year (Bogota)
- WHEN any role opens the FundingModal
- THEN the row is green with no action buttons visible

#### Scenario: Current-month FONDEADO renders gray with Marcar Cartera only

- GIVEN a payment with `status = FONDEADO` and reference date in the current month/year (Bogota)
- WHEN a user with role ADMIN or ANALISTA_SOPORTE opens the modal
- THEN the row is gray AND "Marcar Cartera" SHALL be visible
- AND "Pago Anticipado" MUST NOT be visible

#### Scenario: Future-month FONDEADO renders gray with both action buttons

- GIVEN a payment with `status = FONDEADO` and reference date strictly after the current month/year (Bogota)
- WHEN a user with role ADMIN or ANALISTA_SOPORTE opens the modal
- THEN the row is gray AND both "Marcar Cartera" AND "Pago Anticipado" SHALL be visible

#### Scenario: Current/future aporte renders gray, no buttons for read-only roles

- GIVEN a payment with `status = FONDEADO` and reference date in the current or a future month/year (Bogota)
- WHEN a user with role AGENTE or COACH opens the modal
- THEN the row is gray AND no action buttons are visible

#### Scenario: EN_CARTERA aporte renders red with only Quitar Cartera

- GIVEN a payment with `status = EN_CARTERA`
- WHEN a user with role ADMIN or ANALISTA_SOPORTE opens the modal
- THEN the row is red and only "Quitar Cartera" button is visible
- AND "Pago Anticipado" MUST NOT be present

#### Scenario: PAGO_ANTICIPADO aporte renders green, no buttons

- GIVEN a payment with `status = PAGO_ANTICIPADO`
- WHEN any role opens the modal
- THEN the row is green with label "Pago anticipado {earlyPaymentDate}"
- AND no action buttons are visible

#### Scenario: CARTERA_PAGADO aporte renders green, no buttons

- GIVEN a payment with `status = CARTERA_PAGADO`
- WHEN any role opens the FundingModal
- THEN the row is green with label "Cartera pagada: {portfolioPaymentDate}"
- AND no action buttons are visible

---

### Requirement: AuditLog Coverage

Every successful state mutation MUST produce exactly one AuditLog entry. The entry MUST include: userId, email, ipAddress (via getClientIp), userAgent (via getUserAgent), and a human-readable details string naming the aporte index and resulting status. The following actions MUST be registered in the `AuditAction` enum: `APORTE_CARTERA_PAGADO`, `BUSINESS_CARTERA`, `BUSINESS_REFONDEADO`, `PAYMENT_CRON_FUNDED`, `BUSINESS_CRON_FONDEADO`.

(Previously: Covered `APORTE_CARTERA_MARKED`, `APORTE_CARTERA_UNMARKED`, `APORTE_PAGO_ANTICIPADO_MARKED`, `APORTE_CARTERA_PAGADO`. Did not include BUSINESS_CARTERA, BUSINESS_REFONDEADO, PAYMENT_CRON_FUNDED, BUSINESS_CRON_FONDEADO.)

#### Scenario: Audit entry content for CARTERA_PAGADO

- GIVEN a successful CARTERA_PAGADO transition
- WHEN the service completes
- THEN AuditLog contains action=APORTE_CARTERA_PAGADO, the aporte index, negocioId, portfolioPaymentDate, and actor identity fields
- AND logAuditEvent MUST NOT throw or block the response if it fails internally

#### Scenario: Audit entry for business CARTERA transition

- GIVEN a successful markCartera call
- WHEN the service completes
- THEN AuditLog MUST contain action=BUSINESS_CARTERA with the negocioId and actor identity fields

#### Scenario: Audit entry for BUSINESS_REFONDEADO

- GIVEN markCarteraPagado returns the business to FONDEADO
- WHEN the service completes
- THEN AuditLog MUST contain action=BUSINESS_REFONDEADO with the negocioId and actor identity fields

---

### Requirement: Renewed list status filter options

The principal business-list status filter MUST include `LIQUIDADO` and `CARTERA` as selectable values. The filter MUST NOT include `COMISIONANDO` as a selectable value.

(Previously: Filter included LIQUIDADO; did not include CARTERA.)

#### Scenario: LIQUIDADO selectable

- GIVEN the user opens the status filter on the principal list
- WHEN they inspect the options
- THEN a choice corresponding to `LIQUIDADO` MUST be available

#### Scenario: CARTERA selectable

- GIVEN the user opens the status filter on the principal list
- WHEN they inspect the options
- THEN a choice corresponding to `CARTERA` MUST be available

#### Scenario: COMISIONANDO not in filter

- GIVEN the user opens the status filter on the principal list
- WHEN they inspect the options
- THEN `COMISIONANDO` MUST NOT appear as a filter choice
