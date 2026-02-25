## Why

Direct database access using Prisma within UI components and pages creates high coupling, bypasses the domain service layer, and complicates testing and security auditing. This change aims to enforce proper architecture by migrating all database interactions to dedicated services.

## What Changes

- Removal of direct `@/lib/prisma` imports in UI pages and components.
- Migration of inline database queries to domain-specific services in `src/features/[feature]/services/`.
- Implementation of standard Service patterns for `Business`, `Agent`, and `BatchProcessing` domains.
- Enforcement of **Screaming Architecture** by ensuring pages only interact with domain services or server actions.

## Capabilities

### New Capabilities
- `domain-service-layer`: Enforce a mandatory abstraction layer between data persistence and presentation components.
- `business-domain-service`: Centralized logic for business management (creation, update, retrieval).
- `agent-domain-service`: Centralized logic for agent-specific data and performance metrics.
- `batch-processing-domain-service`: Encapsulated logic for batch file matching and processing.

## Impact

- **Affected Files**:
  * `src/app/dashboard/negocios/editar/[id]/page.tsx`
  * `src/app/dashboard/agente/page.tsx`
  * `src/app/dashboard/carga-archivos/lib/business-matcher.ts`
- **Dependencies**: Stronger reliance on `Prisma` being encapsulated within the `features/` directory.
- **Architectural Integrity**: Improved separation of concerns and testability.
