# Settlement Process

## Purpose
Provides users with a comprehensive history of past settlements with flexible date filtering (month or date range). This view is purely informative because the actual settlement action is executed during the pre-settlement phase.

## Requirements

### Requirement: Settlement Module Layout
The system SHALL provide a Settlement module accessible via layout navigation, dedicated exclusively to historical consultation.

#### Scenario: Navigation and Layout Rendering
- **WHEN** the user navigates to `/dashboard/liquidaciones`
- **THEN** the system SHALL render a layout displaying the "Histórico de Liquidaciones" view.

---

### Requirement: Settlement History with Accordion Breakdown
The "Histórico de Liquidaciones" view SHALL display a list of commissions with status `SETTLED` using an **Accordion/Collapsible** row structure. The interface SHALL explicitly highlight key information:
- Total amount settled in the selected month/period.
- Total amount corresponding to *clawbacks*.
- A breakdown grid showing the payout distributions.

#### Scenario: Viewing historical records breakdown
- **WHEN** the user is on the "Histórico de Liquidaciones" view
- **THEN** the system SHALL display settled items, alongside total settled amounts and clawbacks. Expanding a row SHALL show detailed distribution layouts (Names, percentages, distributed amounts).

---

### Requirement: Date/Month Filtering
The historical view MUST support reactive filtering either by a specific calendar month or a continuous date range.

#### Scenario: Filter applied to listings
- **WHEN** a filter for continuous range or month is inputted
- **THEN** the historical data table SHALL query the backend using date-range filters and reload content accordingly.
