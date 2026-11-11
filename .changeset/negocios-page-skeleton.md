---
'financieramente-app': patch
---

### Mejorado

- **Carga de Negocios:** al abrir la pantalla de Negocios se muestra de inmediato un esqueleto con los indicadores y la tabla, en lugar de una pantalla en blanco mientras se cargan los datos.
- **Apertura más rápida de Negocios:** al entrar sin filtros de fecha, la pantalla aplica el mes actual con una espera menos antes de mostrarse.

### Técnico

- Add `NegociosPageSkeleton` and `src/app/dashboard/negocios/loading.tsx` (covers the session and user lookups before the page's own `Suspense`), and use the skeleton as the `Suspense` fallback in `negocios/page.tsx` instead of the bare `Loader2` spinner.
- `negocios/page.tsx` computes the default date seed from `session.user.role` and redirects before `getCurrentUserByEmail`; the database role is still checked afterwards as a fallback when the session role is missing or has no default.
