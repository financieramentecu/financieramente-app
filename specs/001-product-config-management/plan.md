# Implementation Plan: Product Configuration Management

**Branch**: `001-product-config-management` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-product-config-management/spec.md`

## Summary

Implement a product configuration management module that allows administrators to create, read, update, and soft-delete (activate/inactivate) product configurations by combining Company + Product + Origin Client + Category. Products are **filtered by company** using a two-step selection flow (select company first, then product dropdown shows only products from that company). The system will auto-generate a unique identifier code (format: `PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME`), automatically create and assign a ProductPercentajeCommision for new businesses when needed, validate that the product belongs to the selected company, and ensure referential integrity with existing business records. The solution follows Feature-Based Architecture with TypeScript, React 19, Next.js 15 App Router, Prisma ORM, and Zod validation.

## Technical Context

**Language/Version**: TypeScript 5.x (with Next.js 15, React 19)  
**Primary Dependencies**: Next.js 15, React 19, Prisma ORM, Zod, Radix UI (Shadcn/UI), Tailwind CSS v4  
**Storage**: PostgreSQL 15 (via Prisma ORM)  
**Testing**: Vitest (unit/integration), Testing Library (React components), Playwright (E2E)  
**Target Platform**: Web (Next.js App Router - Server Components + Server Actions)  
**Project Type**: Web application (feature-based architecture in `src/features/`)  
**Performance Goals**:

- Page load time < 1s for configuration list
- Search/filter response < 300ms
- Configuration creation/update < 500ms
- Support pagination for 1000+ configurations

**Constraints**:

- Code identifier must be immutable once created
- Product-Origin-Category combination must be unique
- Transactional creation of ProductConfiguration + ProductPercentajeCommision
- Soft delete only (preserve historical data for existing businesses)
- Admin-only access (role-based authorization)

**Scale/Scope**:

- ~50-200 product configurations initially
- 3-5 products, 2-3 origins, 5-10 categories
- Pagination at 10 records per page
- Support for concurrent admin users (2-5)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ PASS: Feature-Based Architecture (Screaming Architecture)

- Feature organized under `src/features/product-config/`
- Self-contained with `types/`, `lib/`, `components/`, `actions/`, `services/`, `__tests__/`
- No code in legacy locations (`src/services/`, `src/lib/`, `src/types/`)
- **Post-Design**: ✅ Verified in data-model.md and quickstart.md

### ✅ PASS: SOLID Principles

- Single Responsibility: Each service/function has one purpose (creation, update, listing, etc.)
- Open/Closed: Extensible via interfaces for service contracts
- Liskov Substitution: Service implementations substitutable via interfaces
- Interface Segregation: Focused interfaces per operation (create, update, list, etc.)
- Dependency Inversion: Services use factory pattern with injected Prisma client
- **Post-Design**: ✅ Verified in service implementation (product-config.service.ts)

### ✅ PASS: TypeScript Best Practices

- Strict mode enabled (already configured in project)
- No `any` types (use `unknown` with type guards)
- Interfaces use `readonly` for immutable properties
- Zod schemas define validation + infer TypeScript types
- Explicit return types for all functions
- **Post-Design**: ✅ Verified in types, schemas, and contract definitions

### ✅ PASS: Functional Programming & Immutability

- Use pure functions for business logic
- Factory functions for services (no static classes)
- Immutable data structures (`readonly` in interfaces)
- Functions < 50 lines, max 3 parameters (use objects for more)
- **Post-Design**: ✅ Verified in service implementation and utility functions

### ✅ PASS: Clean Code Standards

- Naming conventions:
  - Event handlers: `handleCreate`, `handleUpdate`, `handleToggleActive`
  - Booleans: `isLoading`, `hasError`, `canEdit`
  - Hooks: `useProductConfigs`, `useProductConfigForm`
- Functions < 50 lines
- Self-documenting code (minimal comments, only "why" not "what")
- **Post-Design**: ✅ Verified in quickstart.md examples

### ✅ PASS: Test-First Development

- Unit tests for all services, utilities, Zod schemas
- Integration tests for Server Actions + Prisma operations
- E2E tests for critical user journeys (create, search, update, toggle active)
- Minimum 80% coverage for business logic
- Tests colocalized in `src/features/product-config/__tests__/`
- **Post-Design**: ✅ Test strategy documented in data-model.md and quickstart.md

### ✅ PASS: Error Handling & Validation

- Zod schemas in `lib/product-config-schemas.ts`
- Client-side validation (form) + server-side validation (Server Actions)
- Typed errors with specific codes (`DUPLICATE_CONFIGURATION`, `INVALID_INPUT`, `NOT_FOUND`)
- User-friendly error messages (no database errors exposed)
- **Post-Design**: ✅ Verified in schemas and Server Actions implementation

### ✅ PASS: Dependency Injection

- Factory pattern for services: `createProductConfigService(prisma: PrismaClient)`
- No direct imports of Prisma in actions (injected via factory)
- Testable with mock dependencies
- **Post-Design**: ✅ Verified in service factory implementation

### ✅ PASS: React Data Fetching (Use AsyncState)

- **MUST**: Separate data fetching logic from presentation components.
- **MUST**: Use `AsyncState<T>` type for loading, error, and success states.
- **Strategy**: Creating `hooks/use-product-configurations.ts` and `hooks/use-product-configuration.ts` which return `AsyncState`.
- **Post-Design**: ✅ Verified in data-model.md (Hooks section)

### ✅ PASS: API Response Standardization

- **MUST**: All API routes return `ApiResponse<T>`.
- **MUST**: Handle success (`{ data: T }`) and error (`{ data: null, error: string }`) explicitly.
- **Strategy**: All `route.ts` handlers wrapped to return correct type.
- **Post-Design**: ✅ Verified in contracts (API Router usage)

### ✅ PASS: Component Logic Separation

- **MUST**: Presentation components (Form, List) contain NO business logic or `useEffect`.
- **MUST**: One Container/Hook per feature logic unit.
- **Strategy**:
  - `ProductConfigurationForm` (Presentational) <-> `useProductConfigurationForm` (Logic)
  - `ProductConfigurationsTable` (Presentational) <-> `useProductConfigurations` (Logic)
- **Post-Design**: ✅ Verified in Component Architecture

**STATUS**: ✅ All gates passed (Initial + Post-Design). Ready for Phase 2 (tasks breakdown).

## Project Structure

### Documentation (this feature)

```text
specs/001-product-config-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (NEEDS CLARIFICATION resolution)
├── data-model.md        # Phase 1 output (Entity definitions + Prisma schema)
├── quickstart.md        # Phase 1 output (Developer guide)
├── contracts/           # Phase 1 output (API contracts - Server Actions signatures)
│   └── product-config-actions.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/features/product-config/
├── types/
│   ├── product-config.types.ts      # Domain types (readonly interfaces)
│   └── index.ts                      # Barrel export
├── lib/
│   ├── product-config-schemas.ts    # Zod schemas + type inference
│   ├── product-config-utils.ts      # Code generation, formatting utilities
│   ├── product-config-api.ts        # Client-side API wrapper (fetches)
│   └── index.ts                      # Barrel export
├── services/
│   ├── product-config.service.ts    # Prisma operations (factory pattern)
│   ├── product-config.contracts.ts  # Service interface contracts
│   └── index.ts                      # Barrel export
├── actions/
│   ├── create-product-config.ts     # Server Action (refactor to API route handler?)
│   └── ...                          # (Moving towards API Routes per user request)
├── hooks/
│   ├── use-product-configuration-form.ts   # Form logic (state, submit, validation)
│   ├── use-product-configurations.ts       # List logic (fetch, filter, AsyncState)
│   ├── use-product-configuration-mutations.ts # Create/Update/Toggle logic
│   └── index.ts                      # Barrel export
├── components/
│   ├── product-config-list.tsx      # Table with search, filter, pagination (Server Component)
│   ├── product-config-form.tsx      # Create/Edit form (Client Component)
│   ├── product-config-filters.tsx   # Filter controls (Client Component)
│   ├── product-config-status-badge.tsx  # Status visual indicator
│   └── index.ts                      # Barrel export
├── hooks/
│   ├── use-product-config-form.ts   # Form state management (React Hook Form + Zod)
│   └── index.ts                      # Barrel export
├── __tests__/
│   ├── services/
│   │   └── product-config.service.test.ts  # Unit tests for service
│   ├── actions/
│   │   ├── create-product-config.test.ts
│   │   ├── update-product-config.test.ts
│   │   └── list-product-configs.test.ts
│   ├── lib/
│   │   ├── product-config-schemas.test.ts
│   │   └── product-config-utils.test.ts
│   └── integration/
│       └── product-config-flow.test.ts  # Integration: create + list + update + toggle
└── index.ts                          # Feature barrel export

src/app/
├── (dashboard)/
│   └── configurations/
│       ├── page.tsx                  # List page (Server Component)
│       ├── new/
│       │   └── page.tsx              # Create page
│       └── [id]/
│           └── edit/
│               └── page.tsx          # Edit page

e2e/
└── product-config/
    ├── create-product-config.spec.ts
    ├── search-filter-product-config.spec.ts
    └── update-toggle-product-config.spec.ts
```

**Structure Decision**:
This feature follows the Financieramente standard Feature-Based Architecture under `src/features/product-config/`. The structure is self-contained with clear separation of concerns:

- **types**: Domain models (readonly interfaces)
- **lib**: Schemas (Zod) + utility functions (code generation)
- **services**: Data access layer (Prisma operations via factory pattern)
- **actions**: Server Actions (Next.js 15) for mutations and queries
- **components**: UI components (Presentational only - NO Logic)
- **hooks**: Custom Hooks handling ALL logic (AsyncState, Effects, Data Fetching)
- ****tests****: Colocalized tests (unit, integration)

Pages are organized under `src/app/(dashboard)/configurations/` following Next.js 15 App Router conventions. E2E tests are in the root `e2e/` directory following project convention.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected. All constitution checks passed.**

---

## Phase 0: Research & Clarifications

**Status**: ✅ COMPLETED

**Output**: `research.md` with resolutions for all NEEDS CLARIFICATION items.

**Research Tasks** (all completed):

1. ✅ **Transactional Creation Pattern**: Decision: Use Prisma Interactive Transaction (`$transaction`) for full control over multi-step operations with rollback on failure.
2. ✅ **Code Generation Logic**: Decision: Sanitize each segment, validate length (max 50 chars), uppercase, replace spaces with `_`, join with `-`. Reject if too long (no auto-truncation).
3. ✅ **Uniqueness Validation**: Decision: Prisma compound unique constraint + application-level validation for user-friendly errors.
4. ✅ **Pagination Strategy**: Decision: Offset-based pagination (simpler, sufficient for scale ~1000 records, predictable page numbers).
5. ✅ **Authorization Pattern**: Decision: Server Action level authorization (more granular, easier to test, clearer error messages).
6. ✅ **Form Library**: Decision: React Hook Form + Zod resolver + Server Action submission (type-safe end-to-end, client + server validation).

**Deliverables**: [research.md](./research.md)

---

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETED

**Outputs**:

- ✅ `data-model.md`: Entity definitions + Prisma schema changes
- ✅ `contracts/product-config-actions.ts`: Server Actions signatures
- ✅ `quickstart.md`: Developer setup and usage guide
- ✅ Agent context updated (Cursor IDE context file)

**Design Tasks** (all completed):

1. ✅ **Data Model**: Defined ProductConfiguration entity with relationships, Prisma schema updates, migration strategy, ERD, and query patterns.
2. ✅ **API Contracts**: Defined Server Actions signatures (create, list, update, toggle, get, getAvailablePPCs) with input/output types and error codes.
3. ✅ **Component Architecture**: Defined component tree (list, form, filters, status badge), data flow (Server Components + Client Components), and state management.
4. ✅ **Test Strategy**: Defined unit test scenarios (services, utilities, schemas), integration tests (Server Actions + Prisma), and E2E tests (create, search, update, toggle).

**Deliverables**:

- [data-model.md](./data-model.md)
- [contracts/product-config-actions.ts](./contracts/product-config-actions.ts)
- [quickstart.md](./quickstart.md)

---

## Notes

- This plan follows the `/speckit.plan` command workflow
- Phase 0 (research.md) will resolve all technical unknowns
- Phase 1 (data-model.md, contracts/, quickstart.md) will provide implementation blueprints
- Tasks breakdown (tasks.md) will be created by separate `/speckit.tasks` command
- Implementation follows Financieramente constitution and coding standards
