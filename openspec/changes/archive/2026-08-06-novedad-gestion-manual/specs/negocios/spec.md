# Delta for Negocios — Manual novedad status management

## ADDED Requirements

### Requirement: Manual novedad status management endpoint

The system MUST provide `PATCH /api/negocios/[id]/manage-novedad`, restricted to roles `ANALISTA_SOPORTE` and `ADMIN` (403 for any other role). The endpoint MUST accept exactly one target value from `SOMETIDA_DEVOLUCION`, `DECLINADA`, `PENDIENTE`, `CANCELADA` and MUST reject `NUEVA` as a target (400). It MUST allow transitioning from any current `novedadStatus` (including a non-terminal `CANCELADA`) to any of the four manual values, in either direction, with no state treated as terminal. On success it MUST persist the new `novedadStatus` and emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_STATUS_CHANGED` including `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string naming the from→to values. Prisma access for this operation MUST live in `src/features/negocios/services/`; the route MUST be HTTP-only.

#### Scenario: Analista changes novedad from NUEVA to SOMETIDA_DEVOLUCION

- GIVEN an authenticated `ANALISTA_SOPORTE` and a business with `novedadStatus === 'NUEVA'`
- WHEN they PATCH `manage-novedad` with target `SOMETIDA_DEVOLUCION`
- THEN `novedadStatus` SHALL become `SOMETIDA_DEVOLUCION`
- AND an `AuditLog` entry with action `BUSINESS_NOVEDAD_STATUS_CHANGED` SHALL be created

#### Scenario: Admin reopens a CANCELADA novedad

- GIVEN an authenticated `ADMIN` and a business with `novedadStatus === 'CANCELADA'`
- WHEN they PATCH `manage-novedad` with target `PENDIENTE`
- THEN `novedadStatus` SHALL become `PENDIENTE`

#### Scenario: NUEVA is not a selectable manual target

- GIVEN an authenticated `ANALISTA_SOPORTE` or `ADMIN`
- WHEN they PATCH `manage-novedad` with target `NUEVA`
- THEN the request MUST fail with 400 and `novedadStatus` MUST remain unchanged

#### Scenario: Unauthorized role rejected

- GIVEN an authenticated user with role other than `ANALISTA_SOPORTE`/`ADMIN`
- WHEN they PATCH `manage-novedad` with any valid target
- THEN the request MUST fail with 403 and `novedadStatus` MUST remain unchanged

### Requirement: "Gestionar novedad" trigger visibility

The detail page and `BusinessViewModal` MUST render a "Gestionar novedad" control only for `ANALISTA_SOPORTE` and `ADMIN`, and only when the business has a non-null `novedadStatus`. Activating it MUST open `BusinessNovedadManageModal`, showing the current status and a selector limited to `SOMETIDA_DEVOLUCION`, `DECLINADA`, `PENDIENTE`, `CANCELADA`. On save, the modal MUST call `manage-novedad`, show a success confirmation, and the updated status MUST render immediately in both the detail badge and the business-list "Novedad" column.

#### Scenario: Analista opens and saves the management modal

- GIVEN an `ANALISTA_SOPORTE` viewing a business with `novedadStatus === 'NUEVA'`
- WHEN they click "Gestionar novedad", pick `DECLINADA`, and click "Guardar"
- THEN the modal SHALL close showing a confirmation message
- AND the detail badge and list column SHALL reflect `DECLINADA` without a page reload

#### Scenario: Trigger hidden for non-privileged roles

- GIVEN a business with a non-null `novedadStatus` and a viewer with role `AGENTE`, `ASISTENTE_GERENCIA_OPERATIVA`, or `COACH`
- WHEN the detail page or `BusinessViewModal` renders
- THEN "Gestionar novedad" MUST NOT be visible

### Requirement: Legacy novedad data backfill to NUEVA

The system MUST provide an idempotent data backfill (a plain `UPDATE`, not a Prisma schema migration — `novedadStatus` stays `VarChar(20)`) that sets `novedadStatus = 'NUEVA'` for every `Business` row whose current `novedadStatus` is the legacy value `PENDIENTE` (the prior MARK default) OR the legacy value `RESUELTA` (the prior auto-resolve default). Rows already outside `{PENDIENTE, RESUELTA}` MUST NOT be modified. The script MUST be safely re-runnable with no further effect after the first successful run.

#### Scenario: Legacy PENDIENTE rows backfilled

- GIVEN a business with legacy `novedadStatus === 'PENDIENTE'`
- WHEN the backfill runs
- THEN `novedadStatus` SHALL become `'NUEVA'`

#### Scenario: Legacy RESUELTA rows backfilled

- GIVEN a business with legacy `novedadStatus === 'RESUELTA'`
- WHEN the backfill runs
- THEN `novedadStatus` SHALL become `'NUEVA'`

#### Scenario: Re-run is a no-op

- GIVEN the backfill has already run once
- WHEN it is executed again
- THEN no row SHALL change and zero rows SHALL match `{PENDIENTE, RESUELTA}`

## MODIFIED Requirements

### Requirement: Novedad state persisted on Business

The system MUST persist `novedadStatus` (nullable: `NUEVA` | `SOMETIDA_DEVOLUCION` | `DECLINADA` | `PENDIENTE` | `CANCELADA`), `novedadMarkedAt` (nullable timestamp), and `novedadResolvedAt` (nullable timestamp) on the `Business` record. A business never marked MUST have `novedadStatus = null` and both timestamps `null`. No schema/enum migration is required; the column remains `VARCHAR(20)`.
(Previously: two-state `PENDIENTE` | `RESUELTA`.)

#### Scenario: Never-marked business has null novedad fields

- GIVEN a business that has never been marked with a novedad
- WHEN the business record is read
- THEN `novedadStatus` SHALL be `null`
- AND `novedadMarkedAt` and `novedadResolvedAt` SHALL be `null`

### Requirement: Mark novedad on VENTA_EFECTUADA business

The system MUST allow marking a business as "Con Novedad" only when `status === VENTA_EFECTUADA` and `novedadStatus === null`. Any authenticated role MAY perform this action. On success, the system MUST set `novedadStatus = 'NUEVA'` and `novedadMarkedAt` to the current instant, and MUST emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_MARKED`.
(Previously: set `novedadStatus = 'PENDIENTE'`.)

#### Scenario: Mark succeeds on VENTA_EFECTUADA

- GIVEN a business with `status === VENTA_EFECTUADA` and `novedadStatus === null`
- WHEN any authenticated user calls the mark action
- THEN `novedadStatus` SHALL become `'NUEVA'`
- AND `novedadMarkedAt` SHALL be set to the current instant
- AND this SHALL be visible immediately in the business list

#### Scenario: Mark rejected outside VENTA_EFECTUADA

- GIVEN a business with `status !== VENTA_EFECTUADA`
- WHEN the mark action is requested
- THEN the request MUST fail and `novedadStatus` MUST remain unchanged

#### Scenario: Mark rejected when already marked

- GIVEN a business with non-null `novedadStatus`
- WHEN the mark action is requested again
- THEN the request MUST fail and no duplicate `AuditLog` entry SHALL be created

### Requirement: Unmark a NUEVA novedad

The system MUST allow unmarking a novedad only when `novedadStatus === 'NUEVA'` AND the requesting user owns the business (`business.idUser === currentUser.idUser`). On success, the system MUST reset only `novedadStatus` to `null`; `novedadMarkedAt`, `novedadResolvedAt`, and any other novedad timestamps MUST be preserved unchanged. The system MUST emit an `AuditLog` entry with action `BUSINESS_NOVEDAD_UNMARKED`.
(Previously: gated on `PENDIENTE` only, any authenticated role, and cleared `novedadMarkedAt` to `null`.)

#### Scenario: Owning agent unmarks a NUEVA novedad

- GIVEN a business with `novedadStatus === 'NUEVA'` owned by the requesting user
- WHEN the owner calls the unmark action
- THEN `novedadStatus` SHALL become `null`
- AND `novedadMarkedAt` SHALL remain unchanged (preserved, not cleared)
- AND an `AuditLog` entry with action `BUSINESS_NOVEDAD_UNMARKED` SHALL be created

#### Scenario: Unmark rejected when not NUEVA

- GIVEN a business with `novedadStatus` in `{SOMETIDA_DEVOLUCION, DECLINADA, PENDIENTE, CANCELADA, null}`
- WHEN the unmark action is requested
- THEN the request MUST fail and `novedadStatus` MUST remain unchanged

#### Scenario: Unmark rejected for non-owning user

- GIVEN a business with `novedadStatus === 'NUEVA'` NOT owned by the requesting user
- WHEN that user calls the unmark action
- THEN the request MUST fail and `novedadStatus` MUST remain unchanged

### Requirement: Novedad unaffected by business-status transitions

Within the business-update transaction (including `VENTA_EFECTUADA → EMITIDO`), the system MUST NOT read or write `novedadStatus` or `novedadResolvedAt` for any reason tied to the business-status transition, and MUST NOT emit any novedad-related `AuditLog` entry from that transaction. All other `becomesEmitido` logic (payments, dates) MUST be preserved unchanged.
(Previously: "Auto-resolve novedad on transition to EMITIDO" — auto-set `novedadStatus = 'RESUELTA'` and emitted `BUSINESS_NOVEDAD_RESOLVED`. Removed entirely; see REMOVED Requirements.)

#### Scenario: Novedad untouched by EMITIDO transition

- GIVEN a business with any `novedadStatus` value (including `NUEVA`)
- WHEN the update transaction transitions that business to `status === EMITIDO`
- THEN `novedadStatus` and `novedadResolvedAt` MUST remain byte-identical
- AND no novedad-related `AuditLog` entry SHALL be created
- AND payment/date logic driven by `becomesEmitido` MUST still execute as before

### Requirement: Novedad persists through cancellation

Cancelling a business (`/api/negocios/[id]/cancel`) MUST NOT write or otherwise change `novedadStatus`, regardless of its current value.
(Previously: scoped only to `PENDIENTE`.)

#### Scenario: Cancelling does not touch novedadStatus

- GIVEN a business with any non-null `novedadStatus`
- WHEN the business is cancelled
- THEN `novedadStatus` SHALL remain exactly as it was before cancellation

### Requirement: Novedad column in business list

The principal business list (`BusinessTableSection`) MUST render a "Novedad" column immediately after "Estado". The cell MUST be empty when `novedadStatus === null`, and otherwise MUST show a label and colour + distinct icon per this palette: `NUEVA`=blue/`AlertCircle`, `SOMETIDA_DEVOLUCION`=amber/`Undo2`, `PENDIENTE`=orange/`Clock`, `DECLINADA`=red/`XCircle`, `CANCELADA`=slate/`Ban`. Colour alone MUST NOT be the only differentiator (WCAG 1.4.1).
(Previously: two states, `Pendiente` orange / `Resuelta` green, no icons.)

#### Scenario: Empty cell for never-marked business

- GIVEN a business row with `novedadStatus === null`
- WHEN the business list renders
- THEN the Novedad cell SHALL be empty

#### Scenario: Each state renders distinct colour and icon

- GIVEN business rows covering `NUEVA`, `SOMETIDA_DEVOLUCION`, `PENDIENTE`, `DECLINADA`, `CANCELADA`
- WHEN the business list renders
- THEN each row SHALL show its mapped label, colour, and icon per the palette above
- AND no two states SHALL share the same colour+icon pair

### Requirement: Novedad row actions in BusinessRowActions

The row-actions dropdown MUST offer "Marcar Con Novedad" only when `status === VENTA_EFECTUADA` and `novedadStatus === null` (not role-gated). The dropdown MUST offer "Desmarcar Novedad" only when `novedadStatus === 'NUEVA'` AND the current user owns the business.
(Previously: "Desmarcar Novedad" gated only on `PENDIENTE`, no ownership check.)

#### Scenario: Marcar Con Novedad visible on eligible business

- GIVEN a business with `status === VENTA_EFECTUADA` and `novedadStatus === null`
- WHEN any authenticated user opens the row-actions dropdown
- THEN "Marcar Con Novedad" SHALL be visible

#### Scenario: Desmarcar Novedad visible only for NUEVA + owner

- GIVEN a business with `novedadStatus === 'NUEVA'` owned by the viewing user
- WHEN the row-actions dropdown opens
- THEN "Desmarcar Novedad" SHALL be visible

#### Scenario: Desmarcar Novedad hidden for non-owner or non-NUEVA

- GIVEN a business with `novedadStatus !== 'NUEVA'`, OR `novedadStatus === 'NUEVA'` but not owned by the viewer
- WHEN the row-actions dropdown opens
- THEN "Desmarcar Novedad" SHALL NOT be visible

### Requirement: Novedad visible in business detail view

The business detail view MUST display the novedad status with the same five-state colour + icon semantics as the list column (empty when `null`).
(Previously: two-state colour only, no icons.)

#### Scenario: Detail view matches list palette

- GIVEN a business with a non-null `novedadStatus`
- WHEN the business detail view renders
- THEN the shown label, colour, and icon SHALL match the business-list mapping for that status

#### Scenario: Detail view shows nothing when never marked

- GIVEN a business with `novedadStatus === null`
- WHEN the business detail view renders
- THEN no novedad status indicator SHALL be shown

## REMOVED Requirements

### Requirement: Auto-resolve novedad on transition to EMITIDO

(Reason: CA2 removes automatic novedad changes tied to business-status transitions; novedad tracking must be fully human-owned. `PENDIENTE` becomes a manual-only selector option, not an automatic outcome.)
(Migration: replaced by "Novedad unaffected by business-status transitions" above. Only the novedad branch inside `becomesEmitido` is deleted; all other `becomesEmitido` payment/date logic is unchanged. Existing `RESUELTA` rows are migrated by the "Legacy novedad data backfill to NUEVA" requirement, not by this removal.)
