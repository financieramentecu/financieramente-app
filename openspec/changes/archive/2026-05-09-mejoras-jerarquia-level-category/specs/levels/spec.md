# Levels Specification

## Purpose

Manages the commission hierarchy levels (formerly `Category` hierarchy). A Level defines the commission/hierarchy config for an agent: code, name, color, beneficiary mode, and position in the hierarchy chain. This domain REPLACES the old category-hierarchy domain.

## Requirements

### Requirement: List active levels with pagination and filters

The system SHALL expose a paginated endpoint to list Level records. By default only active levels (`status = true`) SHALL be returned unless explicitly filtered. The system MUST support filter by `status` and `levelNumber`.

#### Scenario: List returns active levels

- GIVEN active and inactive Level records exist
- WHEN `GET /api/levels` is called without filters
- THEN only levels with `status = true` SHALL be returned
- AND results SHALL be paginated

#### Scenario: Filter by levelNumber

- GIVEN levels with various `levelNumber` values (including null for GENERAL_LEVEL)
- WHEN `GET /api/levels?levelNumber=2` is called
- THEN only levels with `levelNumber = 2` SHALL be returned

### Requirement: Create Level

The system MUST accept a create request for a Level record. The `code` field MUST be unique across all levels. The `levelNumber` field is optional (nullable); GENERAL_LEVEL SHALL have `levelNumber = null`. `idCategoryType` MUST NOT be accepted or persisted on Level.

#### Scenario: Create with valid payload

- GIVEN no Level exists with the same `code`
- WHEN `POST /api/levels` with `{ code, name, levelNumber?, color?, beneficiaryMode, idFixedBeneficiaryUser?, idNextCategory? }`
- THEN the level is persisted and returned with HTTP 201
- AND `idCategoryType` SHALL NOT be part of the stored record

#### Scenario: Duplicate code rejected

- GIVEN a Level already exists with `code = "LEVEL_1"`
- WHEN `POST /api/levels` with `{ code: "LEVEL_1", ... }`
- THEN the system SHALL return 409

#### Scenario: GENERAL_LEVEL with null levelNumber

- GIVEN a create payload with `code = "GENERAL_LEVEL"` and no `levelNumber`
- WHEN the request is processed
- THEN the level is persisted with `levelNumber = null`

#### Scenario: idCategoryType is ignored

- GIVEN a create payload that includes `idCategoryType`
- WHEN the request is processed
- THEN the system SHALL ignore the field; the persisted record SHALL NOT contain `idCategoryType`

### Requirement: Update Level

The system SHALL accept updates to name, color, beneficiaryMode, idFixedBeneficiaryUser, idNextCategory, and levelNumber. The `code` MUST NOT be changed after creation.

#### Scenario: Update allowed fields

- GIVEN a Level with id X
- WHEN `PUT /api/levels/X` with `{ name: "Updated Name" }`
- THEN the level is updated and returned with HTTP 200

#### Scenario: Code cannot be updated

- GIVEN a Level with id X and `code = "LEVEL_2"`
- WHEN `PUT /api/levels/X` with `{ code: "NEW_CODE" }`
- THEN the system SHALL ignore the `code` field; the code remains unchanged

### Requirement: Deactivate Level (soft delete)

The system MUST implement soft delete for levels: set `status = false`. The system MUST NOT execute `prisma.level.delete()` in any code path.

#### Scenario: Deactivation sets status=false

- GIVEN an active Level with id X
- WHEN `PATCH /api/levels/X` with `{ status: false }`
- THEN the record is updated with `status = false` and returned with HTTP 200

#### Scenario: No physical delete

- GIVEN any deactivation request on a Level
- WHEN the request is processed
- THEN the record MUST remain in the database; `prisma.level.delete()` MUST NOT be called

### Requirement: Level code uniqueness enforced at persistence

The `code` field on Level MUST have a unique constraint at the database level. No two active or inactive levels may share the same code.

#### Scenario: DB constraint blocks duplicate

- GIVEN a Level with `code = "LEVEL_0"` already exists
- WHEN a second Level with `code = "LEVEL_0"` is inserted
- THEN the persistence layer SHALL reject the operation with a unique constraint error

### Requirement: Level code values aligned to hierarchy

The canonical code-to-levelNumber mapping SHALL be:

| Code | levelNumber |
|------|-------------|
| LEVEL_0 | 0 |
| LEVEL_1 | 1 |
| LEVEL_2 | 2 |
| LEVEL_3 | 3 |
| LEVEL_4 | 4 |
| LEVEL_5 | 5 |
| GENERAL_LEVEL | null |

#### Scenario: Seed data matches canonical mapping

- GIVEN the database is seeded with hierarchy levels
- WHEN each level is read
- THEN `code` and `levelNumber` SHALL match the canonical table above

### Requirement: Audit log on Level mutations

Every create, update, and deactivation of a Level MUST emit an audit event via `logAuditEvent()`. The following `AuditAction` values MUST be added: `LEVEL_CREATED`, `LEVEL_UPDATED`, `LEVEL_DEACTIVATED`.

#### Scenario: Audit on create

- GIVEN an authenticated session
- WHEN a Level is created successfully
- THEN `logAuditEvent` is called with `action: LEVEL_CREATED` and `details` including the level `code` and `id`

#### Scenario: Audit on deactivate

- GIVEN an active Level
- WHEN it is deactivated
- THEN `logAuditEvent` is called with `action: LEVEL_DEACTIVATED` and `details` including the level `id`

#### Scenario: Audit failure does not block operation

- GIVEN an internal error when writing to AuditLog
- WHEN a Level mutation occurs
- THEN the main operation SHALL still return 2xx; the audit error SHALL only be logged
