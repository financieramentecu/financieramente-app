# Delta for Pre-liquidación — Liquidar y Rezagar

## ADDED Requirements

### Requirement: Rezagar records user-initiated lag

The system MUST persist user-initiated lag: `status=LAG`, `isLag=true`, lag timestamps, `isLagByUser=true`, `isLagByUserDate` at action time.

#### Scenario: Lag fields written

- GIVEN eligible commissions selected for Rezagar
- WHEN the user confirms
- THEN each updated row SHALL have `status=LAG`, `isLag=true`, `isLagByUser=true`, and `isLagByUserDate` set

#### Scenario: Empty selection

- GIVEN no commission ids are submitted
- WHEN Rezagar runs
- THEN no row SHALL be updated and the response SHALL not indicate a system error

---

### Requirement: Liquidar settles commission and distributions together

The system MUST atomically set targeted `SettlementCommission` and linked `ComissionDistribution` rows to `SETTLED` with settlement time on commissions.

#### Scenario: Pre-liquidated row with distributions

- GIVEN `PRE-SETTLED` commissions with distributions
- WHEN Liquidar runs
- THEN commissions SHALL be `SETTLED` with settlement time AND distributions `SETTLED`

#### Scenario: No distributions

- GIVEN a `PRE-SETTLED` commission with no linked distributions
- WHEN Liquidar runs
- THEN the commission SHALL become `SETTLED` and the operation SHALL succeed

---

### Requirement: Liquidar applies POLIZA clawbacks to balances

For POLIZA flows with persisted pre-liquidación clawbacks, the system MUST apply clawbacks (reason append) and increase each user’s `ClawbackBalance`.

#### Scenario: POLIZA with clawback rows

- GIVEN `PRE-SETTLED` POLIZA with clawbacks on distributions
- WHEN Liquidar runs
- THEN clawbacks SHALL be applied with reason updated AND balances increased

#### Scenario: POLIZA without clawbacks

- GIVEN POLIZA with no clawback rows
- WHEN Liquidar runs
- THEN settlement and distribution updates SHALL still apply
- AND no `ClawbackBalance` change SHALL occur

---

### Requirement: Linked business becomes COMISIONANDO only from EMITIDO

Liquidar MUST promote linked businesses from `EMITIDO` to `COMISIONANDO` only; other statuses MUST NOT change.

#### Scenario: EMITIDO promoted

- GIVEN a business linked to a settled commission with `status=EMITIDO`
- WHEN Liquidar completes
- THEN that business SHALL have `status=COMISIONANDO`

#### Scenario: Already COMISIONANDO

- GIVEN the linked business has `status=COMISIONANDO`
- WHEN Liquidar completes
- THEN that business SHALL stay `COMISIONANDO` without redundant update

---

## MODIFIED Requirements

### Requirement: Import file reaches COMPLETED only with no SYNCHRONIZED and no PRE-SETTLED

**(Previously:** `COMPLETED` when zero `SYNCHRONIZED` only — wrong after pre-liquidación left `PRE-SETTLED` pending**.**)**

After Liquidar, the system MUST set the file to `COMPLETED` **iff** for that `idFileImport` both counts are zero: `SYNCHRONIZED` and `PRE-SETTLED`. If either count is positive, the system MUST NOT set `COMPLETED`.

#### Scenario: Partial Liquidar

- GIVEN zero `SYNCHRONIZED` but some `PRE-SETTLED` remain after Liquidar
- WHEN the operation completes
- THEN the file SHALL NOT be `COMPLETED`

#### Scenario: Sync backlog

- GIVEN at least one `SYNCHRONIZED` row remains for the file after Liquidar
- WHEN the operation completes
- THEN the file SHALL NOT be `COMPLETED`

#### Scenario: Fully drained queue

- GIVEN zero `SYNCHRONIZED` and zero `PRE-SETTLED` after Liquidar
- WHEN the operation completes
- THEN the file SHALL be `COMPLETED`
