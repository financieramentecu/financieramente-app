## ADDED Requirements

### Requirement: Domain Service Abstraction
The system SHALL ensure that all database queries using Prisma are encapsulated within the service layer of their respective features.

#### Scenario: Page fetching business data
- **WHEN** a dashboard page needs to display business details for editing
- **THEN** it MUST call a domain service instead of importing `@/lib/prisma` directly

### Requirement: Service Layer Isolation
Domain services SHALL be the only modules authorized to interact with the database client, returning mapped domain entities to the callers.

#### Scenario: Service returning data
- **WHEN** a service function is executed
- **THEN** it MUST return a typed domain entity and handle its own database connection lifecycle
