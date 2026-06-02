# Spec: Dashboard TRM Auto-Consultation & USD Conversion Panel

**Change:** `dashboard-trm-conversion`
**Status:** Draft
**Date:** 2026-05-27

---

## Delta Summary

After this change is applied, the production dashboard SHALL include a new section titled "Venta total naranja en USD" containing:

1. A TRM display row showing the current COP/USD exchange rate (auto-fetched or manually entered).
2. Three KPI cards: Detalle internacional (USD), Nacional convertido a USD, and Total USD.

All values SHALL be scoped to the currently active `HierarchySelectionContext.selectedUserIds` and `DashboardFilterContext.appliedFilters`. No Prisma schema changes, no changes to existing contexts, no changes to existing KPI cards.

---

## CAP-1: TRM Auto-Fetch

### Requirement: Auto-fetch TRM on dashboard mount

The system SHALL automatically fetch the current COP/USD TRM rate when the dashboard section mounts, before any KPI card renders its USD value. The fetch SHALL be performed via the BFF proxy at `GET /api/trm` which proxies `https://co.dolarapi.com/v1/trm` server-side (no CORS, no API key). The BFF SHALL enforce a 5-second timeout. The BFF SHALL return the rate as a numeric value.

#### Scenario: Successful TRM fetch on mount

- **GIVEN** the user loads the production dashboard and the TRM service is available
- **WHEN** the "Venta total naranja en USD" section mounts
- **THEN** the system SHALL call `GET /api/trm` before rendering KPI USD values
- **AND** the TRM display row SHALL show the rate formatted as `"4,050 COP/USD"` (period as thousands separator, no decimals for whole rates)
- **AND** the TRM display row SHALL be read-only (no input field visible)
- **AND** KPI cards SHALL proceed to render their USD values using the fetched rate

#### Scenario: TRM fetch in loading state

- **GIVEN** the dashboard section has mounted but the TRM fetch has not yet resolved
- **WHEN** the TRM response is pending
- **THEN** the TRM display row SHALL show a skeleton/spinner in place of the rate value
- **AND** KPI cards SHALL also show skeleton/spinner (TRM is required for their values)

#### Scenario: BFF endpoint behavior under timeout

- **GIVEN** the external TRM service does not respond within 5 seconds
- **WHEN** the BFF request to `https://co.dolarapi.com/v1/trm` exceeds 5s
- **THEN** the BFF SHALL return a non-200 response (timeout error)
- **AND** the client SHALL transition to the TRM Fallback state (CAP-2)

#### Scenario: BFF endpoint behavior on network error or non-200

- **GIVEN** the external TRM service returns an error or is unreachable
- **WHEN** the BFF receives a non-200 response or a network-level failure
- **THEN** the BFF SHALL return a non-200 response to the client
- **AND** the client SHALL transition to the TRM Fallback state (CAP-2)

---

## CAP-2: TRM Fallback (Manual Input)

### Requirement: Manual TRM entry when auto-fetch fails

When the auto-fetch of TRM fails for any reason (network error, timeout, non-200 response), the system SHALL allow the user to manually enter a TRM value and trigger a recalculation of the three KPI cards.

#### Scenario: Error message shown on TRM failure

- **GIVEN** the TRM auto-fetch has failed
- **WHEN** the failure is detected (network error, timeout, or non-200)
- **THEN** the TRM display row SHALL show the error message: `"No fue posible consultar la TRM automáticamente"`
- **AND** a numeric input field SHALL appear, accepting positive numbers with up to 2 decimal places
- **AND** a "Recalcular" button SHALL appear, initially disabled
- **AND** no KPI value that requires TRM SHALL be shown (those fields display `"—"`)

#### Scenario: Recalcular button enabled only with valid input

- **GIVEN** the TRM fallback state is active
- **WHEN** the user enters a value in the manual TRM input
- **THEN** the "Recalcular" button SHALL be enabled only when the input is a valid positive number (> 0, up to 2 decimal places)
- **AND** the "Recalcular" button SHALL remain disabled if the input is empty, zero, negative, or non-numeric

#### Scenario: Recalculate with manually entered TRM

- **GIVEN** the TRM fallback state is active and the user has entered a valid positive number
- **WHEN** the user clicks "Recalcular"
- **THEN** the three KPI cards SHALL recompute their USD values using the manually entered TRM
- **AND** the TRM display row SHALL show the label `"TRM ingresada manualmente"` alongside the entered rate
- **AND** the manual input field SHALL remain editable (user can adjust and recalculate again)

#### Scenario: Detalle internacional card unaffected by TRM state

- **GIVEN** the TRM fallback state is active and TRM has not yet been entered
- **WHEN** the "Detalle internacional" KPI card renders
- **THEN** it SHALL display its USD value normally (foreign businesses are already in USD; no TRM conversion needed)
- **AND** it SHALL NOT show `"—"` due to missing TRM

---

## CAP-3: KPI Aggregation

### Requirement: Three KPI cards scoped to hierarchy and filters

The system SHALL render three KPI cards in the "Venta total naranja en USD" section. All aggregations SHALL use `selectedUserIds` from `HierarchySelectionContext` and `appliedFilters` from `DashboardFilterContext` as scope constraints. The currency split SHALL be determined exclusively by `Business.idCurrency`: a business is "national" if its currency is COP and "foreign" (international) otherwise. The `isInternacional` flag on the Business entity SHALL NOT be used for this split.

#### Scenario: Detalle internacional card

- **GIVEN** there are businesses in scope whose currency is not COP
- **WHEN** the KPI aggregation runs
- **THEN** the "Detalle internacional" card SHALL display:
  - The sum of sales amounts for foreign-currency businesses, expressed in USD
  - The count of foreign-currency businesses in scope
  - Format: `"USD {amount} · {n} negocios"`

#### Scenario: Nacional convertido a USD card

- **GIVEN** there are businesses in scope whose currency is COP and TRM is available (auto or manual)
- **WHEN** the KPI aggregation runs
- **THEN** the "Nacional convertido a USD" card SHALL display:
  - `nationalUsd = totalCop / trm` as the headline value
  - The count of national (COP) businesses in scope
  - A traceability legend below the value: `"TRM promedio {rate} • COP ${copTotal}"`
  - Format: `"USD {nationalUsd} · {n} negocios"`

#### Scenario: Total USD card

- **GIVEN** both foreign and national businesses exist in scope and TRM is available
- **WHEN** the KPI aggregation runs
- **THEN** the "Total USD" card SHALL display:
  - `totalUsd = (totalCop / trm) + foreignUsd`
  - The total business count (national + foreign)
  - Format: `"USD {totalUsd} · {n} negocios"`

#### Scenario: Conversion formula correctness

- **GIVEN** `totalCop = 8,100,000`, `trm = 4,050`, `foreignUsd = 500`
- **WHEN** the Total USD card computes its value
- **THEN** `nationalUsd = 8,100,000 / 4,050 = 2,000`
- **AND** `totalUsd = 2,000 + 500 = 2,500`
- **AND** the card SHALL display `"USD 2,500.00 · {n} negocios"`

#### Scenario: Empty hierarchy short-circuit

- **GIVEN** `selectedUserIds` is an empty array
- **WHEN** the KPI aggregation is triggered
- **THEN** the system SHALL NOT issue any database query
- **AND** all three cards SHALL display `"USD 0.00 · 0 negocios"` immediately

---

## CAP-4: Filter Reactivity

### Requirement: KPI cards react to context changes

The three KPI cards SHALL re-fetch their aggregated data whenever `selectedUserIds` changes OR `appliedFilters` changes. TRM SHALL NOT be re-fetched on filter changes — it is fetched once on mount and remains stable for the session.

#### Scenario: Hierarchy selection change triggers KPI re-fetch

- **GIVEN** the dashboard section is mounted with a TRM value (auto or manual)
- **WHEN** `HierarchySelectionContext.selectedUserIds` changes
- **THEN** the KPI endpoint `GET /api/production-dashboard/kpis` SHALL be called with the new `userIds`
- **AND** the three cards SHALL update their values using the existing TRM
- **AND** `GET /api/trm` SHALL NOT be called again

#### Scenario: Applied filters change triggers KPI re-fetch

- **GIVEN** the dashboard section is mounted with a TRM value
- **WHEN** `DashboardFilterContext.appliedFilters` changes
- **THEN** the KPI endpoint SHALL be called with the new filter parameters
- **AND** the three cards SHALL update their values using the existing TRM
- **AND** the TRM display row SHALL remain unchanged

#### Scenario: TRM does not change when filters change

- **GIVEN** the TRM was auto-fetched successfully as `4,050`
- **WHEN** the user changes any applied filter
- **THEN** the TRM display row SHALL continue to show `"4,050 COP/USD"`
- **AND** the TRM SHALL NOT be re-fetched

---

## CAP-5: Empty State

### Requirement: Zero businesses in scope shows zero values without error

When no businesses match the current scope (either `selectedUserIds` is empty or no businesses exist for the current filters), the system SHALL display a zero-value empty state on all three cards without showing any error messages.

#### Scenario: All cards show zero when no businesses match

- **GIVEN** the current scope results in zero businesses (filters + hierarchy)
- **WHEN** the KPI cards render
- **THEN** each card SHALL display `"USD 0.00 · 0 negocios"`
- **AND** no error messages or warnings SHALL be shown
- **AND** the TRM display row SHALL remain visible and unchanged

#### Scenario: Nacional card empty-state legend

- **GIVEN** there are zero national (COP) businesses in scope but TRM is available
- **WHEN** the "Nacional convertido a USD" card renders
- **THEN** the traceability legend SHALL read `"TRM promedio {rate} • COP $0"`

---

## CAP-6: Loading States

### Requirement: Skeleton states during data fetching

The system SHALL show skeleton/spinner loading states for TRM and KPI cards independently. Both can be loading simultaneously on first mount.

#### Scenario: TRM loading state

- **GIVEN** the section has mounted and `GET /api/trm` has not yet responded
- **WHEN** the TRM fetch is in-flight
- **THEN** the TRM display row SHALL render a skeleton/spinner in place of the rate
- **AND** no rate value SHALL be displayed until the response is received

#### Scenario: KPI cards loading state

- **GIVEN** the section has mounted and the KPI fetch is in-flight
- **WHEN** `GET /api/production-dashboard/kpis` has not yet responded
- **THEN** each of the three KPI cards SHALL render a skeleton/spinner
- **AND** no USD values or business counts SHALL be displayed

#### Scenario: Independent loading on first mount

- **GIVEN** both TRM and KPI fetches are in-flight simultaneously on first mount
- **WHEN** the TRM fetch resolves before the KPI fetch
- **THEN** the TRM display row SHALL show the resolved rate
- **AND** the KPI cards SHALL continue showing their skeletons until the KPI fetch resolves

---

## Constraints & Invariants

| Constraint | Rule |
|---|---|
| Currency classifier | `Business.idCurrency` determines split; `isInternacional` is out of scope |
| TRM persistence | TRM is NOT persisted to DB or cached beyond the component lifecycle |
| Schema changes | No Prisma schema changes are required |
| Shared context changes | `DashboardFilterContext` and `HierarchySelectionContext` are read-only (no modifications) |
| Existing components | `CoachKpiCard` and existing dashboard KPI cards are not modified |
| TRM source | BFF proxies `https://co.dolarapi.com/v1/trm`; no direct client-side fetch to external URLs |
| AsyncState | All hooks with async calls MUST use `AsyncState<T>` from `src/features/shared/types/async-state.types.ts` |
| Empty hierarchy | `selectedUserIds.length === 0` → skip DB query, return zeros immediately |
| Manual TRM precision | Manual input accepts positive numbers with up to 2 decimal places |
| USD formatting | All USD amounts formatted with 2 decimal places (e.g. `"USD 2,500.00"`) |
| TRM formatting | TRM displayed with period thousands separator, no decimals for whole rates (e.g. `"4,050 COP/USD"`) |

---

## Out of Scope

- `isInternacional` filter toggle or flag usage
- Prisma schema changes
- Persisting TRM to DB or caching beyond the request lifecycle
- Changes to `DashboardFilterContext`, `HierarchySelectionContext`, or `CoachKpiCard`
- Authentication or authorization changes
- Any modification to existing KPI cards outside the new USD section
