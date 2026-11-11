---
'financieramente-app': patch
---

### Corregido

- Las rutas `/api/*` ahora rechazan con 401 cualquier solicitud sin sesión válida, aunque una ruta olvide validar la sesión por su cuenta.

### Técnico

- `src/middleware.ts`: fail-closed backstop for `/api/*`; unauthenticated requests get `401 { data: null, error: 'No autorizado' }` unless they match `src/lib/auth/public-api-allowlist.ts` (health, `/api/auth/*`, account flows, `leads/crm-sync`, `negocios/cron/fund-payments`).
- Extended `middleware-api-gate.test.ts` with public-route, anchoring and invalid-token cases.
