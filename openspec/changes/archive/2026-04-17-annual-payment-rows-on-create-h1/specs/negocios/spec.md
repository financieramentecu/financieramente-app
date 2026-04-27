# Delta: Negocios

Delta for change `annual-payment-rows-on-create-h1` (PRD H1). Describes **persisted annual installments** on business creation. Does **not** alter COMISIONANDO / Liquidar behavior (see baseline `openspec/specs/negocios/spec.md`).

## ADDED Requirements

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

## MODIFIED Requirements

_None (this change does not revise existing requirements in baseline negocios spec)._

## REMOVED Requirements

_None._
