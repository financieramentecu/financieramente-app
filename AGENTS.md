# Repository Guidelines

## How to Use This Guide

- Start here for cross-project norms. Financieramente is a commission settlement platform.
- Each feature follows Feature-Based Architecture in `src/features/`.
- Use skills and subagents to ensure code quality and architectural consistency.

## Available Skills

Use these skills for detailed patterns on-demand:

### Generic Skills (Any Project)
| Skill | Description | When to Use | URL |
|-------|-------------|-------------|-----|
| `typescript` | Const types, flat interfaces, utility types, strict typing | Writing TypeScript types/interfaces, refactoring types | [SKILL.md](skills/typescript/SKILL.md) |
| `react-19` | No useMemo/useCallback, React Compiler patterns | Writing React components/hooks | [SKILL.md](skills/react-19/SKILL.md) |
| `nextjs-16` | App Router, Server Actions, Server Components, caching | Working with Next.js App Router, API routes | [SKILL.md](skills/nextjs-16/SKILL.md) |
| `screaming-architecture` | Feature-based organization, domain-driven structure | Organizing code by feature/domain | [SKILL.md](skills/screaming-architecture/SKILL.md) |
| `commit-messages` | Conventional commits, clear commit messages | Writing commit messages, preparing commits | [SKILL.md](skills/commit-messages/SKILL.md) |
| `code-review-skill` | Security, performance, maintainability reviews | Code reviews, PR reviews, security analysis | [SKILL.md](skills/code-review-skill/SKILL.md) |

### Financieramente-Specific Skills
| Skill | Description | When to Use | URL |
|-------|-------------|-------------|-----|
| `financieramente` | Project overview, structure, scripts, architecture | Onboarding, navigating codebase, running scripts | [SKILL.md](skills/financieramente/SKILL.md) |

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Writing React components | `react-19` |
| Writing TypeScript types/interfaces | `typescript` |
| Working with App Router / Server Actions | `nextjs-16` |

---

## Available Subagents

Subagents are specialized AI assistants that enforce specific architectural or code quality rules:

| Subagent | Description | When to Use | Location |
|----------|-------------|-------------|----------|
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

## Project Overview

Financieramente is a modern commission settlement platform for financial services.

| Component | Location | Tech Stack |
|-----------|----------|------------|
| **Pages** | `src/app/` | Next.js 15 App Router |
| **API Routes** | `src/app/api/` | Next.js 15 API Routes |
| **Features** | `src/features/` | Feature-Based Architecture, React 19, TypeScript |
| **Shared** | `src/features/shared/` | UI components, hooks, providers, types |
| **Database** | `prisma/` | Prisma ORM, PostgreSQL |
| **Infrastructure** | `terraform/` | Digital Ocean, Docker |

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

See [.cursor/rules/ARCHITECTURE.md](.cursor/rules/ARCHITECTURE.md) for detailed architecture guidelines.
