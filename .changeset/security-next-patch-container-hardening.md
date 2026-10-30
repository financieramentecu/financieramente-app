---
'financieramente-app': patch
---

### Corregido

- **Seguridad de la plataforma:** Se actualizó el framework web a una versión con las correcciones de seguridad vigentes y se reforzó el entorno donde corre la aplicación para limitar el alcance de cualquier intrusión.

### Técnico

- Upgraded `next` and `eslint-config-next` 15.5.0 → 15.5.28 and `react` / `react-dom` 19.1.0 → 19.1.10 (React Server Components remote code execution advisory CVE-2025-66478 / CVE-2025-55182; 15.5.7 is the first patched 15.5.x release).
- `docker/Dockerfile`: `/app` stays root-owned and read-only for the `nextjs` user; only `/app/.next/cache` and `/app/node_modules/.cache` are writable.
- `docker/docker-compose.{prod,qa}.yml`: Postgres and app ports bound to `127.0.0.1`; the app container runs with `no-new-privileges`, `cap_drop: ALL` and `pids_limit: 256`.
