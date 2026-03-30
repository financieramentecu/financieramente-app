## Why

Provides users with a comprehensive history of past settlements with flexible date filtering (month or date range). This solves the current lack of a historical view in the UI and allows for quick consultation of settlement data without any transactional actions. This view is purely informative because the actual settlement action is executed during the pre-settlement phase.

## What Changes

- **New Page**: `/dashboard/liquidaciones` containing a read-only historical consultation view, very similar to the pre-liquidación interface.
  - **Histórico de Liquidaciones**: List commissions with status `SETTLED`.
  - The view will explicitly highlight key information:
    - Total amount settled in the selected month/period.
    - Total amount corresponding to *clawbacks*.
    - A breakdown grid showing the payout distributions.
- **No Settlement Actions**: The interface will NOT include any actions to settle commissions (no "LIQUIDAR" button). It is strictly for information querying and consultation.
- **Filtering**: Supports reactive filtration by calendar month or continuous date interval range to consult historical settlements easily.
- **Database Extension**: Add map element `settledDate DateTime? @map("settled_date")` to `SettlementCommission` to record exact settlement times for accurate historical filtering.

## Capabilities

### New Capabilities
- `settlement-process`: Covers the historical settlement interface, layout design to display total settled value, clawbacks, distributions, and date interval query setups. No settlement actions are included, strictly queries and information display.

### Modified Capabilities
- None.

## Impact

- **UI**: Added router navigation files and dashboard layout components for historical consultation.
- **Backend/Service Updates**: Adding `settledDate` column to support historical date filtering based on when the settlement actually occurred.
