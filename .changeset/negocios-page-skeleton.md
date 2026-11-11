---
'financieramente-app': patch
---

### Mejorado

- **Carga de Negocios:** al abrir la pantalla de Negocios se muestra de inmediato un esqueleto con los indicadores y la tabla, en lugar de una pantalla en blanco mientras se cargan los datos.
- **Apertura más rápida de Negocios:** al entrar sin filtros de fecha, la pantalla aplica el mes actual con una espera menos antes de mostrarse.
- La pantalla de Negocios deja de repetir peticiones innecesarias al cargar (notificaciones, reportes autorizados y datos ya recibidos del servidor), por lo que abre más rápido.
- El Dashboard de Producción deja de calcular cada gráfica dos veces al abrir (primero solo con el usuario y luego con su jerarquía completa), por lo que carga más rápido.

### Técnico

- Add `NegociosPageSkeleton` and `src/app/dashboard/negocios/loading.tsx` (covers the session and user lookups before the page's own `Suspense`), and use the skeleton as the `Suspense` fallback in `negocios/page.tsx` instead of the bare `Loader2` spinner.
- `negocios/page.tsx` computes the default date seed from `session.user.role` and redirects before `getCurrentUserByEmail`; the database role is still checked afterwards as a fallback when the session role is missing or has no default.
- `src/app/dashboard/layout.tsx` no longer awaits `auth()` itself: the check moved to `DashboardSessionGate` (`src/features/auth/components/dashboard-session-gate.tsx`) inside a `Suspense` with `DashboardLoadingSkeleton`, so every dashboard page paints a skeleton while the session is revalidated. The children are still rendered only after the gate resolves (SEC-01 unchanged).
- `src/middleware.ts` now seeds the negocios default date filter (`buildNegociosSeedRedirectPath`, Edge-safe, drops the router `_rsc` param) and redirects before the page renders. A client-side navigation follows that redirect inside its own request, which removes the ~0.5 s blank screen caused by the page's `redirect()` tearing down the loading UI. The page keeps its own redirect as a fallback for the database role.
- Fewer duplicate requests on page load (36 → 13 measured on `/dashboard/negocios`): `useBusinesses` / `useBusinessStats` keep the server-data claim in a ref so React StrictMode's double effect no longer refetches the list and KPIs; `useNotifications` skips the fetch and SSE stream while the user id is still 0; `useAuthorizedReportCodes` depends on a primitive user key instead of the `session.user` object, so each session refetch no longer re-requests `/api/reports/me`.
- Dashboard de Producción: `HierarchySelectionContext` exposes `isHierarchyResolved` (set by `HierarchyTreePanel` on success, empty or error) and the six data hooks (`useProductionKpis`, `useHeatmapTable`, `useOriginDonut`, `useCompanyDonut`, `useStatusDonut`, `useMsBarChart`) wait for it instead of fetching first with only the session user and again with the whole hierarchy; `useDashboardCatalogs` shares one in-flight request between the filter panel and the heatmap. Measured on `/dashboard`: 21 → 14 requests, each data endpoint once instead of twice.
