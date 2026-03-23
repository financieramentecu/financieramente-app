# Delta for Domain Service Layer

This delta extends `openspec/specs/domain-service-layer/spec.md` to cover API routes (previously only Server Actions and pages were in scope).

---

## ADDED Requirements

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
