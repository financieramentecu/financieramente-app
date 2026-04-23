# Delta for Negocios — hu3-fondeo-sin-anualidades

## ADDED Requirements

### Requirement: Fondeo action for EMITIDO businesses without annuities

The system MUST display a "Fondear" action in the business list for every business whose `status === EMITIDO` AND that has zero `AnnualPayment` rows. The action MUST be visible only to authorized roles: AGENTE (own businesses), ASISTENTE_GERENCIA_OPERATIVA (all businesses), ADMIN (all businesses).

#### Scenario: Authorized role sees Fondear on eligible business

- GIVEN an EMITIDO business with no AnnualPayment rows, viewed by an authorized role
- WHEN the business list renders
- THEN the "Fondear" action MUST appear in the actions column for that row

#### Scenario: Unauthorized role cannot see Fondear

- GIVEN an EMITIDO business with no AnnualPayment rows, viewed by ANALISTA_SOPORTE
- WHEN the business list renders
- THEN the "Fondear" action SHALL NOT appear for that row

---

### Requirement: FONDEADO transition on confirm

When an authorized user confirms the fondear action on an eligible business, the system MUST atomically set `dateAnchored = now()` and transition `status` to `FONDEADO`. No modal SHALL appear for non-annual businesses (zero AnnualPayment rows).

#### Scenario: Happy path — EMITIDO no annuities → FONDEADO

- GIVEN an EMITIDO business with no AnnualPayment rows and an authorized user
- WHEN the user confirms the fondear action
- THEN `status` SHALL become `FONDEADO`
- AND `dateAnchored` SHALL be set to the current timestamp

#### Scenario: VENTA_EFECTUADA business cannot be fondeada

- GIVEN a business in `VENTA_EFECTUADA` state
- WHEN a fondear request is submitted for it
- THEN the system MUST reject the request with a validation error
- AND `status` and `dateAnchored` SHALL remain unchanged

#### Scenario: Already FONDEADO business cannot be fondeada again

- GIVEN a business already in `FONDEADO` state
- WHEN a fondear request is submitted for it
- THEN the system MUST reject the request with a validation error

#### Scenario: Business with AnnualPayment rows redirects to modal (out of scope — HU4)

- GIVEN an EMITIDO business with one or more AnnualPayment rows
- WHEN the fondear action is triggered
- THEN the system MUST NOT execute the direct FONDEADO transition
- AND SHALL defer to the annual fondeo modal flow (HU4)

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

## MODIFIED Requirements

### Requirement: BUSINESS_STATUS as single source of truth

(Previously: `BUSINESS_STATUS` constant was defined in both `business-entity.types.ts` and `business-status.types.ts`, causing drift.)

The `BUSINESS_STATUS` constant MUST be consolidated into a single canonical location. All imports across the codebase SHALL reference only the consolidated source. The consolidated constant MUST include `FONDEADO` as a valid member.

#### Scenario: No duplicate constant definitions

- GIVEN the consolidated `BUSINESS_STATUS` constant
- WHEN the codebase is checked for duplicate constant declarations
- THEN exactly one definition SHALL exist
- AND all feature files SHALL import from that single location
