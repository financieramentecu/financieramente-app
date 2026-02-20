# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Financieramente is a commission settlement platform for financial services built with Next.js 15 App Router.

| Component        | Location               | Tech                                 |
| ---------------- | ---------------------- | ------------------------------------ |
| Pages            | `src/app/`             | Next.js 15 App Router                |
| API Routes       | `src/app/api/`         | Next.js Route Handlers               |
| Features         | `src/features/`        | Feature-Based Architecture           |
| Shared UI/hooks  | `src/features/shared/` | React 19, Tailwind v4                |
| Global utilities | `src/lib/`             | Prisma client, auth, nav, API client |
| Database         | `prisma/`              | Prisma ORM, PostgreSQL 15            |

**Stack**: Next.js 15, React 19, TypeScript 5, Prisma ORM, Zod, React Hook Form, Shadcn/UI + Radix UI, Tailwind CSS v4, Sonner, NextAuth v5, Vitest, Playwright.

---

## Commands

```bash
# Dev
npm run dev
npm run build
npm run type-check
npm run lint
npm run format

# Testing
npm run test:unit                    # Unit tests (vitest.unit.config.ts)
npm run test:integration             # Integration tests
npm run test:e2e                     # Playwright E2E
npm run test:all                     # All three

# Run a single test file
npx vitest run src/features/categories/__tests__/lib/category-api.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "should fetch"

# Prisma
npm run prisma:migrate:dev           # Run migrations (dev)
npm run prisma:generate              # Regenerate client after schema changes
npm run prisma:studio                # Open Prisma Studio
npm run prisma:seed                  # Seed database
```

---

## Architecture Rules

### Feature-Based Structure

All code lives in `src/features/[feature-name]/`. Do **not** add files to `src/services/`, `src/utils/`, or `src/types/`.

```
src/features/[feature-name]/
├── components/       # React components
├── hooks/            # Custom hooks (data fetching, mutations)
├── lib/              # Zod schemas + API functions
│   ├── [name]-api.ts
│   └── [name]-schemas.ts
├── types/            # TypeScript interfaces
├── services/         # Prisma queries (only if needed by Server Actions)
├── mappers/          # Data mappers between layers (optional)
└── __tests__/        # Colocated tests
    ├── lib/
    ├── hooks/
    ├── mappers/
    └── fixtures/
```

**Reference implementation**: `src/features/categories/` — use this as the canonical pattern for new CRUD features.

### Actions vs Services (Server-side only)

- **Server Actions** (`actions/`): validate input with Zod → call services → return `ApiResponse<T>`. Never call Prisma directly.
- **Services** (`services/`): all Prisma calls. Return domain data, not `ApiResponse`.

### API Routes

All routes must use `ApiResponse<T>` from `@/features/shared/types/api-response.types`:

```typescript
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export async function GET(): Promise<NextResponse<ApiResponse<MyType>>> {
	try {
		const data = await myService.getAll()
		return NextResponse.json({ data })
	} catch {
		return NextResponse.json({ data: null, error: 'Failed' }, { status: 500 })
	}
}
```

Auth check pattern at the top of every protected route:

```typescript
const session = await auth()
if (!session?.user) {
	return NextResponse.json(
		{ data: null, error: 'Unauthorized' },
		{ status: 401 }
	)
}
```

See `src/app/api/AGENTS.md` for the full API route reference.

### Client-side API Calls

Use `apiClient` from `src/lib/api/client.ts` — never raw `fetch` in feature lib files:

```typescript
import { apiClient } from '@/lib/api/client'

export async function getCategories(): Promise<Category[]> {
	return apiClient.get<Category[]>('/api/categories')
}
```

### TypeScript

- No `any`. Use `unknown` at boundaries, narrow with Zod or type guards.
- Use `readonly` on interface fields that don't mutate.
- Cast overlapping types via `as unknown as TargetType`.
- Prefer `const` object maps over enums.

### React Components

- No `useMemo`/`useCallback` — React Compiler handles memoization.
- Pages are Server Components (handle auth + layout); interactive parts are Client Components (`'use client'`).
- Sidebar menu items: `src/lib/navigation/menu-items.tsx` (`ALL_MENU_ITEMS`, `AGENTE_MENU_ITEMS`). Icons from `lucide-react`.

---

## Testing Patterns

```typescript
// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock API module
vi.mock('../../lib/category-api', () => ({ getCategories: vi.fn() }))

// Hooks
const { result } = renderHook(() => useCategories())
await waitFor(() => expect(result.current.data).toBeDefined())
```

- Test fixtures live in `__tests__/fixtures/` within each feature.
- `DataTable` columns require unique `key` per column.

---

## Prisma

After modifying `prisma/schema.prisma`:

1. `npm run prisma:migrate:dev` — create and apply migration
2. `npm run prisma:generate` — regenerate client

When adding model fields, also update mock fixtures in `__tests__/fixtures/` that construct full Prisma objects.

---

## Commit & PR Guidelines

Conventional commits: `<type>[scope]: <description>`
Types: `feat`, `fix`, `docs`, `chore`, `perf`, `refactor`, `style`, `test`

Before a PR:

1. `npm run test:all && npm run lint && npm run type-check`
2. Complete `.github/pull_request_template.md` checklist
3. Link screenshots for UI changes

---

## Available Skills

Use these skills for detailed patterns on-demand:

### Generic Skills (Any Project)

| Skill                    | Description                                                | When to Use                                            | URL                                      |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| `typescript`             | Const types, flat interfaces, utility types, strict typing | Writing TypeScript types/interfaces, refactoring types | `skills/typescript/SKILL.md`             |
| `react-19`               | No useMemo/useCallback, React Compiler patterns            | Writing React components/hooks                         | `skills/react-19/SKILL.md`               |
| `nextjs-16`              | App Router, Server Actions, Server Components, caching     | Working with Next.js App Router, API routes            | `skills/nextjs-16/SKILL.md`              |
| `screaming-architecture` | Feature-based organization, domain-driven structure        | Organizing code by feature/domain                      | `skills/screaming-architecture/SKILL.md` |
| `commit-messages`        | Conventional commits, clear commit messages                | Writing commit messages, preparing commits             | `skills/commit-messages/SKILL.md`        |
| `code-review-skill`      | Security, performance, maintainability reviews             | Code reviews, PR reviews, security analysis            | `skills/code-review-skill/SKILL.md`      |

### Financieramente-Specific Skills

| Skill             | Description                                        | When to Use                                      | URL                               |
| ----------------- | -------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| `financieramente` | Project overview, structure, scripts, architecture | Onboarding, navigating codebase, running scripts | `skills/financieramente/SKILL.md` |

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

| Subagent                | Description                                   | When to Use                                | Location                                  |
| ----------------------- | --------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| `architecture-enforcer` | Ensures Feature-Based Architecture compliance | Creating/modifying code in `src/features/` | `.cursor/agents/architecture-enforcer.md` |

### Architecture Enforcer

The **architecture-enforcer** subagent validates that all new code follows:

- Feature-Based Architecture (Screaming Architecture)
- Proper feature structure (`components/`, `hooks/`, `lib/`, `types/`, `__tests__/`)
- TypeScript best practices (no `any`, readonly when appropriate)
- Schemas Zod for validation
- Testing colocalizado

**Invoke when**: Creating or modifying code in `src/features/` to ensure architectural compliance.
