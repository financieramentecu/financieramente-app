# Delta for Lead Funnel Columns

## ADDED Requirements

### Requirement: CSV Import Entry Point on the Funnel Columns Page

The `/admin/lead-funnel-columns` page MUST provide a CSV import entry point alongside the existing column CRUD UI, consisting of a template download action, a file upload action, and a results summary panel that lists imported rows, rejected rows (with row number and reason), leads reported as ownerless, and leads reported as blocked by the WON lock. This entry point MUST be visible to users with role `ADMIN` or `ASISTENTE_GERENCIA_OPERATIVA`; the column CRUD actions on the same page remain governed by their existing `ADMIN`-only requirement, unaffected by this addition.

#### Scenario: Admin sees the import entry point

- GIVEN a user with role `ADMIN` navigates to `/admin/lead-funnel-columns`
- WHEN the page renders
- THEN a template download control and a CSV upload control SHALL be visible

#### Scenario: ASISTENTE_GERENCIA_OPERATIVA sees the import entry point

- GIVEN a user with role `ASISTENTE_GERENCIA_OPERATIVA` navigates to `/admin/lead-funnel-columns`
- WHEN the page renders
- THEN a template download control and a CSV upload control SHALL be visible

#### Scenario: Import summary panel renders rejected rows and WON-locked leads after upload

- GIVEN a user uploads a CSV file containing at least one rejected row and one lead blocked by the WON lock
- WHEN the import completes
- THEN the summary panel SHALL list the rejected row's row number and reason
- AND the summary panel SHALL list the WON-locked lead explicitly, distinct from the successfully imported rows
