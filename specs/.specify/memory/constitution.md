<!--
Sync Impact Report:
Version: 1.0.0 → 1.1.0 (Updated with AGENTS.md and ARCHITECTURE.md improvements)
Modified principles:
  - Enhanced Feature-Based Architecture section with detailed structure
  - Added Skills and Subagents section
  - Updated TypeScript practices with React 19 and Next.js 15 specifics
  - Enhanced Testing Standards with colocalized testing structure
  - Added Validation and Schemas section
  - Updated Development Workflow with commit guidelines
Added sections:
  - Skills and Subagents
  - Validation and Schemas (Zod)
  - Commit & Pull Request Guidelines
  - Tech Stack Context
Templates requiring updates:
  - ✅ plan-template.md (Constitution Check section aligns)
  - ✅ spec-template.md (Architecture principles align)
  - ✅ tasks-template.md (Task categorization aligns)
  - ⚠️ commands/*.md (May need updates if references to old patterns exist)
Follow-up TODOs: None
-->

# Financieramente App Constitution

## Project Context

Financieramente is a modern commission settlement platform for financial services built with:
- **Frontend**: Next.js 15, React 19, Tailwind CSS v4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15
- **UI**: Shadcn/UI + Radix UI
- **Testing**: Vitest, Testing Library, Playwright
- **Infrastructure**: Docker, Terraform, Digital Ocean

## Core Principles

### I. Screaming Architecture (Domain-Driven Organization)

**MUST**: Organize code by business domains, not technical types. The folder structure MUST reflect what the application does, not how it's implemented.

- Features MUST be organized under `src/features/` by domain (e.g., `authentication/`, `user-management/`, `email/`, `negocios/`)
- Each feature domain MUST be self-contained with its own:
  - `types/` - Domain-specific TypeScript interfaces (or `types.ts` if simple)
  - `lib/` - Schemas Zod and API/business logic functions
    - `[feature]-api.ts` - API functions
    - `[feature]-schemas.ts` - Zod schemas for validation
  - `components/` - UI components (if applicable)
  - `hooks/` - React hooks (if applicable)
  - `services/` - Business logic services (optional, only if needed)
  - `mappers/` - Data mappers (optional, only if needed)
  - `__tests__/` - Tests colocalized with the feature
  - `index.ts` - Barrel exports (optional)
- **MUST NOT**: Create files in legacy locations:
  - ❌ `src/services/` (migrate to `src/features/[domain]/services/` or `lib/`)
  - ❌ `src/lib/` for domain logic (use `src/features/[domain]/lib/`)
  - ❌ Global `src/types/` for domain types (use `src/features/[domain]/types/`)
- Shared utilities that don't belong to a specific domain go in `src/features/shared/` only if used by 3+ features

**Rationale**: Makes the codebase self-documenting. New developers can immediately understand business capabilities from folder structure. Enables independent feature development and testing.

### II. SOLID Principles

**MUST**: All code MUST adhere to SOLID principles:

- **Single Responsibility**: Each function, class, or module MUST have one reason to change
- **Open/Closed**: Open for extension, closed for modification. Use interfaces and factory patterns
- **Liskov Substitution**: Derived classes/interfaces MUST be substitutable for their base types
- **Interface Segregation**: Create specific, focused interfaces rather than large, general ones
- **Dependency Inversion**: Depend on abstractions (interfaces), not concrete implementations. Use factory pattern for dependency injection

**Implementation**:
- Services MUST be created via factory functions that accept dependencies as parameters
- NO static classes or singleton patterns for business logic
- Dependencies MUST be injected, not imported directly
- Contracts (interfaces) MUST be defined in `contracts.ts` within each feature domain

**Rationale**: Ensures maintainable, testable, and extensible code. Enables proper mocking in tests and reduces coupling.

### III. TypeScript Best Practices (NON-NEGOTIABLE)

**MUST**: Strict type safety and immutability throughout the codebase.

- TypeScript strict mode MUST be enabled
- NO `any` types allowed. Use `unknown` if type is truly unknown, then narrow with type guards
- Interfaces MUST use `readonly` for immutable properties
- Prefer `interface` over `type` for object structures, especially when extending
- Use union types and discriminated unions for type-safe state management
- All functions MUST have explicit return types
- Error handling MUST use typed error objects with specific error codes
- Use Zod schemas for validation and infer TypeScript types from schemas

**Example**:
```typescript
// ✅ Correct - Interface with readonly
interface AuthenticatedUser {
  readonly id: string
  readonly email: string
}

// ✅ Correct - Zod schema with type inference
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

// ❌ Incorrect - Mutable interface without readonly
interface User {
  id: string
  email: string
}
```

**Rationale**: Prevents runtime errors, improves IDE support, enables refactoring confidence, and documents code contracts.

### IV. Functional Programming & Immutability

**MUST**: Prefer functional programming patterns over object-oriented ones.

- Use pure functions whenever possible (no side effects, same input = same output)
- NO static classes for business logic. Use factory functions or plain functions instead
- Data structures MUST be immutable (use `readonly` in interfaces)
- Prefer `const` over `let`, avoid `var`
- Use array methods (`map`, `filter`, `reduce`) over imperative loops when appropriate
- Functions MUST be small (< 50 lines) and do one thing
- Maximum 3 parameters per function (use objects for more)

**Example**:
```typescript
// ✅ Correct - Plain function with types
// src/features/auth/lib/auth-api.ts
import { apiClient } from '@/lib/api/client'
import type { AuthenticatedUser } from '../types/auth.types'

export async function login(email: string, password: string): Promise<AuthenticatedUser> {
  return apiClient.post<AuthenticatedUser>('/api/auth/login', { email, password })
}

// ✅ Correct - Factory function with dependency injection (if needed)
export function createAuthenticationService(
  tokenManager: ITokenManager,
  userValidator: IUserValidator
): IAuthenticationService {
  return {
    async login(email: string, password: string) {
      // implementation
    }
  }
}

// ❌ Incorrect - Static class
export class AuthService {
  static async login(email: string, password: string) {
    // implementation
  }
}
```

**Rationale**: Functional code is easier to test, reason about, and parallelize. Immutability prevents bugs from unexpected mutations.

### V. Clean Code Standards

**MUST**: Write self-documenting, maintainable code.

- **Naming**: Use descriptive names. Functions should be verbs, variables should be nouns
  - Prefix event handlers with `handle`: `handleClick`, `handleSubmit`
  - Prefix boolean variables with verbs: `isLoading`, `hasError`, `canSubmit`
  - Prefix custom hooks with `use`: `useAuth`, `useForm`
  - Use camelCase for variables, functions, methods, hooks, properties
  - Use PascalCase for components, types, interfaces
  - Use kebab-case for directory and file names
- **Functions**: 
  - Maximum 50 lines per function (prefer smaller)
  - Single responsibility per function
  - Maximum 3 parameters (use objects for more)
- **Comments**: Only comment "why", not "what". Code should be self-explanatory
- **Dead Code**: Remove unused imports, functions, and variables before committing
- **Formatting**: Use Prettier with project configuration. Tabs for indentation, single quotes for strings

**Rationale**: Reduces cognitive load, enables faster onboarding, and prevents bugs from unclear code.

### VI. Test-First Development (NON-NEGOTIABLE for Business Logic)

**MUST**: Write tests for all business logic, utilities, and services.

- Unit tests MUST be written for:
  - All utility functions
  - All business logic services
  - All custom hooks
  - All schema validations (Zod schemas)
- Integration tests MUST be written for:
  - API endpoints
  - Database operations
  - Inter-service communication
- E2E tests MUST cover critical user journeys
- Minimum 80% code coverage for business logic (utilities, services, hooks)
- Tests MUST use AAA pattern (Arrange, Act, Assert)
- Tests MUST be deterministic (no external dependencies, proper mocking)
- Tests MUST be colocalized in `__tests__/` within each feature

**Test Structure**:
- Unit tests: `src/features/[domain]/__tests__/`
- Integration tests: `vitest.integration.config.ts`
- E2E tests: `e2e/`

**Rationale**: Prevents regressions, enables confident refactoring, and documents expected behavior.

### VII. Error Handling & Validation

**MUST**: Implement proper error handling and input validation.

- All user inputs MUST be validated using Zod schemas
- Schemas MUST be defined in `lib/[feature]-schemas.ts` within each feature
- Use Zod schemas for both client-side and server-side validation
- Export TypeScript types from schemas using `z.infer<typeof schema>`
- Errors MUST be typed with specific error codes
- Error messages MUST be user-friendly and actionable
- Database errors MUST be caught and logged, never exposed to users
- Use Result types or try-catch with typed errors, not generic `Error`

**Example**:
```typescript
// ✅ Correct - Zod schema with type inference
// src/features/auth/lib/auth-schemas.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export type LoginInput = z.infer<typeof loginSchema>

// ✅ Correct - Typed error
interface AuthenticationError extends Error {
  readonly code: 'INVALID_CREDENTIALS' | 'KEYCLOAK_ERROR' | 'VALIDATION_ERROR'
  readonly details?: unknown
}

// ❌ Incorrect - Generic error
throw new Error('Login failed')
```

**Rationale**: Provides better debugging, user experience, and security. Prevents information leakage.

## Architecture Constraints

### Feature-Based Organization

**MUST**: All new code MUST follow the feature-based structure:

```
src/features/[domain]/
├── types/                # Domain types (readonly interfaces) or types.ts if simple
├── lib/                  # Schemas Zod and API/business logic functions
│   ├── [feature]-api.ts
│   └── [feature]-schemas.ts
├── components/           # React components (if applicable)
├── hooks/                # React hooks (if applicable)
├── services/             # Business logic services (optional, only if needed)
├── mappers/              # Data mappers (optional, only if needed)
├── __tests__/            # Tests colocalized with the feature
└── index.ts              # Barrel exports (optional)
```

**MUST NOT**: Create new files in legacy locations:
- ❌ `src/services/` (migrate to `src/features/[domain]/services/` or `lib/`)
- ❌ `src/lib/` for domain logic (use `src/features/[domain]/lib/`)
- ❌ Global `src/types/` for domain types (use `src/features/[domain]/types/`)

### Dependency Injection

**MUST**: Use factory pattern for services when needed, or plain functions for simpler cases:

```typescript
// ✅ Correct - Plain function (preferred for simple cases)
// src/features/users/lib/user-api.ts
import { apiClient } from '@/lib/api/client'
import type { User } from '../types/user.types'

export async function createUser(data: CreateUserInput): Promise<User> {
  return apiClient.post<User>('/api/users', data)
}

// ✅ Correct - Factory function (when dependency injection is needed)
export function createUserService(
  prisma: PrismaClient,
  emailService: IEmailService
): IUserService {
  return {
    async createUser(data) {
      // implementation using injected dependencies
    }
  }
}

// ❌ Incorrect - Direct imports in service
export const userService = {
  async createUser(data) {
    // directly imports prisma, emailService
  }
}
```

**Rationale**: Enables testing with mocks, reduces coupling, and follows SOLID principles. Plain functions are simpler and preferred when dependencies are minimal.

## Code Quality Standards

### Type Safety

- **MUST**: Use TypeScript strict mode
- **MUST NOT**: Use `any` type
- **MUST**: Define explicit return types for all functions
- **MUST**: Use `readonly` for immutable data structures
- **MUST**: Use type guards for narrowing types

### Code Organization

- **MUST**: Keep functions under 50 lines
- **MUST**: Limit function parameters to 3 (use objects for more)
- **MUST**: One responsibility per function/class
- **MUST**: Remove unused code before committing
- **MUST**: Use consistent naming conventions (camelCase for variables/functions, PascalCase for types/components)

### Performance

- **MUST**: Leverage React 19 Compiler; avoid manual `useMemo`/`useCallback` unless profiling shows necessity
- **MUST**: Use React Query or similar for data fetching and caching
- **MUST**: Implement code splitting for large features
- **MUST**: Optimize images and assets
- **MUST**: Target Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)

## Development Workflow

### Code Review Requirements

- **MUST**: Require at least one approval for production code changes
- **MUST**: Review for:
  - Architecture compliance (feature-based, SOLID principles)
  - Type safety (no `any`, proper interfaces)
  - Test coverage (business logic must have tests)
  - Security vulnerabilities
  - Performance implications
- **MUST**: Verify all code follows established patterns and conventions
- **MUST**: Use `architecture-enforcer` subagent when creating/modifying code in `src/features/`

### Continuous Integration

- **MUST**: Run linting, formatting, and type checking in CI pipeline
- **MUST**: Run unit and integration tests in CI
- **MUST**: Block merging if tests fail or coverage drops below threshold
- **MUST**: Run security scans and dependency vulnerability checks
- **MUST**: Monitor application performance and error rates in production

### Documentation

- **MUST**: Document all public functions, interfaces, and services with JSDoc
- **MUST**: Use complete sentences with proper punctuation in documentation
- **MUST**: Keep API documentation up-to-date
- **MUST**: Document architectural decisions in relevant docs
- **MUST**: Provide clear setup instructions in README

## Skills and Subagents

### Available Skills

Use these skills for detailed patterns on-demand:

**Generic Skills (Any Project)**:
- `typescript` - Const types, flat interfaces, utility types, strict typing
- `react-19` - No useMemo/useCallback, React Compiler patterns
- `nextjs-16` - App Router, Server Actions, Server Components, caching
- `screaming-architecture` - Feature-based organization, domain-driven structure
- `commit-messages` - Conventional commits, clear commit messages
- `code-review-skill` - Security, performance, maintainability reviews

**Financieramente-Specific Skills**:
- `financieramente` - Project overview, structure, scripts, architecture

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:
- Writing React components → `react-19`
- Writing TypeScript types/interfaces → `typescript`
- Working with App Router / Server Actions → `nextjs-16`

### Architecture Enforcer Subagent

The **architecture-enforcer** subagent validates that all new code follows:
- Feature-Based Architecture (Screaming Architecture)
- Proper feature structure (`components/`, `hooks/`, `lib/`, `types/`, `__tests__/`)
- TypeScript best practices (no `any`, readonly when appropriate)
- Schemas Zod for validation
- Testing colocalizado

**Invoke when**: Creating or modifying code in `src/features/` to ensure architectural compliance.

## Commit & Pull Request Guidelines

### Commit Messages

- **MUST**: Follow conventional-commit style: `<type>[scope]: <description>`
- **Types**: `feat`, `fix`, `docs`, `chore`, `perf`, `refactor`, `style`, `test`
- **MUST**: Use the `commit-messages` skill when writing commit messages

### Pull Request Checklist

Before creating a PR:
1. Complete checklist in `.github/pull_request_template.md`
2. Run all relevant tests and linters (`npm run test:all && npm run lint`)
3. Link screenshots for UI changes
4. Ensure architecture compliance (use `architecture-enforcer` subagent)
5. Verify all code follows established patterns and conventions

## Governance

### Constitution Authority

This constitution supersedes all other coding practices and conventions. All code reviews MUST verify compliance with these principles.

### Amendment Process

- Amendments require:
  1. Documentation of the change and rationale
  2. Review and approval from technical leads
  3. Migration plan if the change affects existing code
  4. Update to version number (semantic versioning: MAJOR.MINOR.PATCH)
     - MAJOR: Backward incompatible changes
     - MINOR: New principles or significant additions
     - PATCH: Clarifications or minor refinements

### Compliance

- All PRs MUST pass constitution checks before merging
- Violations MUST be justified or fixed before approval
- Complexity that violates principles MUST be documented with rationale
- Use `.cursor/rules/ARCHITECTURE.md` for detailed architecture guidance
- Use `AGENTS.md` for skills, subagents, and development workflow guidance

**Version**: 1.1.0 | **Ratified**: 2026-01-23 | **Last Amended**: 2026-01-28
