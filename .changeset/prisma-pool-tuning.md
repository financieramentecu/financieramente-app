---
'financieramente-app': patch
---

### Mejorado

- Las consultas simultáneas ya no se bloquean por falta de conexiones a la base de datos, lo que reduce las lentitudes y los errores en horas de mayor uso.

### Corregido

- El módulo de liquidaciones deja de abrir su propio grupo de conexiones a la base de datos y reutiliza el compartido de la aplicación.

### Técnico

- Add `src/lib/prisma-pool.ts` (`withPoolParams`, `readPoolOptionsFromEnv`) and pass the result as `datasourceUrl` in the `PrismaClient` singleton. Pool size and timeouts come from `PRISMA_CONNECTION_LIMIT`, `PRISMA_POOL_TIMEOUT` and `PRISMA_CONNECT_TIMEOUT`; parameters already present in `DATABASE_URL` take precedence.
- Set defaults in `docker-compose.prod.yml` (15 connections) and `docker-compose.qa.yml` (8 connections), with 20s pool timeout and 10s connect timeout.
- `liquidacion.service.ts` now imports the shared `prisma` singleton instead of calling `new PrismaClient()`.
