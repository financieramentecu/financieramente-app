# Loading skeletons across screens
Objective: replace spinners / "Cargando..." text on screen-level data loads with skeletons shaped like the final content (no layout jump).
Branch: feature/loading-skeletons (cut from feature/roles-permissions-management, unpushed). Delivery: ask-on-risk. Runner: vitest.

## Specs
- S1: "quiero que las cargas de las pantalla usemos skeletons para mejorar la experiencia de usuario"
- S2: Scope chosen by the user: "Todas las pantallas" (screen-level loads only; spinners inside action buttons stay).
- S3: Reuse `src/features/shared/ui/skeleton.tsx` and `loading-skeletons.tsx`; skeletons mirror the loaded layout.
- S4: Skeleton containers expose `aria-busy` and an accessible label (Spanish) so tests/readers can find them.

## Tasks
- [ ] T1 (S3,S4) Shared primitives: list/card/form skeletons in loading-skeletons.tsx. Route: inline.
- [ ] T2 (S1) Roles: roles-manager, role-editor. Route: inline.
- [ ] T3 (S1) Mis distribuciones: list page + [fileId] page. Route: inline.
- [ ] T4 (S1) Distribucion comisiones: reglas pages (2), default-distribution-editor, config-distribucion-entry-client. Route: inline.
- [ ] T5 (S1) Negocios client page, admin/category-types, admin/users/[id], report-permissions-admin, calculadora Suspense fallback. Route: inline.

## Log
- L1 (2026-11-13): "quiero que las cargas de las pantalla usemos skeletons para mejorar la experiencia de usuario"
- L2 (2026-11-13): scope question answered: "Todas las pantallas"
