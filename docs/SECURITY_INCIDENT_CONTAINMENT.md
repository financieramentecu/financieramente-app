# Contención de un contenedor de aplicación comprometido

Guía operativa para producción y QA cuando el contenedor `nextjs` muestra señales de intrusión
(CPU alta sin tráfico, procesos con nombres falsos como `[usr]`, `[pm2]`, `[npm]`, carpetas ocultas
`/app/.<aleatorio>thv`, conexiones salientes desconocidas, muertes por OOM repetidas).

> Orden importa: **preservar → rotar → parchear → recrear → verificar → revisar datos**.
> No basta con reiniciar el contenedor: la vía de entrada sigue abierta.

## 0. Antes de tocar nada (solo lectura)

- [ ] Guardar evidencia fuera del servidor: `docker diff`, `docker top`, `netstat -tn` dentro del contenedor, `crontab -l`, `last`, fingerprints de `authorized_keys`, logs de nginx y de la app.
- [ ] **No** guardar variables de entorno ni `/proc/<pid>/environ` (contienen secretos).
- [ ] Confirmar con el equipo cada llave SSH autorizada y cada login reciente de `root`.

## 1. Rotar secretos (la aplicación puede leer su propio entorno; asuma que se leyó)

Rotar todo lo que el servicio `nextjs` recibe por entorno (ver `docker/docker-compose.prod.yml`):

| Secreto | Dónde se cambia | Efecto colateral |
|---|---|---|
| `POSTGRES_PASSWORD` / `DATABASE_URL` / `DIRECT_URL` | `ALTER USER` en Postgres + `.env` del servidor | Conexiones activas se cortan |
| `NEXTAUTH_SECRET` | `.env` del servidor | Cierra todas las sesiones |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console + `.env` | — |
| `SENDGRID_API_KEY` | SendGrid + `.env` | — |
| `SUPER_ADMIN_PASSWORD` | `.env` | — |
| `DO_SPACES_KEY` / `DO_SPACES_SECRET` | Panel de DigitalOcean + `.env` | — |
| `FLAGSMITH_SERVER_KEY` | Flagsmith + `.env` | — |
| `CRON_SECRET` | `.env` **y** la línea de `crontab` que llama a `/api/negocios/cron/fund-payments` | — |
| `LEADS_CRM_SYNC_API_KEY` | `.env` + sistema que la usa | — |
| Secretos de GitHub Actions (llave SSH de deploy, tokens) | GitHub → Settings → Secrets | Revisar también `authorized_keys` |

El `CRON_SECRET` no debe vivir en texto plano dentro del `crontab`: leerlo de un archivo con permisos `600`.

## 2. Parchear y recrear

1. Mergear el PR de parche (Next.js / React / endurecimiento) siguiendo `develop → qa → main`.
2. Verificar primero en **QA** que la app arranca, que las migraciones corren (`npx prisma migrate deploy` dentro del contenedor) y que no hay escrituras denegadas en `/app`.
3. Desplegar a producción. El contenedor debe **recrearse** desde la imagen nueva (no solo reiniciarse).

## 3. Verificar que quedó limpio

Dentro del contenedor recreado:

```bash
docker exec financieramente-nextjs-prod ps -o pid,user,etime,args
```

Debe verse solo `next-server` (y procesos efímeros de `docker exec`).

```bash
docker diff financieramente-nextjs-prod | grep -vE '/app/.next/cache|/home/nextjs/.npm|/home/nextjs/.cache'
```

No debe aparecer ninguna carpeta oculta en `/app`.

En el host: `ss -tlnp` debe mostrar `3000` y `5432` solo en `127.0.0.1`; `docker stats` debe mostrar la CPU de la app en reposo cerca de 0 %.

## 4. Revisar datos

- [ ] Usuarios y roles creados o modificados desde la fecha de la intrusión (`user`, `AuditLog`).
- [ ] Negocios, pagos y liquidaciones modificados fuera de horario o por usuarios inesperados.
- [ ] Roles y extensiones de Postgres (`\du`, `\dx`) sin cambios inesperados.
- [ ] Backups: confirmar que existe uno **anterior** a la intrusión.

## 5. Endurecimiento pendiente

- [ ] Restringir tráfico saliente del contenedor de la app (regla en `DOCKER-USER` o firewall de DigitalOcean) a los destinos necesarios: Postgres, SendGrid, Spaces, Flagsmith, Google.
- [ ] Rate limit en nginx y rechazo de `POST` a rutas inexistentes.
- [ ] Sistema de archivos raíz de solo lectura (`read_only: true`) con `tmpfs` para `/tmp` y `/home/nextjs`; requiere revisar el flujo de migraciones, que hoy ejecuta `npx` dentro del contenedor.
- [ ] Alertas en Sentry para errores repetidos de React Server Components (`Cannot read properties of undefined (reading 'require')`).
- [ ] Revisar con regularidad `npm audit` y los avisos de seguridad de Next.js.
