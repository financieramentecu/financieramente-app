# Delta for Negocios

## ADDED Requirements

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

### Requirement: CARTERA_PAGADO Visual Variant

The FundingModal MUST render a distinct `CARTERA_PAGADO` visual variant with green row styling, a label showing the portfolioPaymentDate, and no action buttons for any role.

| Variant | Condition | Row color | Label | Buttons |
|---|---|---|---|---|
| CARTERA_PAGADO | status=CARTERA_PAGADO | Green | "Cartera pagada: {portfolioPaymentDate}" | — |

#### Scenario: CARTERA_PAGADO renders green with date label, no buttons

- GIVEN an aporte with status=CARTERA_PAGADO
- WHEN any role opens the FundingModal
- THEN the row is green with label showing portfolioPaymentDate
- AND no action buttons are visible for any role

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

## MODIFIED Requirements

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

(Previously: Four variants only — CARTERA_PAGADO variant and its terminal behavior did not exist.)

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
