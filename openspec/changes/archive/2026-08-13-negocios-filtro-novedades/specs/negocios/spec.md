## ADDED Requirements

### Requirement: Advanced filter Novedades (COM-78)

The advanced filters panel (`AdvancedFiltersSheet`) MUST expose a **Novedades** MultiSelect control with the same visual style as the existing **Estado** MultiSelect. The selectable options MUST be exactly: Nueva (`NUEVA`), Sometido o Devolución (`SOMETIDA_DEVOLUCION`), Declinado (`DECLINADA`), Pendiente (`PENDIENTE`), Cancelado (`CANCELADA`), and Sin novedad (`SIN_NOVEDAD`). An empty selection MUST mean **Todos** (default): no novedad criterion is applied. The filter is independent of business status (Emitido, Liquidado, etc.): selecting novedad values MUST NOT imply or require any business-status filter.

#### Scenario: Novedades field visible with expected options

- **GIVEN** the user opens advanced filters on the negocios list
- **WHEN** the Novedades MultiSelect is displayed
- **THEN** the control SHALL use the same visual style as Estado
- **AND** the options SHALL be Nueva, Sometido o Devolución, Declinado, Pendiente, Cancelado, Sin novedad
- **AND** the default selection SHALL be empty (Todos)

#### Scenario: Empty selection applies no novedad criterion

- **GIVEN** no novedad option is selected (Todos)
- **WHEN** the user applies filters
- **THEN** list, export, and stats results MUST NOT be restricted by `novedadStatus`

### Requirement: Filter by selected novedad statuses (OR within dimension)

When one or more novedad options other than empty/Todos are selected, the system MUST return only businesses that match **any** of the selected novedad values (OR semantics within the Novedades dimension). Concrete statuses MUST match `Business.novedadStatus` via an `IN` predicate. Selecting multiple concrete statuses MUST return the union of matching businesses.

#### Scenario: Single concrete status filters list

- **GIVEN** businesses with various `novedadStatus` values
- **WHEN** the user selects only Pendiente and applies filters
- **THEN** results SHALL include only businesses with `novedadStatus === 'PENDIENTE'`

#### Scenario: Multiple concrete statuses use OR

- **GIVEN** businesses with `novedadStatus` in `{NUEVA, DECLINADA, PENDIENTE}`
- **WHEN** the user selects Nueva and Declinado and applies filters
- **THEN** results SHALL include businesses with `novedadStatus` in `{NUEVA, DECLINADA}`
- **AND** MUST NOT include businesses with only `PENDIENTE` (unless also selected)

### Requirement: Sin novedad maps to null novedadStatus

Selecting **Sin novedad** MUST restrict results to businesses that were never marked: `novedadStatus IS NULL`. When Sin novedad is combined with one or more concrete statuses, the system MUST OR those predicates (null OR `IN` selected statuses).

#### Scenario: Sin novedad alone

- **GIVEN** some businesses with `novedadStatus === null` and others with non-null statuses
- **WHEN** the user selects only Sin novedad and applies filters
- **THEN** results SHALL include only businesses with `novedadStatus IS NULL`

#### Scenario: Sin novedad combined with a concrete status

- **GIVEN** the user selects Pendiente and Sin novedad
- **WHEN** filters are applied
- **THEN** results SHALL include businesses with `novedadStatus === 'PENDIENTE'` OR `novedadStatus IS NULL`

### Requirement: Novedades combines with other filters via AND

The Novedades dimension MUST combine with all other advanced-filter dimensions (Estado / business status, Money Strategist, fechas, compañía, producto, etc.) using **AND** semantics. List, Excel export, and stats MUST accept the same `novedadStatuses` parameter values and apply identical WHERE semantics for parity.

#### Scenario: Novedad AND business status

- **GIVEN** the user selects Estado = Emitido and Novedades = Pendiente
- **WHEN** filters are applied
- **THEN** results SHALL include only businesses with `status === 'EMITIDO'` AND `novedadStatus === 'PENDIENTE'`

#### Scenario: List export stats parity for novedadStatuses

- **GIVEN** identical `novedadStatuses` (and other shared filter params) on list, export, and stats requests
- **WHEN** each endpoint builds its filter predicate
- **THEN** the novedad portion of the WHERE clause MUST be equivalent across the three surfaces
