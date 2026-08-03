# Delta for Negocios

## ADDED Requirements

### Requirement: Novedad state persisted on Business

The system MUST persist `novedadStatus` (nullable: `PENDIENTE` | `RESUELTA`), `novedadMarkedAt` (nullable timestamp), and `novedadResolvedAt` (nullable timestamp) on the `Business` record. A business never marked MUST have `novedadStatus = null` and both timestamps `null`.

#### Scenario: Never-marked business has null novedad fields

- GIVEN a business that has never been marked with a novedad
- WHEN the business record is read
- THEN `novedadStatus` SHALL be `null`
- AND `novedadMarkedAt` and `novedadResolvedAt` SHALL be `null`

### Requirement: Mark novedad on VENTA_EFECTUADA business

The system MUST allow marking a business as "Con Novedad" only when `status === VENTA_EFECTUADA` and `novedadStatus` is not already `PENDIENTE`. Any authenticated role MAY perform this action (no role allowlist). On success, the system MUST set `novedadStatus = PENDIENTE` and `novedadMarkedAt` to the current instant, and MUST emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_MARKED` including `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string.

#### Scenario: Mark succeeds on VENTA_EFECTUADA

- GIVEN a business with `status === VENTA_EFECTUADA` and `novedadStatus === null`
- WHEN any authenticated user calls the mark action
- THEN `novedadStatus` SHALL become `PENDIENTE`
- AND `novedadMarkedAt` SHALL be set to the current instant
- AND an `AuditLog` entry with action `BUSINESS_NOVEDAD_MARKED` SHALL be created

#### Scenario: Mark rejected outside VENTA_EFECTUADA

- GIVEN a business with `status !== VENTA_EFECTUADA`
- WHEN the mark action is requested
- THEN the request MUST fail and `novedadStatus` MUST remain unchanged

#### Scenario: Mark rejected when already PENDIENTE

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the mark action is requested again
- THEN the request MUST fail and no duplicate `AuditLog` entry SHALL be created

### Requirement: Unmark a PENDIENTE novedad

The system MUST allow unmarking a novedad only when `novedadStatus === PENDIENTE`. Any authenticated role MAY perform this action. On success, the system MUST reset `novedadStatus` and `novedadMarkedAt` to `null` (the business returns to the never-marked state), and MUST emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_UNMARKED` including `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string.

#### Scenario: Unmark resets to never-marked state

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN any authenticated user calls the unmark action
- THEN `novedadStatus` SHALL become `null`
- AND `novedadMarkedAt` SHALL become `null`
- AND an `AuditLog` entry with action `BUSINESS_NOVEDAD_UNMARKED` SHALL be created

#### Scenario: Unmark rejected when not PENDIENTE

- GIVEN a business with `novedadStatus === null` or `RESUELTA`
- WHEN the unmark action is requested
- THEN the request MUST fail and `novedadStatus` MUST remain unchanged

### Requirement: Auto-resolve novedad on transition to EMITIDO

Within the existing business-update transaction, when a business with `novedadStatus === PENDIENTE` transitions to `status === EMITIDO`, the system MUST atomically set `novedadStatus = RESUELTA` and record `novedadResolvedAt` as the current instant, regardless of the actor's role. The system MUST emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_RESOLVED` including `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string.

#### Scenario: Pending novedad auto-resolves on EMITIDO transition

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the update transaction transitions that business to `status === EMITIDO`
- THEN `novedadStatus` SHALL become `RESUELTA`
- AND `novedadResolvedAt` SHALL be set to the current instant
- AND an `AuditLog` entry with action `BUSINESS_NOVEDAD_RESOLVED` SHALL be created
- AND this MUST occur regardless of the actor's role

#### Scenario: No pending novedad — no resolution side effect

- GIVEN a business with `novedadStatus === null` or `RESUELTA`
- WHEN the update transaction transitions that business to `status === EMITIDO`
- THEN `novedadStatus` and `novedadResolvedAt` MUST remain unchanged
- AND no `BUSINESS_NOVEDAD_RESOLVED` entry SHALL be created

### Requirement: Novedad persists through cancellation

Cancelling a business with a `PENDIENTE` novedad MUST NOT change `novedadStatus`. The novedad MUST remain `PENDIENTE`.

#### Scenario: Cancelling does not clear a pending novedad

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the business is cancelled
- THEN `novedadStatus` SHALL remain `PENDIENTE`
- AND `novedadMarkedAt` MUST remain unchanged

### Requirement: Novedad column in business list

The principal business list (`BusinessTableSection`) MUST render a "Novedad" column immediately after the "Estado" column. The cell MUST be empty when `novedadStatus === null`, MUST show "Pendiente" styled in orange when `novedadStatus === PENDIENTE`, and MUST show "Resuelta" styled in green/neutral when `novedadStatus === RESUELTA`.

#### Scenario: Empty cell for never-marked business

- GIVEN a business row with `novedadStatus === null`
- WHEN the business list renders
- THEN the Novedad cell SHALL be empty

#### Scenario: Pendiente cell in orange

- GIVEN a business row with `novedadStatus === PENDIENTE`
- WHEN the business list renders
- THEN the Novedad cell SHALL show "Pendiente" styled in orange

#### Scenario: Resuelta cell in green/neutral

- GIVEN a business row with `novedadStatus === RESUELTA`
- WHEN the business list renders
- THEN the Novedad cell SHALL show "Resuelta" styled in green/neutral

### Requirement: Novedad row actions in BusinessRowActions

The row-actions dropdown MUST offer "Marcar Con Novedad" only when `status === VENTA_EFECTUADA` and `novedadStatus !== PENDIENTE`. The dropdown MUST offer "Desmarcar Novedad" only when `novedadStatus === PENDIENTE`. Neither action MAY be gated by role.

#### Scenario: Marcar Con Novedad visible on eligible business

- GIVEN a business with `status === VENTA_EFECTUADA` and `novedadStatus !== PENDIENTE`
- WHEN any authenticated user opens the row-actions dropdown
- THEN "Marcar Con Novedad" SHALL be visible

#### Scenario: Marcar Con Novedad hidden when not VENTA_EFECTUADA or already pending

- GIVEN a business with `status !== VENTA_EFECTUADA`, or `novedadStatus === PENDIENTE`
- WHEN the row-actions dropdown opens
- THEN "Marcar Con Novedad" SHALL NOT be visible

#### Scenario: Desmarcar Novedad visible only when PENDIENTE

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the row-actions dropdown opens
- THEN "Desmarcar Novedad" SHALL be visible

#### Scenario: Desmarcar Novedad hidden when not PENDIENTE

- GIVEN a business with `novedadStatus === null` or `RESUELTA`
- WHEN the row-actions dropdown opens
- THEN "Desmarcar Novedad" SHALL NOT be visible

### Requirement: Novedad visible in business detail view

The business detail view MUST display the novedad status with the same color semantics as the list column (empty when `null`, orange "Pendiente", green/neutral "Resuelta").

#### Scenario: Detail view shows Pendiente in orange

- GIVEN a business with `novedadStatus === PENDIENTE`
- WHEN the business detail view renders
- THEN the novedad status SHALL show "Pendiente" styled in orange

#### Scenario: Detail view shows Resuelta in green/neutral

- GIVEN a business with `novedadStatus === RESUELTA`
- WHEN the business detail view renders
- THEN the novedad status SHALL show "Resuelta" styled in green/neutral

#### Scenario: Detail view shows nothing when never marked

- GIVEN a business with `novedadStatus === null`
- WHEN the business detail view renders
- THEN no novedad status indicator SHALL be shown
