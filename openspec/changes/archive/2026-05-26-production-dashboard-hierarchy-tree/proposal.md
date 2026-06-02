# Proposal: Production dashboard — hierarchy filter tree

## Intent

Production Dashboard **left column**: org tree to **pick users** who scope later business/KPI filters. **Down-branch only**, **active users**, **checkbox = in filter** (off = excluded). **MIA + backoffice**: full tree from top `Level`, **dynamic depth** (new levels auto-fit). **MS Junior**: hide panel. **Entry**: reuse **`/dashboard`** (replace redirect-only page).

## Scope

### In Scope

- `src/features/production-dashboard/` (types, services, hooks, components, tests).
- **GET** `/api/production-dashboard/hierarchy-tree`: nested filter DTO (`userId`, `level`, `children[]`, default include); scope from DB user + role; no client trust.
- UI: expand/collapse, tags, inclusion checkboxes.
- Nav: **Dashboard** → `/dashboard`; **AGENTE** gets Dashboard when product ok.

### Out of Scope

- Right column, metrics APIs, Flagsmith. **Negocios filter wiring**: follow-on slice; **must** still define `selectedUserIds[]` contract here.

## Capabilities

### New Capabilities

- **production-dashboard**: Tree + UI + selection contract + visibility rules above.

### Modified Capabilities

- **navigation**: Dashboard → `/dashboard` production shell; AGENTE menu; document redirect change.
- **negocios** (follow-on delta): optional `hierarchyUserIds` on list/stats; **MUST** verify each id in viewer-allowed set before `idUser IN (...)`.

## Approach

Build adjacency from `idUserLeader`; pick roots by viewer (MIA / `HIERARCHY_BYPASS_ROLES` → org top; else self-subtree). Walk depth via live `Level` chain, not constants. v1: full tree per request; lazy load later if spec caps size.

## Affected Areas

| Area | Impact |
|------|--------|
| `src/app/dashboard/page.tsx` | Modified — shell not redirect-only |
| `menu-items.tsx`, `menu-builder.ts` | Modified |
| `src/app/api/production-dashboard/hierarchy-tree/route.ts` | New |
| `src/features/production-dashboard/**` | New |

## Risks

| Risk | L | Mitigation |
|------|---|------------|
| `/dashboard` bookmark break | M | E2E + changelog |
| Big payload | M | Spec cap; lazy phase 2 |
| Leader cycles | L | BFS + visited |

## Rollback

Revert PR (page, menus, API, feature folder). No migration.

## Dependencies

`Level` seeds; `User.active`.

## Success Criteria

- [ ] API never leaks parallel branches; 403/empty when invalid.
- [ ] MIA/backoffice full tree; MS Junior no UI / no tree data.
- [ ] Unchecked nodes drop from `selectedUserIds` (tested).
- [ ] `npm run type-check` + targeted tests green.
