# domain-service-layer Specification

## Purpose
TBD - created by archiving change fix-data-leaks-prisma. Update Purpose after archive.
## Requirements
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

---

## Requirements (from refactor-admin-discount — 2026-03-16)

### Requirement: API route handlers MUST NOT import Prisma directly

API route handler files (`route.ts`) SHALL NOT import `@/lib/prisma`. All Prisma interactions MUST be encapsulated in the feature's service layer and invoked via imported service functions.

#### Scenario: Route file has no Prisma import

- GIVEN any file at `src/app/api/**/**/route.ts` that is part of the `commission-discounts` feature
- WHEN the file's imports are inspected
- THEN there SHALL be no `import { prisma }` or `import prisma` statement in the file

#### Scenario: Route delegates data access to service

- GIVEN a route handler is processing a valid request
- WHEN it needs to read or write commission discount data
- THEN it SHALL call a function exported from `src/features/commission-discounts/services/commission-discount.service.ts`
- AND SHALL NOT execute any Prisma query inline

---

### Requirement: Commission Discount service SHALL be the sole Prisma boundary for discount data

`src/features/commission-discounts/services/commission-discount.service.ts` SHALL be the only module in the `commission-discounts` feature that imports `@/lib/prisma`. Hooks, components, lib files, and route handlers SHALL NOT import Prisma.

#### Scenario: Service is the single Prisma import point

- GIVEN the `commission-discounts` feature directory
- WHEN all files are scanned for `@/lib/prisma` imports
- THEN only `services/commission-discount.service.ts` SHALL contain that import

#### Scenario: Service function returns typed data

- GIVEN `listDiscounts()` is called
- WHEN the Prisma query resolves
- THEN the function SHALL return the query result (Prisma model type)
- AND the route handler SHALL be responsible for casting/mapping to `CommissionDiscount` domain type if needed

