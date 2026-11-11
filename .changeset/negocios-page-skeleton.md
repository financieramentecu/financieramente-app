---
'financieramente-app': patch
---

### Mejorado

- **Carga de Negocios:** al abrir la pantalla de Negocios se muestra de inmediato un esqueleto con los indicadores y la tabla, en lugar de una pantalla en blanco mientras se cargan los datos.
- **Apertura más rápida de Negocios:** al entrar sin filtros de fecha, la pantalla aplica el mes actual con una espera menos antes de mostrarse.

### Técnico

- Add `NegociosPageSkeleton` and `src/app/dashboard/negocios/loading.tsx` (covers the session and user lookups before the page's own `Suspense`), and use the skeleton as the `Suspense` fallback in `negocios/page.tsx` instead of the bare `Loader2` spinner.
- `negocios/page.tsx` computes the default date seed from `session.user.role` and redirects before `getCurrentUserByEmail`; the database role is still checked afterwards as a fallback when the session role is missing or has no default.
- `src/app/dashboard/layout.tsx` no longer awaits `auth()` itself: the check moved to `DashboardSessionGate` (`src/features/auth/components/dashboard-session-gate.tsx`) inside a `Suspense` with `DashboardLoadingSkeleton`, so every dashboard page paints a skeleton while the session is revalidated. The children are still rendered only after the gate resolves (SEC-01 unchanged).
- `src/middleware.ts` now seeds the negocios default date filter (`buildNegociosSeedRedirectPath`, Edge-safe, drops the router `_rsc` param) and redirects before the page renders. A client-side navigation follows that redirect inside its own request, which removes the ~0.5 s blank screen caused by the page's `redirect()` tearing down the loading UI. The page keeps its own redirect as a fallback for the database role.
