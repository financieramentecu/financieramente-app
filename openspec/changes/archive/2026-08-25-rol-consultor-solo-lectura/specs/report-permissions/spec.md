# Delta for Report Permissions

## MODIFIED Requirements

### Requirement: Server-side authorization by category

Access to a report page and its data APIs MUST be allowed only if the authenticated user's active category is enabled for that report's code, OR the user satisfies a visibility bypass: `isReadOnlyRole(role) || isWriteBypassRole(role)`. Soft-deleted (`status = false`) permission rows MUST NOT grant access. A read-only-role bypass MUST grant visibility for every report category without exception; it MUST NOT grant export authorization (see report export guard requirement below).

(Previously: bypass was a single `isReportViewBypassRole` list mixing visibility and write-capable roles, with no distinct read-only concept.)

#### Scenario: Authorized category can access report APIs

- GIVEN the user's `idCategory` is enabled for `PRODUCCION_REAL`
- WHEN they call a Producción Real report API
- THEN the request SHALL proceed past the report-permission check

#### Scenario: Unauthorized category is denied

- GIVEN the user's category is not enabled for `PRODUCCION_REAL`
- AND the user is neither a read-only-role bypass nor a write-bypass role
- WHEN they call a Producción Real report API or open the report page
- THEN the system SHALL deny access

#### Scenario: Soft-deleted permission does not grant access

- GIVEN a permission row for the user's category and `PRODUCCION_REAL` exists with `status = false`
- WHEN access is evaluated
- THEN access SHALL be denied

#### Scenario: CONSULTOR bypasses the category filter entirely (new)

- GIVEN an authenticated user with role `CONSULTOR`, regardless of their category's `ReportPermission` rows
- WHEN they call any report API or open any report page
- THEN the report-category check MUST be bypassed and access SHALL be granted for every report category
- AND the data returned SHALL be scoped to the whole company

## ADDED Requirements

### Requirement: Report export blocked for read-only roles

The Excel export action for reports MUST be rejected for a user whose `isReadOnlyRole()` is `true`, using the same read-only export guard applied to Negocios, independent of the report-category visibility bypass granted to that user.

#### Scenario: CONSULTOR sees all categories but cannot export

- GIVEN a `CONSULTOR` user viewing any report with full category visibility
- WHEN they attempt to export that report to Excel via UI or direct API call
- THEN the export control SHALL be disabled in the UI with an explanatory tooltip
- AND a direct API call to the report export endpoint MUST return HTTP 403
