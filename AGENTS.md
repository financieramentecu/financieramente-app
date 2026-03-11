---
description:
alwaysApply: true
---

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

### Spec-Driven Development (SDD)

For Spec-Driven Development / OpenSpec workflow, **always use subagents** to run each phase instead of executing the phase inline:

| Phase | Command / Trigger | Action |
| ----- | ----------------- | ------ |
| Proposal | `/sdd-propose` | Launch subagent to create or update `proposal.md` from exploration or user input. |
| Design | `/sdd-design` | Launch subagent to produce `design.md` from proposal (and specs if present). |
| Spec | `/sdd-spec` | Launch subagent to write delta or full specs in `openspec/changes/{change}/specs/`. |
| Tasks | `/sdd-tasks` | Launch subagent to create `tasks.md` from proposal, specs, and design. |
| Apply | `/sdd-apply` | Launch subagent to implement tasks (code changes) in batches. |
| Verify | `/sdd-verify` | Launch subagent to verify implementation against specs and tasks. |
| Archive | `/sdd-archive` | Launch subagent to archive the change and sync delta specs to main specs. |

**Rule**: Do not execute proposal, design, spec, tasks, apply, verify, or archive logic inline. Use `mcp_task` (or equivalent) with the appropriate subagent and pass the change name, artifact store mode, and context so the subagent reads the skill and produces the artifact. See [.cursor/rules/SDD.md](.cursor/rules/SDD.md).

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

## Architecture Rules

- **Feature-Based**: All code in `src/features/[feature-name]/`
- **Structure**: Each feature has `components/`, `hooks/`, `lib/`, `types/`, `__tests__/`
- **Shared Resources**: Use `src/features/shared/` for truly shared components/hooks/types
- **No Root Services**: Don't create files in `src/services/`, `src/utils/`, `src/types/` (use features)

### Actions and Services (data access)

- **Server Actions** (`actions/`): orchestrate validation, call **services** for data, and return `ApiResponse`. Do **not** call Prisma directly from actions.
- **API Routes** (`src/app/api/`): **NUNCA** call Prisma from API route handlers. Always call **feature services** (`src/features/[feature]/services/` or `lib/`) for any database access. Route handlers only handle HTTP, validate input, and return responses.
- **Services** (`services/`): contain all **Prisma** (and other data) calls for the feature. Return domain data or simple result objects; no `ApiResponse` here.
- **Responsibility split**: Actions = input validation, error messages, response shape. API routes = HTTP layer only, delegate to services. Services = database queries, domain logic that touches Prisma.

### Async state in hooks

- **Hooks with async calls** must use the shared type `AsyncState<T>` from `src/features/shared/types/async-state.types.ts`. Do **not** manage three separate states (e.g. `isLoading`, `data`, `error` with multiple `useState`). Use a single discriminated state (`idle` | `loading` | `success` | `error`) for consistent UI and type narrowing.

See [.cursor/rules/ARCHITECTURE.md](.cursor/rules/ARCHITECTURE.md) for detailed architecture guidelines.
- Git: Use Git Flow (feature/, bugfix/, audit/, hotfix/). Branch from 'develop'. Commits MUST follow Conventional Commits (feat:, fix:, chore:, docs:, refactor:, audit:). PRs must use the provided template.
