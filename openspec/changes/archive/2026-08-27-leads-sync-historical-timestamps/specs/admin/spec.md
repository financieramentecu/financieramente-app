# Delta for Admin

## ADDED Requirements

### Requirement: Lead Deletion in Admin Destructive Action Surface

The system MUST restrict Lead deletion (`DELETE /api/leads/[id]`) to users with role `ADMIN` via `requireRole([UserRole.ADMIN])`. Non-admin roles MUST be rejected before any eligibility or lead-lookup logic runs.

#### Scenario: Non-admin is forbidden from deleting a lead

- GIVEN an authenticated user without the `ADMIN` role
- WHEN `DELETE /api/leads/[id]` is called
- THEN the system SHALL return HTTP 403
- AND no lead lookup or soft-delete SHALL occur

#### Scenario: Admin passes the role gate

- GIVEN an authenticated user with the `ADMIN` role
- WHEN `DELETE /api/leads/[id]` is called
- THEN the request SHALL proceed to lead lookup and eligibility evaluation
