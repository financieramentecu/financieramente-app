# Delta for negocios-aportes-fondeo

## MODIFIED Requirements

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
