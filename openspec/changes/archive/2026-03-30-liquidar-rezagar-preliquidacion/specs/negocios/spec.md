# Delta for Negocios — COMISIONANDO

## ADDED Requirements

### Requirement: COMISIONANDO is a valid business status

The system MUST accept `COMISIONANDO` in types, API validation, and filters.

#### Scenario: Validation passes

- GIVEN `status=COMISIONANDO`
- WHEN validated
- THEN validation SHALL succeed

---

### Requirement: Liquidar sets EMITIDO to COMISIONANDO

Liquidar MUST set linked businesses from `EMITIDO` to `COMISIONANDO` only; other statuses unchanged.

#### Scenario: EMITIDO promoted

- GIVEN linked business `EMITIDO`
- WHEN Liquidar completes
- THEN status SHALL be `COMISIONANDO`

#### Scenario: Not EMITIDO

- GIVEN linked business not `EMITIDO`
- WHEN Liquidar completes
- THEN status SHALL be unchanged

#### Scenario: Idempotent COMISIONANDO

- GIVEN business already `COMISIONANDO`
- WHEN Liquidar completes again
- THEN status SHALL remain `COMISIONANDO`

---

### Requirement: COMISIONANDO in business list UI

The system SHOULD show a `COMISIONANDO` badge in business lists.

#### Scenario: Badge visible

- GIVEN row with `COMISIONANDO`
- WHEN rendered
- THEN a status indicator SHALL appear
