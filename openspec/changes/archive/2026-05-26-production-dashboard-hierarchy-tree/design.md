# Design: Production Dashboard — Hierarchy Filter Tree

## Technical Approach

Extend the existing BFS adjacency pattern from `user-hierarchy.service.ts` into a new `production-dashboard` feature that returns a nested `HierarchyNode[]` DTO via `GET /api/production-dashboard/hierarchy-tree`. The `/dashboard` page becomes a real shell (not redirect-only); viewer role determines tree scope server-side; client holds checkbox state in React context.

---

## Architecture Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|
| **Tree root resolution** | Server-side: MIA / bypass → walk all users with no leader; others → viewer as root | Client-supplied root | Spec mandates no client trust; mirrors existing negocios pattern |
| **BFS strategy** | Extend `user-hierarchy.service.ts` pattern: load all active users once, build adjacency map, BFS from root(s) | Recursive Postgres CTE (used in `hierarchy.ts`) | CTE better for flat ID sets; adjacency BFS better for building nested DTO in one pass |
| **Depth computation** | Walk `Level.idNextLevel` chain at query time; count active Level records for cap | Hardcoded constant | Spec mandates dynamic depth; new Levels auto-fit without code change |
| **Selection state** | Client-only `React.createContext` with `selectedUserIds: number[]` derived from recursive `included` flags | Server-side session / URL params | v1 scope; downstream wiring deferred; keeps API stateless |
| **MS Junior gate** | Service returns `{ nodes: [] }`; UI hides panel when `nodes.length === 0` | 403 / separate flag | 200 + empty matches spec; simpler than error handling in UI |
| **`/dashboard` page** | Rewrite to Production Dashboard shell with two-column layout | Add new route `/dashboard/production` | Proposal explicitly reuses `/dashboard`; avoids bookmark break |
| **`getCurrentUserByEmail`** | Move to `src/features/shared/services/user.service.ts`; both `negocios` and `production-dashboard` import from `shared/` | Keep in `negocios/` and cross-import | Cross-feature imports violate Interface Segregation; `getCurrentUserByEmail` is session-identity resolution — a shared concern, not a negocios concern |

---

## Sequence Diagram — API Resolution Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Route Handler
    participant S as hierarchy-tree.service
    participant DB as Prisma / DB

    C->>R: GET /api/production-dashboard/hierarchy-tree
    R->>R: auth() → session.user.email
    alt no session
        R-->>C: 401 { data: null, error: "No autorizado" }
    end
    R->>DB: getCurrentUserByEmail(email) → User { idUser, idLevel, role }
    alt LEVEL_0 (MS Junior)
        R-->>C: 200 { data: { nodes: [] } }
    end
    R->>S: buildHierarchyTree(viewer, prisma)
    S->>DB: prisma.user.findMany({ where: { active: true }, select: { idUser, idUserLeader, name, lastName, idLevel } })
    S->>DB: prisma.level.findMany({ where: { status: true }, select: { idLevel, code, name, color, idNextLevel } })
    S->>S: Build adjacency map (leaderId → childIds[])
    S->>S: Determine root(s): MIA/bypass → nodes with idUserLeader=null; else → [viewer.idUser]
    S->>S: BFS → recursive HierarchyNode tree (included: true by default)
    S-->>R: HierarchyNode[]
    R-->>C: 200 { data: { nodes: HierarchyNode[] } }
```

---

## Component Tree

```
src/app/dashboard/page.tsx          ← Server Component (shell)
└── ProductionDashboardPage         ← Client layout wrapper
    ├── HierarchySelectionContext   ← Context provider (selectedUserIds)
    ├── HierarchyTreePanel          ← Left column (hidden if nodes=[])
    │   └── HierarchyTreeNode*      ← Recursive node (checkbox + children)
    └── <placeholder>               ← Right column (KPIs / filters — future)
```

---

## Data Flow

```
API response                Client state                 Downstream
──────────────              ─────────────────────────    ──────────────
HierarchyNode[]  →  Context initializes included:true
                    User toggles checkbox  →  cascade
                    reducer (excludeSubtree)
                                          →  selectedUserIds: number[]
                                                           → (future negocios filter)
```

---

## File Changes

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/production-dashboard/types/hierarchy.types.ts` | Create | `HierarchyNode`, `HierarchyTreeData`, `HierarchySelectionState` types |
| `src/features/production-dashboard/services/hierarchy-tree.service.ts` | Create | BFS tree builder; Level chain walker; root resolver; pure Prisma logic |
| `src/features/production-dashboard/hooks/use-hierarchy-tree.ts` | Create | `AsyncState<HierarchyTreeData>` hook; calls `/api/production-dashboard/hierarchy-tree` |
| `src/features/production-dashboard/components/HierarchySelectionContext.tsx` | Create | React context + `useReducer` for `selectedUserIds` + cascade toggle |
| `src/features/production-dashboard/components/HierarchyTreePanel.tsx` | Create | Left column shell; renders `HierarchyTreeNode` list; hides when nodes empty |
| `src/features/production-dashboard/components/HierarchyTreeNode.tsx` | Create | Recursive node: expand/collapse, checkbox, level tag with `levelColor` |
| `src/features/production-dashboard/__tests__/services/hierarchy-tree.service.test.ts` | Create | Unit: tree scoping per role, BFS cycle safety, MS Junior empty result, dynamic depth |
| `src/features/production-dashboard/__tests__/components/HierarchyTreePanel.test.tsx` | Create | Component: hidden when empty, cascade uncheck, selectedUserIds output |
| `src/features/shared/services/user.service.ts` | Create/Move | `getCurrentUserByEmail` extracted from `negocios/services/user.service.ts` into shared; returns `SessionUser` type defined in `shared/types/` |
| `src/features/negocios/services/user.service.ts` | Modify | Replace local definition with re-export from `shared/services/user.service.ts` to avoid breaking callers |
| `src/app/api/production-dashboard/hierarchy-tree/route.ts` | Create | Route handler: auth → getUserByEmail (from shared) → buildHierarchyTree → ApiResponse |
| `src/app/dashboard/page.tsx` | Modify | Replace redirect-only with Production Dashboard shell (Server Component) |
| `src/lib/navigation/menu-items.tsx` | Modify | Verify Dashboard entry exists in `ALL_MENU_ITEMS` (already present); add to `AGENTE_MENU_ITEMS` when product signs off |

---

## Interfaces / Contracts

```typescript
// src/features/production-dashboard/types/hierarchy.types.ts

export interface HierarchyNode {
  userId: number
  fullName: string
  levelCode: string
  levelName: string
  levelColor: string
  included: boolean  // default true; client-only mutable state
  children: HierarchyNode[]
}

export interface HierarchyTreeData {
  nodes: HierarchyNode[]
}

// Context state
export interface HierarchySelectionState {
  nodes: HierarchyNode[]              // full tree (immutable shape from API)
  selectedUserIds: readonly number[]  // derived: all nodes where included === true (recursive)
  toggle: (userId: number) => void    // cascades to all descendants
}
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `buildHierarchyTree`: MIA gets all roots, team leader gets only subtree, MS Senior gets only MS Junior children, BFS cycle guard, depth from live Level chain, inactive users excluded | Vitest; mock `prisma.user.findMany` + `prisma.level.findMany` with fixture data |
| Unit | `HierarchySelectionContext` reducer: toggle leaf, cascade parent → children, derive `selectedUserIds` | Vitest; pure reducer function test |
| Component | `HierarchyTreePanel`: hidden when `nodes=[]`; renders nodes; checkbox state syncs with context | Vitest + Testing Library |
| Integration | `GET /api/production-dashboard/hierarchy-tree`: 401 without session, 200+empty for MS Junior, 200+nodes for other roles | Vitest integration with mocked auth + prisma |
| E2E | Dashboard navigation; tree renders; uncheck parent removes descendants from selection | Playwright |

---

## Migration / Rollout

No migration required. No schema changes. No feature flag needed for v1 (tree is gated by session role server-side). AGENTE menu entry added separately after product sign-off via `AGENTE_MENU_ITEMS` update.

---

## Open Questions

- [x] **`getCurrentUserByEmail` cross-feature import**: Resolved — move to `src/features/shared/services/user.service.ts`; `negocios` re-exports from shared to preserve backward compat.
- [x] **`/dashboard` redirect for AGENTE**: Resolved — update `menu-builder.ts` to map AGENTE → `/dashboard` (task 4.3).
- [x] **MIA full-tree roots**: Resolved — all users with `idUserLeader = null` become root nodes, ordered by `levelCode` desc (MIA first).
