# Tasks: Production Dashboard — Hierarchy Filter Tree

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 780–920 (14 new files + 5 modified — includes shared/services + negocios re-export) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (feature-branch-chain) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types + SessionUser + shared/user.service + negocios re-export + BFS service (TDD) | PR 1 | Base: `feature/production-dashboard-hierarchy-tree`; ~350 lines |
| 2 | API route + React components + context (TDD) | PR 2 | Base: PR 1 branch; ~380 lines |
| 3 | Navigation, shell rewrite, E2E | PR 3 | Base: PR 2 branch; ~130 lines |

> **Action required**: Before `sdd-apply` starts, choose chain strategy — `stacked-to-main`, `feature-branch-chain`, or `size-exception`. See forecast rules in the skill.

---

## Resolved Open Questions

- **AGENTE redirect on `/dashboard`**: `getRedirectUrlByRole` currently returns `/dashboard/agente` (non-existent). Decision: update `menu-builder.ts` to map AGENTE → `/dashboard`. Task 4.3.
- **MIA multiple roots**: Users with `idUserLeader = null` ALL become root nodes — confirmed intended. Order by `levelCode` descending (MIA first). Task 1.2.
- **`getCurrentUserByEmail` cross-feature import**: Resolved — move to `src/features/shared/services/user.service.ts`; define `SessionUser` in `src/features/shared/types/session-user.types.ts`; negocios re-exports from shared to preserve backward compat. Tasks 0.2–0.5.

---

## Phase 0: Foundation — Types & Shared Refactor

- [x] 0.1 Create `src/features/production-dashboard/types/hierarchy.types.ts` — define `HierarchyNode`, `HierarchyTreeData`, `HierarchySelectionState` interfaces per design contracts; `selectedUserIds: readonly number[]`
- [x] 0.2 Create `src/features/shared/types/session-user.types.ts` — define `SessionUser` interface with `{ idUser, name, lastName, email, active, idLevel, idUserLeader, role: { code } }` — minimal shape needed by any feature resolving viewer identity; no negocios-specific fields
- [x] 0.3 Create `src/features/shared/services/user.service.ts` — implement `getCurrentUserByEmail(email: string): Promise<SessionUser | null>` using `prisma.user.findUnique({ where: { email }, include: { role: true, level: true } })`; import `SessionUser` from `shared/types/session-user.types.ts`
- [x] 0.4 Modify `src/features/negocios/services/user.service.ts` — replace local `getCurrentUserByEmail` implementation with re-export from `@/features/shared/services/user.service.ts`; keep `UserWithRole` alias export to avoid breaking existing callers in negocios
- [x] 0.5 Run `npm run type-check` after 0.4 — confirm zero regressions in negocios before proceeding

---

## Phase 1: Service Layer (TDD — RED → GREEN)

- [x] 1.1 **(RED)** Create `src/features/production-dashboard/__tests__/services/hierarchy-tree.service.test.ts` — write failing Vitest tests: (a) MIA viewer gets all null-leader root nodes; (b) team leader gets only down-branch subtree; (c) MS Senior gets only direct MS Junior children; (d) inactive user (`active: false`) excluded from tree; (e) BFS cycle guard (user pointing to itself as leader); (f) dynamic depth — new `Level` in chain appears without code change
- [x] 1.2 **(GREEN)** Create `src/features/production-dashboard/services/hierarchy-tree.service.ts` — `buildHierarchyTree(viewer: SessionUser, prisma)`: loads all active users once (`prisma.user.findMany`), loads active levels (`prisma.level.findMany`), builds adjacency map (`leaderId → childIds[]`), resolves roots (MIA / `HIERARCHY_BYPASS_ROLES` → nodes where `idUserLeader === null` ordered by `levelCode` desc; else `[viewer.idUser]`), runs BFS → nested `HierarchyNode[]` with `included: true`; BFS uses `visited: Set<number>` to guard cycles; imports `SessionUser` from `@/features/shared/types/session-user.types`

---

## Phase 2: API Route (TDD — RED → GREEN)

- [x] 2.1 **(RED)** Create `src/features/production-dashboard/__tests__/services/hierarchy-tree.route.test.ts` (or integration suite) — failing tests: (a) 401 when no session; (b) 200 + `nodes: []` for MS Junior viewer; (c) 200 + non-empty `nodes` for MIA viewer; mock `auth()` + `getCurrentUserByEmail` + `buildHierarchyTree`
- [x] 2.2 **(GREEN)** Create `src/app/api/production-dashboard/hierarchy-tree/route.ts` — `GET` handler: `auth()` → 401 if no session; `getCurrentUserByEmail(email)` (import from `@/features/shared/services/user.service`); MS Junior gate → 200 `{ nodes: [] }`; else `buildHierarchyTree(viewer, prisma)` → 200 `ApiResponse<HierarchyTreeData>`

---

## Phase 3: React Components (TDD — RED → GREEN)

- [x] 3.1 Create `src/features/production-dashboard/hooks/use-hierarchy-tree.ts` — `AsyncState<HierarchyTreeData>` hook; fetches `GET /api/production-dashboard/hierarchy-tree`; exposes `{ state, refetch }`
- [x] 3.2 Create `src/features/production-dashboard/components/HierarchySelectionContext.tsx` — `useReducer` with actions `TOGGLE_NODE` (cascade to all descendants) + `INIT`; derive `selectedUserIds: number[]` from recursive `included === true` walk; export `HierarchySelectionContext`, `HierarchySelectionProvider`, `useHierarchySelection` hook
- [x] 3.3 **(RED)** Create `src/features/production-dashboard/__tests__/components/HierarchyTreePanel.test.tsx` — failing tests: (a) panel not rendered when `nodes: []`; (b) renders root nodes; (c) unchecking parent cascades to children; (d) `selectedUserIds` excludes unchecked nodes
- [x] 3.4 **(GREEN)** Create `src/features/production-dashboard/components/HierarchyTreePanel.tsx` — uses `use-hierarchy-tree` for data; wraps in `HierarchySelectionProvider`; returns `null` when `nodes.length === 0`; renders list of `HierarchyTreeNode` for each root; shows skeleton on loading
- [x] 3.5 Create `src/features/production-dashboard/components/HierarchyTreeNode.tsx` — recursive; props: `node: HierarchyNode`; expand/collapse toggle; checkbox calls `useHierarchySelection().toggle(node.userId)`; level tag styled with `node.levelColor`; renders `children` when expanded

---

## Phase 4: Navigation & Shell

- [x] 4.1 Modify `src/app/dashboard/page.tsx` — replace redirect-only logic with Production Dashboard Server Component shell: two-column layout (`HierarchyTreePanel` left; right column placeholder `<div>`); remove any `redirect()` call targeting other routes; page is now a real shell
- [x] 4.2 Modify `src/lib/navigation/menu-items.tsx` — verify `ALL_MENU_ITEMS` has Dashboard entry pointing to `/dashboard` with a `lucide-react` dashboard icon; add Dashboard entry to `AGENTE_MENU_ITEMS` (product sign-off note as inline comment)
- [x] 4.3 Modify `src/lib/navigation/menu-builder.ts` — update `getRedirectUrlByRole` (or equivalent switch/map): AGENTE → `/dashboard` instead of `/dashboard/agente`; add `// AGENTE: product sign-off — lands on Production Dashboard` comment

---

## Phase 5: Integration & E2E

- [x] 5.1 Run `npm run type-check` — fix all TypeScript errors before marking phase complete; no `any` types allowed in new files
- [x] 5.2 Run `npm run test:unit` — service unit tests green (all 6 scenarios from 1.1); context reducer unit tests green
- [x] 5.3 Run `npm run test:integration` — API route integration tests green (all 3 scenarios from 2.1)
- [x] 5.4 Playwright E2E — `e2e/production-dashboard/hierarchy-tree.spec.ts`: (a) authenticated user navigates to `/dashboard` and sees shell (not redirect); (b) MS Junior user — panel not rendered when nodes empty; (c) non-MS-Junior user — panel visible with tree nodes and checkboxes
