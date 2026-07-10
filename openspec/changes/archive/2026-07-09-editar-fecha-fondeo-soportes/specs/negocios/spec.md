# Delta for Negocios

## ADDED Requirements

### Requirement: Inline edit of Business.dateAnchored with Payment sync

The system MUST allow inline editing of `Business.dateAnchored` in the negocios table, following the existing `dateIssued` inline-edit pattern (`BusinessTableSection.tsx`). Editing MUST be restricted to users authorized by `canFundPayments()` (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE). The edit MUST be permitted regardless of the business's current status (no state-machine restriction beyond the permission check), and MUST NOT trigger commission or period recalculation. On save, the system MUST persist the new date via `dateOnlyToBogotaNoonUtc()` inside a `prisma.$transaction` that ALSO updates `Payment.dateAnchored` where `installmentIndex === 1` for that business, in the same atomic operation. Payments with `installmentIndex !== 1` MUST remain unchanged. Every successful edit MUST create an `AuditLog` entry with action `BUSINESS_DATE_ANCHORED_UPDATED`.

#### Scenario: Authorized user edits dateAnchored — Payment[1] syncs

- GIVEN a user with role ADMIN, ASISTENTE_GERENCIA_OPERATIVA, or ANALISTA_SOPORTE viewing the negocios table
- WHEN they inline-edit `dateAnchored` to a valid past or present date and save
- THEN `Business.dateAnchored` SHALL update to the noon-Bogotá-UTC value
- AND `Payment.dateAnchored` for `installmentIndex = 1` SHALL update to the same value in the same transaction
- AND an `AuditLog` entry with action `BUSINESS_DATE_ANCHORED_UPDATED` SHALL be created

#### Scenario: Other installments are not affected

- GIVEN a business with payment rows for installments 1, 2, and 3
- WHEN `dateAnchored` is edited and saved
- THEN only the `installmentIndex = 1` payment row's `dateAnchored` SHALL change
- AND installments 2 and 3 SHALL retain their existing `dateAnchored` values

#### Scenario: Unauthorized user cannot edit

- GIVEN a user without `canFundPayments()` permission (e.g. AGENTE)
- WHEN they view the negocios table
- THEN the `dateAnchored` cell MUST remain read-only or the edit request MUST be rejected with 403

#### Scenario: Future date rejected

- GIVEN an authorized user attempts to save `dateAnchored` set to a date after today (Bogotá)
- WHEN the request is submitted
- THEN the API MUST reject with 400 and no state change MUST occur

#### Scenario: Transaction rollback on partial failure

- GIVEN the Payment[1] update fails after the Business update was staged within the same `prisma.$transaction`
- WHEN the transaction is evaluated
- THEN neither `Business.dateAnchored` nor `Payment.dateAnchored` MUST be persisted (full rollback)

### Requirement: Support validation before funding

Both funding endpoints, `/fondear` (direct/no-annualities) and `/fondear-aportes` (annual installments), MUST reject the funding action when `supportCount === 0` for the target business. The block MUST occur before any status or date mutation. The UI MUST present the modal message "No se puede fondear sin soportes adjuntos" when blocked. Editing an ALREADY-funded business's `dateAnchored` MUST NOT be subject to this guard (guard applies only to the funding action, not to date correction).

#### Scenario: Funding blocked with zero supports (direct)

- GIVEN an `EMITIDO` business with `supportCount = 0`
- WHEN an authorized user attempts `/fondear`
- THEN the API MUST reject with an error the UI maps to "No se puede fondear sin soportes adjuntos"
- AND no status or date change MUST occur

#### Scenario: Funding blocked with zero supports (annual)

- GIVEN an `EMITIDO`/`FONDEADO` business with pending annual installments and `supportCount = 0`
- WHEN an authorized user attempts `/fondear-aportes`
- THEN the API MUST reject with the same block behavior
- AND no installment status change MUST occur

#### Scenario: Funding proceeds when supports exist

- GIVEN a business with `supportCount >= 1` and otherwise-eligible funding conditions
- WHEN an authorized user funds via either endpoint
- THEN the funding action MUST proceed per existing FONDEADO transition rules

#### Scenario: Blocked attempt is audited

- GIVEN a funding attempt blocked due to `supportCount = 0`
- WHEN the block is enforced
- THEN an `AuditLog` entry MUST be created recording the blocked attempt, businessId, and actor identity

#### Scenario: Editing dateAnchored on already-funded business is not blocked by support guard

- GIVEN a `FONDEADO` business with `supportCount = 0` (e.g. legacy data pending remediation)
- WHEN an authorized user edits `dateAnchored` (not a funding action)
- THEN the support guard MUST NOT block the date edit

### Requirement: Remediation of businesses funded without supports

The system MUST provide `scripts/remediate-unsupported-funded-businesses.js` to identify and revert businesses with `status = FONDEADO` and `supportCount === 0` (funded before this validation existed). The script MUST support `--dry-run` (report only, no writes) and `--apply` (execute) modes.

#### Scenario: Dry-run reports affected businesses without mutating data

- GIVEN businesses exist with `status = FONDEADO` and zero active supports
- WHEN the script runs with `--dry-run`
- THEN it MUST output the list of affected business IDs and counts
- AND no database rows MUST change

#### Scenario: Apply mode reverts state atomically per business

- GIVEN the same affected set
- WHEN the script runs with `--apply`
- THEN for each affected business: `status` MUST become `EMITIDO`, `Business.dateAnchored` MUST become `NULL`, all its `Payment` rows MUST become `status = SIN_FONDEAR` with `dateAnchored = NULL`
- AND an `AuditLog` entry with action `BUSINESS_REMEDIATION_REVERTED` MUST be created per business, including businessId, previous status, operator, and timestamp

#### Scenario: Business with supports is excluded

- GIVEN a `FONDEADO` business with `supportCount >= 1`
- WHEN the script identifies candidates (dry-run or apply)
- THEN that business MUST NOT appear in the affected set

## REMOVED Requirements

### Requirement: Fondeo por anualidades vía /fondear-anualidades (dead route)

(Reason: superseded by `/fondear-aportes`; the `/fondear-anualidades` route, its schema, and its tests are unused dead code with only self-referencing test callers.)
(Migration: None — no active callers found; `/fondear-aportes` already covers annual-installment funding.)
