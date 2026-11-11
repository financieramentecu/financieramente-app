---
'financieramente-app': patch
---

### Mejorado

- Las pantallas del dashboard, el CRM y las notificaciones hacen menos trabajo repetido al abrir, así que la plataforma responde antes sin cambiar resultados ni permisos.

### Técnico

- Prisma SQL logging in development is opt-in via `PRISMA_LOG_QUERIES=1`.
- Flagsmith identity and environment reads are deduped per request with `React.cache`.
- CRM stage-detail loads in parallel with the pipeline report, using the same server default range until the user applies dates.
- Notification list and SSE open once the session user id is known.
- Dashboard middleware no longer logs every request and its cookie names.
