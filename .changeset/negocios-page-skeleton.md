---
'financieramente-app': patch
---

### Mejorado

- **Carga de Negocios:** al abrir la pantalla de Negocios se muestra de inmediato un esqueleto con los indicadores y la tabla, en lugar de una pantalla en blanco mientras se cargan los datos.

### Técnico

- Add `NegociosPageSkeleton` and `src/app/dashboard/negocios/loading.tsx` (covers the session and user lookups before the page's own `Suspense`), and use the skeleton as the `Suspense` fallback in `negocios/page.tsx` instead of the bare `Loader2` spinner.
