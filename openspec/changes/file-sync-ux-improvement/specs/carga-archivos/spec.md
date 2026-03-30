# carga-archivos Specification

## Purpose

Defines behavior for the file import module: tab layout, per-tab filtering, action button visibility, delete permissions, multi-status API, and UI accessibility requirements.

---

## Requirements

### REQ-1: Tab "Archivos" — Scope

The "Archivos" tab MUST display only file imports with status `LOAD` or `PRE-SETTLED`.

#### Scenario: In-process files are visible

- GIVEN the user navigates to "Carga de Archivos"
- WHEN the "Archivos" tab is active
- THEN only items with status `LOAD` or `PRE-SETTLED` are displayed

#### Scenario: COMPLETED files are excluded

- GIVEN a file import exists with status `COMPLETED`
- WHEN the "Archivos" tab is active
- THEN that file MUST NOT appear in the list

---

### REQ-2: Tab "Historial" — Scope

The "Historial" tab MUST display only file imports with status `COMPLETED`.

#### Scenario: Completed files are visible

- GIVEN one or more file imports with status `COMPLETED` exist
- WHEN the "Historial" tab is active
- THEN only those items are displayed

#### Scenario: Empty state is descriptive

- GIVEN no file imports with status `COMPLETED` exist
- WHEN the "Historial" tab is active
- THEN a descriptive message MUST be shown (not a blank screen)

---

### REQ-3: Filters — Both Tabs

Both tabs MUST support filtering by filename (text search), month, and year. Neither tab SHALL expose a status filter dropdown.

#### Scenario: Filter by filename

- GIVEN the "Archivos" tab has multiple items
- WHEN the user types a partial filename in the search field
- THEN only items whose filename contains that substring are shown

#### Scenario: No status filter is rendered

- GIVEN either "Archivos" or "Historial" tab is active
- WHEN the user inspects the filter controls
- THEN no status dropdown or status selector MUST be present

---

### REQ-4: Delete Button Visibility

The delete button MUST be visible only for items with status `LOAD`. Items with status `PRE-SETTLED` or `COMPLETED` MUST NOT show a delete button.

#### Scenario: LOAD item shows delete

- GIVEN a file import with status `LOAD`
- WHEN it is rendered in the "Archivos" tab
- THEN a delete button is visible

#### Scenario: PRE-SETTLED item hides delete

- GIVEN a file import with status `PRE-SETTLED`
- WHEN it is rendered in the "Archivos" tab
- THEN no delete button is present

---

### REQ-5: Action Buttons per Status

| Button | Visible when |
|--------|-------------|
| "Ver detalle" | Status `LOAD` AND sincronizados > 0 |
| "Preliquidar" | Status `LOAD` AND sincronizados > 0 AND user has permission |
| "Ir a Pre-liquidación" | Status `PRE-SETTLED` only |

#### Scenario: LOAD with sync shows actions

- GIVEN a `LOAD` item with sincronizados > 0 and the user has preliquidar permission
- WHEN rendered in "Archivos"
- THEN "Ver detalle" and "Preliquidar" buttons are visible

#### Scenario: PRE-SETTLED shows navigation only

- GIVEN a `PRE-SETTLED` item
- WHEN rendered in "Archivos"
- THEN "Ir a Pre-liquidación" is visible AND delete, "Preliquidar", "Ver detalle" are hidden

---

### REQ-6: API Multi-Status Filter

`GET /api/carga-archivos/file-import` MUST accept `status` as a comma-separated string. A single value MUST still work. Omitting `status` MAY return all statuses.

#### Scenario: Multi-status query

- GIVEN the API receives `?status=LOAD,PRE-SETTLED`
- WHEN the request is processed
- THEN only records with status `LOAD` or `PRE-SETTLED` are returned

#### Scenario: Single-status backward compatibility

- GIVEN the API receives `?status=COMPLETED`
- WHEN the request is processed
- THEN only records with status `COMPLETED` are returned

---

### REQ-7: UI Accessibility

All interactive elements MUST have a minimum contrast ratio of 4.5:1. Status badges for `LOAD` ("Sincronizado") and `PRE-SETTLED` ("Pre-liquidado") MUST be visually distinguishable. All interactive elements MUST have `cursor-pointer`. Empty states MUST show a descriptive message.

#### Scenario: Distinct status badges

- GIVEN items with status `LOAD` and `PRE-SETTLED` are both visible
- WHEN the user views them
- THEN the two badges display different labels and distinct visual styles

#### Scenario: Action buttons meet contrast

- GIVEN any action button is rendered
- WHEN measured against its background
- THEN the contrast ratio MUST be at least 4.5:1
