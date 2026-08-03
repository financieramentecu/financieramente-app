---
description:
alwaysApply: true
---

# Agent Teams Lite — Lean Orchestrator Instructions

Add this section to your existing `~/.claude/CLAUDE.md` or project-level `CLAUDE.md`.

---

## Spec-Driven Development (SDD) Orchestrator

You are the ORCHESTRATOR for Spec-Driven Development. Keep the same mentor identity and apply SDD as an overlay.

### Core Operating Rules
- Delegate-only: never do analysis/design/implementation/verification inline.
- Launch sub-agents via Task for all phase work.
- The lead only coordinates DAG state, user approvals, and concise summaries.
- `/sdd-new`, `/sdd-continue`, and `/sdd-ff` are meta-commands handled by the orchestrator (not skills).

### Artifact Store Policy
- `artifact_store.mode`: `engram | openspec | hybrid | none`
- Default: `hybrid` (persists to both Engram and OpenSpec always); `openspec` only if engram is unavailable; otherwise `none`.
- `hybrid` persists to BOTH Engram and OpenSpec. Provides cross-session recovery + local file artifacts. Consumes more tokens per operation.
- In `none`, do not write project files. Return results inline and recommend enabling `engram` or `openspec`.

### Commands
- `/sdd-init` → launch `sdd-init` sub-agent
- `/sdd-explore <topic>` → launch `sdd-explore` sub-agent
- `/sdd-new <change>` → run `sdd-explore` then `sdd-propose`
- `/sdd-continue [change]` → create next missing artifact in dependency chain
- `/sdd-ff [change]` → run `sdd-propose` → `sdd-spec` → `sdd-design` → `sdd-tasks`
- `/sdd-apply [change]` → launch `sdd-apply` in batches
- `/sdd-verify [change]` → launch `sdd-verify`
- `/sdd-archive [change]` → launch `sdd-archive`

### Dependency Graph
```
proposal -> specs --> tasks -> apply -> verify -> archive
             ^
             |
           design
```
- `specs` and `design` both depend on `proposal`.
- `tasks` depends on both `specs` and `design`.

### Sub-Agent Launch Pattern
When launching a phase, require the sub-agent to read `~/.claude/skills/sdd-{phase}/SKILL.md` first and return:
- `status`
- `executive_summary`
- `artifacts` (include IDs/paths)
- `next_recommended`
- `risks`

### State & Conventions (source of truth)
Keep this file lean. Do NOT inline full persistence and naming specs here.

Use shared convention files installed under `~/.claude/skills/_shared/`:
- `engram-convention.md` for artifact naming + two-step recovery
- `persistence-contract.md` for mode behavior + state persistence/recovery
- `openspec-convention.md` for file layout when mode is `openspec`

### Recovery Rule
If SDD state is missing (for example after context compaction), recover from backend state before continuing:
- `engram`: `mem_search(...)` then `mem_get_observation(...)`
- `openspec`: read `openspec/changes/*/state.yaml`
- `none`: explain that state was not persisted

### SDD Suggestion Rule
For substantial features/refactors, suggest SDD.
For small fixes/questions, do not force SDD.



# Repository Guidelines

## How to Use This Guide

- Start here for cross-project norms. Financieramente is a commission settlement platform.
- Each feature follows Feature-Based Architecture in `src/features/`.
- Use skills and subagents to ensure code quality and architectural consistency.

## Available Skills

Use these skills for detailed patterns on-demand:

### Generic Skills (Any Project)

| Skill                    | Description                                                | When to Use                                            | URL                                                |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `typescript`             | Const types, flat interfaces, utility types, strict typing | Writing TypeScript types/interfaces, refactoring types | [SKILL.md](skills/typescript/SKILL.md)             |
| `react-19`               | No useMemo/useCallback, React Compiler patterns            | Writing React components/hooks                         | [SKILL.md](skills/react-19/SKILL.md)               |
| `nextjs-16`              | App Router, Server Actions, Server Components, caching     | Working with Next.js App Router, API routes            | [SKILL.md](skills/nextjs-16/SKILL.md)              |
| `screaming-architecture` | Feature-based organization, domain-driven structure        | Organizing code by feature/domain                      | [SKILL.md](skills/screaming-architecture/SKILL.md) |
| `commit-messages`        | Conventional commits, clear commit messages                | Writing commit messages, preparing commits             | [SKILL.md](skills/commit-messages/SKILL.md)        |
| `code-review-skill`      | Security, performance, maintainability reviews             | Code reviews, PR reviews, security analysis            | [SKILL.md](skills/code-review-skill/SKILL.md)      |

### Financieramente-Specific Skills

| Skill             | Description                                        | When to Use                                      | URL                                         |
| ----------------- | -------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `financieramente` | Project overview, structure, scripts, architecture | Onboarding, navigating codebase, running scripts | [SKILL.md](skills/financieramente/SKILL.md) |

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action                                   | Skill        |
| ---------------------------------------- | ------------ |
| Writing React components                 | `react-19`   |
| Writing TypeScript types/interfaces      | `typescript` |
| Working with App Router / Server Actions | `nextjs-16`  |

---

## Available Subagents

Subagents are specialized AI assistants that enforce specific architectural or code quality rules:

| Subagent                | Description                                   | When to Use                                | Location                                                                           |
| ----------------------- | --------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `architecture-enforcer` | Ensures Feature-Based Architecture compliance | Creating/modifying code in `src/features/` | [.cursor/agents/architecture-enforcer.md](.cursor/agents/architecture-enforcer.md) |

### Architecture Enforcer

The **architecture-enforcer** subagent validates that all new code follows:

- Feature-Based Architecture (Screaming Architecture)
- Proper feature structure (`components/`, `hooks/`, `lib/`, `types/`, `__tests__/`)
- TypeScript best practices (no `any`, readonly when appropriate)
- Schemas Zod for validation
- Testing colocalizado

**Invoke when**: Creating or modifying code in `src/features/` to ensure architectural compliance.

---

## API Documentation

- **[API Router Reference](src/app/api/AGENTS.md)**: Detailed guide to endpoints, authentication, and response formats.

---

## Project Overview

Financieramente is a modern commission settlement platform for financial services.

| Component          | Location               | Tech Stack                                       |
| ------------------ | ---------------------- | ------------------------------------------------ |
| **Pages**          | `src/app/`             | Next.js 15 App Router                            |
| **API Routes**     | `src/app/api/`         | Next.js 15 API Routes                            |
| **Features**       | `src/features/`        | Feature-Based Architecture, React 19, TypeScript |
| **Shared**         | `src/features/shared/` | UI components, hooks, providers, types           |
| **Database**       | `prisma/`              | Prisma ORM, PostgreSQL                           |
| **Infrastructure** | `terraform/`           | Digital Ocean, Docker                            |

### Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15
- **UI**: Shadcn/UI + Radix UI
- **Testing**: Vitest, Testing Library, Playwright
- **Infrastructure**: Docker, Terraform, Digital Ocean

---

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format

# Testing
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # E2E tests
npm run test:all          # All tests
```

## Commit & Pull Request Guidelines

Follow conventional-commit style: `<type>[scope]: <description>`

**Types:** `feat`, `fix`, `docs`, `chore`, `perf`, `refactor`, `style`, `test`

**Use the `commit-messages` skill** when writing commit messages to ensure consistency.

Before creating a PR:

1. Complete checklist in `.github/pull_request_template.md`
2. Run all relevant tests and linters (`npm run test:all && npm run lint`)
3. Link screenshots for UI changes
4. Ensure architecture compliance (use `architecture-enforcer` subagent)

## Release Management: Changelog & Versioning

**MANDATORY RULE:** When archiving a feature/functionality via SDD, you MUST:

1. **Update `CHANGELOG.md`** with the complete feature description:
   - Add a new version header `## [X.Y.Z] - YYYY-MM-DD` at the top
   - Include all changes under `### Agregado`, `### Mejorado`, `### Corregido`, and optionally `### Técnico` sections
   - Write from user/product perspective for "Agregado"/"Mejorado"/"Corregido"
   - Include technical implementation details under `### Técnico` (models, endpoints, new files, migrations)

2. **Increment `package.json` version** following **Semantic Versioning**:
   - **MAJOR** (X.0.0): Breaking changes (API incompatibilities, data schema removals)
   - **MINOR** (1.X.0): New features, backward-compatible additions
   - **PATCH** (1.0.X): Bug fixes, documentation, internal optimizations
   - Example: `1.25.0` → `1.26.0` (new feature) or `1.26.0` → `1.26.1` (bug fix)

3. **Timing:** Update version and changelog **when archiving the change**, NOT before (to ensure accurate date and content).

4. **Format:** Keep CHANGELOG.md structured and readable per [Keep a Changelog](https://keepachangelog.com/es-ES/) standards with Spanish UI copy and English technical details.

**Example (already applied for `novedad-negocio-venta-efectuada`):**
- Version bumped: `1.25.0` → `1.26.0`
- Changelog entry added with Agregado/Técnico sections
- Archive happens at archive-report time

## Coding Language Rules

- **All code must be written in English**: variable names, function names, class names, **file names**, directory names, comments, type names, interface names, enum keys.
- **Spanish is only allowed in user-facing string values**: UI labels, error messages, toast notifications, and any literal string shown to the end user.
- **No Spanish in**: identifiers, file names, comments, JSDoc, type definitions, test descriptions, or any code construct.

## Architecture Rules

### SOLID Principles (MANDATORY — no exceptions)

Every class, function, service, hook, and component MUST follow these principles:

- **S — Single Responsibility**: One reason to change. Route handlers handle HTTP only. Services handle data only. Components render only. Never mix concerns.
- **O — Open/Closed**: Extend behavior via new functions/components — do NOT modify working code to add unrelated logic. Add a new service function instead of bloating an existing one.
- **L — Liskov Substitution**: Subtypes must be substitutable. If a function accepts `PaymentInstallmentDto`, any variant must satisfy the full contract — no silent omissions.
- **I — Interface Segregation**: Small, focused interfaces. `PaymentInstallmentDto` should not carry fields that only one screen needs. Split when callers diverge.
- **D — Dependency Inversion**: Depend on abstractions, not concretions. Route handlers call service functions (not `prisma` directly). Components call hooks (not `fetch` directly).

**Code smells that signal a SOLID violation** (fix immediately):
- A function has more than one `await` chain doing unrelated things → split it
- A variable named `resolvedX2` or `newStatusInner` → derived state computed twice → compute once before use
- A component imports from `prisma` or calls `fetch` directly → wrong layer
- A `prisma.$transaction` block with 4+ distinct operations → extract helpers

### Screaming Architecture (MANDATORY)

The folder structure must SCREAM the domain, not the technology:

```
src/features/
  negocios/          ← domain: commission contracts
    components/      ← UI only, no business logic
    hooks/           ← async state + API calls
    lib/             ← pure functions, calculations, visual-state derivation
    services/        ← ALL Prisma calls live here
    actions/         ← Server Actions: validate → call service → return ApiResponse
    types/           ← domain types + DTOs
    mappers/         ← Prisma model → domain entity
    __tests__/       ← colocated tests
  shared/            ← cross-feature UI, hooks, types ONLY
```

**Violations to reject immediately**:
- `src/utils/`, `src/helpers/`, `src/services/` at root level → move to `src/features/[domain]/`
- Business logic inside a React component → move to `lib/` or a hook
- Prisma call inside a route handler → move to `services/`
- A service that returns `ApiResponse` → services return domain data, never HTTP shapes

### Feature-Based
- All code in `src/features/[feature-name]/`
- **Structure**: Each feature has `components/`, `hooks/`, `lib/`, `types/`, `__tests__/`
- **Shared Resources**: Use `src/features/shared/` for truly shared components/hooks/types
- **No Root Services**: Don't create files in `src/services/`, `src/utils/`, `src/types/` (use features)

### Actions and Services (data access)

- **Server Actions** (`actions/`): orchestrate validation, call **services** for data, and return `ApiResponse`. Do **not** call Prisma directly from actions.
- **API Routes** (`src/app/api/`): **NEVER** call Prisma from API route handlers. Always call **feature services** (`src/features/[feature]/services/` or `lib/`) for any database access. Route handlers only handle HTTP, validate input, and return responses.
- **Services** (`services/`): contain all **Prisma** (and other data) calls for the feature. Return domain data or simple result objects; no `ApiResponse` here.
- **Responsibility split**: Actions = input validation, error messages, response shape. API routes = HTTP layer only, delegate to services. Services = database queries, domain logic that touches Prisma.

### Async state in hooks

- **Hooks with async calls** must use the shared type `AsyncState<T>` from `src/features/shared/types/async-state.types.ts`. Do **not** manage three separate states (e.g. `isLoading`, `data`, `error` with multiple `useState`). Use a single discriminated state (`idle` | `loading` | `success` | `error`) for consistent UI and type narrowing.

See [.cursor/rules/ARCHITECTURE.md](.cursor/rules/ARCHITECTURE.md) for detailed architecture guidelines.

### Soft Delete (eliminación lógica)

- **NEVER use `prisma.model.delete()`** anywhere in the codebase. All deletions MUST be logical: set `status = false` via `prisma.model.update({ data: { status: false } })`.
- This applies to ALL entities across ALL features. Physical deletes are prohibited.
- API DELETE handlers return `{ success: true }` after the status update — no content body change needed.

### Audit Log (monitoreo de cambios)

- **ALL data-mutating operations MUST log to `AuditLog`** using `logAuditEvent()` from `src/features/auth/lib/audit-logger.ts`.
- Applies to: create, update, deactivate (soft delete) on ANY entity.
- Add new `AuditAction` enum values to `audit-logger.ts` following the pattern `ENTITY_ACTION` (e.g. `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED`).
- Always include: `userId` (from session), `email`, `ipAddress` (`getClientIp(headers)`), `userAgent` (`getUserAgent(headers)`), and a human-readable `details` string.
- `logAuditEvent` never throws — errors are swallowed internally so they never block the main flow.

### ERD (Entity Relationship Diagram)

- **ALWAYS update `prisma/ERD.md`** whenever `prisma/schema.prisma` changes — new models, new fields, removed fields, FK changes, or enum value renames.
- Update the three sections in order: (1) `**Enums**` block at the top, (2) the relationship lines in the `erDiagram`, (3) the entity field list in the diagram.
- Add a note under `## Índices y convenciones` for any non-obvious change (self-referential FKs, enum renames, composite uniques, etc.).
- The ERD is the single source of truth for onboarding and cross-feature impact analysis — keep it accurate.

### Date Handling (Bogotá / UTC)

- **NEVER** construct or format a business date by hand (`new Date(dateOnlyString)`, `new Date(\`${str}T12:00:00\`)` without `Z`, `.toLocaleDateString()` without `timeZone`, `.getFullYear()/.getMonth()/.getDate()` on a Bogotá business date). These desync the displayed/stored calendar day by ±1 day depending on the runtime's local timezone.
- Use `dateOnlyToBogotaNoonUtc()` (`src/features/negocios/lib/bogota-date.ts`) to convert a `YYYY-MM-DD` input into a `Date`, and `formatDateBogota()` (`src/features/shared/lib/format-date.ts`) to display any business date to the user.
- Full guide and migration tracking: [docs/DATE_HANDLING_CONVENTIONS.md](docs/DATE_HANDLING_CONVENTIONS.md). When you touch a file that handles business dates by hand, migrate it to the helpers as part of the same change and update its row in that doc.

- Git: Use Git Flow (feature/, bugfix/, audit/, hotfix/). Branch from 'develop'. Commits MUST follow Conventional Commits (feat:, fix:, chore:, docs:, refactor:, audit:). PRs must use the provided template.
