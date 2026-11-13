# Loading skeletons across screens
Objective: replace spinners / "Cargando..." text on screen-level data loads with skeletons shaped like the final content (no layout jump).
Branch: feature/roles-permissions-management (work was briefly on a separate branch, merged back by fast-forward). Delivery: ask-on-risk. Runner: vitest.

## Specs
- S1: "quiero que las cargas de las pantalla usemos skeletons para mejorar la experiencia de usuario"
- S2: Scope chosen by the user: "Todas las pantallas" (screen-level loads only; spinners inside action buttons stay).
- S3: Reuse `src/features/shared/ui/skeleton.tsx` and `loading-skeletons.tsx`; skeletons mirror the loaded layout.
- S4: Skeleton containers expose `aria-busy` and an accessible label (Spanish) so tests/readers can find them.

## Tasks
- [x] T1 (S3,S4) Shared primitives: list/card/form skeletons in loading-skeletons.tsx. Route: inline.
- [x] T2 (S1) Roles: roles-manager, role-editor. Route: inline.
- [x] T3 (S1) Mis distribuciones: list page + [fileId] page. Route: inline.
- [x] T4 (S1) Distribucion comisiones: reglas pages (2), default-distribution-editor, config-distribucion-entry-client. Route: inline.
- [x] T5 (S1) admin/category-types, admin/users/[id], calculadora, pre-liquidacion results/detail/distribution modals, comments sidebar+history, business-supports sheet. Route: inline. Negocios client left as is: loading.tsx exists and its spinner is an action button.

## Log
- L1 (2026-11-13): "quiero que las cargas de las pantalla usemos skeletons para mejorar la experiencia de usuario"
- L2 (2026-11-13): scope question answered: "Todas las pantallas"
- L3 (2026-11-13): done. Commits aa3503f4 (T1,T2), 752f896c (T3), 4dff0185 (T4 + report-permissions), 721d7ce6 (T5 + panels). Full suite 622 files / 5766 tests green, tsc 0, eslint 0 errors. Browser check on /dashboard/admin/roles: skeleton shows, then 8 rows. Header count hidden while loading. T3 skeleton tests written together with the component (RED not observed separately).
