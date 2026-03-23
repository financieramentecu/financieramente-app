## Context

The current application structure has several points where the UI layer (Next.js Pages) directly imports and uses the `PrismaClient` instance from `@/lib/prisma`. This practice violates the **Screaming Architecture** and **Dependency Inversion** principles, making the UI directly dependent on the database schema and preventing proper unit testing of business logic without DB mocks.

## Goals / Non-Goals

**Goals:**
- Centralize all data access logic into domain services.
- Ensure UI components only consume high-level domain entities, not raw Prisma types.
- Standardize the "Service" pattern across `negocios`, `agente`, and `carga-archivos`.

**Non-Goals:**
- Refactoring the database schema.
- Optimizing performance of existing queries (unless required for refactoring).
- Changing the functional behavior of the affected pages.

## Decisions

- **Service Injection**: Instead of static classes, we will use plain functions or factory functions within `*.service.ts` files.
- **Location of Services**:
  * `src/features/negocios/services/business.service.ts` will host the logic for business editing.
  * `src/features/shared/services/agent.service.ts` or similar will host agent dashboard data fetching.
  * `src/features/carga-archivos/services/matcher.service.ts` will encapsulate matching logic.
- **Type Safety**: Services will return domain types (defined in `features/*/types/`) to decouple the frontend from Prisma's auto-generated types.

## Risks / Trade-offs

- **Risk**: Potential regression in data mapping if Prisma types differ significantly from expected domain types.
- **Mitigation**: Implement unit tests for each new service function with 100% coverage for the refactored logic.
- **Trade-off**: Slightly more boilerplate due to the additional service layer, but significantly better maintainability.
