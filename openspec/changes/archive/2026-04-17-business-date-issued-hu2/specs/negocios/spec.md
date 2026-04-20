# Delta for Negocios

## ADDED Requirements

### Requirement: Issuance instant at first EMITIDO

The system MUST record exactly one **issuance instant** per business, at the moment the business first becomes `EMITIDO`. The system MUST NOT change that instant when only the contract identifier is corrected afterward while the business stays `EMITIDO`.

#### Scenario: Create with contract

- **GIVEN** successful creation with a non-empty contract
- **WHEN** the business is read back
- **THEN** status SHALL be `EMITIDO`
- **AND** an issuance instant SHALL be recorded for that business

#### Scenario: Create without contract

- **GIVEN** successful creation without a contract
- **WHEN** the business is read back
- **THEN** status SHALL be `VENTA_EFECTUADA`
- **AND** no issuance instant SHALL be recorded

#### Scenario: Later contract moves sale to EMITIDO

- **GIVEN** a business in `VENTA_EFECTUADA` without issuance
- **WHEN** a contract is saved and the business becomes `EMITIDO`
- **THEN** an issuance instant SHALL be recorded

#### Scenario: Contract edit after EMITIDO

- **GIVEN** `EMITIDO` with issuance already recorded
- **WHEN** the contract is updated without leaving `EMITIDO`
- **THEN** the issuance instant SHALL remain unchanged

---

### Requirement: Issuance exposed in business API payloads

Canonical business responses (list rows and detail) MUST expose issuance: a timestamp when recorded, otherwise an explicit absent value consistent with the contract schema. Clients MUST be able to distinguish issued from never-issued businesses.

#### Scenario: Issued business readable

- **GIVEN** a business with issuance recorded
- **WHEN** any canonical business payload is returned for it
- **THEN** issuance SHALL appear with the recorded instant

#### Scenario: Never issued readable

- **GIVEN** a business without issuance
- **WHEN** any canonical business payload is returned for it
- **THEN** issuance absence SHALL be explicit per schema
